import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Users, Zap, Crown } from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  getBattleStandings,
  getTeamTop,
  getBattleHistory,
  joinTeam,
  settleBattle,
} from "../lib/battle";
import { getProStatus } from "../lib/pro";
import MobileBottomNav from "./MobileBottomNav";

const ALL_EMOJIS = ["🔥", "🚀", "👑", "🤖", "🎯", "💎", "🌟", "⚡", "🌈", "🦄", "🍀", "🎸"];

export default function MobileBattlePage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [myTeam, setMyTeam] = useState<string | null>(null);
  const [standings, setStandings] = useState<{ emoji: string; total_points: number; member_count: number }[]>([]);
  const [teamTop, setTeamTop] = useState<{ username: string; total_score: number; multiplier: number }[]>([]);
  const [history, setHistory] = useState<{ id: number; week_start: string; week_end: string; winning_emoji: string }[]>([]);
  const [selectedTab, setSelectedTab] = useState<"standings" | "my" | "history">("standings");
  const [proActive, setProActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("wintozo_username");
    if (!saved) { navigate("/test/registration"); return; }
    setUsername(saved);
    init(saved);
  }, []);

  const init = async (current: string) => {
    setLoading(true);
    try {
      await settleBattle();

      const [stand, hist, pro] = await Promise.all([
        getBattleStandings(),
        getBattleHistory(),
        getProStatus(current),
      ]);

      setStandings(stand);
      setHistory(hist);
      setProActive(pro.active);

      // Моя команда
      const { data: myData } = await supabase
        .from("wintozo_battle_users")
        .select("team_emoji")
        .eq("username", current)
        .single();
      if (myData) {
        setMyTeam(myData.team_emoji);
        const top = await getTeamTop(myData.team_emoji);
        setTeamTop(top);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (emoji: string) => {
    if (!username) return;
    setJoining(true);
    try {
      const res = await joinTeam(username, emoji);
      if (res.success) {
        setMyTeam(emoji);
        const top = await getTeamTop(emoji);
        setTeamTop(top);
        const stand = await getBattleStandings();
        setStandings(stand);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setJoining(false);
    }
  };

  const myStanding = standings.find((s) => s.emoji === myTeam);

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex flex-col transition-colors">
      {/* Шапка */}
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-4 text-white sticky top-0 z-30">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <p className="font-black text-lg">Битва смайликов</p>
        </div>
        <div className="flex gap-2">
          {["standings", "my", "history"].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab as any)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                selectedTab === tab ? "bg-white/30 text-white" : "text-white/70 hover:bg-white/10"
              }`}
            >
              {tab === "standings" ? "Рейтинг" : tab === "my" ? "Моя команда" : "История"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Вкладка: Рейтинг */}
            {selectedTab === "standings" && (
              <div className="p-4">
                <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Рейтинг команд
                </h2>
                {standings.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Никто ещё не участвует. Выберите команду!</p>
                ) : (
                  <div className="space-y-3">
                    {standings.map((s, i) => (
                      <div
                        key={s.emoji}
                        className={`p-4 rounded-2xl transition-all ${
                          myTeam === s.emoji
                            ? "bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 ring-2 ring-orange-300"
                            : "bg-white dark:bg-gray-800 border border-orange-100 dark:border-gray-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{s.emoji}</span>
                            <div>
                              <p className="font-bold text-gray-800 dark:text-gray-100">
                                {i + 1} место
                                {myTeam === s.emoji && <span className="text-orange-500 text-xs ml-2">— вы здесь</span>}
                              </p>
                              <p className="text-xs text-gray-400">{s.member_count} участников</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-orange-500">{s.total_points}</p>
                            <p className="text-xs text-gray-400">очков</p>
                          </div>
                        </div>
                        {myTeam !== s.emoji && (
                          <button
                            onClick={() => handleJoin(s.emoji)}
                            disabled={joining}
                            className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-orange-400 to-pink-500 text-white font-bold text-xs shadow-sm"
                          >
                            {joining ? "..." : `Вступить в ${s.emoji}`}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Выбор команды (если ещё не выбрал) */}
                {!myTeam && (
                  <div className="mt-6">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Или выберите команду:</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {ALL_EMOJIS.filter((e) => !standings.some((s) => s.emoji === e)).map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleJoin(emoji)}
                          disabled={joining}
                          className="aspect-square rounded-2xl bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-gray-700 flex items-center justify-center text-3xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Вкладка: Моя команда */}
            {selectedTab === "my" && (
              <div className="p-4">
                {myTeam ? (
                  <>
                    <div className="text-center mb-6">
                      <span className="text-6xl block mb-2">{myTeam}</span>
                      <p className="text-lg font-black text-gray-800 dark:text-gray-100">
                        Команда {myTeam}
                      </p>
                      {myStanding && (
                        <p className="text-sm text-gray-400">
                          {myStanding.total_points} очков · {myStanding.member_count} участников
                        </p>
                      )}
                      {proActive && (
                        <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-700 dark:text-yellow-300 text-xs font-bold">
                          <Crown className="w-3 h-3" /> Pro ×2
                        </div>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Топ участников
                    </h3>
                    {teamTop.length === 0 ? (
                      <p className="text-gray-400 text-center py-6 text-sm">Пока нет очков. Напишите сообщение!</p>
                    ) : (
                      <div className="space-y-2">
                        {teamTop.map((u, i) => (
                          <div
                            key={u.username}
                            className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800 border border-orange-100 dark:border-gray-700"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 text-center font-black text-sm text-gray-400">#{i + 1}</span>
                              <p className="font-medium text-sm text-gray-800 dark:text-gray-100">
                                {u.username}
                                {u.multiplier > 1 && <span className="ml-1 text-yellow-500">👑</span>}
                              </p>
                            </div>
                            <p className="font-bold text-sm text-orange-500">
                              {u.total_score}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handleJoin(myTeam)}
                      disabled={joining}
                      className="w-full mt-6 py-3 rounded-xl border-2 border-red-300 dark:border-red-700 text-red-500 font-bold text-sm"
                    >
                      Сменить команду (очки сбросятся)
                    </button>
                  </>
                ) : (
                  <div className="text-center py-16 text-gray-400">
                    <Zap className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Вы не в команде</p>
                    <p className="text-sm">Перейдите на вкладку «Рейтинг» чтобы выбрать</p>
                  </div>
                )}
              </div>
            )}

            {/* Вкладка: История */}
            {selectedTab === "history" && (
              <div className="p-4">
                <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Прошедшие битвы
                </h2>
                {history.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">История пуста</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800 border border-orange-100 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{h.winning_emoji}</span>
                          <div>
                            <p className="font-bold text-sm text-gray-800 dark:text-gray-100">
                              Победитель: {h.winning_emoji}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(h.week_start).toLocaleDateString("ru-RU")} — {new Date(h.week_end).toLocaleDateString("ru-RU")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}