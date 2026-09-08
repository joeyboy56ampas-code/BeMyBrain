import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../lib/authOptions";
import { deletePhotoByUrl, urlToStoragePath } from "../../../lib/deleteStorageFiles";

// ลบไฟล์รูปเดี่ยวของตัวเอง (เรียกตอน user ลบความทรงจำที่มีรูป หรือเปลี่ยนรูปใหม่)
// ไม่งั้นไฟล์เก่าจะค้างกินพื้นที่ Storage ตลอดไป
export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email === "__admin__") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();
  const path = urlToStoragePath(url);
  if (!path) return NextResponse.json({ ok: true }); // รูป base64 เก่า ไม่มีไฟล์ให้ลบ

  // กันไม่ให้ลบไฟล์ของคนอื่น — path ต้องขึ้นต้นด้วยโฟลเดอร์ของตัวเองเท่านั้น
  const safeEmail = session.user.email.replace(/[^a-zA-Z0-9]/g, "_");
  if (!path.startsWith(`${safeEmail}/`)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await deletePhotoByUrl(url);
  return NextResponse.json({ ok: true });
}
