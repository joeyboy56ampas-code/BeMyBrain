import { createClient } from "@supabase/supabase-js";

// ใช้ Service Role Key เท่านั้น — ห้าม import ไฟล์นี้ในโค้ดฝั่ง client เด็ดขาด
// เพราะคีย์นี้มีสิทธิ์เต็ม ต้องรันบนเซิร์ฟเวอร์เท่านั้น
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
