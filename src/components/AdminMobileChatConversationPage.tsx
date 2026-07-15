import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, ArrowLeft, Star, Mic, Trash2, Image as ImageIcon, Phone, PhoneOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { requestNotificationPermission, showNotification } from "../lib/notifications";
import { getUserBadge } from "../lib/badges";
import { addMessagePoints, claimDaily } from "../lib/battle";
import { getProStatus, type ProStatus } from "../lib/pro";
import Avatar from "./Avatar";
import VoicePlayer from "./VoicePlayer";
import UserProfileModal from "./UserProfileModal";
import CallModal from "./CallModal";
import { useCallStore } from "../store/useCallStore";

type Message = {
  id: number;
  from_user: string;
  to_user: string;
  text: string | null;
  audio_url: string | null;
  image_url: string | null;
  created_at: string;
  message_color?: string;
};

type Contact = {
  username: string;
  avatar: string;
  avatar_url: string | null;
  description?: string | null;
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function AdminMobileChatConversationPage() {
  const navigate = useNavigate();
  const { username: contactUsername } = useParams();
  const [username, setUsername] = useState("");
  const [contact, setContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [proStatus, setProStatus] = useState<ProStatus>({ active: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);
  const presenceRef = useRef<any>(null);
  const messageIdsRef = useRef<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();
  const { callTarget, showCallModal, openCall, closeCall } = useCallStore();

  useEffect(() => {
    const saved = localStorage.getItem("wintozo_username");
    if (!saved || saved !== "Admin") {
      navigate("/admin/registration");
      return;
    }
    setUsername(saved);
    requestNotificationPermission();
    if (contactUsername) {
      init(saved, contactUsername);
    }
    claimDaily(saved).catch(() => {});
    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (presenceRef.current) supabase.removeChannel(presenceRef.current);
    };
  }, [contactUsername]);

  const init = async (current: string, contact: string) => {
    const { data: contactData } = await supabase
      .from("wintozo_users")
      .select("username, avatar, avatar_url, description")
      .eq("username", contact)
      .single();

    setContact(contactData as Contact || { username: contact, avatar: "W", avatar_url: null });

    try {
      const pro = await getProStatus(contact);
      setProStatus(pro);
    } catch {}

    const { data: msgData } = await supabase
      .from("wintozo_messages")
      .select("*")
      .or(`and(from_user.eq.${current},to_user.eq.${contact}),and(from_user.eq.${contact},to_user.eq.${current})`)
      .order("created_at", { ascending: true })
      .limit(100);

    if (msgData) {
      messageIdsRef.current.clear();
      msgData.forEach((msg: Message) => messageIdsRef.current.add(msg.id));
      setMessages(msgData);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !contactUsername) return;

    const text = inputText.trim();
    setInputText("");

    const insertData: any = {
      from_user: username,
      to_user: contactUsername,
      text,
      created_at: new Date().toISOString(),
    };

    if (proStatus.active && proStatus.message_color) {
      insertData.message_color = proStatus.message_color;
    }

    const { data } = await supabase.from("wintozo_messages").insert(insertData).select().single();

    if (data) {
      if (!messageIdsRef.current.has(data.id)) {
        messageIdsRef.current.add(data.id);
        setMessages((prev) => [...prev, data]);
      }
      addMessagePoints(username, "text");
    }
  };

  const isSelfChat = username === contactUsername;

  const handleSendVoice = async () => {
    const blob = await stopRecording();
    if (!blob || !contactUsername) return;

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

      const insertData: any = {
        from_user: username,
        to_user: contactUsername,
        audio_url: urlData.publicUrl,
        created_at: new Date().toISOString(),
      };

      if (proStatus.active && proStatus.message_color) {
        insertData.message_color = proStatus.message_color;
      }

      const { data } = await supabase.from("wintozo_messages").insert(insertData).select().single();

      if (data) {
        if (!messageIdsRef.current.has(data.id)) {
          messageIdsRef.current.add(data.id);
          setMessages((prev) => [...prev, data]);
        }
        addMessagePoints(username, "voice");
      }
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    } finally {
      setSendingVoice(false);
    }
  };

  const handleSendImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contactUsername) return;

    setSendingImage(true);
    try {
      const fileName = `photo_${username}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("wintozo-photos")
        .upload(fileName, file, { upsert: true, contentType: file.type || "image/jpeg" });

      if (uploadError) { alert("Ошибка загрузки: " + uploadError.message); return; }

      const { data: urlData } = supabase.storage.from("wintozo-photos").getPublicUrl(fileName);

      const insertData: any = {
        from_user: username,
        to_user: contactUsername,
        text: null,
        image_url: urlData.publicUrl,
        created_at: new Date().toISOString(),
      };

      if (proStatus.active && proStatus.message_color) {
        insertData.message_color = proStatus.message_color;
      }

      const { data, error: insertError } = await supabase.from("wintozo_messages").insert(insertData).select().single();

      if (insertError) { alert("Ошибка БД: " + insertError.message); return; }

      if (data && !messageIdsRef.current.has(data.id)) {
        messageIdsRef.current.add(data.id);
        setMessages((prev) => [...prev, data]);
        addMessagePoints(username, "image");
      }
    } catch (err: any) {
      alert("Ошибка: " + (err?.message || "не удалось отправить фото"));
    } finally {
      setSendingImage(false);
      if (e.target) e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col transition-colors">
      {/* Шапка чата */}
      <div className="bg-white dark:bg-gray-800 border-b-2 border-purple-200 dark:border-gray-700 p-2 flex items-center gap-2 sticky top-0 z-30 transition-colors">
        <button onClick={() => navigate("/admin/mobile/chat")} className="p-1">
          <ArrowLeft className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </button>
        {isSelfChat ? (
          <>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-white" fill="white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800 dark:text-gray-100">Избранное</p>
              <p className="text-xs text-gray-400">Ваши сохранённые сообщения</p>
            </div>
          </>
        ) : (
          <>
            <div className="relative shrink-0">
              <Avatar avatarUrl={contact?.avatar_url} avatarLetter={contact?.avatar || "W"} size="md" />
              {onlineUsers.includes(contactUsername || "") && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
              )}
            </div>
            <button
              onClick={() => setShowProfile(true)}
              className="flex-1 text-left"
            >
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-gray-800 dark:text-gray-100">{contactUsername}</p>
                {proStatus.active && <span className="text-sm">👑</span>}
                {(() => { const b = getUserBadge(contactUsername || ""); return b ? (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${b.color}`}>{b.text}</span>
                ) : null; })()}
              </div>
              <p className="text-xs text-gray-400 truncate">
                {contact?.description || (onlineUsers.includes(contactUsername || "") ? "В сети" : "Не в сети")}
              </p>
            </button>
          </>
        )}
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-3" onContextMenu={(e) => e.preventDefault()}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-purple-400">
            <p className="text-base font-medium">Нет сообщений</p>
            <p className="text-xs">Напишите первое сообщение!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => {
              const isOwn = msg.from_user === username;
              const msgColor = msg.message_color || (isOwn ? "from-purple-500 to-indigo-500" : "");
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                      isOwn
                        ? msgColor
                          ? `text-white ${msgColor.startsWith("from") ? `bg-gradient-to-r ${msgColor}` : ""}`
                          : "bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-tr-sm"
                        : "bg-white dark:bg-gray-700 border-2 border-purple-100 dark:border-gray-600 text-gray-800 dark:text-gray-100 rounded-tl-sm shadow-sm"
                    } transition-colors`}
                    style={
                      isOwn && msgColor && !msgColor.startsWith("from")
                        ? { backgroundColor: msgColor }
                        : undefined
                    }
                  >
                    {msg.audio_url ? (
                      <VoicePlayer audioUrl={msg.audio_url} isOwn={isOwn} />
                    ) : msg.image_url ? (
                      <img
                        src={msg.image_url}
                        alt="photo"
                        className="rounded-xl max-w-[220px] max-h-[300px] object-cover cursor-pointer"
                        onClick={() => msg.image_url && window.open(msg.image_url, "_blank")}
                      />
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                         style={isOwn && msgColor && !msgColor.startsWith("from") ? { color: "#fff" } : undefined}>
                        {msg.text}
                      </p>
                    )}
                    <p className={`text-[10px] mt-1 ${isOwn ? "text-purple-100" : "text-gray-400"}`}>
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
      <form onSubmit={handleSendText} className="bg-white dark:bg-gray-800 border-t-2 border-purple-200 dark:border-gray-700 p-2 flex items-center gap-2 transition-colors">
        {sendingImage ? (
          <div className="flex-1 flex items-center justify-center py-2">
            <span className="text-sm text-gray-400 ml-2">Отправка фото...</span>
          </div>
        ) : isRecording ? (
          <>
            <button
              type="button"
              onClick={cancelRecording}
              className="p-2 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-xl shrink-0"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                Запись... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSendVoice}
              disabled={sendingVoice}
              className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-xl shrink-0"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => openCall(contactUsername || '', 'audio')}
              className="p-2.5 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-xl shrink-0"
            >
              <Phone className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isSelfChat ? "Сообщение..." : "Сообщение..."}
              className="flex-1 px-3 py-2 rounded-xl border-2 border-purple-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-500 focus:outline-none text-gray-800 dark:text-gray-100 dark:bg-gray-700 dark:placeholder-gray-500 text-sm font-medium transition-colors"
              maxLength={1000}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-green-500 dark:text-green-400 rounded-xl hover:bg-green-50 dark:hover:bg-gray-700 shrink-0"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={startRecording}
              className="p-2 text-purple-500 dark:text-purple-400 rounded-xl hover:bg-purple-50 dark:hover:bg-gray-700 shrink-0"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-md shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </>
        )}
      </form>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleSendImage} />
      {showProfile && contactUsername && <UserProfileModal username={contactUsername} onClose={() => setShowProfile(false)} />}
      {showCallModal && callTarget && <CallModal currentUsername={username} callTarget={callTarget} onClose={closeCall} />}
    </div>
  );
}
