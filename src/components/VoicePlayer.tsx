import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

type Props = {
  audioUrl: string;
  isOwn: boolean;
  darkMode: boolean;
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoicePlayer({ audioUrl, isOwn, darkMode }: Props) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.preload = "metadata";

    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
    };
  }, [audioUrl]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const btnBg = isOwn
    ? darkMode ? "bg-white/20 hover:bg-white/30" : "bg-black/10 hover:bg-black/20"
    : "bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40";

  const iconColor = isOwn
    ? darkMode ? "text-white" : "text-black"
    : "text-blue-600";

  const progressBarBg = isOwn
    ? darkMode ? "bg-white/20" : "bg-black/20"
    : "bg-gray-200 dark:bg-gray-600";

  const progressFill = isOwn
    ? darkMode ? "bg-white" : "bg-black"
    : "bg-blue-500";

  const durationText = isOwn
    ? darkMode ? "text-gray-400" : "text-gray-500"
    : "text-gray-400";

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <button
        onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${btnBg}`}
      >
        {playing ? (
          <Pause className={`w-4 h-4 ${iconColor}`} />
        ) : (
          <Play className={`w-4 h-4 ml-0.5 ${iconColor}`} fill="currentColor" />
        )}
      </button>
      <div className="flex-1">
        <div className={`h-1.5 rounded-full overflow-hidden ${progressBarBg}`}>
          <div
            className={`h-full rounded-full transition-all ${progressFill}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className={`text-xs mt-0.5 ${durationText}`}>
          {formatDuration(playing ? currentTime : duration)}
        </p>
      </div>
    </div>
  );
}
