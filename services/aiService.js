const config = require('../config');
const serviceRepository = require('../repositories/serviceRepository');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const FALLBACK_REPLY =
  'Извините, сейчас не удалось получить ответ. Попробуйте позже или свяжитесь с нами по телефону.';

function formatPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) {
    return '—';
  }
  return `${n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₽`;
}

function formatDuration(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) {
    return 'не указана';
  }
  return `${n} мин`;
}

async function getServicesContext() {
  const result = await serviceRepository.listActive();
  const services = result.rows;

  if (services.length === 0) {
    return 'Список услуг временно пуст.';
  }

  return services
    .map((s) => {
      const lines = [
        `- ID ${s.id}: ${s.name} | ${formatPrice(s.price)} | ${formatDuration(s.duration)}${s.category ? ` | ${s.category}` : ''}`
      ];
      if (s.description) {
        lines.push(`  Описание: ${s.description}`);
      }
      return lines.join('\n');
    })
    .join('\n');
}

function sanitizeUserMessage(raw) {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Сообщение должно быть текстом' };
  }

  let message = raw.trim();
  message = message.replace(/<[^>]*>/g, '');
  message = message.replace(/\s+/g, ' ').trim();

  const maxLen = config.openrouter.maxMessageLength;
  if (message.length > maxLen) {
    return { ok: false, error: `Сообщение не должно превышать ${maxLen} символов` };
  }

  if (!message) {
    return { ok: false, error: 'Сообщение не может быть пустым' };
  }

  return { ok: true, message };
}

function getSiteBaseUrl() {
  return config.openrouter.siteUrl.replace(/\/$/, '');
}

function buildSiteLinksBlock() {
  const base = getSiteBaseUrl();

  return `Ссылки на сайт (используй ТОЛЬКО эти URL; не example.com, не localhost, не выдуманные домены).
Формат ссылок в ответах — только полный Markdown: [текст](URL). Без URL ссылка недействительна.
- Запись: [записаться](${base}/#contact) или [тут](${base}/#contact)
- Контакты: [контакты](${base}/#contact)
- Услуги и цены: [услуги](${base}/#services)
- Вход: [войти](${base}/login)
- Личный кабинет: [личный кабинет](${base}/profile)
Запрещено: голые http://..., а также [контакты] или [тут] без (URL) в круглых скобках.

Страницы:
- Главная: ${base}/
- Услуги: ${base}/#services
- Запись на обслуживание: ${base}/#contact
- Вход и регистрация: ${base}/login
- Личный кабинет: ${base}/profile`;
}

function toRelativeSitePath(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname + parsed.hash;
    const isInternal =
      parsed.pathname === '/' ||
      parsed.pathname === '/login' ||
      parsed.pathname === '/profile' ||
      parsed.hash === '#contact' ||
      parsed.hash === '#services';

    if (isInternal) {
      return path || '/';
    }
  } catch (e) {
    // ignore invalid URLs
  }

  return url;
}

function pickLinkLabel(url) {
  const lower = String(url).toLowerCase();

  if (lower.includes('#contact')) {
    return 'записаться';
  }
  if (lower.includes('/login')) {
    return 'войти';
  }
  if (lower.includes('/profile')) {
    return 'личный кабинет';
  }
  if (lower.includes('#services')) {
    return 'услуги';
  }

  return 'тут';
}

function splitTrailingPunctuation(rawUrl) {
  const match = rawUrl.match(/^(.+?)([,.;:!?]+)$/);
  if (!match) {
    return { url: rawUrl, trailing: '' };
  }
  return { url: match[1], trailing: match[2] };
}

function linkifyBareUrls(text) {
  const urlPattern = /https?:\/\/[^\s)\]"']+/g;
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = urlPattern.exec(text)) !== null) {
    const start = match.index;
    const rawUrl = match[0];
    const insideMarkdown = start >= 2 && text.slice(start - 2, start) === '](';

    result += text.slice(lastIndex, start);

    if (insideMarkdown) {
      result += rawUrl;
      lastIndex = start + rawUrl.length;
      continue;
    }

    const { url, trailing } = splitTrailingPunctuation(rawUrl);
    const href = toRelativeSitePath(url);
    const label = pickLinkLabel(href);
    result += `[${label}](${href})${trailing}`;

    lastIndex = start + rawUrl.length;
  }

  result += text.slice(lastIndex);
  return result;
}

const INCOMPLETE_LINK_PATHS = {
  контакты: '/#contact',
  контакт: '/#contact',
  записаться: '/#contact',
  запись: '/#contact',
  тут: '/#contact',
  здесь: '/#contact',
  услуги: '/#services',
  прайс: '/#services',
  цены: '/#services',
  войти: '/login',
  регистрация: '/login',
  'личный кабинет': '/profile',
  кабинет: '/profile',
  главная: '/'
};

function resolvePathByLabel(label) {
  const key = String(label).trim().toLowerCase();
  return INCOMPLETE_LINK_PATHS[key] || null;
}

function fixIncompleteMarkdownLinks(text) {
  let result = String(text);

  result = result.replace(/\[([^\]]+)\]\(\s*\)/g, (_, label) => {
    const path = resolvePathByLabel(label);
    return path ? `[${label}](${path})` : label;
  });

  result = result.replace(/\[([^\]]+)\](?!\()/g, (_, label) => {
    const path = resolvePathByLabel(label);
    if (path) {
      return `[${label}](${path})`;
    }
    return label;
  });

  return result;
}

function normalizeReplyLinks(reply) {
  const base = getSiteBaseUrl();
  let result = String(reply);

  result = result.replace(
    /https?:\/\/(?:www\.)?example\.(?:com|org|net)(\/[^\s)\]"']*)?/gi,
    (_, path) => base + (path || '/')
  );

  result = result.replace(
    /https?:\/\/(?:www\.)?localhost(?::\d+)?(\/[^\s)\]"']*)?/gi,
    (_, path) => base + (path || '/')
  );

  result = result.replace(
    /https?:\/\/127\.0\.0\.1(?::\d+)?(\/[^\s)\]"']*)?/gi,
    (_, path) => base + (path || '/')
  );

  result = result.replace(
    /(на\s+страниц[еы]|здесь|по\s+ссылке|перейти):\s*(https?:\/\/[^\s)\]"']+)/gi,
    (_, prefix, rawUrl) => {
      const { url, trailing } = splitTrailingPunctuation(rawUrl);
      const href = toRelativeSitePath(url);
      return `${prefix} [${pickLinkLabel(href)}](${href})${trailing}`;
    }
  );

  result = linkifyBareUrls(result);

  result = result.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    (full, label, url) => `[${label}](${toRelativeSitePath(url)})`
  );

  result = fixIncompleteMarkdownLinks(result);

  return result;
}

function buildSystemPrompt(servicesContext) {
  const { app } = config;
  const siteLinks = buildSiteLinksBlock();

  return `Ты AI-помощник автосервиса «АвтоМобилСервис».

Твоя задача:
- помогать клиентам понять услуги;
- подсказывать возможные причины проблем автомобиля;
- рекомендовать услуги сервиса;
- помогать оформить заявку;
- отвечать кратко и понятно.

ВАЖНО:
- Не придумывай несуществующие услуги.
- Не ставь точный технический диагноз.
- Не гарантируй исправность.
- Не выдумывай цены.
- Используй только информацию из переданного контекста.
- Если информации нет — честно говори об этом.
- Не отвечай на темы, не связанные с автосервисом.
- Для ссылок на сайт используй только URL из блока «Ссылки на сайт» ниже.
- Ссылки давай только в полном формате Markdown: [текст](URL). Нельзя писать [контакты] или [тут] без (URL).

Если пользователь описывает проблему автомобиля:
- кратко объясни возможные причины (используй осторожные формулировки: «возможно», «может быть связано с», «точную причину определит мастер при диагностике»);
- предложи подходящую услугу из списка;
- предложи записаться на диагностику.

Если пользователь спрашивает стоимость:
- используй только реальные цены из контекста.

Если пользователь хочет оформить заявку:
- объясни какие данные нужны:
  - услуга
  - марка авто
  - модель
  - год
  - описание проблемы
  - желаемая дата
- для отправки заявки нужна авторизация на сайте;
- заявку можно оставить на главной странице в разделе «Контакты» или в личном кабинете.

Контекст сайта:
- Официальный сайт: ${getSiteBaseUrl()}/
- Это автосервис с онлайн-записью на ремонт.
- Есть каталог услуг, галерея работ, отзывы.
- Есть регистрация и личный кабинет клиента.
- Клиент может создавать заявки на обслуживание.
- Статусы заявок: pending (ожидает), in_progress (в работе), completed (завершена), cancelled (отменена).

${siteLinks}

Контакты:
- Телефон: ${app.contactPhone}
- Email: ${app.contactEmail}
- Адрес: ${app.address}
- Часы работы: будни ${app.workingHours.weekdays}, выходные ${app.workingHours.weekends}

Актуальный список услуг (цены и длительность):
${servicesContext}`;
}

async function callOpenRouter(messages, model) {
  const { apiKey, siteUrl, maxTokens, temperature, timeoutMs } = config.openrouter;
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  let data = {};
  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': siteUrl,
        'X-Title': 'AutomobilService'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature
      }),
      signal: controller.signal
    });

    data = await response.json().catch(() => ({}));
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    const isAbort = error && (error.name === 'AbortError' || String(error.message || '').includes('aborted'));
    const err = new Error(isAbort ? `OpenRouter timeout after ${timeoutMs}ms` : `OpenRouter fetch failed: ${error.message || error}`);
    err.cause = error;
    err.isTimeout = Boolean(isAbort);
    err.elapsedMs = elapsedMs;
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errMsg = data?.error?.message || data?.error || `HTTP ${response.status}`;
    const err = new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    err.status = response.status;
    throw err;
  }

  const choice = data?.choices?.[0] || {};
  const content = choice?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Пустой ответ от модели');
  }

  const finishReason = choice?.finish_reason || null;
  const elapsedMs = Date.now() - startedAt;
  const usage = data?.usage || null;

  return {
    content: content.trim(),
    finishReason,
    usage,
    elapsedMs
  };
}

async function chatWithModels(messages, models) {
  let lastError = null;

  for (const model of models) {
    try {
      const result = await callOpenRouter(messages, model);
      return { ...result, model };
    } catch (error) {
      lastError = error;
      console.warn('[aiService] Model failed', {
        model,
        message: error && error.message,
        status: error && error.status,
        isTimeout: Boolean(error && error.isTimeout),
        elapsedMs: error && error.elapsedMs
      });
    }
  }

  throw lastError || new Error('Все модели недоступны');
}

function getUnavailableReply() {
  return `AI-помощник временно недоступен. Обратитесь по телефону ${config.app.contactPhone} или оставьте заявку на сайте.`;
}

async function chat(userMessage, history = []) {
  const { apiKey, model, fallbackModels } = config.openrouter;

  if (!apiKey) {
    return { reply: getUnavailableReply(), unavailable: true };
  }

  const servicesContextRaw = await getServicesContext();
  const servicesContext =
    typeof servicesContextRaw === 'string'
      ? servicesContextRaw.slice(0, config.openrouter.maxServicesContextChars)
      : '';
  const systemPrompt = buildSystemPrompt(servicesContext);

  const safeHistory = Array.isArray(history)
    ? history.filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string'
      )
    : [];

  const trimmedHistory = (() => {
    const maxChars = config.openrouter.maxHistoryChars;
    const out = [];
    let used = 0;
    for (let i = safeHistory.length - 1; i >= 0; i -= 1) {
      const m = safeHistory[i];
      const len = String(m.content).length;
      if (used + len > maxChars) break;
      out.push(m);
      used += len;
    }
    return out.reverse();
  })();

  const messages = [
    { role: 'system', content: systemPrompt },
    ...trimmedHistory,
    { role: 'user', content: userMessage }
  ];

  const models = [model, ...fallbackModels.filter((m) => m !== model)];
  const result = await chatWithModels(messages, models);

  console.info('[aiService] OpenRouter ok', {
    model: result.model,
    elapsedMs: result.elapsedMs,
    finishReason: result.finishReason,
    replyChars: result.content.length,
    usage: result.usage || undefined
  });

  let reply = normalizeReplyLinks(result.content);
  if (result.finishReason === 'length') {
    reply =
      reply +
      '\n\nОтвет мог быть усечён из-за лимита длины. Если нужно — напишите «продолжи» или уточните вопрос.';
  }

  return { reply };
}

module.exports = {
  getServicesContext,
  sanitizeUserMessage,
  buildSystemPrompt,
  normalizeReplyLinks,
  chat,
  FALLBACK_REPLY
};
