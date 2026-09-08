import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../lib/authOptions";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST() {
  const session = await getServerSession(authOptions);
  // บัญชี admin ไม่ใช่ user จริงในตาราง users — ถ้าปล่อยผ่านจะทำให้เขียนข้อมูลชนกับ
  // foreign key แล้วพังเงียบ ๆ ต้องกันไว้ที่ชั้น API เองด้วย ไม่พึ่งการ redirect ฝั่งหน้าเว็บอย่างเดียว
  if (!session?.user?.email || session.user.email === "__admin__") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await supabaseAdmin.from("presence").upsert(
    { user_email: session.user.email, last_seen: new Date().toISOString() },
    { onConflict: "user_email" }
  );

  return NextResponse.json({ ok: true });
}

// เรียกตอน logout เพื่อล้างสถานะ "active" ทันที แทนที่จะรอให้ heartbeat หมดอายุเอง (นานสุด ~40 วิ)
export async function DELETE() {
  const session = await getServerSession(authOptions);
  // บัญชี admin ไม่ใช่ user จริงในตาราง users — ถ้าปล่อยผ่านจะทำให้เขียนข้อมูลชนกับ
  // foreign key แล้วพังเงียบ ๆ ต้องกันไว้ที่ชั้น API เองด้วย ไม่พึ่งการ redirect ฝั่งหน้าเว็บอย่างเดียว
  if (!session?.user?.email || session.user.email === "__admin__") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await supabaseAdmin.from("presence").delete().eq("user_email", session.user.email);

  return NextResponse.json({ ok: true });
}
