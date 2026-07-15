import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, ArrowLeft, Mic, Phone, Trash2, User, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";
import CallModal from "./CallModal";
import { useCallStore } from "../store/useCallStore";

export default function DevMobileChatConversationPage() {
  const navigate = useNavigate();
  const { username: contactUsername } = useParams<{ username: string }>();
  const [username, setUsername] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [contactInfo, setContactInfo] = useState<any>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callTarget, setCallTarget] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { openCall, closeCall } = useCallStore();

  useEffect(() => {
    const devUser = localStorage.getItem("dev_username");
    if (!devUser || !contactUsername) {
      navigate("/dev/registration");
      return;
    }
    setUsername(devUser);
    loadConversation(devUser, contactUsername);
    loadContactInfo(contactUsername);
  }, [contactUsername, navigate]);

  const loadContactInfo = async (contact: string) => {
    const { data } = await supabase
      .from("wintozo_users")
      .select("username, avatar, avatar_url, description")
      .eq("username", contact)
      .single();
    setContactInfo(data);
  };

  const loadConversation = async (user: string, contact: string) => {
    const { data } = await supabase
      .from("wintozo_messages")
      .select("*")
      .or(`and(from_user.eq.${user},to_user.eq.${contact}),and(from_user.eq.${contact},to_user.eq.${user})`)
      .order("created_at", { ascending: true });

    if (data) {
      const validMsgs = data.filter(
        (msg: any) => msg.from_user && msg.to_user && msg.from_user !== msg.to_user
      );
      setMessages(validMsgs);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !username || !contactUsername) return;

    await supabase.from("wintozo_messages").insert({
      from_user: username,
      to_user: contactUsername,
      text: inputText.trim(),
      created_at: new Date().toISOString(),
    });

    setInputText("");
    loadConversation(username, contactUsername);
  };

  const handleDeleteMessage = async (id: number) => {
    await supabase.from("wintozo_messages").delete().eq("id", id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const clearChat = async () => {
    if (!username || !contactUsername) return;
    await supabase
      .from("wintozo_messages")
      .delete()
      .or(`and(from_user.eq.${username},to_user.eq.${contactUsername}),and(from_user.eq.${contactUsername},to_user.eq.${username})`);
    setMessages([]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-blue-900 flex flex-col">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-lg p-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/dev/mobile/chat")} className="p-1 text-purple-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Avatar avatarUrl={contactInfo?.avatar_url} avatarLetter={contactInfo?.avatar || contactUsername?.[0]?.toUpperCase() || "?"} size="sm" />
          <div>
            <p className="font-bold text-white text-sm">{contactUsername}</p>
            <p className="text-xs text-purple-300">Тестер</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setCallTarget(contactUsername!);
              openCall(contactUsername!, 'audio');
              setShowCallModal(true);
            }}
            className="p-2 text-green-400"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button onClick={clearChat} className="p-2 text-red-400">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => {
          const isMe = msg.from_user === username;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs px-3 py-2 rounded-2xl ${
                  isMe
                    ? "bg-gradient-to-r from-red-500 to-purple-600 text-white"
                    : "bg-white/10 text-white"
                }`}
              >
                {msg.text && <p className="text-sm">{msg.text}</p>}
                {msg.audio_url && (
                  <audio controls src={msg.audio_url} className="w-full mt-1" />
                )}
                {msg.image_url && (
                  <img src={msg.image_url} alt="" className="rounded-2xl max-w-full mt-1" />
                )}
                <div className="flex items-center gap-1 mt-1">
                  <p className="text-xs opacity-70">{formatTime(msg.created_at)}</p>
                  {!isMe && (
                    <button onClick={() => handleDeleteMessage(msg.id)} className="text-xs text-red-300">
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendText} className="p-3 bg-black/30 backdrop-blur-lg border-t border-white/10 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Сообщение..."
          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
        />
        <button type="submit" className="p-2.5 bg-gradient-to-r from-red-500 to-purple-600 text-white rounded-2xl">
          <Send className="w-5 h-5" />
        </button>
      </form>

      {/* Call Modal */}
      {showCallModal && callTarget && (
        <CallModal currentUsername={username} callTarget={callTarget} onClose={() => setShowCallModal(false)} />
      )}
    </div>
  );
}
