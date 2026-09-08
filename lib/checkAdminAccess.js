import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "./authOptions";
import { isAdminEmail } from "./isAdmin";
import { verifyAdminSessionToken, ADMIN_COOKIE_NAME } from "./adminSession";

export async function checkAdminAccess() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email && isAdminEmail(session.user.email)) return true;

  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (await verifyAdminSessionToken(token)) return true;

  return false;
}
