// ค่ากลางเกี่ยวกับไฟล์สื่อทั้งหมด — แก้ที่นี่ที่เดียว ทุกที่จะตรงกันเสมอ
export const BUCKET = "memory-photos"; // ใช้บัคเก็ตเดิม เก็บได้ทั้งรูปและวิดีโอ

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;   // 8 MB (ก่อนบีบอัด; หลังบีบเหลือ ~300KB)
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;  // 25 MB ต่อคลิป

// จำกัดขนาดวิดีโอไว้เพื่อไม่ให้กินโควต้า Storage 1GB หมดเร็วเกินไป
// (25MB/คลิป = เก็บได้ราว 40 คลิป ถ้าใช้พื้นที่ทั้งหมดกับวิดีโออย่างเดียว)

export function isVideoFile(file) {
  return !!file && typeof file.type === "string" && file.type.startsWith("video/");
}

// เดาชนิดสื่อจาก URL สำหรับข้อมูลเก่าที่ยังไม่มีฟิลด์ mediaType
export function guessMediaType(url) {
  if (!url || typeof url !== "string") return "image";
  if (url.startsWith("data:video")) return "video";
  const clean = url.split("?")[0].toLowerCase();
  return /\.(mp4|mov|webm|m4v|avi|mkv)$/.test(clean) ? "video" : "image";
}
