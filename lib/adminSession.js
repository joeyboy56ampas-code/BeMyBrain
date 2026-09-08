import { encode, decode } from "next-auth/jwt";

export const ADMIN_COOKIE_NAME = "admin_session";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 วัน

// สร้างโทเค็นเซสชัน admin — เซ็นด้วย NEXTAUTH_SECRET ปลอมแปลงไม่ได้
export async function createAdminSessionToken() {
  return encode({
    token: { purpose: "admin_session", createdAt: Date.now() },
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
}

export async function verifyAdminSessionToken(token) {
  if (!token) return false;
  try {
    const payload = await decode({ token, secret: process.env.NEXTAUTH_SECRET });
    return payload?.purpose === "admin_session";
  } catch (e) {
    return false;
  }
}
