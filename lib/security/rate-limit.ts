/**
 * lib/security/rate-limit.ts
 * 
 * Basic in-memory rate limiter.
 * NOTE: For serverless deployments on Vercel with multiple edge instances, 
 * an in-memory Map is insufficient for strict global rate limiting. 
 * Replace with @upstash/ratelimit or Redis for production.
 */

interface RateLimitTracker {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitTracker>();

export function rateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || record.resetTime < now) {
    // New or expired window
    store.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return true; // Allowed
  }

  if (record.count >= limit) {
    return false; // Rate limited
  }

  // Increment count
  record.count += 1;
  store.set(identifier, record);
  return true; // Allowed
}
