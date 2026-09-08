"use client";

import { Play } from "lucide-react";
import { guessMediaType } from "../lib/mediaConfig";

/**
 * ตัวแสดงสื่อกลาง — ใช้ที่เดียวกันทุกจุด (การ์ด, อัลบั้ม, พรีวิว, หน้า Admin)
 *
 * เหตุผลที่ต้องรวมไว้ที่เดียว: ถ้าปล่อยให้แต่ละหน้าเขียน <img> เอง
 * พอเพิ่มวิดีโอเข้ามาจะต้องไล่แก้ทุกหน้า และมักลืมบางจุดเสมอ
 * (เช่น อัลบั้มเคยลืมใส่ปุ่มดูรูปเต็มจอมาแล้วครั้งหนึ่ง)
 *
 * mediaType: "image" | "video" — ถ้าไม่ส่งมา จะเดาจากนามสกุลไฟล์ใน URL
 * (ข้อมูลเก่าที่บันทึกไว้ก่อนมีวิดีโอจะไม่มีฟิลด์นี้ ต้องเดาให้ถูกด้วย)
 */
export default function MediaThumb({
  src,
  mediaType,
  className = "",
  onClick,
  showPlayBadge = true,
}) {
  if (!src) return null;
  const type = mediaType || guessMediaType(src);

  const inner =
    type === "video" ? (
      <>
        {/* preload="metadata" = โหลดแค่เฟรมแรกมาโชว์ ไม่ดูดโหลดทั้งคลิป ประหยัดเน็ตมาก */}
        <video src={src} className={className} preload="metadata" muted playsInline />
        {showPlayBadge && (
          <span
            style={{ background: "rgba(0,0,0,0.55)" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span
              style={{ background: "rgba(255,255,255,0.9)" }}
              className="w-9 h-9 rounded-full flex items-center justify-center"
            >
              <Play size={16} style={{ color: "#15131F" }} fill="#15131F" />
            </span>
          </span>
        )}
      </>
    ) : (
      <img src={src} alt="" className={className} />
    );

  if (!onClick) return <span className="relative block">{inner}</span>;

  return (
    <button onClick={onClick} className="relative block w-full cursor-zoom-in">
      {inner}
    </button>
  );
}
