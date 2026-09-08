import bcrypt from "bcryptjs";
import { decode } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(request) {
  const { token, username, password, name } = await request.json();

  if (!token || !username || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }

  // ตรวจโทเค็นยืนยัน Gmail ที่เซ็นด้วย NEXTAUTH_SECRET — เป็นหลักฐานว่าอีเมลนี้
  // ผ่านการล็อกอิน Google มาจริง ปลอมแปลงไม่ได้ และหมดอายุใน 10 นาที
  let payload;
  try {
    payload = await decode({ token, secret: process.env.NEXTAUTH_SECRET });
  } catch (e) {
    payload = null;
  }
  if (!payload || payload.purpose !== "google_verify" || !payload.email) {
    return NextResponse.json({ error: "google_not_verified" }, { status: 400 });
  }

  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanUsername = username.trim().toLowerCase();

  // "admin" สงวนไว้สำหรับผู้ดูแลระบบเท่านั้น กันไม่ให้ชนกับ path พิเศษใน authorize()
  if (cleanUsername === "admin") {
    return NextResponse.json({ error: "already_exists" }, { status: 409 });
  }

  const { data: emailMatch } = await supabaseAdmin
    .from("users")
    .select("email, username, password_hash")
    .eq("email", cleanEmail)
    .maybeSingle();

  // อีเมลนี้ลงทะเบียนสมบูรณ์แล้ว (มีรหัสผ่านตั้งไว้แล้ว) -> ห้ามสมัครซ้ำ
  if (emailMatch && emailMatch.password_hash) {
    return NextResponse.json({ error: "already_exists" }, { status: 409 });
  }

  const { data: usernameMatch } = await supabaseAdmin
    .from("users")
    .select("email")
    .eq("username", cleanUsername)
    .maybeSingle();

  // username นี้ถูกคนอื่น (อีเมลอื่น) ใช้ไปแล้ว -> ห้ามใช้ซ้ำ
  if (usernameMatch && usernameMatch.email !== cleanEmail) {
    return NextResponse.json({ error: "already_exists" }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 10);

  const { error } = await supabaseAdmin.from("users").upsert(
    {
      email: cleanEmail,
      username: cleanUsername,
      name: name?.trim() || payload.name || cleanUsername,
      password_hash,
      last_login: new Date().toISOString(),
    },
    { onConflict: "email" }
  );

  if (error) {
    console.error("signup insert error", error);
    return NextResponse.json({ error: "signup_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, username: cleanUsername });
}
