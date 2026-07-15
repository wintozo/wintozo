// Simple cache implementation
const cache = new Map<string, { data: any; timestamp: number }>();

export function cachedQuery<T>(
  key: string,
  query: () => Promise<T>,
  ttl: number
): Promise<{ data: T | null; error: any }> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return Promise.resolve({ data: cached.data as T, error: null });
  }

  return query()
    .then((data) => {
      cache.set(key, { data, timestamp: Date.now() });
      return { data, error: null };
    })
    .catch((error) => {
      return { data: null, error };
    });
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
