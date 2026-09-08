"use client";

import { AlertTriangle, X } from "lucide-react";

const INK = "#15131F";
const INK_SOFT = "#1D1B2A";
const INK_LINE = "#2C2A3C";
const PAPER = "#F6EFE2";
const TEXT_MUTED = "#A9A5BE";
const TEXT_FAINT = "#726E88";
const DANGER = "#D9695F";
const DANGER_SOFT = "#3A2323";

// โมดัลยืนยันแบบใช้ซ้ำได้ อยู่กลางจอเสมอ (ไม่ใช่ browser confirm())
// ปุ่มปลอดภัย (ยกเลิก) เป็นค่าเริ่มต้นที่โฟกัสไว้เสมอ ตามหลัก UX สำหรับ destructive action
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "ยกเลิก",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      style={{ background: "rgba(0,0,0,0.6)" }}
      className="fixed inset-0 z-[60] flex items-center justify-center px-6"
      onClick={onCancel}
    >
      <div
        style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }}
        className="w-full max-w-sm rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div
            style={{ background: DANGER_SOFT }}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          >
            <AlertTriangle size={17} style={{ color: DANGER }} />
          </div>
          <button onClick={onCancel} className="p-1">
            <X size={16} style={{ color: TEXT_FAINT }} />
          </button>
        </div>

        <h2 style={{ fontFamily: "var(--font-display), serif", color: PAPER, fontSize: "1.05rem" }} className="mb-2">
          {title}
        </h2>
        <p style={{ color: TEXT_MUTED }} className="text-sm leading-relaxed mb-6">
          {body}
        </p>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={onCancel}
            autoFocus
            style={{ background: "transparent", border: `1px solid ${INK_LINE}`, color: PAPER }}
            className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/5"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{ background: DANGER, color: "#fff" }}
            className="rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
