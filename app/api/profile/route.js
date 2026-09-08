import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../lib/authOptions";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("name, username, email")
    .eq("email", session.user.email)
    .maybeSingle();

  if (error || !user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ name: user.name, username: user.username, email: user.email });
}

export async function PATCH(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { name, username, newPassword } = await request.json();

  const { data: user, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("email, username, password_hash")
    .eq("email", session.user.email)
    .maybeSingle();

  if (fetchError || !user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const updates = {};

  if (typeof name === "string" && name.trim()) {
    updates.name = name.trim();
  }

  if (typeof username === "string" && username.trim()) {
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername !== user.username) {
      const { data: clash } = await supabaseAdmin
        .from("users")
        .select("email")
        .eq("username", cleanUsername)
        .maybeSingle();
      if (clash && clash.email !== user.email) {
        return NextResponse.json({ error: "username_taken" }, { status: 409 });
      }
      updates.username = cleanUsername;
    }
  }

  if (newPassword) {
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "password_too_short" }, { status: 400 });
    }
    updates.password_hash = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, name: user.name, username: user.username });
  }

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update(updates)
    .eq("email", user.email);

  if (updateError) {
    console.error("profile update error", updateError);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    name: updates.name || undefined,
    username: updates.username || user.username,
  });
}
