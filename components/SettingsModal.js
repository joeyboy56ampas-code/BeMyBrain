"use client";

import { X, Globe, LogOut } from "lucide-react";

const INK = "#15131F";
const INK_SOFT = "#1D1B2A";
const INK_LINE = "#2C2A3C";
const PAPER = "#F6EFE2";
const GOLD = "#E3A84E";
const TEXT_MUTED = "#A9A5BE";
const TEXT_FAINT = "#726E88";

export default function SettingsModal({ open, onClose, user, lang, onToggleLang, onLogout, t }) {
  if (!open) return null;

  return (
    <div
      style={{ background: "rgba(0,0,0,0.55)" }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      onClick={onClose}
    >
      <div
        style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }}
        className="w-full max-w-sm rounded-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ borderBottom: `1px solid ${INK_LINE}` }} className="flex items-center justify-between px-5 py-4">
          <div style={{ fontFamily: "var(--font-display), serif", color: PAPER }} className="text-lg">
            {t("settings_title")}
          </div>
          <button onClick={onClose}><X size={18} style={{ color: TEXT_FAINT }} /></button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-5">
          {/* profile */}
          <div className="flex items-center gap-3">
            {user?.image ? (
              <img src={user.image} alt="" className="w-12 h-12 rounded-full" />
            ) : (
              <div style={{ background: GOLD, color: INK }} className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium">
                {(user?.name || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div style={{ color: PAPER }} className="truncate">{user?.name}</div>
              <div style={{ color: TEXT_FAINT }} className="text-xs truncate">{user?.email}</div>
            </div>
          </div>

          {/* language */}
          <div>
            <div style={{ color: TEXT_MUTED }} className="text-xs mb-2">{t("settings_language")}</div>
            <button
              onClick={onToggleLang}
              style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm"
            >
              <span className="flex items-center gap-2">
                <Globe size={15} style={{ color: TEXT_FAINT }} />
                {lang === "th" ? "ภาษาไทย" : "English"}
              </span>
              <span style={{ color: GOLD }} className="text-xs font-medium">{t("settings_switch_to")}</span>
            </button>
          </div>

          {/* logout */}
          <button
            onClick={onLogout}
            style={{ background: "transparent", border: `1px solid ${INK_LINE}`, color: "#E38E8E" }}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-white/5"
          >
            <LogOut size={15} /> {t("logout")}
          </button>
        </div>
      </div>
    </div>
  );
}
