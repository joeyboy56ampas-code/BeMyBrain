import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../lib/authOptions";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET() {
  const session = await getServerSession(authOptions);
  // บัญชี admin ไม่ใช่ user จริงในตาราง users — ถ้าปล่อยผ่านจะทำให้เขียนข้อมูลชนกับ
  // foreign key แล้วพังเงียบ ๆ ต้องกันไว้ที่ชั้น API เองด้วย ไม่พึ่งการ redirect ฝั่งหน้าเว็บอย่างเดียว
  if (!session?.user?.email || session.user.email === "__admin__") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("brain_data")
    .select("payload, updated_at")
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
    updatedAt: data?.updated_at || null,
  });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  // บัญชี admin ไม่ใช่ user จริงในตาราง users — ถ้าปล่อยผ่านจะทำให้เขียนข้อมูลชนกับ
  // foreign key แล้วพังเงียบ ๆ ต้องกันไว้ที่ชั้น API เองด้วย ไม่พึ่งการ redirect ฝั่งหน้าเว็บอย่างเดียว
  if (!session?.user?.email || session.user.email === "__admin__") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { entries, people, categories, baseUpdatedAt } = body;

  // ป้องกันข้อมูลทับกันเมื่อเปิดหลายเครื่องพร้อมกัน (optimistic locking)
  // ถ้าในฐานข้อมูลถูกแก้ไปแล้วหลังจากที่เครื่องนี้โหลดข้อมูลมา แปลว่าอีกเครื่องเซฟแซงไป
  // ต้องปฏิเสธไว้ก่อน ไม่งั้นข้อมูลของอีกเครื่องจะหายทั้งหมดโดยไม่มีใครรู้
  const { data: current } = await supabaseAdmin
    .from("brain_data")
    .select("updated_at")
    .eq("user_email", session.user.email)
    .maybeSingle();

  if (current?.updated_at && baseUpdatedAt && current.updated_at !== baseUpdatedAt) {
    return NextResponse.json(
      { error: "conflict", serverUpdatedAt: current.updated_at },
      { status: 409 }
    );
  }

  const nextUpdatedAt = new Date().toISOString();
  const { error } = await supabaseAdmin.from("brain_data").upsert(
    {
      user_email: session.user.email,
      payload: { entries, people, categories },
      updated_at: nextUpdatedAt,
    },
    { onConflict: "user_email" }
  );

  if (error) {
    console.error("save error", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updatedAt: nextUpdatedAt });
}
