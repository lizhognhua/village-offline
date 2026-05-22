// 速率限制（内存方案，容器重启后重置）
const ipHits = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of ipHits) {
    if (now > v.resetAt) ipHits.delete(k);
  }
}, 300000);

export function rateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  const entry = ipHits.get(key);
  if (!entry || now > entry.resetAt) {
    ipHits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export function getClientIP(req) {
  return (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown');
}

export const RATE_LIMIT_PRESETS = {
  AUTH: { max: 5, window: 60000 },
  REGISTER: { max: 3, window: 60000 },
  API: { max: 100, window: 60000 },
};
