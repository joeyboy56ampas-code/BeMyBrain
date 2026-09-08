import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { checkAdminAccess } from "../../../../lib/checkAdminAccess";

export async function GET() {
  if (!(await checkAdminAccess())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: users, error: usersError } = await supabaseAdmin
    .from("users")
    .select("email, username, name, avatar_url, last_login")
    .order("last_login", { ascending: false });

  if (usersError) {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  const { data: brainRows, error: brainError } = await supabaseAdmin
    .from("brain_data")
    .select("user_email, payload, updated_at");

  if (brainError) {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  const brainByEmail = {};
  brainRows.forEach((row) => {
    brainByEmail[row.user_email] = row;
  });

  // "กำลังใช้งานอยู่" ประมาณจากการ login ล่าสุดภายใน 15 นาที (ไม่ใช่ real-time presence จริง
  // เพราะต้องมี infrastructure เพิ่ม เช่น websocket — นี่คือค่าประมาณที่ตรงไปตรงมาที่สุดเท่าที่ทำได้ตอนนี้)
  const RECENT_MS = 15 * 60 * 1000;
  const now = Date.now();

  const result = users.map((u) => {
    const row = brainByEmail[u.email];
    const payloadStr = row ? JSON.stringify(row.payload || {}) : "";
    const sizeBytes = Buffer.byteLength(payloadStr, "utf8");
    const entries = row?.payload?.entries || [];
    const people = row?.payload?.people || [];
    const categories = row?.payload?.categories || [];
    const lastLoginMs = u.last_login ? new Date(u.last_login).getTime() : null;
    return {
      email: u.email,
      username: u.username,
      name: u.name,
      avatarUrl: u.avatar_url,
      lastLogin: u.last_login,
      recentlyActive: lastLoginMs ? now - lastLoginMs < RECENT_MS : false,
      sizeBytes,
      entryCount: entries.length,
      peopleCount: people.length,
      categoryCount: categories.length,
      photoCount: entries.filter((e) => e.image).length,
    };
  });

  return NextResponse.json({ users: result });
}
