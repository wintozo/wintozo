import { useState, useRef, useEffect } from "react";
import { Copy, Reply, Forward, Check } from "lucide-react";

interface MessageInfo {
  text: string;
  from: string;
  id?: number;
  image_url?: string | null;
  audio_url?: string | null;
}

interface Props {
  message: MessageInfo;
  position: { x: number; y: number };
  onClose: () => void;
  onReply: (msg: MessageInfo) => void;
  onForward: (msg: MessageInfo) => void;
  onCopy: (text: string) => void;
}

export default function MessageContextMenu({ message, position, onClose, onReply, onForward, onCopy }: Props) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick as EventListener);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick as EventListener);
    };
  }, [onClose]);

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      setCopied(true);
      onCopy(message.text);
      setTimeout(() => onClose(), 800);
    }
  };

  // Отображаем меню над сообщением
  const menuStyle: React.CSSProperties = {
    position: "fixed",
    left: Math.min(position.x, window.innerWidth - 200),
    top: Math.max(10, position.y - 130),
    zIndex: 1000,
  };

  return (
    <div
      ref={ref}
      style={menuStyle}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden min-w-[160px] animate-fade-in"
    >
      {/* Превью сообщения */}
      <div className="px-4 py-2 bg-blue-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">{message.from}</p>
        <p className="text-sm text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
          {message.text || (message.id ? "📷 Фото" : "🎤 Голосовое")}
        </p>
      </div>

      <div className="p-1">
        {/* Ответить */}
        <button
          onClick={() => { onReply(message); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors text-sm"
        >
          <Reply className="w-4 h-4 text-blue-500" />
          Ответить
        </button>

        {/* Переслать */}
        <button
          onClick={() => { onForward(message); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors text-sm"
        >
          <Forward className="w-4 h-4 text-green-500" />
          Переслать
        </button>

        {/* Копировать (только для текста) */}
        {message.text && (
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors text-sm"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-gray-500" />
            )}
            {copied ? "Скопировано" : "Копировать"}
          </button>
        )}
      </div>
    </div>
  );
}