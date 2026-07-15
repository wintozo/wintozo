import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, LogOut, Search, MessageCircleIcon, Users, Settings,
  Bell, Moon, Shield, Info, ChevronRight, Camera, Check, X, Star, Mic, Trash2, Image as ImageIcon, Users2, Plus, Zap, Crown, MessageSquare, Phone, PhoneOff, Palette, AlertTriangle, Terminal,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";
import { getUserBadge } from "../lib/badges";
import UserProfileModal from "./UserProfileModal";
import { getProStatus, updateMessageColor, contactAdmin } from "../lib/pro";
import type { ProStatus } from "../lib/pro";
import { useDarkMode } from "../hooks/useDarkMode";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { requestNotificationPermission, showNotification } from "../lib/notifications";
import VoicePlayer from "./VoicePlayer";
import AdminPanel from "./AdminPanel";
import CallModal from "./CallModal";
import { useCallStore } from "../store/useCallStore";
import { cachedQuery, debounce } from "../lib/supabase-cache";

type Message = {
  id: number;
  from_user: string;
  to_user: string;
  text: string | null;
  audio_url: string | null;
  image_url: string | null;
  created_at: string;
};

type User = {
  username: string;
  avatar: string;
  avatar_url: string | null;
  description: string | null;
  status: string;
};

type ChatPreview = {
  username: string;
  avatar: string;
  avatar_url: string | null;
  last_message: string | null;
  last_time: string | null;
};

type Tab = "chats" | "contacts" | "chat" | "settings";

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatLastTime(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export default function DevChatPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("T");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [editDesc, setEditDesc] = useState(false);
  const [descInput, setDescInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [pcGroups, setPcGroups] = useState<{ id: number; name: string; avatar_url: string | null }[]>([]);
  const [tab, setTab] = useState<Tab>("chats");
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [search, setSearch] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [proStatus, setProStatus] = useState<ProStatus>({ active: false });
  const [messageColor, setMessageColor] = useState("");
  const [adminContacts, setAdminContacts] = useState(2);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showWarnBanner, setShowWarnBanner] = useState(false);
  const [warnReason, setWarnReason] = useState("");
  const [warnBy, setWarnBy] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);
  const presenceRef = useRef<any>(null);
  const messageIdsRef = useRef<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const { darkMode, toggle } = useDarkMode();
  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();
  const { callTarget, showCallModal, openCall, closeCall } = useCallStore();

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

  // Загрузка данных пользователя
  useEffect(() => {
    const devUser = localStorage.getItem("dev_username");
    if (!devUser) {
      navigate("/dev/registration");
      return;
    }
    setUsername(devUser);
    setAvatar(localStorage.getItem("dev_avatar") || devUser[0].toUpperCase());
    setAvatarUrl(localStorage.getItem("dev_avatar_url") || null);
    setDescription(localStorage.getItem("dev_description") || "");
    loadProSettings(devUser).catch(() => {});
    loadAllContacts(devUser);
    loadChats(devUser);
    loadWarns(devUser);
    setLoading(false);
  }, [navigate]);

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

  const loadProSettings = async (user: string) => {
    const status = await getProStatus(user);
    setProStatus(status);
    setMessageColor(status.message_color || "");
    setAdminContacts(status.admin_contacts || 2);
  };

  // Загрузка всех контактов
  const loadAllContacts = async (user: string) => {
    const { data } = await supabase
      .from("wintozo_users")
      .select("username, avatar, avatar_url, description, status")
      .neq("username", user);
    if (data) {
      setUsers(data);
    }
  };

  // Проверка: кто в DEV режиме
  const isDevUser = (username: string): boolean => {
    return localStorage.getItem("dev_username") === username;
  };

  // Проверка: админ в DEV режиме
  const isAdminDev = username === "TestAdmin33";
  
  console.log("DevChatPage isAdminDev:", { username, isAdminDev });

  // Загрузка чатов
  const loadChats = async (user: string) => {
    const { data } = await supabase
      .from("wintozo_messages")
      .select("*")
      .or(`from_user.eq.${user},to_user.eq.${user}`)
      .order("created_at", { ascending: false });

    if (data) {
      const chatMap = new Map<string, Message[]>();
      data.forEach((msg) => {
        const otherUser = msg.from_user === user ? msg.to_user : msg.from_user;
        if (!chatMap.has(otherUser)) chatMap.set(otherUser, []);
        chatMap.get(otherUser)!.push(msg);
      });

      const preview: ChatPreview[] = [];
      chatMap.forEach((msgs, username) => {
        const lastMsg = msgs[0];
        preview.push({
          username,
          avatar: username[0].toUpperCase(),
          avatar_url: null,
          last_message: lastMsg.text || (lastMsg.audio_url ? "🎤 Голосовое" : "📷 Фото"),
          last_time: lastMsg.created_at,
        });
      });

      preview.sort((a, b) => new Date(b.last_time!).getTime() - new Date(a.last_time!).getTime());
      setChats(preview);

      // Подписка на новые сообщения
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
      subscriptionRef.current = supabase.channel("dev_all_messages_global").on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wintozo_messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.from_user === user || newMsg.to_user === user) {
            setMessages((prev) => [...prev, newMsg]);
            setChats((prev) => {
              const updated = prev.filter((c) => c.username !== newMsg.from_user && c.username !== newMsg.to_user);
              const otherUser = newMsg.from_user === user ? newMsg.to_user : newMsg.from_user;
              const exist = updated.find((c) => c.username === otherUser);
              if (exist) {
                return updated.map((c) =>
                  c.username === otherUser
                    ? { ...c, last_message: newMsg.text || "🎤 Голосовое", last_time: newMsg.created_at }
                    : c
                );
              }
              return [
                {
                  username: otherUser,
                  avatar: otherUser[0].toUpperCase(),
                  avatar_url: null,
                  last_message: newMsg.text || "🎤 Голосовое",
                  last_time: newMsg.created_at,
                },
                ...updated,
              ];
            });
            if (newMsg.from_user !== user) {
              showNotification(`Сообщение от ${newMsg.from_user}`, newMsg.text || "📷 Фото");
            }
          }
        }
      ).subscribe();
    }
    setLoading(false);
  };

  // Загрузка сообщений с конкретным пользователем
  const loadConversation = async (user: string, contact: string) => {
    const { data } = await supabase
      .from("wintozo_messages")
      .select("*")
      .or(`and(from_user.eq.${user},to_user.eq.${contact}),and(from_user.eq.${contact},to_user.eq.${user})`)
      .order("created_at", { ascending: true });

    if (data) {
      const validMsgs = data.filter(
        (msg: Message) => msg.from_user && msg.to_user && msg.from_user !== msg.to_user
      );
      setMessages(validMsgs);
      messageIdsRef.current = new Set(validMsgs.map((m: Message) => m.id));
      setSelectedUser({
        username: contact,
        avatar: contact[0].toUpperCase(),
        avatar_url: null,
        description: "",
        status: "online",
      });
    }
  };

  // Отправка сообщения
  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUser || !username) return;

    const { data, error } = await supabase.from("wintozo_messages").insert({
      from_user: username,
      to_user: selectedUser.username,
      text: inputText.trim(),
      created_at: new Date().toISOString(),
    }).select();

    if (data && !error) {
      setMessages((prev) => [...prev, data[0]]);
      setInputText("");
      requestNotificationPermission();
    }
  };

  // Отправка голосового
  const handleSendVoice = async () => {
    if (sendingVoice || !selectedUser || !username) return;
    setSendingVoice(true);
    const audioBlob = await stopRecording();
    if (!audioBlob) return;

    const fileName = `dev_voice_${Date.now()}.webm`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("wintozo_files")
      .upload(`dev_voice/${fileName}`, audioBlob);

    if (!uploadError && uploadData) {
      const { data: urlData } = supabase.storage.from("wintozo_files").getPublicUrl(uploadData.path);
      await supabase.from("wintozo_messages").insert({
        from_user: username,
        to_user: selectedUser.username,
        audio_url: urlData.publicUrl,
        created_at: new Date().toISOString(),
      });
    }
    setSendingVoice(false);
  };

  // Удаление сообщения (для тестеров — можно удалять чужие)
  const handleDeleteMessage = async (id: number) => {
    await supabase.from("wintozo_messages").delete().eq("id", id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  // Очистка чата (специальная функция для тестеров)
  const clearChat = async () => {
    if (!selectedUser || !username) return;
    await supabase
      .from("wintozo_messages")
      .delete()
      .or(`and(from_user.eq.${username},to_user.eq.${selectedUser.username}),and(from_user.eq.${selectedUser.username},to_user.eq.${username})`);
    setMessages([]);
  };

  // Подсветка последних сообщений
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 to-purple-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Боковая панель
  if (tab !== "chat" || !selectedUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-blue-900 flex">
        {/* Sidebar */}
        <div className="w-80 bg-black/30 backdrop-blur-lg border-r border-white/10 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-white">DEV MODE</p>
                  <p className="text-purple-300 text-xs">{username}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("dev_logged_in");
                  localStorage.removeItem("dev_username");
                  navigate("/registration");
                }}
                className="p-2 text-purple-300 hover:text-white"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
            {/* 2 часа до очистки */}
          <div className="bg-yellow-500/20 border border-yellow-400/40 rounded-2xl px-3 py-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
              <span className="text-yellow-200 text-xs">Авто-очистка через {formatTimeLeft()}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {(["chats", "contacts", "settings"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 p-3 text-sm font-medium ${
                  tab === t ? "text-white border-b-2 border-red-500" : "text-purple-300"
                }`}
              >
                {t === "chats" ? "Чаты" : t === "contacts" ? "Контакты" : "Настройки"}
              </button>
            ))}
          </div>

          {/* Chats list */}
          {tab === "chats" && (
            <div className="flex-1 overflow-y-auto">
              {chats.map((chat) => (
                <button
                  key={chat.username}
                  onClick={() => {
                    setTab("chat");
                    loadConversation(username, chat.username);
                  }}
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
                    <p className="text-xs text-purple-300 truncate">{chat.last_message}</p>
                  </div>
                </button>
              ))}
              {chats.length === 0 && (
                <div className="p-8 text-center text-purple-300">
                  <MessageCircleIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Нет сообщений</p>
                  <p className="text-xs mt-1">Напишите кому-нибудь!</p>
                </div>
              )}
            </div>
          )}

          {/* Contacts list */}
          {tab === "contacts" && (
            <div className="flex-1 overflow-y-auto">
              {users.map((user) => {
                const devUser = isDevUser(user.username);
                const isAdmin = user.username === "TestAdmin33";
                return (
                  <button
                    key={user.username}
                    onClick={() => {
                      setTab("chat");
                      setSelectedUser(user);
                      loadConversation(username, user.username);
                    }}
                    className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <Avatar avatarUrl={user.avatar_url} avatarLetter={user.avatar} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white text-sm truncate">{user.username}</p>
                        {isAdmin && (
                          <svg className="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-xs text-purple-300">
                        {devUser ? "🟢 DEV" : user.status === "online" ? "🟢 Online" : "⚪ Offline"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-400" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Settings */}
          {tab === "settings" && (
            <div className="p-4 space-y-3">
              <h3 className="text-white font-bold">Настройки DEV</h3>
              {isAdminDev && (
                <button
                  onClick={() => setShowAdmin(true)}
                  className="w-full p-3 bg-blue-500/20 border border-blue-400/40 text-blue-200 rounded-2xl text-sm hover:bg-blue-500/30 flex items-center justify-center gap-2"
                >
                  <Terminal className="w-4 h-4" />
                  Админ консоль
                </button>
              )}
              <button
                onClick={clearChat}
                className="w-full p-3 bg-red-500/20 border border-red-400/40 text-red-200 rounded-2xl text-sm hover:bg-red-500/30"
              >
                🗑 Очистить текущий чат
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("dev_logged_in");
                  localStorage.removeItem("dev_username");
                  navigate("/dev/registration");
                }}
                className="w-full p-3 bg-white/10 border border-white/20 text-white rounded-2xl text-sm hover:bg-white/20"
              >
                🚪 Выйти из DEV режима
              </button>
            </div>
          )}
        </div>

        {/* Main area */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-purple-300">
            <MessageCircleIcon className="w-20 h-20 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-bold">DEV MODE 🧪</p>
            <p className="text-sm mt-2">Выберите чат или контакт</p>
          </div>
        </div>
      </div>
    );
  }

  // Чат с пользователем
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-blue-900 flex">
      {/* Sidebar */}
      <div className="w-80 bg-black/30 backdrop-blur-lg border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-black text-white">DEV MODE</p>
                <p className="text-purple-300 text-xs">{username}</p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("dev_logged_in");
                localStorage.removeItem("dev_username");
                navigate("/registration");
              }}
              className="p-2 text-purple-300 hover:text-white"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-yellow-500/20 border border-yellow-400/40 rounded-xl px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
            <span className="text-yellow-200 text-xs">Авто-очистка через {formatTimeLeft()}</span>
          </div>
        </div>

        <div className="flex border-b border-white/10">
          {(["chats", "contacts", "settings"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 p-3 text-sm font-medium ${
                tab === t ? "text-white border-b-2 border-red-500" : "text-purple-300"
              }`}
            >
              {t === "chats" ? "💬 Чаты" : t === "contacts" ? "👥 Контакты" : "⚙️"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <button
              key={chat.username}
              onClick={() => {
                setTab("chat");
                loadConversation(username, chat.username);
              }}
              className={`w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left ${
                selectedUser?.username === chat.username ? "bg-white/10" : ""
              }`}
            >
              <Avatar avatarUrl={chat.avatar_url} avatarLetter={chat.avatar} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-white text-sm truncate">{chat.username}</p>
                  {chat.last_time && (
                    <span className="text-xs text-purple-300">{formatLastTime(chat.last_time)}</span>
                  )}
                </div>
                <p className="text-xs text-purple-300 truncate">{chat.last_message}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="p-4 bg-black/30 backdrop-blur-lg border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTab("chats")}
              className="p-2 text-purple-300 hover:text-white"
            >
              ←
            </button>
            <Avatar avatarUrl={selectedUser?.avatar_url} avatarLetter={selectedUser?.avatar || "?"} size="md" />
            <div>
              <p className="font-bold text-white">{selectedUser?.username}</p>
              <p className="text-xs text-purple-300">Тестер</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => openCall(selectedUser!.username, 'audio')}
              className="p-2 text-green-400 hover:text-green-300"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              onClick={clearChat}
              className="p-2 text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Плашка предупреждения */}
        {showWarnBanner && (
          <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-red-300 text-sm">
                  ⚠️ Предупреждение от {warnBy}
                </p>
                <p className="text-xs text-red-400 mt-0.5">
                  {warnReason}
                </p>
              </div>
              <button
                onClick={() => setShowWarnBanner(false)}
                className="text-red-400 hover:text-red-300 transition-colors shrink-0"
                title="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((msg) => {
            const isMe = msg.from_user === username;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    isMe
                      ? "bg-gradient-to-r from-red-500 to-purple-600 text-white"
                      : "bg-white/10 text-white"
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className="text-xs opacity-70 mt-1">{formatTime(msg.created_at)}</p>
                  {!isMe && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="text-xs text-red-300 hover:text-red-200 mt-1"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendText} className="p-4 bg-black/30 backdrop-blur-lg border-t border-white/10 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Сообщение для тестера..."
            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="p-2.5 bg-gradient-to-r from-red-500 to-purple-600 text-white rounded-2xl"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

        {/* Modals */}
        {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
        {showCallModal && callTarget && <CallModal currentUsername={username} callTarget={callTarget} onClose={closeCall} />}
      </div>
    </div>
    );
  }
