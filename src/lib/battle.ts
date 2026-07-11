import { supabase } from "./supabase";

const WEEK_START_KEY = "wintozo_battle_week_settled";

/** Присоединиться к команде */
export async function joinTeam(username: string, emoji: string) {
  const { data, error } = await supabase.rpc("join_battle_team", {
    p_username: username,
    p_emoji: emoji,
  });
  if (error) throw error;
  return data as { success: boolean; error?: string };
}

/** Заявить ежедневный бонус */
export async function claimDaily(username: string) {
  const { data, error } = await supabase.rpc("claim_daily_login", {
    p_username: username,
  });
  if (error) throw error;
  return data as { claimed: boolean; streak?: number; reason?: string; mult?: number };
}

/** Добавить очки за сообщение */
export async function addMessagePoints(username: string, type: "text" | "voice" | "image") {
  const { error } = await supabase.rpc("add_message_points", {
    p_username: username,
    p_message_type: type,
  });
  if (error) console.error("addMessagePoints error:", error);
}

/** Получить рейтинг команд */
export async function getBattleStandings() {
  const { data, error } = await supabase.rpc("get_battle_standings");
  if (error) throw error;
  return (data || []) as { emoji: string; total_points: number; member_count: number }[];
}

/** Топ пользователей в команде */
export async function getTeamTop(emoji: string) {
  const { data, error } = await supabase.rpc("get_team_top", { p_emoji: emoji });
  if (error) throw error;
  return (data || []) as { username: string; total_score: number; multiplier: number }[];
}

/** Подвести итоги (если понедельник) */
export async function settleBattle() {
  const settled = localStorage.getItem(WEEK_START_KEY);
  const weekStart = getWeekStart();
  if (settled === weekStart) return null;

  const { data, error } = await supabase.rpc("settle_battle_week");
  if (error) throw error;
  const result = data as { settled: boolean; winner?: string; reason?: string };
  if (result.settled) {
    localStorage.setItem(WEEK_START_KEY, weekStart);
  }
  return result;
}

/** Получить историю побед */
export async function getBattleHistory() {
  const { data, error } = await supabase
    .from("wintozo_battle_history")
    .select("*")
    .order("week_start", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data || []) as { id: number; week_start: string; week_end: string; winning_emoji: string }[];
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}