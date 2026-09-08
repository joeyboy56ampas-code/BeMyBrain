"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const INK = "#15131F";
const INK_LINE = "#2C2A3C";
const PAPER = "#F6EFE2";
const TEXT_MUTED = "#A9A5BE";
const TEXT_FAINT = "#726E88";

/**
 * ช่องกรอกรหัสผ่านพร้อมปุ่มเปิด/ปิดตาในตัว
 *
 * สำคัญ: state การเปิด/ปิดตาอยู่ "ภายใน" component นี้ แปลว่าแต่ละช่องคุมของตัวเองแยกกันเสมอ
 * (บั๊กเดิมเกิดจากหลายช่องแชร์ state ตัวเดียวกัน กดปุ่มช่องบนแล้วช่องล่างเปิดตามไปด้วย)
 *
 * ใช้ <div> ครอบแทน <label> เพราะการวาง <button> ไว้ใน <label>
 * จะทำให้คลิกปุ่มไปโดน label แล้วเด้งไป focus ที่ input แทน ทำให้ปุ่มเหมือนกดไม่ติด
 */
export default function PasswordField({
  label,
  value,
  onChange,
  placeholder = "••••••••",
  required = false,
  minLength,
  autoFocus = false,
  hint,
}) {
  const [visible, setVisible] = useState(false);
  const inputId = `pw-${label?.replace(/\s+/g, "-").toLowerCase() || "field"}`;

  return (
    <div className="block">
      {label && (
        <label htmlFor={inputId} style={{ color: TEXT_MUTED }} className="text-xs block">
          {label}
        </label>
      )}
      <div className="relative mt-1">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          autoFocus={autoFocus}
          style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }}
          className="w-full rounded-lg px-3 py-2 pr-10 outline-none text-sm"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-0 top-0 h-full px-3 flex items-center"
        >
          {visible ? (
            <EyeOff size={15} style={{ color: TEXT_FAINT }} />
          ) : (
            <Eye size={15} style={{ color: TEXT_FAINT }} />
          )}
        </button>
      </div>
      {hint && (
        <p style={{ color: TEXT_FAINT }} className="text-xs mt-1 leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}
