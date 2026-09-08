// รายชื่ออีเมลที่มีสิทธิ์ Admin — ตั้งค่าผ่าน Environment Variable ADMIN_EMAILS
// (คั่นด้วย comma ถ้ามีหลายคน เช่น "you@gmail.com,partner@gmail.com")
// ตั้งใจผูกกับอีเมลจริงที่ต้องผ่านการยืนยันตัวตนอยู่แล้ว ไม่ใช่รหัสผ่านแยกต่างหาก
export function isAdminEmail(email) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
