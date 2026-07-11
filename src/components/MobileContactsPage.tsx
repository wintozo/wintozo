import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getUserBadge } from "../lib/badges";
import Avatar from "./Avatar";
import MobileBottomNav from "./MobileBottomNav";

type User = {
  username: string;
  avatar: string;
  avatar_url: string | null;
  status: string;
};

export default function MobileContactsPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("W");
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const presenceRef = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("wintozo_username");
    const savedAvatar = localStorage.getItem("wintozo_avatar");
    if (!saved) {
      navigate("/test/registration");
      return;
    }
    setUsername(saved);
    setAvatar(savedAvatar || "W");

    // Загружаем пользователей с обработкой ошибок
    supabase
      .from("wintozo_users")
      .select("username, avatar, avatar_url, status")
      .neq("username", saved)
      .order("username", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Contacts load error:", error);
        }
        if (data) setUsers(data as User[]);
      });

    // Presence отдельно
    const ch = supabase.channel("presence_wintozo");
    presenceRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState();
        const online: string[] = [];
        Object.values(state).forEach((arr: any) => {
          arr.forEach((item: any) => {
            if (item.username) online.push(item.username);
          });
        });
        setOnlineUsers(online);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ username: saved });
        }
      });

    return () => {
      if (presenceRef.current) supabase.removeChannel(presenceRef.current);
    };
  }, []);

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex flex-col transition-colors">
      {/* Шапка */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 text-white sticky top-0 z-30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Avatar avatarUrl={localStorage.getItem("wintozo_avatar_url")} avatarLetter={avatar} size="sm" className="bg-white/20 ring-2 ring-white/20" />
            <p className="font-black text-lg">{username}</p>
          </div>
          <span className="text-blue-100 text-sm">{users.length} контактов</span>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск контактов..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/90 text-gray-800 text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Список контактов */}
      <div className="flex-1 overflow-y-auto pb-20">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-blue-400">
            <Users className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Нет контактов</p>
          </div>
        ) : (
          filteredUsers.map((u) => (
            <button
              key={u.username}
              onClick={() => navigate(`/mobile/test/chat/${u.username}`)}
              className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors border-b border-blue-100 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <div className="relative shrink-0">
                <Avatar avatarUrl={u.avatar_url} avatarLetter={u.avatar} size="lg" />
                {onlineUsers.includes(u.username) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                )}
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-gray-800 dark:text-gray-100">{u.username}</p>
                  {(() => { const b = getUserBadge(u.username); return b ? (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${b.color}`}>{b.text}</span>
                  ) : null; })()}
                </div>
                <p className="text-xs text-gray-400">
                  {onlineUsers.includes(u.username) ? "В сети" : "Не в сети"}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
