import { useNavigate, useLocation } from "react-router-dom";
import { MessageCircle, Users, Users2, Settings } from "lucide-react";

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { label: "Чаты", icon: MessageCircle, path: "/mobile/test/chat" },
    { label: "Контакты", icon: Users, path: "/mobile/test/chat/contacts" },
    { label: "Группы", icon: Users2, path: "/mobile/test/chat/groups" },
    { label: "Настройки", icon: Settings, path: "/mobile/test/settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t-2 border-blue-200 dark:border-gray-700 flex z-40 transition-colors">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 transition-colors ${
              isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
            }`}
          >
            <tab.icon className="w-6 h-6" />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
