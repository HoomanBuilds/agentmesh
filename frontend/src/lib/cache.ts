/**
 * Simple in-memory cache for server-side caching
 * Used to reduce redundant Supabase calls in API routes
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get from cache or fetch and cache the result
 * @param key - Cache key
 * @param fetchFn - Function to fetch data if not cached
 * @param ttlMs - Time to live in milliseconds (default: 5 minutes)
 */
export async function getOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key) as CacheEntry<T> | undefined;

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const data = await fetchFn();
  cache.set(key, { data, expiresAt: now + ttlMs });
  return data;
}

/**
 * Invalidate a cache key
 */
export function invalidate(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cache keys matching a prefix
 */
export function invalidatePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear all cache
 */
export function clearAll(): void {
  cache.clear();
}

/**
 * Cache keys for backend
 */
export const backendCacheKeys = {
  activeAgents: "active-agents",
  agent: (id: string) => `agent:${id}`,
};
