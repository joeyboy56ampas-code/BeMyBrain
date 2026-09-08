import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../../../lib/authOptions";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { checkAdminAccess } from "../../../../../lib/checkAdminAccess";
import { deleteUserPhotos } from "../../../../../lib/deleteStorageFiles";

export async function GET(request, { params }) {
  if (!(await checkAdminAccess())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const email = decodeURIComponent(params.email);

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("email, username, name, avatar_url, last_login")
    .eq("email", email)
    .maybeSingle();

  if (userError || !user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: row } = await supabaseAdmin
    .from("brain_data")
    .select("payload, updated_at")
    .eq("user_email", email)
    .maybeSingle();

  return NextResponse.json({
    user,
    entries: row?.payload?.entries || [],
    people: row?.payload?.people || [],
    categories: row?.payload?.categories || [],
    updatedAt: row?.updated_at || null,
  });
}

export async function DELETE(request, { params }) {
  if (!(await checkAdminAccess())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const email = decodeURIComponent(params.email);

  // ถ้าเข้าถึงผ่านบัญชี Google/username จริง (ไม่ใช่ผ่านรหัส admin) ห้ามลบบัญชีตัวเองพลาด
  const session = await getServerSession(authOptions);
  if (session?.user?.email && email.toLowerCase() === session.user.email.toLowerCase()) {
    return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 });
  }

  // ลบไฟล์รูปของ user คนนี้ใน Storage ด้วย ไม่งั้นไฟล์ค้างกินพื้นที่
  await deleteUserPhotos(email);

  await supabaseAdmin.from("brain_data").delete().eq("user_email", email);
  await supabaseAdmin.from("presence").delete().eq("user_email", email);
  const { error } = await supabaseAdmin.from("users").delete().eq("email", email);

  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
