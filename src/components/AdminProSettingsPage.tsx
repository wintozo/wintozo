import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, MessageSquare, Check, X, ArrowLeft, Palette } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getProStatus, updateMessageColor } from "../lib/pro";
import type { ProStatus } from "../lib/pro";

export default function AdminProSettingsPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [proStatus, setProStatus] = useState<ProStatus>({ active: false });
  const [messageColor, setMessageColor] = useState("");
  const [adminContacts, setAdminContacts] = useState(2);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("wintozo_username");
    if (!saved) {
      navigate("/registration");
      return;
    }
    setUsername(saved);
    loadProStatus(saved);
  }, []);

  const loadProStatus = async (current: string) => {
    try {
      const pro = await getProStatus(current);
      setProStatus(pro);
      setMessageColor(pro.message_color || "");
      setAdminContacts(pro.admin_contacts || 2);
    } catch {
      setProStatus({ active: false });
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = async (color: string) => {
    setMessageColor(color);
    setShowColorPicker(false);
    try {
      await updateMessageColor(username, color);
      setProStatus((prev) => ({ ...prev, message_color: color }));
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem("wintozo_username");
    localStorage.removeItem("wintozo_avatar");
    localStorage.removeItem("wintozo_avatar_url");
    localStorage.removeItem("wintozo_description");
    localStorage.removeItem("wintozo_device");
    navigate("/registration");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      {/* Шапка */}
      <div className="bg-black/20 backdrop-blur-lg p-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/pc/chat")} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="font-black text-xl text-white">Wintozo Pro</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Статус подписки */}
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl border-2 border-yellow-400/30 overflow-hidden">
              <div className="p-6 flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="font-black text-2xl text-white">Wintozo Pro</h2>
                  {proStatus.active ? (
                    <p className="text-yellow-300 text-sm mt-1">
                      ✅ Активно {proStatus.reason === "admin" ? "навсегда" : `до ${proStatus.end_date ? new Date(proStatus.end_date).toLocaleDateString("ru-RU") : "?"}`}
                    </p>
                  ) : (
                    <p className="text-gray-400 text-sm mt-1">❌ Неактивно</p>
                  )}
                </div>
                {proStatus.active && <span className="text-3xl">👑</span>}
              </div>
            </div>

            {/* Если Pro активен - показываем настройки */}
            {proStatus.active && (
              <>
                {/* Цвет сообщений */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl border-2 border-yellow-400/30 overflow-hidden">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-full p-6 flex items-center gap-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: messageColor || "#3b82f6" }}>
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-lg text-white">Цвет сообщений</h3>
                      <p className="text-sm text-gray-300">Ваши сообщения будут этого цвета в чатах</p>
                    </div>
                    <Palette className="w-5 h-5 text-gray-400" />
                  </button>

                  {showColorPicker && (
                    <div className="px-6 pb-6">
                      <div className="grid grid-cols-4 gap-3">
                        {["#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#6366f1", "#a855f7", "#78716c"].map((c) => (
                          <button
                            key={c}
                            onClick={() => handleColorChange(c)}
                            className={`w-full aspect-square rounded-xl border-2 transition-all ${
                              messageColor === c ? "border-white scale-110 shadow-lg" : "border-transparent"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <button
                          onClick={() => handleColorChange("")}
                          className="w-full aspect-square rounded-xl border-2 border-gray-400/50 flex items-center justify-center text-sm text-gray-300 hover:border-white transition-colors"
                        >
                          Сброс
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Написать админу */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl border-2 border-yellow-400/30 overflow-hidden">
                  <button className="w-full p-6 flex items-center gap-4 hover:bg-white/5 transition-colors">
                    <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                      <Crown className="w-6 h-6 text-red-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-lg text-white">Написать админу</h3>
                      <p className="text-sm text-gray-300">Осталось контактов: {adminContacts} из 2</p>
                    </div>
                    <Check className="w-5 h-5 text-green-400" />
                  </button>
                </div>
              </>
            )}

            {/* Если Pro не активен - показываем что делать */}
            {!proStatus.active && (
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl border-2 border-gray-500/30 p-6 text-center">
                <Crown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="font-bold text-xl text-white mb-2">Wintozo Pro не активен</h3>
                <p className="text-gray-300 text-sm">
                  Чтобы получить Pro, обратитесь к администратору
                </p>
              </div>
            )}

            {/* Выход */}
            <button
              onClick={handleLogout}
              className="w-full bg-red-500/20 hover:bg-red-500/30 border-2 border-red-400/30 rounded-2xl p-4 flex items-center gap-3 transition-colors"
            >
              <X className="w-5 h-5 text-red-400" />
              <span className="flex-1 text-left font-medium text-red-400">Выйти из аккаунта</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
