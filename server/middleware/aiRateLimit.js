export function createAiRateLimit(options = {}) {
  const buckets = new Map();
  const limit = Number(options.limit || process.env.AI_DAILY_REQUEST_LIMIT_PER_USER || 3);
  const windowMs = 24 * 60 * 60 * 1000;

  return function aiRateLimit(req, res, next) {
    const key = String(req.headers['x-forwarded-for'] || req.ip || 'unknown').split(',')[0].trim();
    const now = Date.now();
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;
    if (bucket.count >= limit) {
      return res.status(429).json({
        error: 'Daily AI plan limit reached. Please try again tomorrow.',
      });
    }
    bucket.count += 1;
    buckets.set(key, bucket);
    return next();
  };
}
