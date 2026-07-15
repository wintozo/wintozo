/**
 * Кэширование для оптимизации бесплатного плана Supabase
 * - localStorage кэш с TTL (время жизни)
 * - Избегает лишних запросов к БД
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 минут
const USERS_CACHE_TTL = 10 * 60 * 1000; // 10 минут

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getCache<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(`cache_${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T, ttl: number = CACHE_TTL): void {
  try {
    localStorage.setItem(
      `cache_${key}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // localStorage full — удаляем старые кэши
    cleanupCache();
  }
}

function cleanupCache(): void {
  const keys = Object.keys(localStorage);
  const cacheKeys = keys.filter(k => k.startsWith('cache_'));
  // Удаляем старые кэши
  cacheKeys.forEach(key => {
    const entry = getCache(key.replace('cache_', ''));
    if (entry && Date.now() - entry.timestamp > 15 * 60 * 1000) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Запрос с кэшированием
 * - Если кэш свежий — возвращает данные без запроса
 * - Если кэш устарел — делает запрос и обновляет кэш
 */
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CACHE_TTL
): Promise<T> {
  const cached = getCache<T>(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await fetchFn();
  setCache(key, data, ttl);
  return data;
}

/**
 * Простой debounce для поиска
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms: number = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
