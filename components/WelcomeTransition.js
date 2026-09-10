"use client";

import { useEffect } from "react";
import { Brain } from "lucide-react";

const INK = "#15131F";
const GOLD = "#E3A84E";
const PAPER = "#F6EFE2";

/**
 * แอนิเมชันต้อนรับตอนล็อกอินเข้า BeMyBrain สำเร็จ
 *
 * ธีมอบอุ่นตามตัวเว็บ (ทอง/กระดาษ) ไม่ใช่ธีมเขียวแบบหน้า admin
 * แนวคิด: สมองค่อย ๆ "ติด" ขึ้นมา มีคลื่นความคิดกระจายออกเป็นวง
 * แล้วค่อยเฟดเข้าหน้าแดชบอร์ดอย่างนุ่มนวล แทนการตัดภาพแข็ง ๆ แบบเดิม
 */
export default function WelcomeTransition({ name, onDone, duration = 1700 }) {
  useEffect(() => {
    const timer = setTimeout(() => onDone && onDone(), duration);
    return () => clearTimeout(timer);
  }, [duration, onDone]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, overflow: "hidden" }}>
      <style>{`
        @keyframes wt-bg {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .wt-bg { animation: wt-bg 320ms ease-out both; }

        @keyframes wt-brain-in {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.6); filter: blur(6px); }
          45%  { opacity: 1; transform: translate(-50%,-50%) scale(1.06); filter: blur(0); }
          100% { opacity: 1; transform: translate(-50%,-50%) scale(1); filter: blur(0); }
        }
        .wt-brain {
          position: absolute; top: 50%; left: 50%;
          animation: wt-brain-in 900ms cubic-bezier(0.22,1,0.36,1) both;
        }

        /* คลื่นความคิดกระจายออกเป็นวง */
        @keyframes wt-wave {
          0%   { transform: translate(-50%,-50%) scale(0.4); opacity: 0.55; }
          100% { transform: translate(-50%,-50%) scale(2.8); opacity: 0; }
        }
        .wt-wave {
          position: absolute; top: 50%; left: 50%;
          width: 150px; height: 150px; border-radius: 999px;
          border: 1.5px solid ${GOLD};
          animation: wt-wave 1.7s cubic-bezier(0.22,1,0.36,1) infinite;
        }

        @keyframes wt-name {
          0%   { opacity: 0; transform: translate(-50%, 6px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }
        .wt-name {
          position: absolute; left: 50%; top: calc(50% + 62px);
          animation: wt-name 620ms cubic-bezier(0.22,1,0.36,1) 420ms both;
          white-space: nowrap;
        }

        /* เฟดออกทั้งจอตอนท้าย ให้ไหลเข้าแดชบอร์ดแบบไม่มีรอยต่อ */
        @keyframes wt-out { to { opacity: 0; } }
        .wt-out { animation: wt-out 420ms ease-in ${duration - 420}ms both; }
      `}</style>

      <div className="wt-out" style={{ position: "absolute", inset: 0 }}>
        <div
          className="wt-bg"
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 50% 45%, #2A2640 0%, ${INK} 60%)`,
          }}
        />

        <div className="wt-wave" />
        <div className="wt-wave" style={{ animationDelay: "0.45s" }} />
        <div className="wt-wave" style={{ animationDelay: "0.9s" }} />

        <div className="wt-brain">
          <Brain size={54} style={{ color: GOLD, filter: `drop-shadow(0 0 18px ${GOLD}66)` }} />
        </div>

        <div className="wt-name" style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-display), serif",
              color: PAPER,
              fontSize: "1.05rem",
              letterSpacing: "0.01em",
            }}
          >
            {name ? `Welcome back, ${name}` : "Welcome back"}
          </div>
        </div>
      </div>
    </div>
  );
}
