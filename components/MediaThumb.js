"use client";

import { useRef, useEffect, useState } from "react";
import { Play, VolumeX, Volume2 } from "lucide-react";
import { guessMediaType } from "../lib/mediaConfig";

/**
 * ตัวแสดงสื่อกลาง — ใช้ที่เดียวกันทุกจุด (การ์ด, อัลบั้ม, พรีวิว, หน้า Admin)
 *
 * autoPlay=true (โหมดฟีดหลัก): วิดีโอเล่นเองทันทีแบบเงียบ วนลูป
 *   เล่นเฉพาะตอนเลื่อนมาอยู่ในจอเท่านั้น (IntersectionObserver) — เลื่อนผ่านแล้วหยุดเล่นอัตโนมัติ
 *   กันไม่ให้วิดีโอ 10-20 อันเล่นพร้อมกันทั้งหน้าโดยไม่จำเป็น เปลืองแบตและเน็ต
 *
 * autoPlay=false (หน้า Admin): แสดงแค่ภาพปกนิ่ง กดเข้าไปถึงจะเล่น (แบบเดิม)
 */
export default function MediaThumb({
  src,
  mediaType,
  thumbnail,
  className = "",
  onClick,
  showPlayBadge = true,
  autoPlay = false,
}) {
  const videoRef = useRef(null);
  const wrapRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [muted, setMuted] = useState(true);

  const type = mediaType || guessMediaType(src);
  const isVideo = type === "video";

  // เล่น/หยุดตามว่าอยู่ในจอหรือไม่ (ประหยัดทรัพยากรเวลาเลื่อนผ่านของที่ไม่ได้ดู)
  useEffect(() => {
    if (!autoPlay || !isVideo || !wrapRef.current) return;
    const el = wrapRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoPlay, isVideo]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView) v.play().catch(() => {});
    else v.pause();
  }, [inView]);

  if (!src) return null;

  let inner;

  if (!isVideo) {
    inner = <img src={src} alt="" className={className} />;
  } else if (autoPlay) {
    // โหมดฟีด: เล่นเองแบบ TikTok/Reels — เงียบ วนลูป หยุดเมื่อเลื่อนพ้นจอ
    inner = (
      <video
        disablePictureInPicture
        ref={videoRef}
        src={src}
        poster={thumbnail || undefined}
        className={className}
        muted={muted}
        loop
        playsInline
        preload="metadata"
      />
    );
  } else if (thumbnail) {
    inner = <img src={thumbnail} alt="" className={className} />;
  } else {
    inner = (
      <video
        disablePictureInPicture
        src={src}
        className={className}
        preload="metadata"
        muted
        playsInline
      />
    );
  }

  const badge = isVideo && showPlayBadge && !autoPlay && (
    <span
      style={{ background: "rgba(0,0,0,0.35)" }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <span
        style={{ background: "rgba(255,255,255,0.92)" }}
        className="w-9 h-9 rounded-full flex items-center justify-center"
      >
        <Play size={16} style={{ color: "#15131F" }} fill="#15131F" />
      </span>
    </span>
  );

  // ปุ่มปิด/เปิดเสียงเล็ก ๆ มุมล่าง เฉพาะโหมดฟีด (กดแล้วไม่เปิด lightbox ตาม)
  const soundToggle = isVideo && autoPlay && (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setMuted((m) => !m);
      }}
      style={{ background: "rgba(0,0,0,0.55)" }}
      className="absolute bottom-2 right-2 p-1.5 rounded-full z-10"
    >
      {muted ? <VolumeX size={12} style={{ color: "#fff" }} /> : <Volume2 size={12} style={{ color: "#fff" }} />}
    </button>
  );

  const content = (
    <span ref={wrapRef} className="relative block overflow-hidden">
      {inner}
      {badge}
      {soundToggle}
    </span>
  );

  if (!onClick) return content;

  // ใช้ <div role="button"> แทน <button> จริง เพราะข้างในมีปุ่มปิด/เปิดเสียงซ้อนอยู่
  // (ปุ่มซ้อนในปุ่มเป็น HTML ที่ผิดกฎ เบราว์เซอร์จะจัดการคลิกมั่ว ปุ่มเสียงกดไม่ติด)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(e); }}
      className="relative block w-full overflow-hidden cursor-zoom-in"
    >
      {content}
    </div>
  );
}
