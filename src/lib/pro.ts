import { supabase } from "./supabase";

export type ProStatus = {
  active: boolean;
  reason?: string;
  end_date?: string | null;
  message_color?: string;
  admin_contacts?: number;
};

/** Получить Pro-статус */
export async function getProStatus(username: string): Promise<ProStatus> {
  const { data, error } = await supabase.rpc("get_pro_status", { p_username: username });
  if (error) throw error;
  return data as ProStatus;
}

/** Написать админу */
export async function contactAdmin(username: string) {
  const { data, error } = await supabase.rpc("contact_admin", { p_username: username });
  if (error) throw error;
  return data as { success: boolean; error?: string; remaining?: number };
}

/** Обновить цвет сообщений */
export async function updateMessageColor(username: string, color: string) {
  const { error } = await supabase.rpc("update_message_color", {
    p_username: username,
    p_color: color,
  });
  if (error) throw error;
}

/** Дать Pro пользователю */
export async function grantPro(
  targetUsername: string,
  adminUsername: string,
  days: number | null, // null = навсегда
  reason: string = "admin"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("grant_pro", {
      p_target_username: targetUsername,
      p_days: days,
      p_admin_username: adminUsername,
      p_reason: reason,
    });
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/** Забрать Pro у пользователя */
export async function revokePro(targetUsername: string, adminUsername: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc("revoke_pro", {
      p_target_username: targetUsername,
      p_admin_username: adminUsername,
    });
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}