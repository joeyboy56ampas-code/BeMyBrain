"use client";

import { useEffect, useState } from "react";

// จำนวนเสี่ยงกระจก — สร้างเป็น grid แล้วให้แต่ละชิ้นแตกกระจายคนละทิศ คนละจังหวะ
const COLS = 6;
const ROWS = 4;

/**
 * direction:
 *   "toAdmin"  — จอ BeMyBrain (ม่วงเข้ม) แตก แล้ว blend เป็นสีเขียว programmer
 *   "toApp"    — จอเขียว admin แตก แล้ว blend กลับเป็นสี BeMyBrain
 * onDone — เรียกเมื่อแอนิเมชันจบ
 */
export default function ShatterTransition({ direction = "toAdmin", onDone, duration = 1900 }) {
  const [phase, setPhase] = useState("shatter"); // shatter -> blend

  const fromColor = direction === "toAdmin" ? "#15131F" : "#050805";
  const toColor = direction === "toAdmin" ? "#050805" : "#15131F";
  const glow = direction === "toAdmin" ? "#33FF66" : "#E3A84E";

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("blend"), duration * 0.55);
    const t2 = setTimeout(() => onDone && onDone(), duration);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [duration, onDone]);

  const shards = [];
  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      const i = r * COLS + col;
      // ทิศทางกระเด็นคำนวณจากระยะห่างจากจุดกึ่งกลางจอ ให้ดูเหมือนแรงระเบิดจากตรงกลาง
      const cx = (col + 0.5) / COLS - 0.5;
      const cy = (r + 0.5) / ROWS - 0.5;
      const dist = Math.sqrt(cx * cx + cy * cy);
      const tx = cx * (180 + Math.random() * 120);
      const ty = cy * (180 + Math.random() * 120) + 40;
      const rot = (Math.random() - 0.5) * 90;
      const delay = dist * 260 + Math.random() * 90;
      shards.push(
        <div
          key={i}
          className="shard"
          style={{
            position: "absolute",
            left: `${(col / COLS) * 100}%`,
            top: `${(r / ROWS) * 100}%`,
            width: `${100 / COLS}%`,
            height: `${100 / ROWS}%`,
            background: fromColor,
            borderRight: `1px solid ${glow}44`,
            borderBottom: `1px solid ${glow}44`,
            boxShadow: `inset 0 0 18px ${glow}22`,
            "--tx": `${tx}px`,
            "--ty": `${ty}px`,
            "--rot": `${rot}deg`,
            animationDelay: `${delay}ms`,
          }}
        />
      );
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none" }}>
      <style>{`
        @keyframes shard-fly {
          0%   { transform: none; opacity: 1; }
          18%  { transform: scale(1.02); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(0.55); opacity: 0; }
        }
        .shard {
          animation: shard-fly 1000ms cubic-bezier(0.5, 0, 0.75, 0) both;
          will-change: transform, opacity;
        }
        @keyframes flash-in {
          0%   { opacity: 0; }
          40%  { opacity: 0.55; }
          100% { opacity: 0; }
        }
        .shatter-flash { animation: flash-in 620ms ease-out both; }
        @keyframes blend-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .blend-layer { animation: blend-in 780ms ease-in-out both; }
        @keyframes scan-sweep {
          from { transform: translateY(-110%); }
          to   { transform: translateY(110%); }
        }
        .scan-line { animation: scan-sweep 900ms linear both; }
      `}</style>

      {/* ชั้นสีปลายทาง — เผยออกมาทีละนิดระหว่างที่กระจกกระจายออกไป */}
      <div style={{ position: "absolute", inset: 0, background: toColor }} />

      {/* เสี่ยงกระจกที่กำลังแตกกระจาย */}
      {phase === "shatter" && <div style={{ position: "absolute", inset: 0 }}>{shards}</div>}

      {/* แสงวาบตอนกระแทก */}
      <div
        className="shatter-flash"
        style={{ position: "absolute", inset: 0, background: glow, mixBlendMode: "screen" }}
      />

      {/* ชั้น blend สีปลายทาง + เส้นสแกนกวาดผ่าน */}
      {phase === "blend" && (
        <div className="blend-layer" style={{ position: "absolute", inset: 0, background: toColor, overflow: "hidden" }}>
          <div
            className="scan-line"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: "35%",
              background: `linear-gradient(to bottom, transparent, ${glow}22, transparent)`,
            }}
          />
        </div>
      )}
    </div>
  );
}
