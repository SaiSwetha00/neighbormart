import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

let redis: Redis | null = null;

try {
  redis = new Redis(config.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
  });

  redis.on('error', (err) => logger.warn(`Redis error (non-fatal): ${err.message}`));
  redis.on('connect', () => logger.info('Redis connected'));

  redis.connect().catch(() => {
    logger.warn('Redis unavailable — caching disabled. App continues without cache.');
    redis = null;
  });
} catch {
  logger.warn('Redis client failed to initialize — caching disabled.');
  redis = null;
}

export { redis };

export async function cache<T>(key: string, fn: () => Promise<T>, ttlSeconds = 60): Promise<T> {
  if (!redis) return fn();
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
    const value = await fn();
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
    return value;
  } catch {
    return fn();
  }
}

export async function invalidate(pattern: string) {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch { /* non-fatal */ }
}
