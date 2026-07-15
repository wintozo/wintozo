import { useNavigate } from "react-router-dom";
import { Smartphone, ArrowLeft, MessageCircle } from "lucide-react";

export default function SelectDevicePage() {
  const navigate = useNavigate();

  const selectDevice = () => {
    localStorage.setItem("wintozo_device", "mobile");
    navigate("/registration/select/style");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Выберите устройство</h1>
          <p className="text-gray-400 text-sm">
            От этого зависит интерфейс чата
          </p>
        </div>

        <div className="space-y-4">
          {/* Телефон */}
          <button
            onClick={selectDevice}
            className="w-full bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xl font-black text-white">Телефон</p>
                <p className="text-sm text-gray-400">Мобильный интерфейс</p>
              </div>
              <ArrowLeft className="w-6 h-6 text-blue-400 rotate-180 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        <button
          onClick={() => navigate("/registration")}
          className="mt-6 text-gray-400 hover:text-white text-sm underline flex items-center gap-1 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>
      </div>
    </div>
  );
}
