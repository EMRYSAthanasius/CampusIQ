import { Redis } from '@upstash/redis';

type RateLimitRecord = {
  count: number;
  resetTime: number;
};

const rateLimitMap = new Map<string, RateLimitRecord>();

// Periodically clean up expired entries to prevent memory leaks in the fallback
if (typeof global !== 'undefined') {
  const globalRef = global as unknown as { __rateLimitCleanupInterval?: NodeJS.Timeout };
  if (!globalRef.__rateLimitCleanupInterval) {
    globalRef.__rateLimitCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of rateLimitMap.entries()) {
        if (now > value.resetTime) {
          rateLimitMap.delete(key);
        }
      }
    }, 60000); // clean every minute
  }
}

let redis: Redis | null = null;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

if (redisUrl && redisToken) {
  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  } catch (e) {
    console.error('Failed to initialize Redis client:', e);
  }
}

export async function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const now = Date.now();
  const resetTime = now + windowMs;

  if (redis) {
    try {
      const key = `ratelimit:${identifier}`;
      const currentCount = await redis.incr(key);
      if (currentCount === 1) {
        await redis.pexpire(key, windowMs);
      }
      return {
        success: currentCount <= limit,
        remaining: Math.max(0, limit - currentCount),
        reset: resetTime,
      };
    } catch (e) {
      console.error('Redis rate limit error, falling back to memory:', e);
    }
  }

  // Fallback to in-memory
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return { success: true, remaining: limit - 1, reset: resetTime };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, reset: record.resetTime };
  }

  record.count += 1;
  return { success: true, remaining: limit - record.count, reset: record.resetTime };
}
