import { useState, useEffect } from "react";
import { X, Shield, Ban } from "lucide-react";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";
import { getUserBadge } from "../lib/badges";

type Props = {
  username: string;
  onClose: () => void;
};

type UserData = {
  username: string;
  avatar: string;
  avatar_url: string | null;
  description: string | null;
  created_at: string;
};

export default function UserProfileModal({ username, onClose }: Props) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("wintozo_users")
      .select("username, avatar, avatar_url, description, created_at")
      .eq("username", username)
      .single()
      .then(({ data }) => {
        setUser(data as UserData);
        setLoading(false);
      });
  }, [username]);

  const badge = getUserBadge(username);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 flex flex-col items-center relative">
          <button onClick={onClose} className="absolute top-3 right-3 p-2 hover:bg-white/20 rounded-xl transition-colors text-white">
            <X className="w-5 h-5" />
          </button>
          {loading ? (
            <div className="w-20 h-20 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Avatar avatarUrl={user?.avatar_url} avatarLetter={user?.avatar || username.charAt(0)} size="xl" className="ring-4 ring-white/30" />
          )}
        </div>

        {/* Контент */}
        <div className="p-6 flex flex-col items-center">
          {loading ? (
            <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-black text-gray-800 dark:text-gray-100">{username}</h2>
                {badge && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
                    {badge.text}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 text-center mb-4">
                {user?.description || "Нет описания"}
              </p>
              {user?.created_at && (
                <p className="text-xs text-gray-400">
                  В Wintozo с {new Date(user.created_at).toLocaleDateString("ru-RU")}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
