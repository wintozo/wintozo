export type Badge = {
  text: string;
  color: string;
};

const TESTERS = ["Spidi390", "Нэкстези 🎀"];

export function getUserBadge(username: string): Badge | null {
  if (username === "Admin") {
    return { text: "Создатель", color: "bg-gradient-to-r from-purple-500 to-indigo-500 text-white" };
  }
  if (TESTERS.includes(username)) {
    return { text: "Тестер", color: "bg-gradient-to-r from-green-400 to-emerald-500 text-white" };
  }
  return null;
}
