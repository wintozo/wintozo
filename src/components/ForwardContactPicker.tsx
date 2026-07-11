import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";

interface Props {
  onSelect: (username: string) => void;
  onClose: () => void;
}

export default function ForwardContactPicker({ onSelect, onClose }: Props) {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<{ username: string; avatar: string; avatar_url: string | null }[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("wintozo_username");
    if (!saved) { navigate("/test/registration"); return; }

    supabase
      .from("wintozo_users")
      .select("username, avatar, avatar_url")
      .neq("username", saved)
      .then(({ data }) => {
        setContacts(data || []);
      });
  }, []);

  const filtered = contacts.filter((c) =>
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl max-h-[70vh] flex flex-col">
        {/* Шапка */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <p className="font-bold text-gray-800 dark:text-gray-100">Переслать</p>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Поиск */}
        <div className="p-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск контактов..."
            className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none"
          />
        </div>

        {/* Список */}
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">Нет контактов</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.username}
                onClick={() => onSelect(c.username)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Avatar avatarUrl={c.avatar_url} avatarLetter={c.avatar} size="sm" />
                <p className="font-medium text-sm text-gray-800 dark:text-gray-100">{c.username}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}