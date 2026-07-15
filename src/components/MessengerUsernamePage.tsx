import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowRight, User } from "lucide-react";

export default function MessengerUsernamePage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmed = nickname.trim();
    
    if (!trimmed) {
      setError("Введите никнейм");
      setLoading(false);
      return;
    }

    if (trimmed.length < 3) {
      setError("Никнейм должен быть не менее 3 символов");
      setLoading(false);
      return;
    }

    localStorage.setItem("messenger_temp_username", trimmed);
    navigate("/registration/messenger/password");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Регистрация</h1>
          <p className="text-gray-400 text-sm">
            Придумайте Никнейм
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300" />
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Никнейм"
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-lg"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/40 text-red-200 px-4 py-3 rounded-2xl text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !nickname.trim()}
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
        </div>

        <div className="mt-6 text-center">
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
