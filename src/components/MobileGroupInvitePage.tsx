import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Users, Check, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";

export default function MobileGroupInvitePage() {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [username, setUsername] = useState("");
  const [group, setGroup] = useState<{ id: number; name: string; avatar_url: string | null; created_by: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("wintozo_username");
    if (!saved) {
      navigate("/test/registration");
      return;
    }
    setUsername(saved);
    loadGroup();
  }, [groupId]);

  const loadGroup = async () => {
    if (!groupId) return;
    try {
      const { data, error } = await supabase
        .from("wintozo_groups")
        .select("*")
        .eq("id", groupId)
        .single();
      
      if (error) {
        setError("Группа не найдена");
        setLoading(false);
        return;
      }
      
      setGroup(data);
      setLoading(false);
    } catch (err: any) {
      setError("Ошибка загрузки группы");
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!groupId || !username) return;
    setJoining(true);
    setError("");

    try {
      const { error } = await supabase
        .from("wintozo_group_members")
        .insert({
          group_id: groupId,
          username: username,
        });

      if (error) {
        // Если уже участник — это ок
        if (error.code === "23505") {
          navigate(`/mobile/test/chat/group/${groupId}`);
          return;
        }
        setError("Ошибка: " + error.message);
        setJoining(false);
        return;
      }

      // Перенаправляем в группу
      navigate(`/mobile/test/chat/group/${groupId}`);
    } catch (err: any) {
      setError("Ошибка: " + (err?.message || "не удалось вступить"));
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-200 dark:border-gray-700 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-4 text-white">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <X className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-black text-gray-800 dark:text-gray-100 mb-2">Группа не найдена</h2>
            <p className="text-sm text-gray-400 mb-6">Возможно, группа была удалена</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-purple-500 text-white rounded-xl font-bold"
            >
              Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* Шапка */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-4 text-white">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <p className="font-black text-lg">Приглашение в группу</p>
        </div>
      </div>

      {/* Контент */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Аватар группы */}
        <div className="w-24 h-24 rounded-3xl overflow-hidden mb-4 shadow-lg bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
          {group.avatar_url ? (
            <img src={group.avatar_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <Users className="w-12 h-12 text-white" />
          )}
        </div>

        {/* Название */}
        <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-2">{group.name}</h2>
        <p className="text-sm text-gray-400 mb-8">
          Создатель: {group.created_by}
        </p>

        {/* Кнопка вступления */}
        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full max-w-sm py-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-base shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {joining ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Вступление...
            </>
          ) : (
            <>
              <Users className="w-5 h-5" />
              Присоединиться
            </>
          )}
        </button>

        {error && (
          <p className="text-sm text-red-500 mt-4 text-center">{error}</p>
        )}

        {/* Успех */}
        {joining && !error && (
          <div className="mt-4 flex items-center gap-2 text-green-500">
            <Check className="w-5 h-5" />
            <span className="text-sm font-medium">Вы вступили в группу!</span>
          </div>
        )}
      </div>
    </div>
  );
}
