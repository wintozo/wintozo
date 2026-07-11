import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

type Props = {
  audioUrl: string;
  isOwn: boolean;
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoicePlayer({ audioUrl, isOwn }: Props) {
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

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <button
        onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isOwn ? "bg-white/20 hover:bg-white/30" : "bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200"
        }`}
      >
        {playing ? (
          <Pause className={`w-4 h-4 ${isOwn ? "text-white" : "text-blue-600 dark:text-blue-400"}`} />
        ) : (
          <Play className={`w-4 h-4 ml-0.5 ${isOwn ? "text-white" : "text-blue-600 dark:text-blue-400"}`} fill="currentColor" />
        )}
      </button>
      <div className="flex-1">
        <div className={`h-1.5 rounded-full overflow-hidden ${isOwn ? "bg-white/20" : "bg-gray-200 dark:bg-gray-600"}`}>
          <div
            className={`h-full rounded-full transition-all ${isOwn ? "bg-white" : "bg-blue-500"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className={`text-xs mt-0.5 ${isOwn ? "text-blue-100" : "text-gray-400"}`}>
          {formatDuration(playing ? currentTime : duration)}
        </p>
      </div>
    </div>
  );
}
