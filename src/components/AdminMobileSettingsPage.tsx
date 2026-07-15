import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Bell, Moon, Shield, Info, ChevronRight, Camera, Check, X, Zap, Crown, MessageCircle, Terminal } from "lucide-react";
import { useDarkMode } from "../hooks/useDarkMode";
import { supabase } from "../lib/supabase";
import { getProStatus, updateMessageColor, contactAdmin } from "../lib/pro";
import type { ProStatus } from "../lib/pro";
import Avatar from "./Avatar";
import MobileBottomNav from "./MobileBottomNav";
import AdminTerminal from "./AdminTerminal";

export default function AdminMobileSettingsPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("W");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [editDesc, setEditDesc] = useState(false);
  const [descInput, setDescInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [proStatus, setProStatus] = useState<ProStatus>({ active: false });
  const [messageColor, setMessageColor] = useState("");
  const [adminContacts, setAdminContacts] = useState(2);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { darkMode, toggle } = useDarkMode();

  useEffect(() => {
    const saved = localStorage.getItem("wintozo_username");
    const savedAvatar = localStorage.getItem("wintozo_avatar");
    const savedAvatarUrl = localStorage.getItem("wintozo_avatar_url");
    const savedDesc = localStorage.getItem("wintozo_description");
    if (!saved || saved !== "Admin") {
      navigate("/admin/registration");
      return;
    }
    setUsername(saved);
    setAvatar(savedAvatar || "A");
    setAvatarUrl(savedAvatarUrl || null);
    setDescription(savedDesc || "");
    setDescInput(savedDesc || "");
    loadProStatus(saved);
  }, []);

  const loadProStatus = async (current: string) => {
    try {
      const pro = await getProStatus(current);
      setProStatus(pro);
      setMessageColor(pro.message_color || "");
      setAdminContacts(pro.admin_contacts || 2);
    } catch {}
  };

  const handleColorChange = async (color: string) => {
    setMessageColor(color);
    setShowColorPicker(false);
    try {
      await updateMessageColor(username, color);
      setProStatus((prev) => ({ ...prev, message_color: color }));
    } catch {}
  };

  const handleContactAdmin = async () => {
    if (!proStatus.active) return;
    try {
      const res = await contactAdmin(username);
      if (res.success) {
        setAdminContacts(res.remaining || 0);
        alert("Сообщение админу отправлено!");
      } else {
        alert("Лимит исчерпан");
      }
    } catch {}
  };

  const compressImage = (file: File, maxSize: number = 256): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.85);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const fileName = `${username}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("wintozo-avatars")
        .upload(fileName, compressed, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) {
        alert("Ошибка загрузки: " + uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("wintozo-avatars")
        .getPublicUrl(fileName);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("wintozo_users")
        .update({ avatar_url: publicUrl })
        .eq("username", username);

      if (updateError) {
        alert("Ошибка сохранения: " + updateError.message);
        return;
      }

      setAvatarUrl(publicUrl);
      localStorage.setItem("wintozo_avatar_url", publicUrl);
    } catch (err: any) {
      alert("Ошибка: " + (err?.message || "не удалось загрузить фото"));
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const saveDescription = async () => {
    const trimmed = descInput.trim();
    setDescription(trimmed);
    setEditDesc(false);
    localStorage.setItem("wintozo_description", trimmed);

    await supabase
      .from("wintozo_users")
      .update({ description: trimmed })
      .eq("username", username);
  };

  const handleLogout = () => {
    localStorage.removeItem("wintozo_username");
    localStorage.removeItem("wintozo_avatar");
    localStorage.removeItem("wintozo_avatar_url");
    localStorage.removeItem("wintozo_description");
    localStorage.removeItem("wintozo_device");
    localStorage.removeItem("wintozo_is_admin");
    navigate("/admin/registration");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex flex-col transition-colors">
      {/* Шапка */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-4 text-white sticky top-0 z-30">
        <div className="flex items-center justify-between mb-2">
          <p className="font-black text-lg text-center flex-1">Настройки</p>
          <button
            onClick={() => setShowTerminal(true)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors ml-2"
            title="Терминал"
          >
            <Terminal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Профиль */}
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-3xl border-2 border-purple-200 dark:border-gray-700 p-6 shadow-sm flex items-center gap-4 transition-colors">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <Avatar avatarUrl={avatarUrl} avatarLetter={avatar} size="xl" />
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-xl text-gray-800 dark:text-gray-100">{username}</p>
            {editDesc ? (
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="text"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  maxLength={60}
                  className="flex-1 px-2 py-1 text-sm rounded-lg border-2 border-purple-300 focus:outline-none focus:border-purple-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  placeholder="О себе..."
                  autoFocus
                />
                <button onClick={saveDescription} className="p-1 text-green-500 hover:text-green-600">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => { setEditDesc(false); setDescInput(description); }} className="p-1 text-red-500 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-1">
                <p className="text-sm text-gray-400 truncate">{description || "Нет описания"}</p>
                <button onClick={() => setEditDesc(true)} className="p-0.5 text-purple-400 hover:text-purple-600 shrink-0">
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadAvatar}
          />
        </div>
      </div>

      {/* Настройки */}
      <div className="px-4 pb-24 space-y-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-purple-100 dark:border-gray-700 overflow-hidden transition-colors">
          <div className="w-full flex items-center gap-3 p-4 border-b border-purple-50 dark:border-gray-700">
            <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-800 dark:text-gray-200">Уведомления</span>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${notifications ? "bg-purple-500" : "bg-gray-300 dark:bg-gray-600"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${notifications ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div className="w-full flex items-center gap-3 p-4 border-b border-purple-50 dark:border-gray-700">
            <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center">
              <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-800 dark:text-gray-200">Тёмная тема</span>
            <button
              onClick={toggle}
              className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${darkMode ? "bg-purple-500" : "bg-gray-300 dark:bg-gray-600"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${darkMode ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>

          <button className="w-full flex items-center gap-3 p-4 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors border-b border-purple-50 dark:border-gray-700">
            <div className="w-9 h-9 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-800 dark:text-gray-200">Конфиденциальность</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full flex items-center gap-3 p-4 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors">
            <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-800 dark:text-gray-200">О приложении</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* ===== БИТВА СМАЙЛИКОВ ===== */}
        <button
          onClick={() => navigate("/admin/mobile/settings/battle")}
          className="w-full bg-white dark:bg-gray-800 rounded-2xl border-2 border-orange-100 dark:border-orange-900/40 p-4 flex items-center gap-3 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <span className="font-medium text-gray-800 dark:text-gray-200">Битва смайликов</span>
            <p className="text-xs text-gray-400">Выберите команду и зарабатывайте очки</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* ===== WINTOZO PRO ===== */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-yellow-100 dark:border-yellow-900/40 overflow-hidden transition-colors">
          <div className="p-4 flex items-center gap-3 border-b border-yellow-50 dark:border-yellow-900/20">
            <div className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <span className="font-medium text-gray-800 dark:text-gray-200">Wintozo Pro</span>
              {proStatus.active ? (
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Активно {proStatus.reason === "admin" ? "навсегда" : `до ${proStatus.end_date ? new Date(proStatus.end_date).toLocaleDateString("ru-RU") : "?"}`}
                </p>
              ) : (
                <p className="text-xs text-gray-400">Неактивно</p>
              )}
            </div>
            {proStatus.active && <span className="text-lg">👑</span>}
          </div>

          {proStatus.active && (
            <>
              <div className="border-b border-yellow-50 dark:border-yellow-900/20">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: messageColor || "#8b5cf6" }}>
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-medium text-sm text-gray-800 dark:text-gray-200">Цвет сообщений</span>
                    <p className="text-xs text-gray-400">Ваши сообщения будут этого цвета</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                {showColorPicker && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-6 gap-2">
                      {["#8b5cf6", "#3b82f6", "#ec4899", "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#6366f1", "#a855f7", "#78716c"].map((c) => (
                        <button
                          key={c}
                          onClick={() => handleColorChange(c)}
                          className={`w-full aspect-square rounded-xl border-2 transition-all ${
                            messageColor === c ? "border-gray-800 dark:border-white scale-110" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <button
                        onClick={() => handleColorChange("")}
                        className="w-full aspect-square rounded-xl border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center text-xs text-gray-400"
                      >
                        Сброс
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-white dark:bg-gray-800 rounded-2xl border-2 border-red-100 dark:border-red-900/40 p-4 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <div className="w-9 h-9 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center">
            <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <span className="flex-1 text-left font-medium text-red-600 dark:text-red-400">Выйти</span>
        </button>

        <p className="text-center text-xs text-gray-400 pt-4">Wintozo Admin v1.0</p>
      </div>

      <MobileBottomNav />
      {showTerminal && <AdminTerminal onClose={() => setShowTerminal(false)} />}
    </div>
  );
}
