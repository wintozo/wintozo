import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xwzgtbgfhtxzeoncdnzo.supabase.co";
const SUPABASE_KEY = "sb_publishable_W1Cyn-4nag2Y7y5qy_e2-Q_v9trNZNQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
