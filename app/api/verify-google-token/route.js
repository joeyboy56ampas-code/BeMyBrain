import { decode } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { token } = await request.json();
  if (!token) {
    return NextResponse.json({ error: "no_token" }, { status: 400 });
  }

  try {
    const payload = await decode({ token, secret: process.env.NEXTAUTH_SECRET });
    if (!payload || payload.purpose !== "google_verify") {
      return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    }
    return NextResponse.json({ email: payload.email, name: payload.name || "" });
  } catch (e) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });
  }
}
