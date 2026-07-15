import { useNavigate, useLocation } from "react-router-dom";
import { MessageCircle, Users, Settings } from "lucide-react";

export default function DevMobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { label: "Чаты", icon: MessageCircle, path: "/dev/mobile" },
    { label: "Контакты", icon: Users, path: "/dev/mobile/contacts" },
    { label: "Настройки", icon: Settings, path: "/dev/mobile/settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-lg border-t border-white/10 flex z-40 transition-colors">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              isActive ? "text-white" : "text-purple-300"
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
