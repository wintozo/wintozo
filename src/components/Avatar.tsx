import { useState } from "react";

type Props = {
  avatarUrl?: string | null;
  avatarLetter?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-2xl",
};

export default function Avatar({ avatarUrl, avatarLetter = "W", size = "md", className = "" }: Props) {
  const [imgError, setImgError] = useState(false);

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt="avatar"
        className={`${sizeClasses[size]} rounded-xl object-cover shrink-0 ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center font-black text-white shrink-0 ${className}`}
    >
      {avatarLetter?.charAt(0).toUpperCase() || "W"}
    </div>
  );
}