import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../lib/authOptions";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await supabaseAdmin.from("presence").upsert(
    { user_email: session.user.email, last_seen: new Date().toISOString() },
    { onConflict: "user_email" }
  );

  return NextResponse.json({ ok: true });
}
