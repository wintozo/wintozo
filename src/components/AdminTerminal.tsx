import { useState, useRef, useEffect } from "react";
import { X, Terminal, Send, UserX, UserCheck, VolumeX, AlertTriangle, UserMinus, Gift, Crown, Award, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";

interface TerminalCommand {
  name: string;
  description: string;
  icon: any;
  color: string;
  execute: (args: string[]) => Promise<string>;
}

export default function AdminTerminal({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<{ type: "info" | "success" | "error" | "command"; text: string }[]>([
    { type: "info", text: "🖥️ Wintozo Admin Terminal v1.0" },
    { type: "info", text: "Введите 'help' для списка команд" },
    { type: "info", text: "────────────────────────────────" },
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const addHistory = (type: "info" | "success" | "error" | "command", text: string) => {
    setHistory((prev) => [...prev, { type, text }]);
  };

  const getUserById = async (id: string) => {
    const { data } = await supabase
      .from("wintozo_users")
      .select("username, avatar, banned, title")
      .eq("username", id)
      .single();
    return data;
  };

  const getAllUsers = async () => {
    const { data } = await supabase
      .from("wintozo_users")
      .select("username, avatar, banned, title, is_admin, avatar_url, description, created_at")
      .order("created_at", { ascending: false });
    return data || [];
  };

  const commands: Record<string, TerminalCommand> = {
    help: {
      name: "help",
      description: "Показать список всех команд",
      icon: Terminal,
      color: "text-blue-400",
      execute: async () => {
        return `Доступные команды:
  /ban [ID] [причина]     — Блокировка пользователя
  /unban [ID]             — Разблокировка пользователя
  /mute [ID] [время]      — Ограничение на отправку сообщений (10m, 1h, 1d)
  /warn [ID]              — Выдать предупреждение (3 варна = бан)
  /kick [ID]              — Исключить из общего чата
  /delete [ID]            — Удалить пользователя навсегда
  /give w-pro (ник) X     — Выдать Wintozo Pro на X дней
  /remove w-pro (ник)     — Забрать Wintozo Pro
  /tittle give (ник) X    — Выдать титул (owner, tester, Spidi)
  /tittle remove (ник) X  — Забрать титул
  /users                  — Показать всех пользователей
  /clear                  — Очистить терминал`;
      }
    },

    ban: {
      name: "ban",
      description: "Забанить пользователя",
      icon: UserX,
      color: "text-red-400",
      execute: async (args) => {
        const id = args[0];
        const reason = args.slice(1).join(" ") || "без причины";
        if (!id) return "❌ Ошибка: укажите ID пользователя. Пример: /ban Admin причина";

        const user = await getUserById(id);
        if (!user) return `❌ Пользователь ${id} не найден`;

        // Прямое обновление banned = true
        const { error: banError } = await supabase
          .from("wintozo_users")
          .update({ banned: true })
          .eq("username", id);

        if (banError) return `❌ Ошибка бана: ${banError.message}`;

        // Удаляем сообщения и данные из чатов
        await supabase
          .from("wintozo_messages")
          .delete()
          .or(`from_user.eq.${id},to_user.eq.${id}`);
        await supabase
          .from("wintozo_group_messages")
          .delete()
          .eq("from_user", id);
        await supabase
          .from("wintozo_battle_users")
          .delete()
          .eq("username", id);
        await supabase
          .from("wintozo_pro")
          .delete()
          .eq("username", id);

        addHistory("error", `🚫 Пользователь ${id} заблокирован. Причина: ${reason}`);
        return `✅ Пользователь ${id} заблокирован. Причина: ${reason}\nВсе сообщения с этим пользователем удалены из чатов.`;
      }
    },

    unban: {
      name: "unban",
      description: "Разбанить пользователя",
      icon: UserCheck,
      color: "text-green-400",
      execute: async (args) => {
        const id = args[0];
        if (!id) return "❌ Ошибка: укажите ID пользователя. Пример: /unban Admin";

        const user = await getUserById(id);
        if (!user) return `❌ Пользователь ${id} не найден`;

        if (!user.banned) return `ℹ️ Пользователь ${id} не забанен`;

        const { error } = await supabase.rpc("unban_user", {
          p_target_username: id,
          p_admin_username: "Admin"
        });

        if (error) return `❌ Ошибка: ${error.message}`;

        return `✅ Пользователь ${id} разблокирован`;
      }
    },

    mute: {
      name: "mute",
      description: "Замутить пользователя",
      icon: VolumeX,
      color: "text-yellow-400",
      execute: async (args) => {
        const id = args[0];
        const time = args[1] || "10m";
        if (!id) return "❌ Ошибка: укажите ID и время. Пример: /mute Admin 10m";

        const user = await getUserById(id);
        if (!user) return `❌ Пользователь ${id} не найден`;

        return `✅ Пользователь ${id} замучен на ${time}`;
      }
    },

    warn: {
      name: "warn",
      description: "Выдать предупреждение",
      icon: AlertTriangle,
      color: "text-orange-400",
      execute: async (args) => {
        const id = args[0];
        if (!id) return "❌ Ошибка: укажите ID пользователя. Пример: /warn Admin";

        const user = await getUserById(id);
        if (!user) return `❌ Пользователь ${id} не найден`;

        const { data, error } = await supabase.rpc("warn_user", {
          p_target_username: id,
          p_admin_username: "Admin",
          p_reason: "Ручной варн через терминал"
        });

        if (error) return `❌ Ошибка: ${error.message}`;

        return data.message;
      }
    },

    kick: {
      name: "kick",
      description: "Исключить из чата",
      icon: UserMinus,
      color: "text-pink-400",
      execute: async (args) => {
        const id = args[0];
        if (!id) return "❌ Ошибка: укажите ID пользователя. Пример: /kick Admin";

        const user = await getUserById(id);
        if (!user) return `❌ Пользователь ${id} не найден`;

        const { error } = await supabase.rpc("kick_user", {
          p_target_username: id,
          p_admin_username: "Admin"
        });

        if (error) return `❌ Ошибка: ${error.message}`;

        return `✅ Пользователь ${id} исключён из всех чатов. Сообщения удалены.`;
      }
    },

    "give": {
      name: "give",
      description: "Выдать Wintozo Pro",
      icon: Gift,
      color: "text-amber-400",
      execute: async (args) => {
        if (args[0] !== "w-pro") return "❌ Используйте: /give w-pro (ник) X days";

        const nick = args[1];
        const days = parseInt(args[2]) || 30;

        if (!nick) return "❌ Ошибка: укажите ник. Пример: /give w-pro Admin 30 days";

        const { error } = await supabase.rpc("grant_pro", {
          p_target_username: nick,
          p_admin_username: "Admin",
          p_days: days,
          p_reason: "admin_give"
        });

        if (error) return `❌ Ошибка: ${error.message}`;

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);

        return `✅ Пользователю ${nick} выдан Wintozo Pro на ${days} дней (до ${endDate.toLocaleDateString("ru-RU")})`;
      }
    },

    "remove": {
      name: "remove",
      description: "Забрать Wintozo Pro",
      icon: Trash2,
      color: "text-gray-400",
      execute: async (args) => {
        if (args[0] !== "w-pro") return "❌ Используйте: /remove w-pro (ник)";

        const nick = args[1];
        if (!nick) return "❌ Ошибка: укажите ник. Пример: /remove w-pro Admin";

        const { error } = await supabase.rpc("revoke_pro", {
          p_target_username: nick,
          p_admin_username: "Admin"
        });

        if (error) return `❌ Ошибка: ${error.message}`;

        return `✅ У пользователя ${nick} забран Wintozo Pro`;
      }
    },

    "tittle": {
      name: "tittle",
      description: "Управление титулами",
      icon: Award,
      color: "text-cyan-400",
      execute: async (args) => {
        if (args[0] === "give") {
          const nick = args[1];
          const title = args[2];

          if (!nick || !title) return "❌ Используйте: /tittle give (ник) (title)";

          const validTitles = ["owner", "tester", "Spidi"];
          if (!validTitles.includes(title)) return `❌ Неверный титул. Доступные: ${validTitles.join(", ")}`;

          const user = await getUserById(nick);
          if (!user) return `❌ Пользователь ${nick} не найден`;

          await supabase
            .from("wintozo_users")
            .update({ title: title })
            .eq("username", nick);

          return `✅ Титул "${title}" выдан пользователю ${nick}`;
        }

        if (args[0] === "remove") {
          const nick = args[1];
          const title = args[2];

          if (!nick || !title) return "❌ Используйте: /tittle remove (ник) (title)";

          const user = await getUserById(nick);
          if (!user) return `❌ Пользователь ${nick} не найден`;

          await supabase
            .from("wintozo_users")
            .update({ title: null })
            .eq("username", nick);

          return `✅ Титул удалён у пользователя ${nick}`;
        }

        return "❌ Используйте: /tittle give/remove (ник) (title)";
      }
    },

    "delete": {
      name: "delete",
      description: "Удалить пользователя",
      icon: Trash2,
      color: "text-red-500",
      execute: async (args) => {
        const id = args[0];
        if (!id) return "❌ Ошибка: укажите ID пользователя. Пример: /delete Admin";

        const user = await getUserById(id);
        if (!user) return `❌ Пользователь ${id} не найден`;
        if (id === "Admin") return "❌ Нельзя удалить админа";

        const { error } = await supabase.rpc("delete_user", {
          p_target_username: id,
          p_admin_username: "Admin"
        });

        if (error) return `❌ Ошибка: ${error.message}`;

        return `🗑 Пользователь ${id} удалён навсегда`;
      }
    },

    users: {
      name: "users",
      description: "Показать всех пользователей",
      icon: UserCheck,
      color: "text-emerald-400",
      execute: async () => {
        const users = await getAllUsers();
        
        // Получаем Pro статусы
        const { data: proData } = await supabase
          .from("wintozo_pro")
          .select("username, end_date, reason");
        
        const proMap: Record<string, any> = {};
        (proData || []).forEach((p: any) => {
          proMap[p.username] = p;
        });

        if (users.length === 0) return "ℹ️ Пользователей нет";

        const lines = users.map((u: any) => {
          const status = u.banned ? "🚫" : "✅";
          const admin = u.is_admin ? "👑" : "";
          const pro = proMap[u.username] ? "👑" : "";
          const title = u.title ? ` [${u.title}]` : "";
          return `${status} ${admin}${u.username}${title} ${pro}`;
        });

        return `Всего пользователей: ${users.length}\n${lines.join("\n")}`;
      }
    },

    clear: {
      name: "clear",
      description: "Очистить терминал",
      icon: Terminal,
      color: "text-gray-400",
      execute: async () => {
        setHistory([]);
        return "";
      }
    },
  };

  const handleCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    addHistory("command", `$ ${cmd}`);

    const parts = cmd.trim().split(/\s+/);
    const commandName = parts[0].toLowerCase().replace("/", "");
    const args = parts.slice(1);

    if (commandName === "clear") {
      await commands.clear.execute(args);
      return;
    }

    const command = commands[commandName];
    if (!command) {
      addHistory("error", `❌ Неизвестная команда: ${commandName}. Введите 'help' для списка команд.`);
      return;
    }

    try {
      const result = await command.execute(args);
      if (result) {
        const resultType = result.startsWith("✅") ? "success" : result.startsWith("❌") ? "error" : "info";
        addHistory(resultType, result);
      }
    } catch (err: any) {
      addHistory("error", `❌ Ошибка: ${err.message}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCommand(input);
    setInput("");
    setCommandHistory((prev) => [...prev, input]);
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl h-[80vh] bg-gray-900 rounded-2xl border border-gray-700 flex flex-col overflow-hidden shadow-2xl">
        {/* Шапка терминала */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-green-400" />
            <span className="text-white font-bold text-sm">Wintozo Terminal</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Вывод терминала */}
        <div
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1"
        >
          {history.map((line, i) => (
            <div
              key={i}
              className={`${
                line.type === "command"
                  ? "text-gray-500"
                  : line.type === "success"
                  ? "text-green-400"
                  : line.type === "error"
                  ? "text-red-400"
                  : "text-gray-300"
              }`}
            >
              {line.text}
            </div>
          ))}
        </div>

        {/* Ввод команды */}
        <form onSubmit={handleSubmit} className="bg-gray-800 border-t border-gray-700 px-4 py-3 flex items-center gap-2">
          <span className="text-green-400 font-mono font-bold text-sm shrink-0">❯</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите команду..."
            className="flex-1 bg-transparent text-white font-mono text-sm focus:outline-none placeholder-gray-600"
            autoFocus
          />
          <button
            type="submit"
            className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4 text-green-400" />
          </button>
        </form>
      </div>
    </div>
  );
}
