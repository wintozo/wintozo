import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight, Eye, EyeOff, Shield, AlertTriangle, User } from "lucide-react";
import { supabase } from "../lib/supabase";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "wintozo_salt_2026");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function MessengerPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const tempUsername = localStorage.getItem("messenger_temp_username") || "";

  if (!tempUsername) {
    navigate("/registration/messenger/username");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 4) {
      setError("Пароль должен быть не менее 4 символов");
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);

    try {
      const passwordHash = await hashPassword(password);

      const { data: existingUser } = await supabase
        .from("wintozo_users")
        .select("*")
        .eq("username", tempUsername)
        .single();

      if (existingUser) {
        if (existingUser.banned) {
          setError("Вы заблокированы");
          setLoading(false);
          return;
        }
        if (existingUser.password_hash !== passwordHash) {
          setError("Неверный пароль");
          setLoading(false);
          return;
        }
        completeAuth(tempUsername);
      } else {
        const { error: insertError } = await supabase.from("wintozo_users").insert({
          username: tempUsername,
          password_hash: passwordHash,
          avatar: tempUsername[0].toUpperCase(),
          description: "",
          created_at: new Date().toISOString(),
        });

        if (insertError) {
          if (insertError.code === "23505") {
            setError("Этот ник уже занят");
          } else {
            setError(insertError.message || "Ошибка регистрации");
          }
          setLoading(false);
          return;
        }

        completeAuth(tempUsername);
      }
    } catch (err) {
      setError("Ошибка подключения к серверу");
      setLoading(false);
    }
  };

  const completeAuth = (username: string) => {
    localStorage.setItem("wintozo_username", username);
    localStorage.setItem("wintozo_avatar", username[0].toUpperCase());
    localStorage.removeItem("messenger_temp_username");
    navigate("/registration/select");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Регистрация</h1>
          <p className="text-gray-400 text-sm">
            Придумайте пароль
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-white/5 rounded-2xl border border-white/10">
              <User className="w-5 h-5 text-purple-300" />
              <span className="text-white font-medium">{tempUsername}</span>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-lg"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300" />
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
                className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-lg"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/40 text-red-200 px-4 py-3 rounded-2xl text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim() || !confirmPassword.trim()}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-bold rounded-2xl hover:from-purple-600 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Далее
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 bg-yellow-500/10 border border-yellow-400/30 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-200 text-sm font-medium">⚠️ Запомните пароль!</p>
                <p className="text-yellow-300/80 text-xs mt-1">
                  Это ваш секретный код для входа. Без него вы не сможете вернуться.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => navigate("/registration/messenger/username")}
            className="text-gray-400 hover:text-white text-sm underline"
          >
            ← Изменить ник
          </button>
          <button
            onClick={() => navigate("/registration")}
            className="text-gray-400 hover:text-white text-sm underline"
          >
            Вернуться к старой версии регистрации
          </button>
        </div>
      </div>
    </div>
  );
}
