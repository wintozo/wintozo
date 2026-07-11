import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import MobileBottomNav from "./MobileBottomNav";

type GroupInfo = {
  id: number;
  name: string;
  avatar_url: string | null;
};

export default function MobileGroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("wintozo_username");
    if (!saved) {
      navigate("/test/registration");
      return;
    }
    loadGroups(saved);
  }, []);

  const loadGroups = async (current: string) => {
    // Находим group_id где пользователь отправлял сообщения
    const { data: msgData } = await supabase
      .from("wintozo_group_messages")
      .select("group_id")
      .eq("from_user", current);

    const msgGroupIds = (msgData || []).map((m: any) => m.group_id);

    // Находим group_id где пользователь состоит как участник (по приглашению)
    const { data: memberData } = await supabase
      .from("wintozo_group_members")
      .select("group_id")
      .eq("username", current);

    const memberGroupIds = (memberData || []).map((m: any) => m.group_id);

    const groupIds = [...new Set([...msgGroupIds, ...memberGroupIds])];

    if (groupIds.length === 0) {
      setLoading(false);
      return;
    }

    const { data: groupsData } = await supabase
      .from("wintozo_groups")
      .select("id, name, avatar_url")
      .in("id", groupIds)
      .order("id", { ascending: true });

    setGroups(groupsData || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex flex-col transition-colors">
      {/* Шапка */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 text-white sticky top-0 z-30">
        <p className="font-black text-lg">Группы</p>
      </div>

      {/* Кнопка создать */}
      <div className="p-3">
        <button
          onClick={() => navigate("/mobile/test/chat/group/new")}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-gray-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center shrink-0">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-800 dark:text-gray-100">Создать группу</p>
            <p className="text-xs text-gray-400">Новый групповой чат</p>
          </div>
        </button>
      </div>

      {/* Список групп */}
      <div className="flex-1 overflow-y-auto pb-20 px-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-3 border-blue-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-blue-400">
            <Users2 className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Нет групп</p>
            <p className="text-sm">Создайте группу или присоединитесь по ссылке</p>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => navigate(`/mobile/test/chat/group/${g.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                  {g.avatar_url ? (
                    <img src={g.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Users2 className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{g.name}</p>
                  <p className="text-xs text-gray-400">Групповой чат</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
