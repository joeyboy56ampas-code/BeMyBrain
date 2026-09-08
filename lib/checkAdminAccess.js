import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { isAdminEmail } from "./isAdmin";

export async function checkAdminAccess() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return false;

  // เข้าทาง username "admin" + ADMIN_PASSWORD (เช็คใน authorize() ของ authOptions.js แล้ว)
  if (session.user.email === "__admin__") return true;

  // หรือเข้าทางบัญชี Google/username จริงที่อยู่ใน allowlist ADMIN_EMAILS
  if (isAdminEmail(session.user.email)) return true;

  return false;
}
