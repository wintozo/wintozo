import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, LogOut, Search, MessageCircleIcon, Users, Settings,
  Bell, Moon, Shield, Info, ChevronRight, Camera, Check, X, Star, Mic, Trash2, Image as ImageIcon, Users2, Plus, Zap, Crown, MessageSquare,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";
import { getUserBadge } from "../lib/badges";
import UserProfileModal from "./UserProfileModal";
import AnnouncementBanner from "./AnnouncementBanner";
import { getProStatus, updateMessageColor, contactAdmin } from "../lib/pro";
import type { ProStatus } from "../lib/pro";
import { useDarkMode } from "../hooks/useDarkMode";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { requestNotificationPermission, showNotification } from "../lib/notifications";
import VoicePlayer from "./VoicePlayer";
import AdminPanel from "./AdminPanel";

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

type Tab = "chats" | "contacts" | "groups" | "settings";

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

export default function ChatPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("W");
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);
  const presenceRef = useRef<any>(null);
  const messageIdsRef = useRef<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const { darkMode, toggle } = useDarkMode();
  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();

  useEffect(() => {
    const savedUsername = localStorage.getItem("wintozo_username");
    const savedAvatar = localStorage.getItem("wintozo_avatar");
    const savedAvatarUrl = localStorage.getItem("wintozo_avatar_url");
    const savedDesc = localStorage.getItem("wintozo_description");
    if (!savedUsername) {
      navigate("/test/registration");
      return;
    }
    setUsername(savedUsername);
    setAvatar(savedAvatar || "W");
    setAvatarUrl(savedAvatarUrl || null);
    setDescription(savedDesc || "");
    setDescInput(savedDesc || "");
    requestNotificationPermission();
    loadUsers(savedUsername);
    loadChats(savedUsername);
    loadPcGroups(savedUsername);
    loadProStatus(savedUsername);
    setLoading(false);
  }, []);

  const loadProStatus = async (current: string) => {
    try {
      const pro = await getProStatus(current);
      setProStatus(pro);
      setMessageColor(pro.message_color || "");
      setAdminContacts(pro.admin_contacts || 2);
    } catch {}
  };

  const handleColorChange = async (color: string) => {
    setMessageColor(color);
    setShowColorPicker(false);
    try {
      await updateMessageColor(username, color);
      setProStatus((prev) => ({ ...prev, message_color: color }));
    } catch {}
  };

  const handleContactAdmin = async () => {
    if (!proStatus.active) return;
    try {
      const res = await contactAdmin(username);
      if (res.success) {
        setAdminContacts(res.remaining || 0);
        alert("Сообщение админу отправлено!");
      } else {
        alert("Лимит исчерпан");
      }
    } catch {}
  };

  // Загрузка всех пользователей
  const loadUsers = async (current: string) => {
    const { data, error } = await supabase
      .from("wintozo_users")
      .select("username, avatar, avatar_url, description, status")
      .neq("username", current)
      .order("username", { ascending: true });
    if (error) console.error("loadUsers:", error);
    if (data) setUsers(data);
  };

  const loadPcGroups = async (current: string) => {
    const { data: msgData } = await supabase
      .from("wintozo_group_messages")
      .select("group_id")
      .eq("from_user", current);

    const groupIds = [...new Set((msgData || []).map((m: any) => m.group_id))];
    if (groupIds.length === 0) return;

    const { data: groupsData } = await supabase
      .from("wintozo_groups")
      .select("id, name, avatar_url")
      .in("id", groupIds);
    setPcGroups(groupsData || []);
  };

  const compressImage = (file: File, maxSize: number = 512): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error("Не удалось загрузить изображение"));
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            let { width, height } = img;
            if (width > height) {
              if (width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize; }
            } else {
              if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) { resolve(file); return; }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.85);
          } catch (err) {
            resolve(file);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const fileName = `${username}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("wintozo-avatars")
        .upload(fileName, compressed, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) {
        alert("Ошибка загрузки: " + uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("wintozo-avatars")
        .getPublicUrl(fileName);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("wintozo_users")
        .update({ avatar_url: publicUrl })
        .eq("username", username);

      if (updateError) {
        alert("Ошибка сохранения: " + updateError.message);
        return;
      }

      setAvatarUrl(publicUrl);
      localStorage.setItem("wintozo_avatar_url", publicUrl);
    } catch (err: any) {
      alert("Ошибка: " + (err?.message || "не удалось загрузить фото"));
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const saveDescription = async () => {
    const trimmed = descInput.trim();
    setDescription(trimmed);
    setEditDesc(false);
    localStorage.setItem("wintozo_description", trimmed);

    await supabase
      .from("wintozo_users")
      .update({ description: trimmed })
      .eq("username", username);
  };

  // Загрузка списка чатов (с кем уже общался)
  const loadChats = async (current: string) => {
    const { data: messages } = await supabase
      .from("wintozo_messages")
      .select("*")
      .or(`from_user.eq.${current},to_user.eq.${current}`)
      .order("created_at", { ascending: false });

    if (!messages || messages.length === 0) return;

    const chatMap = new Map<string, { last_message: string | null; last_time: string }>();
    for (const msg of messages) {
      // Skip self-messages (Избранное)
      if (msg.from_user === current && msg.to_user === current) continue;
      const other = msg.from_user === current ? msg.to_user : msg.from_user;
      if (!chatMap.has(other)) {
        chatMap.set(other, { last_message: msg.text, last_time: msg.created_at });
      }
    }

    const usernames = Array.from(chatMap.keys());
    const { data: usersData } = await supabase
      .from("wintozo_users")
      .select("username, avatar, avatar_url")
      .in("username", usernames);

    const result: ChatPreview[] = usernames.map((uname) => {
      const u = usersData?.find((x) => x.username === uname);
      const info = chatMap.get(uname)!;
      return { username: uname, avatar: u?.avatar || "W", avatar_url: u?.avatar_url || null, last_message: info.last_message, last_time: info.last_time };
    });

    result.sort((a, b) => new Date(b.last_time!).getTime() - new Date(a.last_time!).getTime());
    setChats(result);
  };

  // Выбор пользователя — загрузка сообщений
  useEffect(() => {
    if (!selectedUser || !username) return;

    messageIdsRef.current.clear();
    setMessages([]);
    loadMessages();

    if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    const channel = supabase
      .channel(`chat_${[username, selectedUser.username].sort().join("_")}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "wintozo_messages",
      }, (payload) => {
        const msg = payload.new as Message;
        if (
          (msg.from_user === selectedUser.username && msg.to_user === username) ||
          (msg.from_user === username && msg.to_user === selectedUser.username)
        ) {
          if (!messageIdsRef.current.has(msg.id)) {
            messageIdsRef.current.add(msg.id);
            setMessages((prev) => [...prev, msg]);
            // Уведомление если сообщение от собеседника
            if (msg.from_user === selectedUser.username) {
              const body = msg.audio_url ? "Голосовое сообщение" : msg.image_url ? "Фото" : (msg.text || "Новое сообщение");
              showNotification(msg.from_user, body);
            }
          }
        }
      })
      .subscribe();
    subscriptionRef.current = channel;

    // Presence
    if (presenceRef.current) supabase.removeChannel(presenceRef.current);
    const pch = supabase.channel("presence_wintozo");
    presenceRef.current = pch;
    pch
      .on("presence", { event: "sync" }, () => {
        const state = pch.presenceState();
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
          await pch.track({ username });
        }
      });

    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (presenceRef.current) supabase.removeChannel(presenceRef.current);
    };
  }, [selectedUser, username]);

  const loadMessages = async () => {
    if (!selectedUser || !username) return;
    const { data } = await supabase
      .from("wintozo_messages")
      .select("*")
      .or(`and(from_user.eq.${username},to_user.eq.${selectedUser.username}),and(from_user.eq.${selectedUser.username},to_user.eq.${username}))`)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) {
      messageIdsRef.current.clear();
      data.forEach((msg: Message) => messageIdsRef.current.add(msg.id));
      setMessages(data);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUser) return;

    const text = inputText.trim();

    // Команда /admin — только для Admin в Избранном (self-chat)
    if (text === "/admin" && username === "Admin" && selectedUser.username === username) {
      setInputText("");
      setShowAdmin(true);
      return;
    }

    setInputText("");

    const { data } = await supabase.from("wintozo_messages").insert({
      from_user: username,
      to_user: selectedUser.username,
      text,
      created_at: new Date().toISOString(),
    }).select().single();

    if (data) {
      if (!messageIdsRef.current.has(data.id)) {
        messageIdsRef.current.add(data.id);
        setMessages((prev) => [...prev, data]);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("wintozo_username");
    localStorage.removeItem("wintozo_avatar");
    localStorage.removeItem("wintozo_avatar_url");
    localStorage.removeItem("wintozo_description");
    localStorage.removeItem("wintozo_device");
    navigate("/test/registration");
  };

  const openChat = (u: User | ChatPreview) => {
    const user: User = {
      username: u.username,
      avatar: u.avatar,
      avatar_url: "avatar_url" in u ? u.avatar_url : null,
      description: "description" in u ? u.description : null,
      status: "offline",
    };
    setSelectedUser(user);
    setTab("chats");
  };

  const handleSendVoice = async () => {
    const blob = await stopRecording();
    if (!blob || !selectedUser) return;

    setSendingVoice(true);
    try {
      const fileName = `voice_${username}_${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("wintozo-voice")
        .upload(fileName, blob, { contentType: "audio/webm" });

      if (uploadError) {
        alert("Ошибка загрузки голоса: " + uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("wintozo-voice")
        .getPublicUrl(fileName);

      const { data } = await supabase.from("wintozo_messages").insert({
        from_user: username,
        to_user: selectedUser.username,
        audio_url: urlData.publicUrl,
        created_at: new Date().toISOString(),
      }).select().single();

      if (data) {
        if (!messageIdsRef.current.has(data.id)) {
          messageIdsRef.current.add(data.id);
          setMessages((prev) => [...prev, data]);
        }
      }
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    } finally {
      setSendingVoice(false);
    }
  };

  const handleSendImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;

    setSendingImage(true);
    try {
      const fileName = `photo_${username}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("wintozo-photos")
        .upload(fileName, file, { upsert: true, contentType: file.type || "image/jpeg" });

      if (uploadError) { alert("Ошибка загрузки: " + uploadError.message); return; }

      const { data: urlData } = supabase.storage.from("wintozo-photos").getPublicUrl(fileName);

      const { data, error: insertError } = await supabase.from("wintozo_messages").insert({
        from_user: username,
        to_user: selectedUser.username,
        text: null,
        image_url: urlData.publicUrl,
        created_at: new Date().toISOString(),
      }).select().single();

      if (insertError) { alert("Ошибка БД: " + insertError.message); return; }

      if (data && !messageIdsRef.current.has(data.id)) {
        messageIdsRef.current.add(data.id);
        setMessages((prev) => [...prev, data]);
      }
    } catch (err: any) {
      alert("Ошибка: " + (err?.message || "не удалось отправить фото"));
    } finally {
      setSendingImage(false);
      if (e.target) e.target.value = "";
    }
  };

  const filteredChats = chats.filter((c) =>
    c.username.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  // Удалить чат из списка
  const removeChat = (chatUsername: string) => {
    setChats((prev) => prev.filter((c) => c.username !== chatUsername));
    if (selectedUser?.username === chatUsername) {
      setSelectedUser(null);
      setMessages([]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center transition-colors">
        <div className="w-16 h-16 border-4 border-blue-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex transition-colors">
      {/* Боковая панель */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r-2 border-blue-200 dark:border-gray-700 flex flex-col h-screen transition-colors">
        {/* Объявление */}
        <AnnouncementBanner storageKey="wintozo_announcement_11072026_pc" />
        {/* Шапка с пользователем */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Avatar avatarUrl={avatarUrl} avatarLetter={avatar} size="sm" />
              <div>
                <p className="font-black text-lg">{username}</p>
                <p className="text-blue-100 text-xs">{description || "Wintozo"}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              title="Выйти"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* 3 вкладки */}
          <div className="flex gap-1 bg-black/10 rounded-xl p-1">
            <button
              onClick={() => setTab("chats")}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === "chats" ? "bg-white text-blue-600" : "text-white/80 hover:bg-white/10"
              }`}
            >
              <MessageCircleIcon className="w-4 h-4" />
              Чаты
            </button>
            <button
              onClick={() => setTab("contacts")}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === "contacts" ? "bg-white text-blue-600" : "text-white/80 hover:bg-white/10"
              }`}
            >
              <Users className="w-4 h-4" />
              Контакты
            </button>
            <button
              onClick={() => setTab("groups")}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === "groups" ? "bg-white text-blue-600" : "text-white/80 hover:bg-white/10"
              }`}
            >
              <Users2 className="w-4 h-4" />
              Группы
            </button>
            <button
              onClick={() => setTab("settings")}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === "settings" ? "bg-white text-blue-600" : "text-white/80 hover:bg-white/10"
              }`}
            >
              <Settings className="w-4 h-4" />
              Настр.
            </button>
          </div>
        </div>

        {/* Поиск (только для чатов и контактов) */}
        {tab !== "settings" && (
          <div className="p-3 bg-white dark:bg-gray-800 border-b border-blue-100 dark:border-gray-700">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === "chats" ? "Поиск чатов..." : "Поиск контактов..."}
                className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-blue-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none text-gray-800 dark:text-gray-100 dark:bg-gray-700 dark:placeholder-gray-500 text-sm transition-colors"
              />
            </div>
          </div>
        )}

        {/* Контент вкладки */}
        <div className="flex-1 overflow-y-auto">
          {/* ЧАТЫ */}
          {tab === "chats" && (
            <>
              {/* Избранное (всегда сверху) */}
              {!search && (
                <button
                  onClick={() => openChat({ username, avatar, avatar_url: avatarUrl, description: null, status: "offline" } as User)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors border-b border-blue-100 dark:border-gray-700 ${
                    selectedUser?.username === username ? "bg-blue-100 dark:bg-blue-900/30" : ""
                  }`}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
                    <Star className="w-6 h-6 text-white" fill="white" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-bold text-gray-800 dark:text-gray-100">Избранное</p>
                    <p className="text-xs text-gray-400 truncate">
                      {username === "Admin" ? "Команда /admin — панель управления" : "Сохраняйте сообщения здесь"}
                    </p>
                  </div>
                </button>
              )}

              {filteredChats.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageCircleIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Нет чатов</p>
                </div>
              ) : (
                filteredChats.map((c) => (
                  <button
                    key={c.username}
                    onClick={() => openChat(c)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors border-b border-blue-100 dark:border-gray-700 ${
                      selectedUser?.username === c.username ? "bg-blue-100 dark:bg-blue-900/30" : ""
                    }`}
                  >
                    <Avatar avatarUrl={c.avatar_url} avatarLetter={c.avatar} size="lg" />
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{c.username}</p>
                      <p className="text-xs text-gray-400 truncate">{c.last_message || "..."}</p>
                    </div>
                    {c.last_time && (
                      <span className="text-xs text-gray-400 shrink-0">{formatLastTime(c.last_time)}</span>
                    )}
                  </button>
                ))
              )}
            </>
          )}

          {/* КОНТАКТЫ */}
          {tab === "contacts" && (
            <>
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Нет контактов</p>
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.username}
                    onClick={() => openChat(u)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors border-b border-blue-100 dark:border-gray-700 ${
                      selectedUser?.username === u.username ? "bg-blue-100 dark:bg-blue-900/30" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar avatarUrl={u.avatar_url} avatarLetter={u.avatar} size="lg" />
                      {onlineUsers.includes(u.username) && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-gray-800 dark:text-gray-100">{u.username}</p>
                        {(() => { const b = getUserBadge(u.username); return b ? (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${b.color}`}>{b.text}</span>
                        ) : null; })()}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {u.description || (onlineUsers.includes(u.username) ? "В сети" : "Не в сети")}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </>
          )}

          {/* ГРУППЫ */}
          {tab === "groups" && (
            <div className="p-3 space-y-2">
              <button
                onClick={() => navigate("/mobile/test/chat/group/new")}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-700 border-2 border-dashed border-purple-300 dark:border-gray-500 hover:bg-purple-50 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-gray-800 dark:text-gray-100">Создать группу</p>
                  <p className="text-xs text-gray-400">Новый групповой чат</p>
                </div>
              </button>
              {pcGroups.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Вы не участвуете в группах</p>
                  <p className="text-xs">Создайте или откройте ссылку</p>
                </div>
              ) : (
                pcGroups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => navigate(`/pc/test/chat/group/${g.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-700 border border-blue-100 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                      {g.avatar_url ? (
                        <img src={g.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Users2 className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{g.name}</p>
                      <p className="text-xs text-gray-400">Групповой чат</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* НАСТРОЙКИ */}
          {tab === "settings" && (
            <div className="p-4 space-y-3">
              {/* Профиль */}
              <div className="bg-blue-50 dark:bg-gray-700 rounded-2xl p-4 flex items-center gap-3 transition-colors">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Avatar avatarUrl={avatarUrl} avatarLetter={avatar} size="lg" />
                  <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 dark:text-gray-100">{username}</p>
                  {editDesc ? (
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="text"
                        value={descInput}
                        onChange={(e) => setDescInput(e.target.value)}
                        maxLength={60}
                        className="flex-1 px-2 py-0.5 text-xs rounded-lg border-2 border-blue-300 focus:outline-none focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
                        placeholder="О себе..."
                        autoFocus
                      />
                      <button onClick={saveDescription} className="p-0.5 text-green-500 hover:text-green-600">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setEditDesc(false); setDescInput(description); }} className="p-0.5 text-red-500 hover:text-red-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-xs text-gray-400 truncate">{description || "Нет описания"}</p>
                      <button onClick={() => setEditDesc(true)} className="p-0.5 text-blue-400 hover:text-blue-600 shrink-0">
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadAvatar}
                />
              </div>

              {/* Уведомления */}
              <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-100 dark:border-gray-600 flex items-center gap-3 p-3 transition-colors">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                  <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">Уведомления</span>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`w-11 h-5 rounded-full transition-colors ${notifications ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${notifications ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* Тёмная тема */}
              <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-100 dark:border-gray-600 flex items-center gap-3 p-3 transition-colors">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center">
                  <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">Тёмная тема</span>
                <button
                  onClick={toggle}
                  className={`w-11 h-5 rounded-full transition-colors ${darkMode ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${darkMode ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* БИТВА СМАЙЛИКОВ */}
              <button
                onClick={() => navigate("/mobile/test/chat/battle")}
                className="w-full bg-white dark:bg-gray-700 rounded-xl border-2 border-orange-100 dark:border-orange-900/40 flex items-center gap-3 p-3 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Битва смайликов</div>
                  <div className="text-xs text-gray-400">Выберите команду и зарабатывайте очки</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              {/* WINTOZO PRO */}
              <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-yellow-100 dark:border-yellow-900/40 overflow-hidden transition-colors">
                <div className="flex items-center gap-3 p-3 border-b border-yellow-50 dark:border-yellow-900/20">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Wintozo Pro</div>
                    {proStatus.active ? (
                      <div className="text-xs text-yellow-600 dark:text-yellow-400">
                        Активно {proStatus.reason === "admin" ? "навсегда" : `до ${proStatus.end_date ? new Date(proStatus.end_date).toLocaleDateString("ru-RU") : "?"}`}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">Неактивно</div>
                    )}
                  </div>
                  {proStatus.active && <span className="text-base">👑</span>}
                </div>

                {proStatus.active && (
                  <>
                    <div className="border-b border-yellow-50 dark:border-yellow-900/20">
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: messageColor || "#3b82f6" }}>
                          <MessageSquare className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-xs font-medium text-gray-800 dark:text-gray-200">Цвет сообщений</div>
                          <div className="text-[10px] text-gray-400">Ваши сообщения будут этого цвета</div>
                        </div>
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                      </button>
                      {showColorPicker && (
                        <div className="px-3 pb-3">
                          <div className="grid grid-cols-6 gap-1.5">
                            {["#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#6366f1", "#a855f7", "#78716c"].map((c) => (
                              <button
                                key={c}
                                onClick={() => handleColorChange(c)}
                                className={`w-full aspect-square rounded-lg border-2 transition-all ${
                                  messageColor === c ? "border-gray-800 dark:border-white scale-110" : "border-transparent"
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                            <button
                              onClick={() => handleColorChange("")}
                              className="w-full aspect-square rounded-lg border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center text-[10px] text-gray-400"
                            >
                              Сброс
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-b border-yellow-50 dark:border-yellow-900/20">
                      <button
                        onClick={handleContactAdmin}
                        disabled={adminContacts <= 0}
                        className="w-full flex items-center gap-3 p-3 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors disabled:opacity-50"
                      >
                        <div className="w-7 h-7 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                          <Shield className="w-3.5 h-3.5 text-red-500" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-xs font-medium text-gray-800 dark:text-gray-200">Написать админу</div>
                          <div className="text-[10px] text-gray-400">Осталось: {adminContacts} из 2</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Конфиденциальность + О приложении */}
              <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-100 dark:border-gray-600 overflow-hidden transition-colors">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors border-b border-blue-50 dark:border-gray-600">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">Конфиденциальность</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center">
                    <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">О приложении</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Выход */}
              <button
                onClick={handleLogout}
                className="w-full bg-white dark:bg-gray-700 rounded-xl border-2 border-red-100 dark:border-red-900/40 flex items-center gap-3 p-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
                  <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <span className="flex-1 text-sm font-medium text-red-600 dark:text-red-400">Выйти из аккаунта</span>
              </button>

              <p className="text-center text-xs text-gray-400 pt-2">Wintozo v1.0 — Test</p>
            </div>
          )}
        </div>
      </div>

      {/* Окно чата */}
      {selectedUser ? (
        <div className="flex-1 flex flex-col h-screen">
          {/* Шапка чата */}
          <div className="bg-white dark:bg-gray-800 border-b-2 border-blue-200 dark:border-gray-700 p-4 flex items-center gap-3 transition-colors">
            {selectedUser.username === username ? (
              <>
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
                  <Star className="w-6 h-6 text-white" fill="white" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-100">Избранное</p>
                  <p className="text-xs text-gray-400">
                    {username === "Admin" ? "Введите /admin для панели управления" : "Ваши сохранённые сообщения"}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <Avatar avatarUrl={selectedUser.avatar_url} avatarLetter={selectedUser.avatar} size="md" />
                  {onlineUsers.includes(selectedUser.username) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                  )}
                </div>
                <button onClick={() => setShowProfile(true)} className="text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-gray-800 dark:text-gray-100">{selectedUser.username}</p>
                    {(() => { const b = getUserBadge(selectedUser.username); return b ? (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${b.color}`}>{b.text}</span>
                    ) : null; })()}
                  </div>
                  <p className="text-xs text-gray-400">
                    {selectedUser.description || (onlineUsers.includes(selectedUser.username) ? "В сети" : "Не в сети")}
                  </p>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Удалить чат с ${selectedUser.username}?`)) {
                      removeChat(selectedUser.username);
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  title="Удалить чат"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Сообщения */}
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 transition-colors">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-blue-400">
                <MessageCircleIcon className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Нет сообщений</p>
                <p className="text-sm">Напишите первое сообщение!</p>
              </div>
            ) : (
              <div className="space-y-3 max-w-2xl mx-auto">
                {messages.map((msg) => {
                  const isOwn = msg.from_user === username;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-xs sm:max-w-md px-4 py-3 rounded-2xl transition-colors ${
                          isOwn
                            ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-tr-sm"
                            : "bg-white dark:bg-gray-700 border-2 border-blue-100 dark:border-gray-600 text-gray-800 dark:text-gray-100 rounded-tl-sm shadow-sm"
                        }`}
                      >
                        {msg.audio_url ? (
                          <VoicePlayer audioUrl={msg.audio_url} isOwn={isOwn} />
                        ) : msg.image_url ? (
                          <img
                            src={msg.image_url}
                            alt="photo"
                            className="rounded-xl max-w-[280px] max-h-[400px] object-cover cursor-pointer"
                            onClick={() => msg.image_url && window.open(msg.image_url, "_blank")}
                          />
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                        )}
                        <p className={`text-xs mt-1 ${isOwn ? "text-blue-100" : "text-gray-400"}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Форма отправки */}
          <form onSubmit={handleSendText} className="bg-white dark:bg-gray-800 border-t-2 border-blue-200 dark:border-gray-700 p-3 flex items-center gap-2 transition-colors">
            {sendingImage ? (
              <div className="flex-1 flex items-center justify-center py-3">
                <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-sm text-gray-400 ml-2">Отправка фото...</span>
              </div>
            ) : isRecording ? (
              <>
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="p-2.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-xl shrink-0"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                    Запись... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSendVoice}
                  disabled={sendingVoice}
                  className="px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl disabled:opacity-50 shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={selectedUser.username === username ? (username === "Admin" ? "Введите /admin..." : "Напишите сообщение...") : "Напишите сообщение..."}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-blue-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none text-gray-800 dark:text-gray-100 dark:bg-gray-700 dark:placeholder-gray-500 font-medium transition-colors"
                  maxLength={1000}
                />
                <button
                  type="button"
                  onClick={() => photoFileRef.current?.click()}
                  className="p-3 text-green-500 dark:text-green-400 rounded-xl hover:bg-green-50 dark:hover:bg-gray-700 shrink-0"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={startRecording}
                  className="p-3 text-blue-500 dark:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-700 shrink-0"
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-2 shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </>
            )}
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 transition-colors">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-3xl mx-auto mb-4 flex items-center justify-center">
              <MessageCircleIcon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-black text-blue-900 dark:text-blue-100 mb-2">Wintozo</h2>
            <p className="text-blue-600 dark:text-blue-400">Выберите собеседника слева</p>
          </div>
        </div>
      )}

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      <input ref={photoFileRef} type="file" accept="image/*" className="hidden" onChange={handleSendImage} />
      {showProfile && selectedUser && <UserProfileModal username={selectedUser.username} onClose={() => setShowProfile(false)} />}
    </div>
  );
}
