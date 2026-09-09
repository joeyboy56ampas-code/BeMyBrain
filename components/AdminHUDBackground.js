"use client";

import { useEffect, useRef } from "react";

const GREEN = "51, 255, 102"; // rgb ของ #33FF66 — ใช้แบบ rgba ปรับความจางได้

/**
 * พื้นหลังเคลื่อนไหวแบบ HUD ธีม "โปรแกรมเมอร์ระดับไอรอนแมน" — จุดข้อมูลเชื่อมกันเป็นเครือข่าย
 * ล่องลอยช้า ๆ ตลอดเวลา เบาบางพอไม่รบกวนการอ่าน แต่มองแล้วรู้สึกถึง "ระบบที่มีชีวิต"
 *
 * ใช้ canvas + requestAnimationFrame แทนการวาดจุดด้วย DOM element เป็นร้อยตัว
 * เพราะ canvas เร็วกว่ามากเวลามีจุดหลายสิบจุดขยับพร้อมกันตลอดเวลา
 */
export default function AdminHUDBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    let w, h;
    let nodes = [];

    const NODE_COUNT_BASE = 44; // ต่อ 1280x800 — จะปรับตามขนาดจอจริงด้านล่าง
    const LINK_DIST = 130;

    function resize() {
      w = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      const area = canvas.offsetWidth * canvas.offsetHeight;
      const count = Math.max(24, Math.min(70, Math.round((area / (1280 * 800)) * NODE_COUNT_BASE)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12 * window.devicePixelRatio,
        vy: (Math.random() - 0.5) * 0.12 * window.devicePixelRatio,
        r: (Math.random() * 1.4 + 0.6) * window.devicePixelRatio,
      }));
    }

    function tick() {
      ctx.clearRect(0, 0, w, h);

      // เส้นเชื่อมระหว่างจุดที่อยู่ใกล้กัน — จางลงตามระยะทาง
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = LINK_DIST * window.devicePixelRatio;
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.18;
            ctx.strokeStyle = `rgba(${GREEN}, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // ตัวจุดเอง — ล่องลอยช้า ๆ แล้ววนกลับเมื่อชนขอบ
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        ctx.fillStyle = `rgba(${GREEN}, 0.55)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    }

    resize();
    tick();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <style>{`
        @keyframes hud-grid-drift {
          from { background-position: 0 0; }
          to   { background-position: 0 -80px; }
        }
        @keyframes hud-scan {
          0%   { transform: translateY(-100%); opacity: 0; }
          8%   { opacity: 0.5; }
          92%  { opacity: 0.5; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes hud-corner-pulse {
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 0.9; }
        }
        .hud-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(51,255,102,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(51,255,102,0.055) 1px, transparent 1px);
          background-size: 42px 42px;
          animation: hud-grid-drift 14s linear infinite;
        }
        .hud-scanline {
          position: absolute; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(51,255,102,0.9), transparent);
          box-shadow: 0 0 12px 2px rgba(51,255,102,0.6);
          animation: hud-scan 6s ease-in-out infinite;
        }
        .hud-corner {
          position: absolute; width: 26px; height: 26px;
          border-color: rgba(51,255,102,0.8);
          animation: hud-corner-pulse 3.2s ease-in-out infinite;
        }
      `}</style>

      <div className="hud-grid" />
      <div className="hud-scanline" />

      {/* กรอบมุม HUD ทั้ง 4 มุมจอ */}
      <div className="hud-corner" style={{ top: 14, left: 14, borderTop: "2px solid", borderLeft: "2px solid" }} />
      <div className="hud-corner" style={{ top: 14, right: 14, borderTop: "2px solid", borderRight: "2px solid" }} />
      <div className="hud-corner" style={{ bottom: 14, left: 14, borderBottom: "2px solid", borderLeft: "2px solid" }} />
      <div className="hud-corner" style={{ bottom: 14, right: 14, borderBottom: "2px solid", borderRight: "2px solid" }} />

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0.7 }} />
    </div>
  );
}
