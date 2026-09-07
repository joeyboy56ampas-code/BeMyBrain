import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../lib/authOptions";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("brain_data")
    .select("payload")
    .eq("user_email", session.user.email)
    .maybeSingle();

  if (error) {
    console.error("load error", error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  return NextResponse.json({
    entries: data?.payload?.entries || [],
    people: data?.payload?.people || [],
    categories: data?.payload?.categories || null,
  });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { entries, people, categories } = body;

  const { error } = await supabaseAdmin.from("brain_data").upsert(
    {
      user_email: session.user.email,
      payload: { entries, people, categories },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_email" }
  );

  if (error) {
    console.error("save error", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
