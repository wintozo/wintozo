import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Copy, Users, Camera } from "lucide-react";
import { supabase } from "../lib/supabase";

function compressImage(file: File, maxSize: number = 256): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read error"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("img error"));
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          if (width > height) {
            if (width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize; }
          } else {
            if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve(file); return; }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.85);
        } catch {
          resolve(file);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function MobileCreateGroup() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [groupName, setGroupName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("wintozo_username");
    if (!saved) {
      navigate("/test/registration");
      return;
    }
    setUsername(saved);
  }, []);

  const handlePickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const blob = await compressImage(file);
      const fileName = `group_avatar_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("wintozo-avatars")
        .upload(fileName, blob, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) { alert("Ошибка: " + uploadError.message); return; }

      const { data: urlData } = supabase.storage.from("wintozo-avatars").getPublicUrl(fileName);
      setAvatarUrl(urlData.publicUrl);
    } catch {
      alert("Не удалось загрузить фото");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError("Введите название группы");
      return;
    }
    setCreating(true);
    setError("");

    try {
      const { data, error: insertError } = await supabase
        .from("wintozo_groups")
        .insert({
          name: groupName.trim(),
          avatar_url: avatarUrl,
          created_by: username,
        })
        .select()
        .single();

      if (insertError) {
        setError("Ошибка: " + insertError.message);
        setCreating(false);
        return;
      }

      setCreatedId(data.id);
    } catch (err: any) {
      setError("Ошибка: " + (err?.message || "не удалось создать группу"));
      setCreating(false);
    }
  };

  const shareLink = createdId
    ? `https://wintozo.vercel.app/mobile/test/chat/group/${createdId}`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col transition-colors">
      {/* Шапка */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-4 text-white sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <p className="font-black text-lg">Новая группа</p>
        </div>
      </div>

      {createdId ? (
        /* Группа создана — показываем ссылку */
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-24 h-24 rounded-3xl overflow-hidden mb-4 shadow-lg bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <Users className="w-12 h-12 text-white" />
            )}
          </div>
          <h2 className="text-xl font-black text-gray-800 dark:text-gray-100 mb-1">{groupName}</h2>
          <p className="text-sm text-gray-400 mb-8">Группа создана!</p>

          {/* Ссылка */}
          <div className="w-full max-w-sm">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">
              Поделитесь ссылкой с друзьями:
            </p>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-700 border-2 border-purple-200 dark:border-gray-600 rounded-xl p-3">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 text-xs text-gray-600 dark:text-gray-300 bg-transparent outline-none truncate"
              />
              <button
                onClick={handleCopy}
                className={`p-2 rounded-lg shrink-0 transition-colors ${
                  copied ? "bg-green-100 text-green-600" : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                }`}
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            {copied && <p className="text-center text-xs text-green-500 mt-2">Ссылка скопирована!</p>}
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 mt-8 w-full max-w-sm">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 py-3 rounded-xl border-2 border-purple-200 dark:border-gray-600 text-purple-600 dark:text-purple-400 font-bold text-sm"
            >
              Назад
            </button>
            <button
              onClick={() => navigate(`/mobile/test/chat/group/${createdId}`)}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm shadow-md"
            >
              Открыть группу
            </button>
          </div>
        </div>
      ) : (
        /* Форма создания */
        <div className="flex-1 overflow-y-auto p-4">
          {/* Аватар — загрузка фото */}
          <div className="flex flex-col items-center mb-6">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-3xl overflow-hidden mb-3 shadow-lg bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center ring-4 ring-purple-100 dark:ring-purple-900/30"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-10 h-10 text-white" />
              )}
            </button>
            <p className="text-sm text-purple-500 font-medium">
              {avatarUrl ? "Фото загружено" : "Нажмите чтобы выбрать фото"}
            </p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePickPhoto} />
          </div>

          {/* Название */}
          <div className="mb-6">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Название группы</p>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Например: Друзья"
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 dark:border-gray-600 focus:border-purple-500 focus:outline-none text-gray-800 dark:text-gray-100 dark:bg-gray-700 text-sm font-medium"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-4 text-center">{error}</p>
          )}

          {/* Кнопка */}
          <button
            onClick={handleCreate}
            disabled={creating || !groupName.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Создание...
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                Создать группу
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
