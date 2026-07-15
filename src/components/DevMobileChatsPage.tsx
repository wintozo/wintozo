import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, MessageCircle, Star, LogOut, Shield, AlertTriangle, X, Settings, Users, Terminal } from "lucide-react";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";
import DevMobileBottomNav from "./DevMobileBottomNav";
import ReleaseBanner from "./ReleaseBanner";

type ChatUser = {
  username: string;
  avatar: string;
  avatar_url: string | null;
  last_message: string | null;
  last_time: string | null;
  is_dev?: boolean;
  status?: string;
};

function formatLastTime(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function formatTimeLeft(): string {
  const now = new Date();
  const hours = now.getHours();
  const nextClear = new Date(now);
  nextClear.setHours(Math.floor((hours + 2) / 2) * 2, 0, 0, 0);
  if (nextClear <= now) nextClear.setHours(nextClear.getHours() + 2);
  
  const diff = nextClear.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}ч ${m}м`;
}

export default function DevMobileChatsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("T");
  const [chats, setChats] = useState<ChatUser[]>([]);
  const [search, setSearch] = useState("");
  const [showWarnBanner, setShowWarnBanner] = useState(false);
  const [warnReason, setWarnReason] = useState("");
  const [warnBy, setWarnBy] = useState("");

  // Определяем активную вкладку из URL
  const getActiveTab = (): "chats" | "contacts" | "settings" => {
    if (location.pathname.includes("/settings")) return "settings";
    if (location.pathname.includes("/contacts")) return "contacts";
    return "chats";
  };

  const [activeTab, setActiveTab] = useState<"chats" | "contacts" | "settings">(getActiveTab());

  useEffect(() => {
    const devUser = localStorage.getItem("dev_username");
    if (!devUser) {
      navigate("/dev/registration");
      return;
    }
    setUsername(devUser);
    setAvatar(localStorage.getItem("dev_avatar") || devUser[0].toUpperCase());
    
    if (activeTab === "chats") loadChats(devUser);
    else if (activeTab === "contacts") loadAllContacts();
    
    loadWarns(devUser);
  }, [navigate, activeTab]);

  // Обновляем activeTab при смене URL
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  const loadWarns = async (current: string) => {
    const { data } = await supabase
      .from("wintozo_warnings")
      .select("reason, warned_by")
      .eq("target_user", current)
      .order("created_at", { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      setWarnReason(data[0].reason || "За нарушение правил");
      setWarnBy(data[0].warned_by || "Admin");
      setShowWarnBanner(true);
    }
  };

  const loadChats = async (current: string) => {
    const { data: messages } = await supabase
      .from("wintozo_messages")
      .select("*")
      .or(`from_user.eq.${current},to_user.eq.${current}`)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!messages || messages.length === 0) {
      return;
    }

    const chatMap = new Map<string, { last_message: string | null; last_time: string }>();
    for (const msg of messages) {
      if (msg.from_user === current && msg.to_user === current) continue;
      
      const otherUser = msg.from_user === current ? msg.to_user : msg.from_user;
      if (!chatMap.has(otherUser) || new Date(msg.created_at) > new Date(chatMap.get(otherUser)!.last_time)) {
        chatMap.set(otherUser, {
          last_message: msg.text || (msg.audio_url ? "🎤 Голосовое" : "📷 Фото"),
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
        avatar: userInfo?.avatar || "T",
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

  const loadAllContacts = async () => {
    const { data } = await supabase
      .from("wintozo_users")
      .select("username, avatar, avatar_url, status")
      .neq("username", username);
    
    if (data) {
      const contacts: ChatUser[] = data.map((u: any) => ({
        username: u.username,
        avatar: u.avatar,
        avatar_url: u.avatar_url,
        last_message: null,
        last_time: null,
        is_dev: localStorage.getItem("dev_username") === u.username,
        status: u.status,
      }));
      setChats(contacts);
    }
  };

  // Проверка: админ в DEV режиме
  const isAdminDev = username === "TestAdmin33";

  const handleLogout = () => {
    localStorage.removeItem("dev_logged_in");
    localStorage.removeItem("dev_username");
    navigate("/registration");
  };

  const filteredChats = chats.filter((chat) =>
    chat.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-blue-900 flex flex-col">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-lg p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-white text-sm">DEV MODE</p>
              <p className="text-purple-300 text-xs">{username}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-purple-300 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        
        {/* Timer */}
        <div className="bg-yellow-500/20 border border-yellow-400/40 rounded-2xl px-3 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="text-yellow-200 text-xs">Авто-очистка через {formatTimeLeft()}</span>
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === "chats" && (
          <div>
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center text-purple-300">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Нет сообщений</p>
                <p className="text-xs mt-1">Напишите кому-нибудь!</p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.username}
                  onClick={() => navigate(`/dev/mobile/chat/${chat.username}`)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                >
                  <Avatar avatarUrl={chat.avatar_url} avatarLetter={chat.avatar} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-white text-sm truncate">{chat.username}</p>
                      {chat.last_time && (
                        <span className="text-xs text-purple-300">{formatLastTime(chat.last_time)}</span>
                      )}
                    </div>
                    <p className="text-xs text-purple-300 truncate">{chat.last_message || "Начните чат"}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === "contacts" && (
          <div>
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center text-purple-300">
                <p>Нет контактов</p>
              </div>
            ) : (
              filteredChats.map((contact) => (
                <button
                  key={contact.username}
                  onClick={() => navigate(`/dev/mobile/chat/${contact.username}`)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                >
                  <Avatar avatarUrl={contact.avatar_url} avatarLetter={contact.avatar} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white text-sm truncate">{contact.username}</p>
                      {contact.username === "TestAdmin33" && (
                        <svg className="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-purple-300">
                      {contact.is_dev ? "🟢 DEV" : contact.status === "online" ? "🟢 Online" : "⚪ Offline"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="p-4 space-y-3">
            <h3 className="text-white font-bold">Настройки DEV</h3>
            {isAdminDev && (
              <button
                onClick={() => alert("Админ консоль открыта!")}
                className="w-full p-3 bg-blue-500/20 border border-blue-400/40 text-blue-200 rounded-2xl text-sm hover:bg-blue-500/30 flex items-center justify-center gap-2"
              >
                <Terminal className="w-4 h-4" />
                Админ консоль
              </button>
            )}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-purple-200 text-sm">
                <strong>🧪 Режим тестировщика</strong>
              </p>
              <p className="text-purple-300 text-xs mt-1">
                Все данные удаляются каждые 2 часа для экономии места на сервере.
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full p-3 bg-white/10 border border-white/20 text-white rounded-2xl text-sm hover:bg-white/20"
            >
              🚪 Выйти из DEV режима
            </button>
          </div>
        )}
      </div>

      {/* Mobile Bottom Nav */}
      <DevMobileBottomNav />
    </div>
  );
}
