import rateLimit from 'express-rate-limit';

const json = (code: string, message: string) => ({ error: { code, message } });

export const globalLimiter = rateLimit({
  windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false,
  message: json('RATE_LIMITED', 'Too many requests'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: json('RATE_LIMITED', 'Too many authentication attempts, try again later'),
});

// Keyed by API-key prefix so one noisy agent can't exhaust another's budget.
export const gatewayLimiter = rateLimit({
  windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => (req.get('authorization') ?? '').slice(7, 24) || req.ip || 'anon',
  message: json('RATE_LIMITED', 'Agent rate limit exceeded'),
});
