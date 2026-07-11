import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Send, LogOut, Users, Sun, Home } from "lucide-react";
import { supabase } from "../lib/supabase";

type Message = {
  id: number;
  username: string;
  text: string;
  avatar: string;
  created_at: string;
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function SolnechnayaComputerChat() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("🌻");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);
  const presenceRef = useRef<any>(null);
  const messageIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem("solnechnaya_username");
    const savedAvatar = localStorage.getItem("solnechnaya_avatar");
    if (!saved) {
      navigate("/solnechnaya/registration");
      return;
    }
    setUsername(saved);
    setAvatar(savedAvatar || "🌻");
    loadMessages();
    setupRealtime();
    setupPresence(saved);
    setLoading(false);

    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (presenceRef.current) supabase.removeChannel(presenceRef.current);
    };
  }, []);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("solnechnaya_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);

    if (data) {
      messageIdsRef.current.clear();
      data.forEach((msg: Message) => messageIdsRef.current.add(msg.id));
      setMessages(data);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel("solnechnaya_chat")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "solnechnaya_messages",
      }, (payload) => {
        const msg = payload.new as Message;
        if (!messageIdsRef.current.has(msg.id)) {
          messageIdsRef.current.add(msg.id);
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();
    subscriptionRef.current = channel;
  };

  const setupPresence = (current: string) => {
    const ch = supabase.channel("solnechnaya_presence");
    presenceRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState();
        let count = 0;
        Object.values(state).forEach((arr: any) => {
          count += arr.length;
        });
        setOnlineCount(count);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ username: current });
        }
      });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText("");

    const { data } = await supabase.from("solnechnaya_messages").insert({
      username,
      text,
      avatar,
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
    localStorage.removeItem("solnechnaya_username");
    localStorage.removeItem("solnechnaya_avatar");
    localStorage.removeItem("solnechnaya_device");
    navigate("/solnechnaya/registration");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex flex-col">
      {/* Шапка */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-white flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
            🌻
          </div>
          <div>
            <p className="font-black text-xl">Чат Деревни Солнечной</p>
            <p className="text-amber-100 text-sm flex items-center gap-1">
              <Users className="w-4 h-4" />
              {onlineCount} человек онлайн
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2">
            <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center">
              {avatar}
            </div>
            <span className="font-bold">{username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
            title="Выйти"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <a
            href="https://derevnyasolnechnaya.vercel.app"
            className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
            title="Назад на сайт"
          >
            <Home className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Чат */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-amber-400">
            <Sun className="w-20 h-20 mb-4 opacity-30" />
            <p className="text-xl font-medium">Нет сообщений</p>
            <p className="text-base">Напишите первым!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.username === username;
              return (
                <div key={msg.id} className={`flex gap-3 ${isOwn ? "justify-end" : "justify-start"}`}>
                  {!isOwn && (
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-lg shrink-0">
                      {msg.avatar}
                    </div>
                  )}
                  <div className={`max-w-md ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                    {!isOwn && (
                      <p className="text-sm text-amber-700 font-bold mb-0.5 ml-1">{msg.username}</p>
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        isOwn
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-tr-sm"
                          : "bg-white border-2 border-amber-100 text-gray-800 rounded-tl-sm shadow-sm"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                      <p className={`text-xs mt-1 ${isOwn ? "text-amber-100" : "text-gray-400"}`}>
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

      {/* Форма отправки */}
      <form onSubmit={handleSend} className="bg-white border-t-2 border-amber-200 p-4 max-w-4xl w-full mx-auto flex gap-3">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Напишите сообщение в общий чат..."
          className="flex-1 px-4 py-3 rounded-xl border-2 border-amber-200 focus:border-amber-500 focus:outline-none text-gray-800 font-medium"
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-2"
        >
          <Send className="w-5 h-5" />
          Отправить
        </button>
      </form>
    </div>
  );
}
