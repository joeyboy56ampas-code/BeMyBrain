"use client";

import { useEffect, useState } from "react";

// โค้ดจริงจากโปรเจกต์เรา (lib/checkAdminAccess.js) — โชว์ของจริง ไม่ใช่โค้ดปลอมประกอบฉาก
const BOOT_LINES = [
  'import { checkAdminAccess } from "./lib/checkAdminAccess";',
  "",
  "const session = await getServerSession(authOptions);",
  'if (session.user.email === "__admin__") return true;',
  "if (isAdminEmail(session.user.email)) return true;",
  "",
  "> handshake established",
  "> permissions verified",
  "✓ ACCESS GRANTED",
];

const SHUTDOWN_LINES = [
  "await fetch('/api/heartbeat', { method: 'DELETE' });",
  "clearInterval(pollInterval);",
  "session.invalidate();",
  "",
  "> closing secure channel",
  "> session terminated",
  "✓ SIGNED OUT",
];

/**
 * direction: "enter" (BeMyBrain -> Admin, สีม่วง -> เขียว) | "exit" (ย้อนกลับ)
 * onDone: เรียกเมื่อจบแอนิเมชัน
 *
 * ดีไซน์ใหม่: ไม่มีการแตกกระจกแล้ว (ตามที่ขอ) ใช้วงแหวนพลังงานขยาย/หด
 * แบบ arc reactor + พาเนลเทอร์มินัลโชว์โค้ดจริงวิ่งขึ้นทีละบรรทัด + ไล่สีพื้นหลังนุ่ม ๆ
 */
export default function AdminBoot({ direction = "enter", onDone, duration = 2200 }) {
  const [lineIdx, setLineIdx] = useState(0);
  const lines = direction === "enter" ? BOOT_LINES : SHUTDOWN_LINES;

  const fromColor = direction === "enter" ? "#15131F" : "#050805";
  const toColor = direction === "enter" ? "#050805" : "#15131F";
  const glow = "#33FF66";

  useEffect(() => {
    const stepMs = Math.max(90, (duration * 0.72) / lines.length);
    const timers = lines.map((_, i) => setTimeout(() => setLineIdx(i + 1), i * stepMs));
    const doneTimer = setTimeout(() => onDone && onDone(), duration);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
      <style>{`
        @keyframes ab-bg-cross {
          from { background: ${fromColor}; }
          to   { background: ${toColor}; }
        }
        .ab-bg { animation: ab-bg-cross ${duration}ms ease-in-out both; }

        @keyframes ab-ring {
          0%   { transform: scale(0.15); opacity: 0; border-width: 3px; }
          12%  { opacity: 1; }
          70%  { opacity: 0.35; }
          100% { transform: scale(2.6); opacity: 0; border-width: 0.5px; }
        }
        .ab-ring {
          position: absolute; top: 50%; left: 50%;
          width: 220px; height: 220px;
          margin: -110px 0 0 -110px;
          border-radius: 999px;
          border: 3px solid ${glow};
          box-shadow: 0 0 30px ${glow}66, inset 0 0 30px ${glow}33;
          animation: ab-ring 1.5s cubic-bezier(0.16, 0.8, 0.3, 1) both;
        }

        @keyframes ab-core-pulse {
          0%, 100% { transform: translate(-50%,-50%) scale(1); opacity: 0.9; }
          50%      { transform: translate(-50%,-50%) scale(1.15); opacity: 1; }
        }
        .ab-core {
          position: absolute; top: 50%; left: 50%;
          width: 14px; height: 14px; border-radius: 999px;
          background: ${glow};
          box-shadow: 0 0 24px 8px ${glow}aa, 0 0 60px 20px ${glow}44;
          animation: ab-core-pulse 1.1s ease-in-out infinite;
        }

        @keyframes ab-panel-in {
          from { opacity: 0; transform: translate(-50%, -46%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        .ab-panel {
          animation: ab-panel-in 500ms cubic-bezier(0.16, 0.8, 0.3, 1) 260ms both;
        }

        @keyframes ab-line-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ab-line { animation: ab-line-in 220ms ease-out both; }

        @keyframes ab-cursor { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .ab-cursor { animation: ab-cursor 0.9s step-start infinite; }

        @keyframes ab-fade-out {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        .ab-fadeout { animation: ab-fade-out 500ms ease-in ${duration - 500}ms both; }
      `}</style>

      <div className="ab-bg" style={{ position: "absolute", inset: 0 }} />

      <div className="ab-fadeout" style={{ position: "absolute", inset: 0 }}>
        <div className="ab-ring" />
        <div className="ab-ring" style={{ animationDelay: "180ms" }} />
        <div className="ab-ring" style={{ animationDelay: "360ms" }} />
        <div className="ab-core" />

        <div
          className="ab-panel"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "min(92vw, 420px)",
            maxWidth: "min(92vw, 420px)",
            overflow: "hidden",
            boxSizing: "border-box",
            background: "rgba(5,8,5,0.82)",
            border: `1px solid ${glow}55`,
            boxShadow: `0 0 40px ${glow}22`,
            borderRadius: 10,
            padding: "18px 20px",
            fontFamily: "monospace",
            fontSize: "clamp(9.5px, 2.9vw, 12.5px)",
            lineHeight: 1.7,
            color: glow,
            backdropFilter: "blur(2px)",
          }}
        >
          {lines.slice(0, lineIdx).map((line, i) => (
            <div key={i} className="ab-line" style={{
                opacity: line === "" ? 0.3 : 1,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}>
              {line || "\u00A0"}
            </div>
          ))}
          <span className="ab-cursor">▊</span>
        </div>
      </div>
    </div>
  );
}
