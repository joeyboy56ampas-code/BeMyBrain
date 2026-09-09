import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../../../lib/supabaseAdmin";
import { checkAdminAccess } from "../../../../../../../lib/checkAdminAccess";
import { deletePhotoByUrl } from "../../../../../../../lib/deleteStorageFiles";

export async function DELETE(request, { params }) {
  if (!(await checkAdminAccess())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const email = decodeURIComponent(params.email);
  const entryId = params.entryId;

  const { data: row, error: fetchError } = await supabaseAdmin
    .from("brain_data")
    .select("payload")
    .eq("user_email", email)
    .maybeSingle();

  if (fetchError || !row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const allEntries = row.payload?.entries || [];
  const target = allEntries.find((e) => e.id === entryId);

  // ลบไฟล์รูป/ภาพปกใน Storage ก่อน — ถ้าพังไม่ให้ทั้ง route ล่ม แค่บันทึกไว้เตือนตอนจบ
  let storageWarning = false;
  try {
    if (target?.image) await deletePhotoByUrl(target.image);
    if (target?.thumbnail) await deletePhotoByUrl(target.thumbnail);
  } catch (e) {
    console.error("delete entry: storage cleanup failed", e);
    storageWarning = true;
  }

  const nextEntries = allEntries.filter((e) => e.id !== entryId);
  const nextPayload = { ...row.payload, entries: nextEntries };

  const { error: updateError } = await supabaseAdmin
    .from("brain_data")
    .update({ payload: nextPayload, updated_at: new Date().toISOString() })
    .eq("user_email", email);

  if (updateError) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, warning: storageWarning ? "storage_cleanup_incomplete" : undefined });
}
