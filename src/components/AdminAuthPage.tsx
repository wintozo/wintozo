import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, ArrowRight, LogIn, Shield } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function AdminAuthPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Пароль администратора: 2015Nikita2015
  const ADMIN_PASSWORD = "2015Nikita2015";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Проверяем что это именно Admin
      const { data: user } = await supabase
        .from("wintozo_users")
        .select("*")
        .eq("username", "Admin")
        .single();

      if (!user) {
        setError("Пользователь Admin не найден. Сначала создайте аккаунт Admin в обычном чате.");
        setLoading(false);
        return;
      }

      if (password === ADMIN_PASSWORD) {
        localStorage.setItem("wintozo_username", "Admin");
        localStorage.setItem("wintozo_avatar", "A");
        localStorage.setItem("wintozo_avatar_url", "");
        localStorage.setItem("wintozo_description", "");
        localStorage.setItem("wintozo_is_admin", "true");
        navigate("/admin/pc/chat");
      } else {
        setError("Неверный пароль администратора");
      }
    } catch (err: any) {
      setError(err?.message || "Ошибка подключения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center transition-colors">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-400/40 rounded-full px-4 py-1.5 mb-4">
            <Shield className="w-4 h-4 text-purple-300" />
            <span className="text-purple-200 text-sm font-semibold">Admin Panel</span>
          </div>
          <h1 className="text-5xl font-black text-white mb-2">
            Wintozo
          </h1>
          <p className="text-purple-300 text-lg font-medium">
            Панель управления
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-lg rounded-3xl border-2 border-purple-400/30 p-8 shadow-xl">
          {error && (
            <div className="bg-red-500/20 border border-red-400/40 text-red-200 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-purple-200 font-bold text-sm mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Никнейм
            </label>
            <input
              type="text"
              value="Admin"
              readOnly
              className="w-full px-4 py-3 rounded-xl border-2 border-purple-400/40 bg-purple-900/30 text-white font-medium cursor-not-allowed"
            />
          </div>

          <div className="mb-6">
            <label className="block text-purple-200 font-bold text-sm mb-2">
              <Lock className="w-4 h-4 inline mr-1" />
              Пароль администратора
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль админа"
              className="w-full px-4 py-3 rounded-xl border-2 border-purple-400/40 focus:border-purple-500 focus:outline-none text-white bg-purple-900/30 placeholder-purple-400/50 font-medium transition-colors"
              minLength={4}
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || password.length < 4}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 text-lg"
          >
            {loading ? (
              "Загрузка..."
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Войти как админ
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-center text-purple-300/60 text-sm mt-4">
            Доступ только для пользователя Admin
          </p>
        </form>
      </div>
    </div>
  );
}
