/**
 * ОПТИМИЗАЦИИ ДЛЯ БЕСПЛАТНОГО ПЛАНА SUPABASE
 * 
 * Бесплатный план имеет ограничения:
 * - 500MB базы данных
 * - 1GB bandwidth/month
 * - 500MB disk
 * - 1GB/month real-time messages
 * - 10k daily active users
 * - 1GB/month API requests
 */

import { supabase } from "./supabase";

/**
 * 1. ОПТИМИЗАЦИЯ ЗАПРОСОВ — выбирать только нужные поля
 * Вместо select("*") использовать конкретные поля
 */

// Оптимизированный запрос пользователей
export const getMinimalUsers = async (excludeUser?: string) => {
  const query = supabase
    .from("wintozo_users")
    .select("username, avatar, avatar_url");
    
  if (excludeUser) {
    query.neq("username", excludeUser);
  }
  
  return query;
};

// Оптимизированный запрос сообщений с лимитом
export const getLimitedMessages = async (
  user1: string,
  user2: string,
  limit: number = 100
) => {
  return supabase
    .from("wintozo_messages")
    .select("id, from_user, to_user, text, created_at")
    .or(`and(from_user.eq.${user1},to_user.eq.${user2}),and(from_user.eq.${user2},to_user.eq.${user1}))`)
    .order("created_at", { ascending: false })
    .limit(limit);
};

// Оптимизированный запрос чатов (только последние сообщения)
export const getLastMessages = async (user: string, limit: number = 200) => {
  return supabase
    .from("wintozo_messages")
    .select("from_user, to_user, text, created_at")
    .or(`from_user.eq.${user},to_user.eq.${user}`)
    .order("created_at", { ascending: false })
    .limit(limit);
};

/**
 * 2. ОПТИМИЗАЦИЯ REAL-TIME — не подписываться на всё подряд
 */

// Подписка только на новые сообщения (не обновления/удаления)
export const subscribeToNewMessages = (callback: (payload: any) => void) => {
  const channel = supabase
    .channel('messages_insert_only')
    .on("postgres_changes", {
      event: "INSERT", // ТОЛЬКО вставки!
      schema: "public",
      table: "wintozo_messages",
    }, callback)
    .subscribe();

  return channel;
};

// Подписка на онлайн статус (только sync event)
export const subscribeToPresence = (callback: () => void) => {
  const channel = supabase
    .channel("presence_optimized")
    .on("presence", { event: "sync" }, callback)
    .subscribe();

  return channel;
};

/**
 * 3. ОПТИМИЗАЦИЯ ОБРАБОТКИ ДАННЫХ
 */

// Дедупликация сообщений (убираем дубликаты)
export const deduplicateMessages = <T extends { id: number }>(messages: T[]): T[] => {
  const seen = new Set<number>();
  return messages.filter(msg => {
    if (seen.has(msg.id)) return false;
    seen.add(msg.id);
    return true;
  });
};

// Группировка сообщений по пользователям
export const groupMessagesByUser = <T extends { from_user: string; to_user: string }>(
  messages: T[],
  currentUser: string
): Map<string, T[]> => {
  const grouped = new Map<string, T[]>();
  
  messages.forEach(msg => {
    const otherUser = msg.from_user === currentUser ? msg.to_user : msg.from_user;
    if (!grouped.has(otherUser)) {
      grouped.set(otherUser, []);
    }
    grouped.get(otherUser)!.push(msg);
  });

  return grouped;
};

/**
 * 4. ОПТИМИЗАЦИЯ ХРАНИЛИЩА
 */

// Сжатие изображения перед загрузкой
export const compressImage = async (
  file: File,
  maxWidth: number = 800,
  quality: number = 0.7
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Масштабирование
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(blob || file),
          "image/jpeg",
          quality
        );
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
  });
};

// Оптимизация аватара (ещё больше сжатие)
export const compressAvatar = async (file: File): Promise<Blob> => {
  return compressImage(file, 200, 0.6);
};

/**
 * 5. ОПТИМИЗАЦИЯ ПОИСКА
 */

// Debounce для поиска (уменьшает количество запросов)
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Фильтрация на клиенте (если данные уже загружены)
export const filterUsers = (
  users: any[],
  search: string
) => {
  if (!search.trim()) return users;
  const lowerSearch = search.toLowerCase();
  return users.filter(user =>
    user.username.toLowerCase().includes(lowerSearch)
  );
};

/**
 * 6. ОПТИМИЗАЦИЯ КАЧЕСТВА ДАННЫХ
 */

// Удаление старых кэшей из localStorage
export const cleanupLocalStorage = () => {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('cache_')) {
      try {
        const entry = JSON.parse(localStorage.getItem(key) || '');
        if (entry.timestamp && Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  });
};

// Очистка кэша запросов
export const clearQueryCache = () => {
  // Очищаем старые кэши из localStorage
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('cache_')) {
      try {
        const entry = JSON.parse(localStorage.getItem(key) || '');
        if (entry.timestamp && Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  });
};

/**
 * 7. ОПТИМИЗАЦИЯ ЗАГРУЗКИ
 */

// Ленивая загрузка (pagination)
export const loadWithPagination = async <T>(
  table: string,
  page: number = 0,
  pageSize: number = 50
): Promise<{ data: T[]; hasMore: boolean }> => {
  const { data, error } = await supabase
    .from(table)
    .select("*", { count: 'exact' })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) throw error;

  return {
    data: data || [],
    hasMore: (data?.length || 0) === pageSize
  };
};

// Prefetch данных (предзагрузка в кэш)
export const prefetchData = async (key: string, fetchFn: () => Promise<any>) => {
  try {
    await fetchFn();
  } catch {
    // Игнорируем ошибки prefetch
  }
};
