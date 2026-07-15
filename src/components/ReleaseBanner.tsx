import { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function ReleaseBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Проверяем первый ли это вход в чат
    const firstChat = localStorage.getItem("wintozo_first_chat");
    if (!firstChat) {
      // Первый вход - показываем баннер
      localStorage.setItem("wintozo_first_chat", "true");
      setShow(true);
    }
  }, []);

  const handleClose = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("wintozo_banner_dismissed", new Date().toISOString());
  };

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="font-bold text-sm sm:text-base">
            🎉 Админы, Тестеры, Пользователи Wintozo!
          </p>
          <p className="text-xs sm:text-sm text-white/90 mt-0.5">
            12.07.2026 вышла первая релизная версия! Тесты окончены!
          </p>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
