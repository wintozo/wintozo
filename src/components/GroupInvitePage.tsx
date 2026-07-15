import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Users, Check } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function GroupInvitePage() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const [groupName, setGroupName] = useState("");
  const [groupAvatarUrl, setGroupAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!groupId) return;
    loadGroup(parseInt(groupId));
  }, [groupId]);

  const loadGroup = async (gid: number) => {
    const { data, error } = await supabase
      .from("wintozo_groups")
      .select("*")
      .eq("id", gid)
      .single();

    if (error) {
      setError("Группа не найдена");
      setLoading(false);
      return;
    }

    setGroupName(data.name || `Группа #${gid}`);
    setGroupAvatarUrl(data.avatar_url || null);
    setLoading(false);
  };

  const handleJoin = async () => {
    const username = localStorage.getItem("wintozo_username");
    if (!username) {
      navigate("/registration");
      return;
    }
    if (!groupId || joining) return;

    setJoining(true);
    setError("");

    try {
      // Отправляем системное сообщение о присоединении
      await supabase.from("wintozo_group_messages").insert({
        group_id: parseInt(groupId),
        from_user: username,
        text: "👋 Присоединился к группе",
        created_at: new Date().toISOString(),
      });

      setJoined(true);
      setTimeout(() => {
        navigate(`/mobile/chat/group/${groupId}`);
      }, 800);
    } catch (err: any) {
      setError("Ошибка: " + (err?.message || "не удалось присоединиться"));
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex flex-col transition-colors">
      {/* Шапка */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 text-white">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <p className="font-black text-lg">Приглашение в группу</p>
        </div>
      </div>

      {/* Контент */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {error ? (
          <div className="text-center">
            <div className="w-24 h-24 rounded-3xl overflow-hidden mb-4 shadow-lg bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center">
              <Users className="w-12 h-12 text-white" />
            </div>
            <p className="text-red-500 font-bold text-lg mb-4">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 rounded-xl bg-blue-500 text-white font-bold"
            >
              Назад
            </button>
          </div>
        ) : (
          <>
            {/* Аватарка группы */}
            <div className="w-24 h-24 rounded-3xl overflow-hidden mb-4 shadow-lg bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
              {groupAvatarUrl ? (
                <img
                  src={groupAvatarUrl}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="w-12 h-12 text-white" />
              )}
            </div>

            {/* Название */}
            <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-2 text-center">
              {groupName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
              Вас пригласили в группу
            </p>

            {/* Кнопка */}
            {joined ? (
              <div className="flex flex-col items-center gap-3">
                <Check className="w-16 h-16 text-green-500" />
                <p className="text-green-600 dark:text-green-400 font-bold text-lg">
                  Вы присоединились!
                </p>
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-black text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {joining ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Присоединяюсь...
                  </>
                ) : (
                  "Присоединиться"
                )}
              </button>
            )}

            {error && (
              <p className="text-sm text-red-500 mt-4 text-center">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
