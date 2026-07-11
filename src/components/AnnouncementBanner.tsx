import { useState } from "react";
import { X, Megaphone } from "lucide-react";

interface Props {
  storageKey?: string;
}

export default function AnnouncementBanner({ storageKey = "wintozo_announcement" }: Props) {
  const [visible, setVisible] = useState(() => {
    return !localStorage.getItem(storageKey);
  });

  const handleClose = () => {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mx-3 mt-2 mb-1 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-indigo-500/10 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700/50 rounded-2xl p-4 relative">
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 p-1 rounded-lg text-purple-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
          <Megaphone className="w-4 h-4 text-white" />
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          Здравствуйте тестеры, админы, пользователи Wintozo! Сегодня 11.07.2026 выходит Пре-релизная версия! Спасибо всем кто участвовал в бета - тесте!
        </p>
      </div>
    </div>
  );
}