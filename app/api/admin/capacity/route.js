import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { checkAdminAccess } from "../../../../lib/checkAdminAccess";

// เพดานของแพลนฟรีแต่ละบริการ (ถ้าอัปเกรดแพลน แก้ตัวเลขตรงนี้ได้เลย)
const LIMITS = {
  database: 500 * 1024 * 1024,   // Supabase free: 500 MB
  storage: 1024 * 1024 * 1024,   // Supabase free: 1 GB
  bandwidth: 100 * 1024 * 1024 * 1024, // Vercel Hobby: 100 GB/เดือน (ดูตัวเลขจริงได้ที่ Vercel)
};

export async function GET() {
  if (!(await checkAdminAccess())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin.rpc("admin_capacity");

  if (error) {
    console.error("capacity rpc failed", error);
    return NextResponse.json({ error: "load_failed", detail: error.message }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;

  return NextResponse.json({
    database: { used: Number(row?.db_bytes || 0), limit: LIMITS.database },
    storage: {
      used: Number(row?.storage_bytes || 0),
      limit: LIMITS.storage,
      files: Number(row?.storage_files || 0),
    },
    bandwidth: { limit: LIMITS.bandwidth },
  });
}
