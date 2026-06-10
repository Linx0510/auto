const express = require('express');
const config = require('../config');
const { createRateLimiter } = require('../middleware/rateLimit');
const aiService = require('../services/aiService');

const router = express.Router();

const aiRateLimit = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  keyFn: (req) => req.sessionID
});

router.post('/chat', aiRateLimit, async (req, res) => {
  try {
    const parsed = aiService.sanitizeUserMessage(req.body?.message);

    if (!parsed.ok) {
      return res.status(400).json({ error: parsed.error });
    }

    const message = parsed.message;
    const history = Array.isArray(req.session.aiChatHistory)
      ? req.session.aiChatHistory
      : [];

    const result = await aiService.chat(message, history);
    const reply = result.reply;

    req.session.aiChatHistory = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: reply }
    ];

    const maxHistory = config.openrouter.maxHistoryMessages;
    if (req.session.aiChatHistory.length > maxHistory) {
      req.session.aiChatHistory = req.session.aiChatHistory.slice(-maxHistory);
    }

    return res.json({ reply });
  } catch (error) {
    const status =
      error && typeof error.status === 'number'
        ? error.status
        : error && error.isTimeout
          ? 504
          : 500;

    console.error('[ai/chat]', {
      status,
      message: error && error.message,
      isTimeout: Boolean(error && error.isTimeout),
      cause: error && error.cause ? String(error.cause) : undefined
    });

    return res.status(status).json({
      error: status === 429 ? 'Слишком много сообщений. Подождите минуту.' : 'Ошибка при обработке запроса',
      reply: aiService.FALLBACK_REPLY
    });
  }
});

module.exports = router;
