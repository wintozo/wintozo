import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, ArrowLeft, Star, Mic, Trash2, Image as ImageIcon } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { requestNotificationPermission, showNotification } from "../lib/notifications";
import { getUserBadge } from "../lib/badges";
import { addMessagePoints, claimDaily } from "../lib/battle";
import { getProStatus, type ProStatus } from "../lib/pro";
import Avatar from "./Avatar";
import AdminPanel from "./AdminPanel";
import VoicePlayer from "./VoicePlayer";
import UserProfileModal from "./UserProfileModal";
import MessageContextMenu from "./MessageContextMenu";
import ForwardContactPicker from "./ForwardContactPicker";

type Message = {
  id: number;
  from_user: string;
  to_user: string;
  text: string | null;
  audio_url: string | null;
  image_url: string | null;
  created_at: string;
  message_color?: string;
  reply_to_id?: number | null;
  reply_text?: string | null;
  reply_from?: string | null;
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

export default function MobileChatConversationPage() {
  const navigate = useNavigate();
  const { username: contactUsername } = useParams();
  const [username, setUsername] = useState("");
  const [contact, setContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
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

  // Контекстное меню
  const [contextMsg, setContextMsg] = useState<Message | null>(null);
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 });
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showForward, setShowForward] = useState(false);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("wintozo_username");
    if (!saved) {
      navigate("/test/registration");
      return;
    }
    setUsername(saved);
    requestNotificationPermission();
    if (contactUsername) {
      init(saved, contactUsername);
    }
    // Дейли бонус
    claimDaily(saved).catch(() => {});
    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (presenceRef.current) supabase.removeChannel(presenceRef.current);
    };
  }, [contactUsername]);

  const init = async (current: string, contact: string) => {
    // Загружаем контакт
    const { data: contactData } = await supabase
      .from("wintozo_users")
      .select("username, avatar, avatar_url, description")
      .eq("username", contact)
      .single();

    setContact(contactData as Contact || { username: contact, avatar: "W", avatar_url: null });

    // Pro статус контакта
    try {
      const pro = await getProStatus(contact);
      setProStatus(pro);
    } catch {}

    // Загружаем сообщения
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
    setLoading(false);

    // Подписка на новые сообщения
    if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    const channel = supabase
      .channel(`chat_${[current, contact].sort().join("_")}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "wintozo_messages",
      }, (payload) => {
        const msg = payload.new as Message;
        if (
          (msg.from_user === contact && msg.to_user === current) ||
          (msg.from_user === current && msg.to_user === contact)
        ) {
          if (!messageIdsRef.current.has(msg.id)) {
            messageIdsRef.current.add(msg.id);
            setMessages((prev) => [...prev, msg]);
            if (msg.from_user === contact) {
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
          await pch.track({ username: current });
        }
      });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ======= ДОЛГОЕ НАЖАТИЕ =======
  const handleTouchStart = (msg: Message) => (e: React.TouchEvent) => {
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      setContextMsg(msg);
      setContextPos({ x: touch.clientX, y: touch.clientY });
    }, 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const handleContextMenu = (msg: Message) => (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMsg(msg);
    setContextPos({ x: e.clientX, y: e.clientY });
  };

  // ======= ОТВЕТ =======
  const handleReply = (msg: Message) => {
    setReplyTo(msg);
    // Фокус на инпут
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      input?.focus();
    }, 100);
  };

  const cancelReply = () => setReplyTo(null);

  // ======= ПЕРЕСЛАТЬ =======
  const handleForward = (msg: Message) => {
    setForwardMsg(msg);
    setShowForward(true);
  };

  const sendForward = async (toUsername: string) => {
    if (!forwardMsg) return;
    await supabase.from("wintozo_messages").insert({
      from_user: username,
      to_user: toUsername,
      text: forwardMsg.text,
      image_url: forwardMsg.image_url,
      audio_url: forwardMsg.audio_url,
      created_at: new Date().toISOString(),
    });
    setShowForward(false);
    setForwardMsg(null);
    alert("Сообщение переслано!");
  };

  // ======= ОТПРАВКА ТЕКСТА =======
  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !contactUsername) return;

    const text = inputText.trim();

    if (text === "/admin" && username === "Admin" && contactUsername === username) {
      setInputText("");
      setShowAdmin(true);
      return;
    }

    setInputText("");

    const insertData: any = {
      from_user: username,
      to_user: contactUsername,
      text,
      created_at: new Date().toISOString(),
    };

    // Если есть ответ
    if (replyTo) {
      insertData.reply_to_id = replyTo.id;
      insertData.reply_text = replyTo.text;
      insertData.reply_from = replyTo.from_user;
      setReplyTo(null);
    }

    // Цвет сообщения (Pro)
    if (proStatus.active && proStatus.message_color) {
      insertData.message_color = proStatus.message_color;
    }

    const { data } = await supabase.from("wintozo_messages").insert(insertData).select().single();

    if (data) {
      if (!messageIdsRef.current.has(data.id)) {
        messageIdsRef.current.add(data.id);
        setMessages((prev) => [...prev, data]);
      }
      // Очки битвы
      addMessagePoints(username, "text");
    }
  };

  const isSelfChat = username === contactUsername;

  // ======= ГОЛОС =======
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

  // ======= ФОТО =======
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center transition-colors">
        <div className="w-12 h-12 border-4 border-blue-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col transition-colors">
      {/* Шапка чата */}
      <div className="bg-white dark:bg-gray-800 border-b-2 border-blue-200 dark:border-gray-700 p-2 flex items-center gap-2 sticky top-0 z-30 transition-colors">
        <button onClick={() => navigate("/mobile/test/chat")} className="p-1">
          <ArrowLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </button>
        {isSelfChat ? (
          <>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-white" fill="white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800 dark:text-gray-100">Избранное</p>
              <p className="text-xs text-gray-400">
                {username === "Admin" ? "Введите /admin для панели управления" : "Ваши сохранённые сообщения"}
              </p>
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
          <div className="h-full flex flex-col items-center justify-center text-blue-400">
            <p className="text-base font-medium">Нет сообщений</p>
            <p className="text-xs">Напишите первое сообщение!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => {
              const isOwn = msg.from_user === username;
              const msgColor = msg.message_color || (isOwn ? "from-blue-500 to-indigo-500" : "");
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  onTouchStart={handleTouchStart(msg)}
                  onTouchEnd={handleTouchEnd}
                  onContextMenu={handleContextMenu(msg)}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                      isOwn
                        ? msgColor
                          ? `text-white ${msgColor.startsWith("from") ? `bg-gradient-to-r ${msgColor}` : ""}`
                          : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-tr-sm"
                        : "bg-white dark:bg-gray-700 border-2 border-blue-100 dark:border-gray-600 text-gray-800 dark:text-gray-100 rounded-tl-sm shadow-sm"
                    } transition-colors`}
                    style={
                      isOwn && msgColor && !msgColor.startsWith("from")
                        ? { backgroundColor: msgColor }
                        : undefined
                    }
                  >
                    {/* Ответ на сообщение */}
                    {msg.reply_to_id && msg.reply_text && (
                      <div className={`mb-1.5 px-2 py-1 rounded-lg text-xs ${
                        isOwn ? "bg-white/15" : "bg-blue-50 dark:bg-gray-600"
                      }`}>
                        <p className={`font-medium ${isOwn ? "text-blue-100" : "text-blue-600"}`}>
                          {msg.reply_from}
                        </p>
                        <p className={`truncate ${isOwn ? "text-blue-100/80" : "text-gray-500 dark:text-gray-300"}`}>
                          {msg.reply_text}
                        </p>
                      </div>
                    )}

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
                    <p className={`text-[10px] mt-1 ${isOwn ? "text-blue-100" : "text-gray-400"}`}>
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

      {/* Баннер ответа */}
      {replyTo && (
        <div className="bg-blue-50 dark:bg-gray-700 border-t-2 border-blue-200 dark:border-gray-600 px-3 py-2 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Ответ {replyTo.from_user}</p>
            <p className="text-xs text-gray-500 dark:text-gray-300 truncate">{replyTo.text || (replyTo.image_url ? "📷 Фото" : "🎤 Голосовое")}</p>
          </div>
          <button onClick={cancelReply} className="p-1 text-gray-400 hover:text-gray-600">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Форма отправки */}
      <form onSubmit={handleSendText} className="bg-white dark:bg-gray-800 border-t-2 border-blue-200 dark:border-gray-700 p-2 flex items-center gap-2 transition-colors">
        {sendingImage ? (
          <div className="flex-1 flex items-center justify-center py-2">
            <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin" />
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
              className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl disabled:opacity-50 shrink-0"
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
              placeholder={isSelfChat ? (username === "Admin" ? "Введите /admin..." : "Сообщение...") : "Сообщение..."}
              className="flex-1 px-3 py-2 rounded-xl border-2 border-blue-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none text-gray-800 dark:text-gray-100 dark:bg-gray-700 dark:placeholder-gray-500 text-sm font-medium transition-colors"
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
              className="p-2 text-blue-500 dark:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-700 shrink-0"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-md shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </>
        )}
      </form>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleSendImage} />

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {showProfile && contactUsername && <UserProfileModal username={contactUsername} onClose={() => setShowProfile(false)} />}

      {/* Контекстное меню */}
      {contextMsg && (
        <MessageContextMenu
          message={{ text: contextMsg.text || "", from: contextMsg.from_user, id: contextMsg.id }}
          position={contextPos}
          onClose={() => setContextMsg(null)}
          onReply={handleReply}
          onForward={handleForward}
          onCopy={() => {}}
        />
      )}

      {/* Выбор контакта для пересылки */}
      {showForward && (
        <ForwardContactPicker
          onSelect={sendForward}
          onClose={() => { setShowForward(false); setForwardMsg(null); }}
        />
      )}
    </div>
  );
}
