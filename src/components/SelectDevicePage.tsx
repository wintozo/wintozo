import { useNavigate } from "react-router-dom";
import { Smartphone, Monitor, ArrowLeft, MessageCircle } from "lucide-react";

export default function SelectDevicePage() {
  const navigate = useNavigate();

  const selectDevice = (device: "mobile" | "pc") => {
    localStorage.setItem("wintozo_device", device);
    navigate(`/${device}/test/chat`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center transition-colors">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-800 rounded-full px-4 py-1.5 mb-4">
            <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-800 dark:text-blue-300 text-sm font-semibold">Wintozo</span>
          </div>
          <h1 className="text-4xl font-black text-blue-900 dark:text-blue-100 mb-2">Выберите устройство</h1>
          <p className="text-blue-600 dark:text-blue-400 text-base font-medium">
            От этого зависит интерфейс чата
          </p>
        </div>

        <div className="space-y-4">
          {/* Телефон */}
          <button
            onClick={() => selectDevice("mobile")}
            className="w-full bg-white dark:bg-gray-800 rounded-3xl border-2 border-blue-200 dark:border-gray-700 p-6 shadow-md hover:border-blue-500 hover:shadow-lg transition-all flex items-center gap-5 group"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-xl font-black text-gray-800 dark:text-gray-100">Телефон</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Мобильный интерфейс</p>
            </div>
            <ArrowLeft className="w-6 h-6 text-blue-400 rotate-180 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* ПК */}
          <button
            onClick={() => selectDevice("pc")}
            className="w-full bg-white dark:bg-gray-800 rounded-3xl border-2 border-blue-200 dark:border-gray-700 p-6 shadow-md hover:border-blue-500 hover:shadow-lg transition-all flex items-center gap-5 group"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Monitor className="w-8 h-8 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-xl font-black text-gray-800 dark:text-gray-100">Компьютер</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Полноценный интерфейс</p>
            </div>
            <ArrowLeft className="w-6 h-6 text-blue-400 rotate-180 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <button
          onClick={() => navigate("/test/registration")}
          className="mt-6 text-blue-500 dark:text-blue-400 font-medium text-sm flex items-center gap-1 mx-auto hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>
      </div>
    </div>
  );
}
