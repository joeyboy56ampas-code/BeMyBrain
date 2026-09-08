import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { checkAdminAccess } from "../../../../lib/checkAdminAccess";

export async function POST(request) {
  if (!(await checkAdminAccess())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { confirm } = await request.json();
  // ต้องพิมพ์คำยืนยันตรงตัวเป๊ะ ๆ เท่านั้น กันการกดพลาด
  if (confirm !== "WIPE ALL DATA") {
    return NextResponse.json({ error: "confirmation_mismatch" }, { status: 400 });
  }

  await supabaseAdmin.from("brain_data").delete().neq("user_email", "");
  const { error } = await supabaseAdmin.from("users").delete().neq("email", "");

  if (error) {
    return NextResponse.json({ error: "wipe_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
