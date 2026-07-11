import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Shield, Search, LogOut, Ban, UserCheck, Trash2, Crown } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getProStatus, grantPro, revokePro } from "../lib/pro";
import type { ProStatus } from "../lib/pro";
import Avatar from "./Avatar";

type User = {
  username: string;
  avatar: string;
  avatar_url: string | null;
  description: string | null;
  banned: boolean;
  created_at: string;
};

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const adminUsername = localStorage.getItem("wintozo_username") || "";
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [proStatusMap, setProStatusMap] = useState<Record<string, ProStatus>>({});
  const [proModal, setProModal] = useState<{ username: string; status: ProStatus } | null>(null);
  const [proDays, setProDays] = useState("7");
  const [proProcessing, setProProcessing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0 && !loading) {
      users.forEach((u) => loadProStatus(u.username));
    }
  }, [users, loading]);

  // Защита: только админ
  if (!adminUsername || adminUsername !== "Admin") {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Доступ запрещён</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Панель администратора доступна только для пользователя Admin.</p>
          <button onClick={onClose} className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from("wintozo_users")
      .select("*")
      .neq("username", "Admin")
      .order("created_at", { ascending: false });
    if (error) console.error("Admin load error:", error);
    if (data) setUsers(data as User[]);
    setLoading(false);
  };

  const loadProStatus = async (username: string) => {
    try {
      const status = await getProStatus(username);
      setProStatusMap((prev) => ({ ...prev, [username]: status }));
    } catch {
      setProStatusMap((prev) => ({ ...prev, [username]: { active: false } }));
    }
  };

  const toggleBan = async (username: string, banned: boolean) => {
    const { error } = await supabase
      .from("wintozo_users")
      .update({ banned: !banned })
      .eq("username", username);
    if (error) {
      alert("Ошибка: " + error.message);
    } else {
      loadUsers();
    }
  };

  const deleteUser = async (username: string) => {
    if (!confirm(`Удалить пользователя ${username}?`)) return;
    
    const { error } = await supabase
      .from("wintozo_users")
      .delete()
      .eq("username", username);
    if (error) {
      alert("Ошибка: " + error.message);
    } else {
      loadUsers();
    }
  };

  const handleGrantPro = async () => {
    if (!proModal || !adminUsername) return;
    setProProcessing(true);
    const days = proDays === "-1" ? null : parseInt(proDays);
    const result = await grantPro(proModal.username, adminUsername, days);
    setProProcessing(false);
    if (result.success) {
      await loadProStatus(proModal.username);
      setProModal(null);
      alert(`Pro выдан ${proModal.username}${days === null ? " навсегда" : ` на ${days} дн.`}`);
    } else {
      alert("Ошибка: " + (result.error || "Не удалось выдать Pro"));
    }
  };

  const handleRevokePro = async () => {
    if (!proModal || !adminUsername) return;
    if (!confirm(`Забрать Pro у ${proModal.username}?`)) return;
    const result = await revokePro(proModal.username, adminUsername);
    if (result.success) {
      await loadProStatus(proModal.username);
      setProModal(null);
      alert(`Pro забран у ${proModal.username}`);
    } else {
      alert("Ошибка: " + (result.error || "Не удалось забрать Pro"));
    }
  };

  const getProDisplay = (username: string) => {
    const status = proStatusMap[username];
    if (!status?.active) return null;
    const isForever = status.reason === "admin";
    return (
      <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded-lg flex items-center gap-1">
        <Crown className="w-3 h-3" />
        {isForever ? "Pro навсегда" : `Pro до ${status.end_date ? new Date(status.end_date).toLocaleDateString("ru-RU") : "?"}`}
      </span>
    );
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Шапка */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-4 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Shield className="w-6 h-6" />
            <h2 className="font-black text-xl">Админ панель</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Поиск */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск пользователей..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 focus:outline-none text-gray-800 dark:text-gray-100 dark:bg-gray-700 dark:placeholder-gray-500 text-sm"
            />
          </div>
        </div>

        {/* Список */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Нет пользователей</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div
                  key={u.username}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl"
                >
                  <Avatar avatarUrl={u.avatar_url} avatarLetter={u.avatar} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{u.username}</p>
                    <p className="text-xs text-gray-400 truncate">{u.description || "Нет описания"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.banned && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg">
                        Забанен
                      </span>
                    )}
                    {getProDisplay(u.username)}
                    <button
                      onClick={() => loadProStatus(u.username).then(() => setProModal({ username: u.username, status: proStatusMap[u.username] || { active: false } }))}
                      className={`p-2 rounded-lg transition-colors ${
                        (proStatusMap[u.username]?.active)
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200"
                          : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200"
                      }`}
                      title={proStatusMap[u.username]?.active ? "Управление Pro" : "Дать Pro"}
                    >
                      <Crown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleBan(u.username, u.banned)}
                      className={`p-2 rounded-lg transition-colors ${
                        u.banned
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200"
                          : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200"
                      }`}
                      title={u.banned ? "Разбанить" : "Забанить"}
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteUser(u.username)}
                      className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Инфо */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-400">
          Пользователей: {filteredUsers.length} | Заблокировано: {users.filter(u => u.banned).length}
        </div>
      </div>

      {/* Модальное окно: Выдать Pro */}
      {proModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4 rounded-t-3xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Crown className="w-6 h-6" />
                <h3 className="font-black text-xl">Wintozo Pro</h3>
              </div>
              <button onClick={() => setProModal(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700 dark:text-gray-200">
                <span className="font-bold">{proModal.username}</span>
              </p>

              {proModal.status.active && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    Сейчас: Pro
                    {proModal.status.reason === "admin" ? " (навсегда)" : ` (до ${proModal.status.end_date ? new Date(proModal.status.end_date).toLocaleDateString("ru-RU") : "?"})`}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Длительность Pro:
                </label>
                <select
                  value={proDays}
                  onChange={(e) => setProDays(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-yellow-500 focus:outline-none text-gray-800 dark:text-gray-100 dark:bg-gray-700 text-sm"
                >
                  <option value="1">1 день</option>
                  <option value="3">3 дня</option>
                  <option value="7">7 дней</option>
                  <option value="14">14 дней</option>
                  <option value="30">30 дней</option>
                  <option value="-1">Навсегда</option>
                </select>
              </div>

              <div className="flex gap-3">
                {!proModal.status.active ? (
                  <button
                    onClick={handleGrantPro}
                    disabled={proProcessing}
                    className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl hover:from-yellow-500 hover:to-orange-600 transition-all disabled:opacity-50"
                  >
                    {proProcessing ? "Выдача..." : "Выдать Pro"}
                  </button>
                ) : (
                  <button
                    onClick={handleRevokePro}
                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all"
                  >
                    Забрать Pro
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
