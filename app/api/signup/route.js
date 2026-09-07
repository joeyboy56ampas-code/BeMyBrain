import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(request) {
  const { username, email, password, name } = await request.json();

  if (!username || !email || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("email, username")
    .or(`username.eq.${cleanUsername},email.eq.${cleanEmail}`)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "already_exists" }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 10);

  const { error } = await supabaseAdmin.from("users").insert({
    email: cleanEmail,
    username: cleanUsername,
    name: name?.trim() || cleanUsername,
    password_hash,
    last_login: new Date().toISOString(),
  });

  if (error) {
    console.error("signup insert error", error);
    return NextResponse.json({ error: "signup_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
