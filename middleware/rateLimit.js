const store = new Map();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function pruneStore(windowMs) {
  const now = Date.now();
  const cutoff = now - windowMs;

  for (const [key, timestamps] of store.entries()) {
    const filtered = timestamps.filter((ts) => ts > cutoff);
    if (filtered.length === 0) {
      store.delete(key);
    } else {
      store.set(key, filtered);
    }
  }
}

setInterval(() => {
  pruneStore(60_000);
}, CLEANUP_INTERVAL_MS);

function createRateLimiter({ windowMs, max, keyFn }) {
  return (req, res, next) => {
    const key = keyFn(req);
    if (!key) {
      return next();
    }

    const now = Date.now();
    const cutoff = now - windowMs;
    const timestamps = (store.get(key) || []).filter((ts) => ts > cutoff);

    if (timestamps.length >= max) {
      return res.status(429).json({
        error: 'Слишком много сообщений. Подождите минуту.'
      });
    }

    timestamps.push(now);
    store.set(key, timestamps);
    return next();
  };
}

module.exports = {
  createRateLimiter
};
