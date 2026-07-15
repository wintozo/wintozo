import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MessageCircle, Star, Terminal, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";
import MobileBottomNav from "./MobileBottomNav";
import ReleaseBanner from "./ReleaseBanner";
import AdminTerminal from "./AdminTerminal";

type ChatUser = {
  username: string;
  avatar: string;
  avatar_url: string | null;
  last_message: string | null;
  last_time: string | null;
};

function formatLastTime(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export default function AdminMobileChatsPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("W");
  const [chats, setChats] = useState<ChatUser[]>([]);
  const [favLastMsg, setFavLastMsg] = useState<string | null>(null);
  const [favLastTime, setFavLastTime] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showTerminal, setShowTerminal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("wintozo_username");
    const savedAvatar = localStorage.getItem("wintozo_avatar");
    if (!saved || saved !== "Admin") {
      navigate("/admin/registration");
      return;
    }
    setUsername(saved);
    setAvatar(savedAvatar || "A");
    loadChats(saved);
  }, []);

  const loadChats = async (current: string) => {
    const { data: messages } = await supabase
      .from("wintozo_messages")
      .select("*")
      .or(`from_user.eq.${current},to_user.eq.${current}`)
      .order("created_at", { ascending: false });

    if (!messages || messages.length === 0) {
      return;
    }

    const chatMap = new Map<string, { last_message: string | null; last_time: string }>();
    for (const msg of messages) {
      if (msg.from_user === current && msg.to_user === current) {
        if (!favLastTime || new Date(msg.created_at) > new Date(favLastTime)) {
          setFavLastMsg(msg.text);
          setFavLastTime(msg.created_at);
        }
        continue;
      }
      const otherUser = msg.from_user === current ? msg.to_user : msg.from_user;
      if (!chatMap.has(otherUser)) {
        chatMap.set(otherUser, {
          last_message: msg.text,
          last_time: msg.created_at,
        });
      }
    }

    const usernames = Array.from(chatMap.keys());
    const { data: users } = await supabase
      .from("wintozo_users")
      .select("username, avatar, avatar_url")
      .in("username", usernames);

    const result: ChatUser[] = usernames.map((uname) => {
      const userInfo = (users as any[])?.find((u) => u.username === uname);
      const chatInfo = chatMap.get(uname)!;
      return {
        username: uname,
        avatar: userInfo?.avatar || "W",
        avatar_url: userInfo?.avatar_url || null,
        last_message: chatInfo.last_message,
        last_time: chatInfo.last_time,
      };
    });

    result.sort((a, b) => {
      const aTime = chatMap.get(a.username)!.last_time;
      const bTime = chatMap.get(b.username)!.last_time;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setChats(result);
  };

  const filteredChats = chats.filter((c) =>
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleLogout = () => {
    localStorage.removeItem("wintozo_username");
    localStorage.removeItem("wintozo_avatar");
    localStorage.removeItem("wintozo_avatar_url");
    localStorage.removeItem("wintozo_description");
    localStorage.removeItem("wintozo_device");
    localStorage.removeItem("wintozo_is_admin");
    navigate("/admin/registration");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex flex-col transition-colors">
      <ReleaseBanner />
      {/* Шапка */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-4 text-white sticky top-0 z-30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Avatar avatarUrl={localStorage.getItem("wintozo_avatar_url")} avatarLetter={avatar} size="sm" className="bg-white/20 ring-2 ring-white/20" />
            <p className="font-black text-lg">{username}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTerminal(true)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              title="Терминал"
            >
              <Terminal className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              title="Выйти"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск чатов..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/90 text-gray-800 text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto pb-20">
        {!search && (
          <button
            onClick={() => navigate(`/admin/mobile/chat/${username}`)}
            className="w-full flex items-center gap-3 p-3 hover:bg-purple-50 dark:hover:bg-gray-800 transition-colors border-b border-purple-100 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
              <Star className="w-6 h-6 text-white" fill="white" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-bold text-gray-800 dark:text-gray-100">Избранное</p>
              <p className="text-xs text-gray-400 truncate">
                {favLastMsg || "Сохраняйте сообщения здесь"}
              </p>
            </div>
            {favLastTime && (
              <span className="text-xs text-gray-400 shrink-0">
                {formatLastTime(favLastTime)}
              </span>
            )}
          </button>
        )}

        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-purple-400">
            <MessageCircle className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Нет чатов</p>
            <p className="text-sm">Откройте контакты и начните общение</p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <button
              key={chat.username}
              onClick={() => navigate(`/admin/mobile/chat/${chat.username}`)}
              className="w-full flex items-center gap-3 p-3 hover:bg-purple-50 dark:hover:bg-gray-800 transition-colors border-b border-purple-100 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <Avatar avatarUrl={chat.avatar_url} avatarLetter={chat.avatar} size="lg" />
              <div className="text-left flex-1 min-w-0">
                <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{chat.username}</p>
                <p className="text-xs text-gray-400 truncate">
                  {chat.last_message || "..."}
                </p>
              </div>
              {chat.last_time && (
                <span className="text-xs text-gray-400 shrink-0">
                  {formatLastTime(chat.last_time)}
                </span>
              )}
            </button>
          ))
        )}
      </div>

      <MobileBottomNav />
      {showTerminal && <AdminTerminal onClose={() => setShowTerminal(false)} />}
    </div>
  );
}
