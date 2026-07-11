import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, ArrowRight, LogIn, MessageCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "wintozo_salt_2026");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function AuthPage() {
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
        .from("wintozo_users")
        .select("*")
        .eq("username", trimmedNick)
        .single();

      if (existingUser) {
        if (existingUser.banned) {
          setError("Вы заблокированы администратором");
          setLoading(false);
          return;
        }
        if (existingUser.password_hash !== passwordHash) {
          setError("Неверный пароль");
          setLoading(false);
          return;
        }
        localStorage.setItem("wintozo_username", trimmedNick);
        localStorage.setItem("wintozo_avatar", existingUser.avatar || "W");
        localStorage.setItem("wintozo_avatar_url", existingUser.avatar_url || "");
        localStorage.setItem("wintozo_description", existingUser.description || "");
        navigate("/test/registration/select");
      } else {
        const letters = "WVSMDKALNP";
        const randomAvatar = letters[Math.floor(Math.random() * letters.length)];

        const { error: insertError } = await supabase.from("wintozo_users").insert({
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

        localStorage.setItem("wintozo_username", trimmedNick);
        localStorage.setItem("wintozo_avatar", randomAvatar);
        localStorage.setItem("wintozo_avatar_url", "");
        localStorage.setItem("wintozo_description", "");
        navigate("/test/registration/select");
      }
    } catch (err: any) {
      setError(err?.message || "Ошибка подключения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center transition-colors">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-800 rounded-full px-4 py-1.5 mb-4">
            <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-800 dark:text-blue-300 text-sm font-semibold">Wintozo</span>
          </div>
          <h1 className="text-5xl font-black text-blue-900 dark:text-blue-100 mb-2">
            Wintozo
          </h1>
          <p className="text-blue-600 dark:text-blue-400 text-lg font-medium">
            Мессенджер
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-3xl border-2 border-blue-200 dark:border-gray-700 p-8 shadow-md transition-colors">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="mb-5">
            <label className="block text-gray-700 dark:text-gray-300 font-bold text-sm mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Никнейм
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Например: MARKO5"
              className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none text-gray-800 dark:text-gray-100 dark:bg-gray-700 dark:placeholder-gray-500 font-medium transition-colors"
              maxLength={20}
              minLength={2}
              autoFocus
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 font-bold text-sm mb-2">
              <Lock className="w-4 h-4 inline mr-1" />
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 4 символа"
              className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none text-gray-800 dark:text-gray-100 dark:bg-gray-700 dark:placeholder-gray-500 font-medium transition-colors"
              minLength={4}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !nickname.trim() || password.length < 4}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 text-lg"
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

          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-4">
            Нет аккаунта? Просто введи ник и пароль — регистрация автоматическая.
          </p>
        </form>
      </div>
    </div>
  );
}
