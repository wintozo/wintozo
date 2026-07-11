import { useNavigate } from "react-router-dom";
import { Smartphone, Monitor, ArrowLeft, Sun } from "lucide-react";

export default function SolnechnayaSelectPage() {
  const navigate = useNavigate();

  const selectDevice = (device: "mobile" | "computer") => {
    localStorage.setItem("solnechnaya_device", device);
    navigate(`/solnechnaya/${device}/chat`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-300 rounded-full px-4 py-1.5 mb-4">
            <Sun className="w-4 h-4 text-amber-600" />
            <span className="text-amber-800 text-sm font-semibold">Деревня Солнечная</span>
          </div>
          <h1 className="text-4xl font-black text-amber-900 mb-2">Выберите устройство</h1>
          <p className="text-amber-600 text-base font-medium">
            От этого зависит интерфейс чата
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => selectDevice("mobile")}
            className="w-full bg-white rounded-3xl border-2 border-amber-200 p-6 shadow-md hover:border-amber-500 hover:shadow-lg transition-all flex items-center gap-5 group"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-xl font-black text-gray-800">Телефон</p>
              <p className="text-sm text-gray-500">Мобильный интерфейс</p>
            </div>
            <ArrowLeft className="w-6 h-6 text-amber-400 rotate-180 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => selectDevice("computer")}
            className="w-full bg-white rounded-3xl border-2 border-amber-200 p-6 shadow-md hover:border-amber-500 hover:shadow-lg transition-all flex items-center gap-5 group"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Monitor className="w-8 h-8 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-xl font-black text-gray-800">Компьютер</p>
              <p className="text-sm text-gray-500">Полноценный интерфейс</p>
            </div>
            <ArrowLeft className="w-6 h-6 text-amber-400 rotate-180 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <button
          onClick={() => navigate("/solnechnaya/registration")}
          className="mt-6 text-amber-500 font-medium text-sm flex items-center gap-1 mx-auto hover:text-amber-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад к регистрации
        </button>

        <a
          href="https://derevnyasolnechnaya.vercel.app"
          className="mt-3 text-amber-500 font-medium text-sm flex items-center gap-1 mx-auto hover:text-amber-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад на сайт Деревни
        </a>
      </div>
    </div>
  );
}
