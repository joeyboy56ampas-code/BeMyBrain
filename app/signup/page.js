"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Brain, Eye, EyeOff } from "lucide-react";

const INK = "#15131F";
const INK_SOFT = "#1D1B2A";
const INK_LINE = "#2C2A3C";
const PAPER = "#F6EFE2";
const GOLD = "#E3A84E";
const TEXT_MUTED = "#A9A5BE";
const TEXT_FAINT = "#726E88";

const ERROR_MESSAGES = {
  missing_fields: "กรอกข้อมูลให้ครบทุกช่อง",
  password_too_short: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
  already_exists: "ชื่อผู้ใช้หรืออีเมลนี้มีคนใช้แล้ว",
  signup_failed: "สมัครสมาชิกไม่สำเร็จ ลองใหม่อีกครั้ง",
};

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(ERROR_MESSAGES[data.error] || "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
      setLoading(false);
      return;
    }

    // สมัครสำเร็จ ล็อกอินให้อัตโนมัติ
    const signInRes = await signIn("credentials", { username, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) {
      router.replace("/login");
      return;
    }
    router.replace("/dashboard");
  };

  return (
    <div
      style={{
        background: `radial-gradient(circle at 20% 10%, #2A2640 0%, ${INK} 55%)`,
        minHeight: "100vh",
        fontFamily: "'Noto Sans Thai', sans-serif",
      }}
      className="w-full flex items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Brain size={22} style={{ color: GOLD }} />
          <span style={{ fontFamily: "'Noto Serif Thai', serif", color: PAPER, fontSize: "1.35rem" }}>
            BeMyBrain
          </span>
        </div>

        <div style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }} className="rounded-2xl p-7">
          <h1 style={{ fontFamily: "'Noto Serif Thai', serif", color: PAPER, fontSize: "1.25rem" }} className="mb-1">
            สร้างสมองใหม่
          </h1>
          <p style={{ color: TEXT_FAINT }} className="mb-6 leading-relaxed text-sm">
            สมัครสมาชิกด้วยชื่อผู้ใช้และรหัสผ่านของคุณเอง
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="block">
              <span style={{ color: TEXT_MUTED }} className="text-xs">ชื่อที่แสดง</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น พลอย"
                style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }}
                className="w-full mt-1 rounded-lg px-3 py-2 outline-none text-sm"
              />
            </label>
            <label className="block">
              <span style={{ color: TEXT_MUTED }} className="text-xs">ชื่อผู้ใช้ (username)</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ใช้เข้าสู่ระบบครั้งถัดไป"
                style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }}
                className="w-full mt-1 rounded-lg px-3 py-2 outline-none text-sm"
                required
              />
            </label>
            <label className="block">
              <span style={{ color: TEXT_MUTED }} className="text-xs">อีเมล</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }}
                className="w-full mt-1 rounded-lg px-3 py-2 outline-none text-sm"
                required
              />
            </label>
            <label className="block">
              <span style={{ color: TEXT_MUTED }} className="text-xs">รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)</span>
              <div className="relative mt-1">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }}
                  className="w-full rounded-lg px-3 py-2 pr-9 outline-none text-sm"
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2.5 top-2.5">
                  {showPw ? <EyeOff size={15} style={{ color: TEXT_FAINT }} /> : <Eye size={15} style={{ color: TEXT_FAINT }} />}
                </button>
              </div>
            </label>
            <label className="block">
              <span style={{ color: TEXT_MUTED }} className="text-xs">ยืนยันรหัสผ่าน</span>
              <input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }}
                className="w-full mt-1 rounded-lg px-3 py-2 outline-none text-sm"
                required
              />
            </label>

            {error && <p style={{ color: "#E38E8E" }} className="text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{ background: GOLD, color: INK }}
              className="w-full rounded-lg py-2.5 font-medium mt-1 hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "กำลังสมัคร…" : "สมัครสมาชิก"}
            </button>
          </form>
        </div>

        <p style={{ color: TEXT_FAINT }} className="text-xs text-center mt-5">
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/login" style={{ color: GOLD }} className="hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  );
}
