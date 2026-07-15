import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Bell, User, Shield, AlertTriangle, LogOut, Trash2, Monitor, Smartphone } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useDarkMode } from "../hooks/useDarkMode";

export default function DevSettingsPage() {
  const navigate = useNavigate();
  const { darkMode, toggle } = useDarkMode();
  const [username, setUsername] = useState("");

  useEffect(() => {
    const devUser = localStorage.getItem("dev_username");
    if (!devUser) {
      navigate("/dev/registration");
      return;
    }
    setUsername(devUser);
  }, [navigate]);

  const formatTimeLeft = () => {
    const now = new Date();
    const hours = now.getHours();
    const nextClear = new Date(now);
    nextClear.setHours(Math.floor((hours + 2) / 2) * 2, 0, 0, 0);
    if (nextClear <= now) nextClear.setHours(nextClear.getHours() + 2);
    
    const diff = nextClear.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}ч ${m}м`;
  };

  const clearAllData = async () => {
    if (!username) return;
    const { error } = await supabase
      .from("wintozo_messages")
      .delete()
      .or(`from_user.eq.${username},to_user.eq.${username}`);
    
    if (!error) {
      alert("Все данные очищены!");
      navigate("/dev/mobile/chat");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("dev_logged_in");
    localStorage.removeItem("dev_username");
    navigate("/registration");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-blue-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-lg p-4 border-b border-white/10">
        <h1 className="text-xl font-black text-white">⚙️ Настройки DEV</h1>
        <p className="text-purple-300 text-sm mt-1">{username}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Timer */}
        <div className="bg-yellow-500/20 border border-yellow-400/40 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h3 className="text-yellow-200 font-bold">Режим очистки</h3>
          </div>
          <p className="text-yellow-200 text-sm">
            До автоматической очистки данных: <strong>{formatTimeLeft()}</strong>
          </p>
          <p className="text-yellow-300 text-xs mt-1">
            Все сообщения удаляются для экономии места на сервере.
          </p>
        </div>

        {/* Appearance */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <h3 className="text-white font-bold mb-3">🎨 Внешний вид</h3>
          <button
            onClick={toggle}
            className="w-full flex items-center justify-between p-3 bg-white/5 rounded-2xl hover:bg-white/10"
          >
            <div className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-purple-300" />
              <span className="text-white">Тёмная тема</span>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors ${darkMode ? "bg-purple-500" : "bg-gray-600"} relative`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${darkMode ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
          </button>
        </div>

        {/* Notifications */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <h3 className="text-white font-bold mb-3">🔔 Уведомления</h3>
          <button className="w-full p-3 bg-white/5 rounded-2xl hover:bg-white/10 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-300" />
              <span>Push-уведомления</span>
            </div>
            <span className="text-purple-300 text-sm">Вкл</span>
          </button>
        </div>

        {/* Switch Device */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <h3 className="text-white font-bold mb-3">📱 Устройство</h3>
          <button
            onClick={() => navigate("/dev/registration/select")}
            className="w-full flex items-center justify-between p-3 bg-white/5 rounded-2xl hover:bg-white/10"
          >
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-purple-300" />
              <span className="text-white">Сменить устройство</span>
            </div>
            <span className="text-purple-300 text-sm">→</span>
          </button>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/10 border border-red-400/40 rounded-2xl p-4">
          <h3 className="text-red-200 font-bold mb-3 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Опасная зона
          </h3>
          <button
            onClick={clearAllData}
            className="w-full p-3 bg-red-500/20 border border-red-400/40 text-red-200 rounded-2xl hover:bg-red-500/30 mb-2"
          >
            🗑 Очистить все данные
          </button>
          <button
            onClick={handleLogout}
            className="w-full p-3 bg-white/5 border border-white/20 text-white rounded-2xl hover:bg-white/10"
          >
            🚪 Выйти из DEV режима
          </button>
        </div>

        {/* Info */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <h3 className="text-white font-bold mb-2">🧪 О режиме тестировщика</h3>
          <ul className="text-purple-200 text-sm space-y-1">
            <li>• Все данные удаляются каждые 2 часа</li>
            <li>• Можно удалять чужие сообщения</li>
            <li>• Доступ к звонкам и чатам</li>
            <li>• Ник должен содержать "Test" и цифру</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
