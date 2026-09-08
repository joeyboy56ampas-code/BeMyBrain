import { supabaseAdmin } from "./supabaseAdmin";

const BUCKET = "memory-photos";

// ลบไฟล์รูปทั้งหมดของ user คนหนึ่ง (ไฟล์ถูกเก็บในโฟลเดอร์ชื่อตามอีเมลที่แปลงแล้ว)
export async function deleteUserPhotos(email) {
  const safeEmail = email.replace(/[^a-zA-Z0-9]/g, "_");
  const { data: files, error } = await supabaseAdmin.storage.from(BUCKET).list(safeEmail, { limit: 1000 });
  if (error || !files || files.length === 0) return;
  const paths = files.map((f) => `${safeEmail}/${f.name}`);
  await supabaseAdmin.storage.from(BUCKET).remove(paths);
}

// ลบไฟล์รูปทั้ง bucket (ใช้ตอน wipe ทั้งระบบ) — ต้องไล่ทีละโฟลเดอร์ของแต่ละ user
export async function deleteAllPhotos() {
  const { data: folders, error } = await supabaseAdmin.storage.from(BUCKET).list("", { limit: 1000 });
  if (error || !folders) return;
  for (const folder of folders) {
    const { data: files } = await supabaseAdmin.storage.from(BUCKET).list(folder.name, { limit: 1000 });
    if (files && files.length > 0) {
      await supabaseAdmin.storage.from(BUCKET).remove(files.map((f) => `${folder.name}/${f.name}`));
    }
  }
}

// แปลง public URL กลับเป็น path ในบัคเก็ต เพื่อใช้ลบไฟล์เดี่ยว
export function urlToStoragePath(url) {
  if (!url || typeof url !== "string") return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null; // เป็นรูป base64 เก่า หรือไม่ใช่ไฟล์ในบัคเก็ตเรา
  return decodeURIComponent(url.slice(idx + marker.length));
}

// ลบไฟล์รูปเดี่ยวจาก URL
export async function deletePhotoByUrl(url) {
  const path = urlToStoragePath(url);
  if (!path) return;
  await supabaseAdmin.storage.from(BUCKET).remove([path]);
}
