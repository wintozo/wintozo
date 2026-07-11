import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, ArrowRight, ArrowLeft, LogIn, Sun } from "lucide-react";
import { supabase } from "../lib/supabase";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "solnechnaya_salt_2026");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function SolnechnayaAuthPage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const trimmedNick = nickname.trim();
      const passwordHash = await hashPassword(password);

      const { data: existingUser } = await supabase
        .from("solnechnaya_users")
        .select("*")
        .eq("username", trimmedNick)
        .single();

      if (existingUser) {
        if (existingUser.password_hash !== passwordHash) {
          setError("Неверный пароль");
          setLoading(false);
          return;
        }
        localStorage.setItem("solnechnaya_username", trimmedNick);
        localStorage.setItem("solnechnaya_avatar", existingUser.avatar || "🌻");
        navigate("/solnechnaya/registration/select");
      } else {
        const avatars = ["🌻", "🌞", "🏡", "🌳", "🌾", "🦋", "🐝", "🌷"];
        const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

        const { error: insertError } = await supabase.from("solnechnaya_users").insert({
          username: trimmedNick,
          password_hash: passwordHash,
          avatar: randomAvatar,
          created_at: new Date().toISOString(),
        });

        if (insertError) {
          setError(insertError.message);
          setLoading(false);
          return;
        }

        localStorage.setItem("solnechnaya_username", trimmedNick);
        localStorage.setItem("solnechnaya_avatar", randomAvatar);
        navigate("/solnechnaya/registration/select");
      }
    } catch (err: any) {
      setError(err?.message || "Ошибка подключения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-300 rounded-full px-4 py-1.5 mb-4">
            <Sun className="w-4 h-4 text-amber-600" />
            <span className="text-amber-800 text-sm font-semibold">Wintozo × Солнечная</span>
          </div>
          <h1 className="text-4xl font-black text-amber-900 mb-3">
            🌻 Чат Деревни Солнечной
          </h1>
          <p className="text-amber-700 text-base font-medium leading-relaxed">
            Добро пожаловать в чат Деревни Солнечной в Wintozo Messenger!
            <br />
            Зарегистрируйтесь и начинайте общаться с жителями
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border-2 border-amber-200 p-8 shadow-md">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="mb-5">
            <label className="block text-gray-700 font-bold text-sm mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Никнейм
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Например: MARKO5"
              className="w-full px-4 py-3 rounded-xl border-2 border-amber-200 focus:border-amber-500 focus:outline-none text-gray-800 font-medium"
              maxLength={20}
              minLength={2}
              autoFocus
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-bold text-sm mb-2">
              <Lock className="w-4 h-4 inline mr-1" />
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 4 символа"
              className="w-full px-4 py-3 rounded-xl border-2 border-amber-200 focus:border-amber-500 focus:outline-none text-gray-800 font-medium"
              minLength={4}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !nickname.trim() || password.length < 4}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 text-lg"
          >
            {loading ? (
              "Загрузка..."
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Начать общение
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-center text-gray-500 text-sm mt-4">
            Нет аккаунта? Просто введи ник и пароль — регистрация автоматическая.
          </p>
        </form>

        <div className="mt-6 text-center">
          <a
            href="https://derevnyasolnechnaya.vercel.app"
            className="text-amber-500 font-medium text-sm flex items-center gap-1 mx-auto hover:text-amber-700 transition-colors justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад на сайт Деревни
          </a>
        </div>
      </div>
    </div>
  );
}
