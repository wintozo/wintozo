import { useNavigate } from "react-router-dom";
import { Monitor, Smartphone, ArrowLeft } from "lucide-react";

export default function DevSelectDevicePage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("dev_username") || "Tester";

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Заголовок */}
        <h1 className="text-3xl font-black text-white mb-2">Выберите устройство</h1>
        <p className="text-purple-200 mb-8">Привет, {username}! 🧪</p>

        {/* Кнопки устройств */}
        <div className="space-y-4">
          <button
            onClick={() => navigate("/dev/pc/chat")}
            className="w-full p-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 hover:bg-white/20 transition-all flex items-center gap-4 group"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Monitor className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-bold text-lg">Компьютер</h3>
              <p className="text-purple-200 text-sm">Полнофункциональный чат</p>
            </div>
          </button>

          <button
            onClick={() => navigate("/dev/mobile/chat")}
            className="w-full p-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 hover:bg-white/20 transition-all flex items-center gap-4 group"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-bold text-lg">Телефон</h3>
              <p className="text-purple-200 text-sm">Мобильная версия</p>
            </div>
          </button>
        </div>

        {/* Кнопка выхода */}
        <button
          onClick={() => {
            localStorage.removeItem("dev_logged_in");
            localStorage.removeItem("dev_username");
            navigate("/registration");
          }}
          className="mt-8 flex items-center gap-2 text-purple-300 hover:text-white mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Выйти в обычную версию
        </button>
      </div>
    </div>
  );
}
