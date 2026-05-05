import redis from "../config/redis.config";


type CacheModule = "user" | "auth" | "rate" | "session";

type CacheKey = string & { readonly __brand: "CacheKey" };

// format: "module:subtype:id"
export const createCacheKey = (
  module: CacheModule,
  subtype: string,
  id: string
): CacheKey => {
  return `${module}:${subtype}:${id}` as CacheKey;
};


// Set with expiry (seconds)
export const setCache = async (
  key: CacheKey,
  value: unknown,
  ttlSeconds: number = 3600
): Promise<void> => {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
};

// Get and auto-parse
export const getCache = async <T>(key: CacheKey): Promise<T | null> => {
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
};

// Delete
export const deleteCache = async (key: CacheKey): Promise<void> => {
  await redis.del(key);
};

// Delete multiple keys by pattern e.g. "users:*"
export const deleteCacheByPattern = async (pattern: string): Promise<void> => {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(...keys);
};