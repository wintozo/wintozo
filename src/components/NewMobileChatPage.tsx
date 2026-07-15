import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, LogOut, Search, MessageCircleIcon, Users, Settings,
  Bell, Moon, Shield, Info, ChevronRight, Camera, Check, X, Star, Mic, Trash2, Image as ImageIcon, Users2, Plus, Phone, Sun, Zap, Crown,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";
import { getUserBadge } from "../lib/badges";
import UserProfileModal from "./UserProfileModal";
import { getProStatus, updateMessageColor, contactAdmin } from "../lib/pro";
import type { ProStatus } from "../lib/pro";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { requestNotificationPermission, showNotification } from "../lib/notifications";
import VoicePlayer from "./VoicePlayer";
import AdminPanel from "./AdminPanel";
import CallModal from "./CallModal";
import { useCallStore } from "../store/useCallStore";

type Message = {
  id: number;
  from_user: string;
  to_user: string;
  text: string | null;
  audio_url: string | null;
  image_url: string | null;
  message_color?: string;
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

type Tab = "chats" | "contacts" | "groups" | "settings" | "chat";

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

export default function NewMobileChatPage() {
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
  const [tab, setTab] = useState<Tab>("chats");
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [search, setSearch] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWarnBanner, setShowWarnBanner] = useState(false);
  const [warnReason, setWarnReason] = useState("");
  const [warnBy, setWarnBy] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [proStatus, setProStatus] = useState<ProStatus>({ active: false });
  const [messageColor, setMessageColor] = useState("");
  const [adminContacts, setAdminContacts] = useState(2);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);
  const presenceRef = useRef<any>(null);
  const messageIdsRef = useRef<Set<number>>(new Set());
  const photoFileRef = useRef<HTMLInputElement>(null);
  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();
  const { callTarget, showCallModal, openCall, closeCall } = useCallStore();

  // Theme classes
  const theme = {
    bg: darkMode ? "bg-black" : "bg-white",
    bgSecondary: darkMode ? "bg-[#1a1a1a]" : "bg-gray-100",
    bgCard: darkMode ? "bg-[#2a2a2a]" : "bg-white",
    text: darkMode ? "text-white" : "text-black",
    textSecondary: darkMode ? "text-gray-400" : "text-gray-500",
    border: darkMode ? "border-gray-800" : "border-gray-200",
    borderLight: darkMode ? "border-gray-700" : "border-gray-300",
    hover: darkMode ? "hover:bg-[#333]" : "hover:bg-gray-200",
    inputBg: darkMode ? "bg-[#2a2a2a]" : "bg-gray-50",
    placeholder: darkMode ? "placeholder-gray-500" : "placeholder-gray-400",
    ownBubble: darkMode ? "bg-white text-black" : "bg-black text-white",
    otherBubble: darkMode ? "bg-[#2a2a2a] text-white" : "bg-gray-200 text-black",
    accent: darkMode ? "text-white" : "text-black",
    accentBg: darkMode ? "bg-white text-black" : "bg-black text-white",
  };

  useEffect(() => {
    const savedUsername = localStorage.getItem("wintozo_username");
    const savedAvatar = localStorage.getItem("wintozo_avatar");
    const savedAvatarUrl = localStorage.getItem("wintozo_avatar_url");
    const savedDesc = localStorage.getItem("wintozo_description");
    const savedDark = localStorage.getItem("wintozo_new_theme_dark");
    if (!savedUsername) {
      navigate("/registration");
      return;
    }
    setUsername(savedUsername);
    setAvatar(savedAvatar || "W");
    setAvatarUrl(savedAvatarUrl || null);
    setDescription(savedDesc || "");
    setDescInput(savedDesc || "");
    if (savedDark !== null) setDarkMode(savedDark === "true");
    requestNotificationPermission();
    loadUsers(savedUsername);
    loadChats(savedUsername);
    loadWarns(savedUsername);
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

  const toggleTheme = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    localStorage.setItem("wintozo_new_theme_dark", newVal.toString());
  };

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

  const loadUsers = async (current: string) => {
    const { data, error } = await supabase
      .from("wintozo_users")
      .select("username, avatar, avatar_url, description, status")
      .neq("username", current)
      .order("username", { ascending: true });
    if (error) console.error("loadUsers:", error);
    if (data) setUsers(data);
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
      const { data: urlData } = supabase.storage.from("wintozo-avatars").getPublicUrl(fileName);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) {
        alert("Ошибка получения ссылки");
        return;
      }
      await supabase.from("wintozo_users").update({ avatar_url: publicUrl }).eq("username", username);
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
    await supabase.from("wintozo_users").update({ description: trimmed }).eq("username", username);
  };

  const loadChats = useCallback(async (current: string) => {
    const { data: messages } = await supabase
      .from("wintozo_messages")
      .select("from_user, to_user, text, created_at, id")
      .or(`from_user.eq.${current},to_user.eq.${current}`)
      .order("created_at", { ascending: false })
      .limit(200);
    
    if (!messages || messages.length === 0) {
      setChats([]);
      return;
    }
    
    const chatMap = new Map<string, { last_message: string | null; last_time: string }>();
    for (const msg of messages) {
      if (msg.from_user === current && msg.to_user === current) continue;
      const other = msg.from_user === current ? msg.to_user : msg.from_user;
      if (!chatMap.has(other)) {
        chatMap.set(other, { last_message: msg.text, last_time: msg.created_at });
      }
    }
    
    const usernames = Array.from(chatMap.keys());
    if (usernames.length === 0) {
      setChats([]);
      return;
    }
    
    const { data: usersData } = await supabase
      .from("wintozo_users")
      .select("username, avatar, avatar_url")
      .in("username", usernames);
    
    const result: ChatPreview[] = usernames.map((uname) => {
      const u = usersData?.find((x: any) => x.username === uname);
      const info = chatMap.get(uname)!;
      return { username: uname, avatar: u?.avatar || "W", avatar_url: u?.avatar_url || null, last_message: info.last_message, last_time: info.last_time };
    });
    result.sort((a: any, b: any) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());
    setChats(result);
  }, []);

  const removeChat = async (targetUser: string) => {
    await supabase
      .from("wintozo_messages")
      .delete()
      .or(`and(from_user.eq.${username},to_user.eq.${targetUser}),and(from_user.eq.${targetUser},to_user.eq.${username}))`);
    if (selectedUser?.username === targetUser) {
      setSelectedUser(null);
      setMessages([]);
      setTab("chats");
    }
    loadChats(username);
  };

  useEffect(() => {
    if (!username) return;
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    const channel = supabase
      .channel('all_messages_global_new')
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "wintozo_messages",
      }, (payload) => {
        const msg = payload.new as Message;
        const isInChat =
          (msg.from_user === selectedUser?.username && msg.to_user === username) ||
          (msg.from_user === username && msg.to_user === selectedUser?.username);
        if (isInChat && !messageIdsRef.current.has(msg.id)) {
          messageIdsRef.current.add(msg.id);
          setMessages((prev) => [...prev, msg]);
          if (msg.from_user === selectedUser?.username) {
            const body = msg.audio_url ? "Голосовое сообщение" : msg.image_url ? "Фото" : (msg.text || "Новое сообщение");
            showNotification(msg.from_user, body);
          }
        }
      })
      .subscribe();
    subscriptionRef.current = channel;

    if (presenceRef.current) {
      supabase.removeChannel(presenceRef.current);
      presenceRef.current = null;
    }
    const pch = supabase.channel("presence_wintozo_new");
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
  }, [username]);

  useEffect(() => {
    if (selectedUser && username) loadMessages();
  }, [selectedUser, username]);

  const loadMessages = async () => {
    if (!selectedUser || !username) return;
    const { data } = await supabase
      .from("wintozo_messages")
      .select("id, from_user, to_user, text, audio_url, image_url, created_at")
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
    if (text === "/admin" && username === "Admin" && selectedUser.username === username) {
      setInputText("");
      setShowAdmin(true);
      return;
    }
    setInputText("");

    const insertData: any = {
      from_user: username,
      to_user: selectedUser.username,
      text,
      created_at: new Date().toISOString(),
    };

    // Цвет сообщения (Pro) — как в старой теме
    if (proStatus.active && proStatus.message_color) {
      insertData.message_color = proStatus.message_color;
    }

    const { data } = await supabase.from("wintozo_messages").insert(insertData).select().single();
    if (data) {
      if (!messageIdsRef.current.has(data.id)) {
        messageIdsRef.current.add(data.id);
        setMessages((prev) => [...prev, data as Message]);
      }
      loadChats(username);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("wintozo_username");
    localStorage.removeItem("wintozo_avatar");
    localStorage.removeItem("wintozo_avatar_url");
    localStorage.removeItem("wintozo_description");
    localStorage.removeItem("wintozo_device");
    navigate("/registration");
  };

  const handleSendVoice = async () => {
    if (!selectedUser || isRecording === false) return;
    setSendingVoice(true);
    try {
      const audioBlob = await stopRecording();
      if (!audioBlob) {
        alert("Ошибка записи голосового");
        setSendingVoice(false);
        return;
      }
      const fileName = `voice_${username}_${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("wintozo-voice")
        .upload(fileName, audioBlob, { contentType: "audio/webm" });
      if (uploadError) {
        console.error("Upload voice error:", uploadError);
        alert("Ошибка загрузки голосового: " + uploadError.message);
        setSendingVoice(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("wintozo-voice").getPublicUrl(fileName);
      const audioUrl = urlData?.publicUrl;
      if (!audioUrl) {
        alert("Ошибка получения ссылки");
        setSendingVoice(false);
        return;
      }
      const insertData: any = {
        from_user: username, to_user: selectedUser.username,
        audio_url: audioUrl, created_at: new Date().toISOString(),
      };
      if (proStatus.active && proStatus.message_color) {
        insertData.message_color = proStatus.message_color;
      }
      await supabase.from("wintozo_messages").insert(insertData);
      loadMessages();
      loadChats(username);
    } catch (err: any) {
      console.error("Send voice error:", err);
      alert("Ошибка: " + (err?.message || "не удалось записать голосовое"));
    } finally { setSendingVoice(false); }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;
    setSendingImage(true);
    try {
      const fileName = `photo_${username}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("wintozo-photos")
        .upload(fileName, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (uploadError) {
        console.error("Upload image error:", uploadError);
        alert("Ошибка загрузки фото: " + uploadError.message);
        setSendingImage(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("wintozo-photos").getPublicUrl(fileName);
      const imageUrl = urlData?.publicUrl;
      if (!imageUrl) {
        alert("Ошибка получения ссылки");
        setSendingImage(false);
        return;
      }
      const insertData: any = {
        from_user: username, to_user: selectedUser.username,
        image_url: imageUrl, created_at: new Date().toISOString(),
      };
      if (proStatus.active && proStatus.message_color) {
        insertData.message_color = proStatus.message_color;
      }
      const { data } = await supabase.from("wintozo_messages").insert(insertData).select().single();
      if (data && !messageIdsRef.current.has(data.id)) {
        messageIdsRef.current.add(data.id);
        setMessages((prev) => [...prev, data as Message]);
      }
      loadChats(username);
    } catch (err: any) {
      console.error("Send image error:", err);
      alert("Ошибка: " + (err?.message || "не удалось загрузить фото"));
    } finally {
      setSendingImage(false);
      if (e.target) e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center`}>
        <div className={`w-10 h-10 border-2 ${darkMode ? "border-white/30 border-t-white" : "border-black/30 border-t-black"} rounded-full animate-spin transition-all duration-500`} />
      </div>
    );
  }

  // === MOBILE LAYOUT ===
  // No sidebar - single column layout

  // Main list view (chats, contacts, groups, settings)
  if (tab !== "chat" || !selectedUser) {
    return (
      <div className={`min-h-screen ${theme.bg} flex flex-col transition-colors duration-300`}>
        {/* Header */}
        <div className={`p-4 ${theme.bgSecondary} border-b ${theme.border}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${theme.accentBg} transition-all duration-300`}>
                <MessageCircleIcon className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-bold ${theme.text} text-sm tracking-wide`}>WINTOZO</p>
                <p className={`${theme.textSecondary} text-xs`}>{username}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={toggleTheme} className={`p-2 rounded-2xl ${theme.textSecondary} ${theme.hover} transition-all duration-200`}>
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={handleLogout} className={`p-2 rounded-2xl ${theme.textSecondary} ${theme.hover} transition-all duration-200`}>
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme.textSecondary}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-2xl ${theme.inputBg} ${theme.borderLight} border ${theme.text} ${theme.placeholder} focus:outline-none text-sm transition-all duration-200`}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex ${theme.bgSecondary} border-b ${theme.border}`}>
          {(["chats", "contacts", "groups", "settings"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-all duration-200 ${
                tab === t
                  ? `${theme.text} border-b-2 ${darkMode ? "border-white" : "border-black"}`
                  : theme.textSecondary
              }`}
            >
              {t === "chats" ? "Чаты" : t === "contacts" ? "Контакты" : t === "groups" ? "Группы" : "Настройки"}
            </button>
          ))}
        </div>

        {/* Chats */}
        {tab === "chats" && (
          <div className="flex-1 overflow-y-auto scroll-smooth">
            {chats.map((chat) => (
              <button
                key={chat.username}
                onClick={() => {
                  setTab("chat");
                  setSelectedUser({
                    username: chat.username, avatar: chat.avatar,
                    avatar_url: chat.avatar_url, description: "", status: "offline",
                  });
                  loadMessages();
                }}
                className={`w-full p-3 flex items-center gap-3 ${theme.hover} transition-all duration-200 text-left`}
              >
                <Avatar avatarUrl={chat.avatar_url} avatarLetter={chat.avatar} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className={`font-medium ${theme.text} text-sm truncate`}>{chat.username}</p>
                    {chat.last_time && (
                      <span className={`text-xs ${theme.textSecondary}`}>{formatLastTime(chat.last_time)}</span>
                    )}
                  </div>
                  <p className={`text-xs ${theme.textSecondary} truncate`}>{chat.last_message}</p>
                </div>
              </button>
            ))}
            {chats.length === 0 && (
              <div className={`p-8 text-center ${theme.textSecondary}`}>
                <MessageCircleIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Нет сообщений</p>
                <p className="text-xs mt-1">Напишите кому-нибудь!</p>
              </div>
            )}
          </div>
        )}

        {/* Contacts */}
        {tab === "contacts" && (
          <div className="flex-1 overflow-y-auto">
            {users.map((user) => (
              <button
                key={user.username}
                onClick={() => {
                  setTab("chat");
                  setSelectedUser(user);
                }}
                className={`w-full p-3 flex items-center gap-3 ${theme.hover} transition-all duration-200 text-left`}
              >
                <Avatar avatarUrl={user.avatar_url} avatarLetter={user.avatar} size="md" />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${theme.text} text-sm truncate`}>{user.username}</p>
                  <p className={`text-xs ${theme.textSecondary}`}>{user.description || "Пользователь"}</p>
                </div>
                <ChevronRight className={`w-4 h-4 ${theme.textSecondary}`} />
              </button>
            ))}
          </div>
        )}

        {/* Groups */}
        {tab === "groups" && (
          <div className="flex-1 overflow-y-auto">
            <button
              onClick={() => navigate("/mobile/test/chat/groups")}
              className={`w-full p-3 flex items-center gap-3 ${theme.hover} transition-all duration-200 text-left mb-2`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${darkMode ? "bg-purple-500/20" : "bg-purple-100"}`}>
                <Users2 className={`w-5 h-5 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${theme.text} text-sm`}>Все группы</p>
                <p className={`text-xs ${theme.textSecondary}`}>Перейти к группам</p>
              </div>
              <ChevronRight className={`w-4 h-4 ${theme.textSecondary}`} />
            </button>
            <button
              onClick={() => navigate("/mobile/test/chat/group/new")}
              className={`w-full p-3 flex items-center gap-3 ${theme.hover} transition-all duration-200 text-left`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${darkMode ? "bg-green-500/20" : "bg-green-100"}`}>
                <Plus className={`w-5 h-5 ${darkMode ? "text-green-400" : "text-green-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${theme.text} text-sm`}>Создать группу</p>
              </div>
              <ChevronRight className={`w-4 h-4 ${theme.textSecondary}`} />
            </button>
          </div>
        )}

        {/* Settings */}
        {tab === "settings" && (
          <div className="p-4 pb-24 space-y-3 overflow-y-auto">
            {/* Профиль */}
            <div className={`${theme.bgCard} rounded-2xl border ${theme.borderLight} p-4`}>
              <div className="flex items-center gap-4">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Avatar avatarUrl={avatarUrl} avatarLetter={avatar} size="xl" />
                  <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                      <div className={`w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin`} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-lg ${theme.text} truncate`}>{username}</p>
                  {editDesc ? (
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="text"
                        value={descInput}
                        onChange={(e) => setDescInput(e.target.value)}
                        maxLength={60}
                        className={`flex-1 px-2 py-1 text-sm rounded-lg border ${theme.borderLight} focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme.inputBg} ${theme.text}`}
                        placeholder="О себе..."
                        autoFocus
                      />
                      <button onClick={saveDescription} className="p-1 text-green-500 hover:text-green-400">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setEditDesc(false); setDescInput(description); }} className="p-1 text-red-500 hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-1">
                      <p className={`text-sm ${theme.textSecondary} truncate`}>{description || "Нет описания"}</p>
                      <button onClick={() => setEditDesc(true)} className="p-0.5 text-blue-400 hover:text-blue-300 shrink-0">
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
            </div>

            {/* Настройки */}
            <div className={`${theme.bgCard} rounded-2xl border ${theme.borderLight} overflow-hidden`}>
              {/* Уведомления */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-700/30">
                <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-400" />
                </div>
                <span className={`flex-1 text-left font-medium text-sm ${theme.text}`}>Уведомления</span>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${notifications ? "bg-blue-500" : "bg-gray-600"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${notifications ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* Тёмная тема */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-700/30">
                <div className="w-9 h-9 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                  <Moon className="w-5 h-5 text-indigo-400" />
                </div>
                <span className={`flex-1 text-left font-medium text-sm ${theme.text}`}>Тёмная тема</span>
                <button
                  onClick={toggleTheme}
                  className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${darkMode ? "bg-blue-500" : "bg-gray-600"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${darkMode ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* Конфиденциальность */}
              <button onClick={() => setShowPrivacy(true)} className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors border-b border-gray-700/30">
                <div className="w-9 h-9 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-400" />
                </div>
                <span className={`flex-1 text-left font-medium text-sm ${theme.text}`}>Конфиденциальность</span>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>

              {/* О приложении */}
              <button onClick={() => setShowAbout(true)} className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors">
                <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <Info className="w-5 h-5 text-amber-400" />
                </div>
                <span className={`flex-1 text-left font-medium text-sm ${theme.text}`}>О приложении</span>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Битва смайликов */}
            <button className={`w-full ${theme.bgCard} rounded-2xl border ${theme.borderLight} p-4 flex items-center gap-3 hover:bg-white/5 transition-colors`}>
              <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <span className={`font-medium text-sm ${theme.text}`}>Битва смайликов</span>
                <p className={`text-xs ${theme.textSecondary}`}>Выберите команду и зарабатывайте очки</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>

            {/* Wintozo Pro */}
            <div className={`${theme.bgCard} rounded-2xl border border-yellow-500/30 overflow-hidden`}>
              <div className="p-4 flex items-center gap-3 border-b border-yellow-500/20">
                <div className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className={`font-medium text-sm ${theme.text}`}>Wintozo Pro</span>
                  {proStatus.active ? (
                    <p className="text-xs text-yellow-400">
                      Активно {proStatus.reason === "admin" ? "навсегда" : `до ${proStatus.end_date ? new Date(proStatus.end_date).toLocaleDateString("ru-RU") : "?"}`}
                    </p>
                  ) : (
                    <p className={`text-xs ${theme.textSecondary}`}>Неактивно</p>
                  )}
                </div>
                {proStatus.active && <span className="text-lg">👑</span>}
              </div>

              {proStatus.active && (
                <>
                  {/* Цвет сообщений */}
                  <div className="border-b border-yellow-500/20">
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-yellow-500/5 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: messageColor || "#3b82f6" }}>
                        <MessageCircleIcon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <span className={`font-medium text-sm ${theme.text}`}>Цвет сообщений</span>
                        <p className={`text-xs ${theme.textSecondary}`}>Ваши сообщения будут этого цвета</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                    {showColorPicker && (
                      <div className="px-4 pb-4">
                        <div className="grid grid-cols-6 gap-2">
                          {["#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#6366f1", "#a855f7", "#78716c"].map((c) => (
                            <button
                              key={c}
                              onClick={() => handleColorChange(c)}
                              className={`w-full aspect-square rounded-xl border-2 transition-all ${
                                messageColor === c ? "border-white scale-110" : "border-transparent"
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <button
                            onClick={() => handleColorChange("")}
                            className="w-full aspect-square rounded-xl border-2 border-gray-600 flex items-center justify-center text-xs text-gray-400"
                          >
                            Сброс
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Выйти */}
            <button
              onClick={handleLogout}
              className={`w-full ${theme.bgCard} rounded-2xl border border-red-500/30 p-4 flex items-center gap-3 hover:bg-red-500/10 transition-colors`}
            >
              <div className="w-9 h-9 bg-red-500/20 rounded-xl flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-400" />
              </div>
              <span className={`flex-1 text-left font-medium text-red-400 text-sm`}>Выйти из аккаунта</span>
            </button>

            <p className={`text-center text-xs ${theme.textSecondary} pt-2`}>Wintozo v1.0 — New Theme</p>
          </div>
        )}
      </div>
    );
  }

  // Chat view
  return (
    <div className={`min-h-screen ${theme.bg} flex flex-col transition-colors duration-300`}>
      {/* Chat header */}
      <div className={`p-4 ${theme.bgSecondary} border-b ${theme.border} flex items-center justify-between transition-all duration-300`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setTab("chats")} className={`p-2 rounded-2xl ${theme.textSecondary} ${theme.hover} transition-all duration-200`}>
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="relative">
            <Avatar avatarUrl={selectedUser.avatar_url} avatarLetter={selectedUser.avatar} size="md" />
            {onlineUsers.includes(selectedUser.username) && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
            )}
          </div>
          <div>
            <p className={`font-bold ${theme.text}`}>{selectedUser.username}</p>
            <p className={`text-xs ${theme.textSecondary}`}>
              {selectedUser.description || (onlineUsers.includes(selectedUser.username) ? "В сети" : "Не в сети")}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => {
            if (confirm(`Удалить чат с ${selectedUser.username}?`)) removeChat(selectedUser.username);
          }} className={`p-2 rounded-2xl ${theme.textSecondary} ${theme.hover} transition-all duration-200`}>
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Warning banner */}
      {showWarnBanner && (
        <div className={`${darkMode ? "bg-white/5" : "bg-black/5"} border-b ${theme.border} px-4 py-3 animate-slideDown`}>
          <div className="flex items-start gap-3">
            <Shield className={`w-5 h-5 ${theme.text} mt-0.5 shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className={`font-bold ${theme.text} text-sm`}>⚠️ Предупреждение от {warnBy}</p>
              <p className={`text-xs ${theme.textSecondary} mt-0.5`}>{warnReason}</p>
            </div>
            <button onClick={() => setShowWarnBanner(false)} className={`${theme.textSecondary} ${theme.hover} p-1 rounded-xl transition-all duration-200`}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth ${theme.bg} transition-colors duration-300`}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30">
            <MessageCircleIcon className={`w-16 h-16 mb-4 ${theme.textSecondary}`} />
            <p className={`text-lg font-medium ${theme.textSecondary}`}>Нет сообщений</p>
            <p className={`text-sm ${theme.textSecondary}`}>Напишите первое сообщение!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.from_user === username;
            const msgColor = msg.message_color || "";
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-fadeIn`}>
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl transition-all duration-200 ${
                    isOwn
                      ? msgColor
                        ? `text-white`
                        : (darkMode ? "bg-white text-black" : "bg-black text-white")
                      : (darkMode ? "bg-[#2a2a2a] text-white" : "bg-gray-200 text-black")
                  }`}
                  style={msgColor ? { backgroundColor: msgColor } : undefined}
                >
                  {msg.audio_url ? (
                    <VoicePlayer audioUrl={msg.audio_url} isOwn={isOwn} darkMode={darkMode} />
                  ) : msg.image_url ? (
                    <img src={msg.image_url || ""} alt="photo" className="rounded-2xl max-w-[280px] max-h-[400px] object-cover cursor-pointer" onClick={() => msg.image_url && window.open(msg.image_url || "", "_blank")} />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={isOwn && msgColor ? { color: "#fff" } : undefined}>
                      {msg.text}
                    </p>
                  )}
                  <p className={`text-xs mt-1.5 ${isOwn ? (msgColor ? "text-white/60" : (darkMode ? "text-gray-500" : "text-gray-400")) : theme.textSecondary}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendText} className={`p-4 ${theme.bgSecondary} border-t ${theme.border} flex items-center gap-2 transition-all duration-300`}>
        {sendingImage ? (
          <div className="flex-1 flex items-center justify-center py-3">
            <div className={`w-5 h-5 border-2 ${darkMode ? "border-white/30 border-t-white" : "border-black/30 border-t-black"} rounded-full animate-spin`} />
            <span className={`text-sm ${theme.textSecondary} ml-2`}>Отправка фото...</span>
          </div>
        ) : isRecording ? (
          <>
            <button type="button" onClick={cancelRecording} className={`p-2.5 rounded-2xl ${darkMode ? "bg-white/10 text-white" : "bg-black/10 text-black"} transition-all duration-200`}>
              <Trash2 className="w-5 h-5" />
            </button>
            <div className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-2xl ${darkMode ? "bg-white/10" : "bg-black/10"}`}>
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className={`text-sm ${theme.text} font-medium`}>
                Запись... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <button type="button" onClick={handleSendVoice} disabled={sendingVoice} className={`px-4 py-2.5 rounded-2xl ${theme.accentBg} disabled:opacity-50 transition-all duration-200`}>
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
              className={`flex-1 px-4 py-2.5 rounded-2xl ${theme.inputBg} ${theme.borderLight} border ${theme.text} ${theme.placeholder} focus:outline-none text-sm transition-all duration-200`}
              maxLength={1000}
            />
            <button type="button" onClick={() => photoFileRef.current?.click()} className={`p-2.5 rounded-2xl ${theme.textSecondary} ${theme.hover} transition-all duration-200`}>
              <ImageIcon className="w-5 h-5" />
            </button>
            <button type="button" onClick={startRecording} className={`p-2.5 rounded-2xl ${theme.textSecondary} ${theme.hover} transition-all duration-200`}>
              <Mic className="w-5 h-5" />
            </button>
            <button type="submit" disabled={!inputText.trim()} className={`px-4 py-2.5 rounded-2xl ${theme.accentBg} disabled:opacity-40 transition-all duration-200`}>
              <Send className="w-5 h-5" />
            </button>
          </>
        )}
      </form>
      <input type="file" accept="image/*" ref={photoFileRef} className="hidden" onChange={handleUploadImage} />

      {/* Modals */}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {showCallModal && callTarget && <CallModal currentUsername={username} callTarget={callTarget} onClose={closeCall} />}

      {/* Модалка: Конфиденциальность */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowPrivacy(false)}>
          <div className={`${theme.bgCard} rounded-2xl p-6 max-w-sm w-full`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${theme.text}`}>Конфиденциальность</h3>
              <button onClick={() => setShowPrivacy(false)} className={`p-2 rounded-xl ${theme.hover} ${theme.textSecondary}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className={`${theme.bg} rounded-xl p-4`}>
                <p className={`font-medium text-sm ${theme.text} mb-2`}>Блокировка пользователей</p>
                <p className={`text-xs ${theme.textSecondary}`}>Вы можете заблокировать нежелательных пользователей. Они больше не смогут писать вам.</p>
              </div>
              <div className={`${theme.bg} rounded-xl p-4`}>
                <p className={`font-medium text-sm ${theme.text} mb-2`}>Кто может писать</p>
                <p className={`text-xs ${theme.textSecondary}`}>Настройте, кто может отправлять вам сообщения: все, контакты или никто.</p>
              </div>
              <div className={`${theme.bg} rounded-xl p-4`}>
                <p className={`font-medium text-sm ${theme.text} mb-2`}>Статус онлайн</p>
                <p className={`text-xs ${theme.textSecondary}`}>Вы можете скрыть свой статус онлайн от других пользователей.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка: О приложении */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowAbout(false)}>
          <div className={`${theme.bgCard} rounded-2xl p-6 max-w-sm w-full`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${theme.text}`}>О приложении</h3>
              <button onClick={() => setShowAbout(false)} className={`p-2 rounded-xl ${theme.hover} ${theme.textSecondary}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <MessageCircleIcon className="w-10 h-10 text-white" />
              </div>
              <div>
                <p className={`text-xl font-bold ${theme.text}`}>Wintozo</p>
                <p className={`text-sm ${theme.textSecondary}`}>Версия 1.0 — New Theme</p>
              </div>
              <p className={`text-sm ${theme.textSecondary}`}>
                Современный мессенджер с тёмной темой и мощными функциями.
              </p>
              <div className={`${theme.bg} rounded-xl p-4 text-left`}>
                <p className={`text-xs ${theme.textSecondary}`}>
                  © 2026 Wintozo. Все права защищены.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
