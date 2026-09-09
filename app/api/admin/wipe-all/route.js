import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { checkAdminAccess } from "../../../../lib/checkAdminAccess";
import { deleteAllPhotos } from "../../../../lib/deleteStorageFiles";

export async function POST(request) {
  if (!(await checkAdminAccess())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { confirm } = await request.json();
  if (confirm !== "WIPE ALL DATA") {
    return NextResponse.json({ error: "confirmation_mismatch" }, { status: 400 });
  }

  // ต้องเช็ค error ทุกขั้นตอน — ยืนยันจริงว่าลบสำเร็จ ไม่ใช่แค่สมมติว่าสำเร็จ
  let storageWarning = false;
  try {
    await deleteAllPhotos();
  } catch (e) {
    console.error("wipe-all: storage cleanup failed", e);
    storageWarning = true;
  }

  const { error: brainError } = await supabaseAdmin.from("brain_data").delete().neq("user_email", "");
  if (brainError) {
    console.error("wipe-all: brain_data delete failed", brainError);
    return NextResponse.json({ error: "wipe_failed", step: "brain_data", detail: brainError.message }, { status: 500 });
  }

  const { error: presenceError } = await supabaseAdmin.from("presence").delete().neq("user_email", "");
  if (presenceError) {
    console.error("wipe-all: presence delete failed", presenceError);
    return NextResponse.json({ error: "wipe_failed", step: "presence", detail: presenceError.message }, { status: 500 });
  }

  const { error: usersError } = await supabaseAdmin.from("users").delete().neq("email", "");
  if (usersError) {
    console.error("wipe-all: users delete failed", usersError);
    return NextResponse.json({ error: "wipe_failed", step: "users", detail: usersError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, warning: storageWarning ? "storage_cleanup_incomplete" : undefined });
}
