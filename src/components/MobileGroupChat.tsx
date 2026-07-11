import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, ArrowLeft, Image as ImageIcon, Share2, Check, Edit2, X, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { requestNotificationPermission, showNotification } from "../lib/notifications";
import Avatar from "./Avatar";

type Message = {
  id: number;
  group_id: number;
  from_user: string;
  text: string | null;
  image_url: string | null;
  created_at: string;
};

type UserInfo = {
  username: string;
  avatar: string;
  avatar_url: string | null;
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function MobileGroupChat() {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [username, setUsername] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingImage, setSendingImage] = useState(false);
  const [userCache, setUserCache] = useState<Record<string, UserInfo>>({});
  const [groupName, setGroupName] = useState("");
  const [groupAvatarUrl, setGroupAvatarUrl] = useState<string | null>(null);
  const [editName, setEditName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);
  const messageIdsRef = useRef<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("wintozo_username");
    if (!saved) {
      navigate("/test/registration");
      return;
    }
    setUsername(saved);
    requestNotificationPermission();
    if (groupId) init(saved);
    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    };
  }, [groupId]);

  const init = async (current: string) => {
    const gid = parseInt(groupId!);

    // Load or create group
    const { data: existingGroup } = await supabase
      .from("wintozo_groups")
      .select("*")
      .eq("id", gid)
      .single();

    if (existingGroup) {
      setGroupName(existingGroup.name || `Группа #${gid}`);
      setGroupAvatarUrl(existingGroup.avatar_url || null);
      setNameInput(existingGroup.name || "");
    } else {
      // Create the group if it doesn't exist (user came by direct link)
      await supabase.from("wintozo_groups").insert({
        id: gid,
        name: `Группа #${gid}`,
        avatar_url: null,
        created_by: current,
      });
      setGroupName(`Группа #${gid}`);
      setGroupAvatarUrl(null);
      setNameInput(`Группа #${gid}`);
    }

    // Load messages
    const { data: msgData } = await supabase
      .from("wintozo_group_messages")
      .select("*")
      .eq("group_id", gid)
      .order("created_at", { ascending: true })
      .limit(200);

    if (msgData) {
      messageIdsRef.current.clear();
      msgData.forEach((m: Message) => messageIdsRef.current.add(m.id));
      setMessages(msgData);

      const usernames = [...new Set(msgData.map((m: Message) => m.from_user))];
      const { data: users } = await supabase
        .from("wintozo_users")
        .select("username, avatar, avatar_url")
        .in("username", usernames);
      const cache: Record<string, UserInfo> = {};
      (users as any[])?.forEach((u) => {
        cache[u.username] = { username: u.username, avatar: u.avatar, avatar_url: u.avatar_url };
      });
      setUserCache(cache);
    }
    setLoading(false);

    // Subscribe to messages
    if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    const channel = supabase
      .channel(`group_${gid}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "wintozo_group_messages",
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.group_id === gid) {
          if (!messageIdsRef.current.has(msg.id)) {
            messageIdsRef.current.add(msg.id);
            setMessages((prev) => [...prev, msg]);
            if (msg.from_user !== current) {
              const body = msg.image_url ? "Фото" : (msg.text || "Новое сообщение");
              showNotification(`${groupName}: ${msg.from_user}`, body);
            }
            if (!userCache[msg.from_user]) {
              supabase.from("wintozo_users").select("username, avatar, avatar_url").eq("username", msg.from_user).single()
                .then(({ data }) => {
                  if (data) setUserCache((prev) => ({ ...prev, [msg.from_user]: data as UserInfo }));
                });
            }
          }
        }
      })
      .subscribe();
    subscriptionRef.current = channel;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !groupId) return;
    const text = inputText.trim();
    setInputText("");

    const { data } = await supabase.from("wintozo_group_messages").insert({
      group_id: parseInt(groupId),
      from_user: username,
      text,
      created_at: new Date().toISOString(),
    }).select().single();

    if (data && !messageIdsRef.current.has(data.id)) {
      messageIdsRef.current.add(data.id);
      setMessages((prev) => [...prev, data]);
    }
  };

  const handleSendImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !groupId) return;

    setSendingImage(true);
    try {
      const fileName = `group_${groupId}_${username}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("wintozo-photos")
        .upload(fileName, file, { upsert: true, contentType: file.type || "image/jpeg" });

      if (uploadError) { alert("Ошибка загрузки: " + uploadError.message); return; }

      const { data: urlData } = supabase.storage.from("wintozo-photos").getPublicUrl(fileName);

      const { data } = await supabase.from("wintozo_group_messages").insert({
        group_id: parseInt(groupId),
        from_user: username,
        image_url: urlData.publicUrl,
        created_at: new Date().toISOString(),
      }).select().single();

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

  const saveGroupName = async () => {
    const trimmed = nameInput.trim() || `Группа #${groupId}`;
    setGroupName(trimmed);
    setEditName(false);
    await supabase.from("wintozo_groups").update({ name: trimmed }).eq("id", parseInt(groupId!));
  };

  const handleShare = () => {
    const url = `https://wintozo.vercel.app/chat/priglashenie/group/${groupId}`;
    if (navigator.share) {
      navigator.share({ title: groupName, url });
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
      {/* Шапка */}
      <div className="bg-white dark:bg-gray-800 border-b-2 border-blue-200 dark:border-gray-700 p-2 flex items-center gap-2 sticky top-0 z-30 transition-colors">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </button>
        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
          {groupAvatarUrl ? (
            <img src={groupAvatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <Users className="w-5 h-5 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {editName ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={30}
                className="flex-1 px-2 py-1 text-sm rounded-lg border-2 border-purple-300 focus:outline-none dark:bg-gray-700 dark:text-gray-100"
                autoFocus
              />
              <button onClick={saveGroupName} className="p-1 text-green-500">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => { setEditName(false); setNameInput(groupName); }} className="p-1 text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{groupName}</p>
              <button onClick={() => setEditName(true)} className="p-0.5 text-gray-400 hover:text-blue-500 shrink-0">
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
          <p className="text-xs text-gray-400">Групповой чат</p>
        </div>
        <button
          onClick={handleShare}
          className="p-2 text-purple-500 dark:text-purple-400 rounded-xl hover:bg-purple-50 dark:hover:bg-gray-700 shrink-0"
          title="Поделиться"
        >
          {copied ? <Check className="w-5 h-5 text-green-500" /> : <Share2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-blue-400">
            <p className="text-base font-medium">Нет сообщений</p>
            <p className="text-xs">Напишите первое сообщение в группу!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => {
              const isOwn = msg.from_user === username;
              const userInfo = userCache[msg.from_user];
              return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                    {!isOwn && (
                      <div className="flex items-center gap-1 mb-0.5 px-1">
                        <Avatar avatarUrl={userInfo?.avatar_url} avatarLetter={userInfo?.avatar || msg.from_user.charAt(0)} size="sm" />
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{msg.from_user}</span>
                      </div>
                    )}
                    <div
                      className={`px-3 py-2 rounded-2xl ${
                        isOwn
                          ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-tr-sm"
                          : "bg-white dark:bg-gray-700 border-2 border-blue-100 dark:border-gray-600 text-gray-800 dark:text-gray-100 rounded-tl-sm shadow-sm"
                      } transition-colors`}
                    >
                      {msg.image_url ? (
                        <img
                          src={msg.image_url}
                          alt="photo"
                          className="rounded-xl max-w-[220px] max-h-[300px] object-cover cursor-pointer"
                          onClick={() => msg.image_url && window.open(msg.image_url, "_blank")}
                        />
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                      )}
                      <p className={`text-[10px] mt-1 ${isOwn ? "text-blue-100" : "text-gray-400"}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Форма */}
      <form onSubmit={handleSendText} className="bg-white dark:bg-gray-800 border-t-2 border-blue-200 dark:border-gray-700 p-2 flex items-center gap-2 transition-colors">
        {sendingImage ? (
          <div className="flex-1 flex items-center justify-center py-2">
            <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-400 ml-2">Отправка фото...</span>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Сообщение..."
              className="flex-1 px-3 py-2 rounded-xl border-2 border-blue-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none text-gray-800 dark:text-gray-100 dark:bg-gray-700 dark:placeholder-gray-500 text-sm font-medium transition-colors"
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
    </div>
  );
}
