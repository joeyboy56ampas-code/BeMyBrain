import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { checkAdminAccess } from "../../../../lib/checkAdminAccess";

export async function GET() {
  if (!(await checkAdminAccess())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: users, error: usersError } = await supabaseAdmin
    .from("users")
    .select("email, username, name, avatar_url, last_login");

  if (usersError) {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  // ใช้ SQL function คำนวณขนาด/จำนวนให้ที่ฝั่งฐานข้อมูล แล้วส่งกลับมาแค่ตัวเลข
  // (ของเดิมดึง payload ของทุกคนรวมรูป base64 ทั้งหมดมาคำนวณฝั่ง server ทุก ๆ 5 วิ
  //  ซึ่งกินแบนด์วิดท์มหาศาลและช้าลงเรื่อย ๆ ตามจำนวนข้อมูล)
  const { data: statsRows, error: brainError } = await supabaseAdmin.rpc("admin_brain_stats");

  if (brainError) {
    console.error("stats rpc failed", brainError);
    return NextResponse.json({ error: "load_failed", detail: brainError.message }, { status: 500 });
  }

  const { data: presenceRows } = await supabaseAdmin
    .from("presence")
    .select("user_email, last_seen");

  const statsByEmail = {};
  (statsRows || []).forEach((row) => {
    statsByEmail[row.user_email] = row;
  });

  const presenceByEmail = {};
  (presenceRows || []).forEach((row) => {
    presenceByEmail[row.user_email] = row.last_seen;
  });

  // "กำลังใช้งานอยู่ตอนนี้จริง ๆ" — เว็บส่ง heartbeat มาทุก 20 วิ ขณะเปิดแดชบอร์ดค้างไว้
  // ถือว่า active ถ้า heartbeat ล่าสุดมาไม่เกิน 40 วิ (เผื่อ buffer ให้ heartbeat รอบถัดไปมาไม่ทัน)
  const ACTIVE_WINDOW_MS = 40 * 1000;
  const now = Date.now();

  const result = users.map((u) => {
    const stats = statsByEmail[u.email];
    const sizeBytes = Number(stats?.size_bytes || 0);
    const lastSeenMs = presenceByEmail[u.email] ? new Date(presenceByEmail[u.email]).getTime() : null;
    const lastLoginMs = u.last_login ? new Date(u.last_login).getTime() : null;
    // "last seen" ใช้ค่าที่ใหม่กว่าจริงระหว่าง heartbeat ล่าสุด กับเวลา login ล่าสุด
    // (heartbeat จะแม่นกว่าเสมอถ้ากำลังเปิดแอปอยู่ ไม่ใช่แค่ตอน login ครั้งเดียว)
    const lastSeenIso =
      lastSeenMs && (!lastLoginMs || lastSeenMs > lastLoginMs) ? presenceByEmail[u.email] : u.last_login;
    return {
      email: u.email,
      username: u.username,
      name: u.name,
      avatarUrl: u.avatar_url,
      lastSeen: lastSeenIso,
      recentlyActive: lastSeenMs ? now - lastSeenMs < ACTIVE_WINDOW_MS : false,
      sizeBytes,
      entryCount: Number(stats?.entry_count || 0),
      peopleCount: Number(stats?.people_count || 0),
      categoryCount: Number(stats?.category_count || 0),
      photoCount: Number(stats?.photo_count || 0),
      updatedAt: stats?.updated_at || null,
    };
  });

  result.sort((a, b) => new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0));

  return NextResponse.json({ users: result });
}
