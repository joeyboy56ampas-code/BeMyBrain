import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../lib/authOptions";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

const BUCKET = "memory-photos";

// อัปโหลดรูปทีละใบเข้า Supabase Storage แล้วคืน public URL กลับไป
// (เดิมเก็บเป็น base64 ปนอยู่ใน payload ทำให้ทุกครั้งที่เซฟต้องส่งรูปทั้งหมดไปด้วย
//  พอรูปเกิน ~10 ใบจะชน hard limit 4.5MB ของ Vercel แล้วเซฟไม่ได้อีกเลย)
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email === "__admin__") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  const ext = (file.type || "image/jpeg").split("/")[1] || "jpg";
  const safeEmail = session.user.email.replace(/[^a-zA-Z0-9]/g, "_");
  const path = `${safeEmail}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type || "image/jpeg", upsert: false });

  if (error) {
    console.error("upload error", error);
    return NextResponse.json({ error: "upload_failed", detail: error.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: data.publicUrl, path });
}
