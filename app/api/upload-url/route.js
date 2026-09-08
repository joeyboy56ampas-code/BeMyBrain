import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../lib/authOptions";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { BUCKET, MAX_VIDEO_BYTES, MAX_IMAGE_BYTES } from "../../../lib/mediaConfig";

// คืน "ลิงก์อัปโหลดชั่วคราว" ให้เบราว์เซอร์ยิงไฟล์ขึ้น Supabase Storage โดยตรง
// สำคัญ: ไฟล์ไม่วิ่งผ่าน Vercel เลย จึงไม่ติดเพดาน 4.5MB ต่อ request
// (ถ้าอัปวิดีโอผ่าน Vercel แบบเดิมจะพังทันทีเพราะวิดีโอใหญ่กว่า 4.5MB แทบทุกไฟล์)
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email === "__admin__") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { kind, size, ext } = await request.json();

  if (kind !== "image" && kind !== "video") {
    return NextResponse.json({ error: "bad_kind" }, { status: 400 });
  }

  const cap = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (typeof size !== "number" || size <= 0 || size > cap) {
    return NextResponse.json({ error: "too_large", cap }, { status: 400 });
  }

  const safeEmail = session.user.email.replace(/[^a-zA-Z0-9]/g, "_");
  const safeExt = String(ext || (kind === "video" ? "mp4" : "jpg")).replace(/[^a-zA-Z0-9]/g, "").slice(0, 5);
  const path = `${safeEmail}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);

  if (error) {
    console.error("signed url error", error);
    return NextResponse.json({ error: "signing_failed", detail: error.message }, { status: 500 });
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path,
    publicUrl: pub.publicUrl,
  });
}
