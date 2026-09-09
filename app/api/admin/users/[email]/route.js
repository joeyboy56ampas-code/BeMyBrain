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

  const session = await getServerSession(authOptions);
  if (session?.user?.email && email.toLowerCase() === session.user.email.toLowerCase()) {
    return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 });
  }

  // *** ทุกขั้นตอนต้องเช็ค error จริง — ห้ามสมมติว่าสำเร็จเฉย ๆ ***
  // เดิมบางขั้นตอนไม่เช็ค error เลย ถ้าขั้นไหนพังแบบเงียบ ๆ บัญชีจะหาย
  // จากรายชื่อ (เพราะ users ถูกลบสำเร็จ) แต่ไฟล์/ข้อมูลจริงยังค้างอยู่ ไม่มีใครรู้
  const steps = [];

  try {
    await deleteUserPhotos(email);
    steps.push("storage:ok");
  } catch (e) {
    console.error("delete user: storage cleanup failed", e);
    steps.push("storage:failed");
    // ไม่ return ทันที — ยังพยายามลบข้อมูลที่เหลือต่อ แต่จะรายงาน error ตอนจบ
  }

  const { error: brainError } = await supabaseAdmin.from("brain_data").delete().eq("user_email", email);
  if (brainError) {
    console.error("delete user: brain_data delete failed", brainError);
    return NextResponse.json({ error: "delete_failed", step: "brain_data", detail: brainError.message }, { status: 500 });
  }

  const { error: presenceError } = await supabaseAdmin.from("presence").delete().eq("user_email", email);
  if (presenceError) {
    console.error("delete user: presence delete failed", presenceError);
    return NextResponse.json({ error: "delete_failed", step: "presence", detail: presenceError.message }, { status: 500 });
  }

  const { error: userDeleteError } = await supabaseAdmin.from("users").delete().eq("email", email);
  if (userDeleteError) {
    console.error("delete user: users delete failed", userDeleteError);
    return NextResponse.json({ error: "delete_failed", step: "users", detail: userDeleteError.message }, { status: 500 });
  }

  if (steps.includes("storage:failed")) {
    // ข้อมูลในฐานข้อมูลลบครบแล้ว แต่ไฟล์รูป/วิดีโออาจมีบางส่วนค้างใน Storage
    // แจ้งตรง ๆ แทนที่จะบอกว่าสำเร็จเฉย ๆ ทั้งที่ไม่ครบจริง
    return NextResponse.json({ ok: true, warning: "storage_cleanup_incomplete" });
  }

  return NextResponse.json({ ok: true });
}
