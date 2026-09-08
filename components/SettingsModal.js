"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { X, LogOut, Eye, EyeOff, Check } from "lucide-react";

const INK = "#15131F";
const INK_SOFT = "#1D1B2A";
const INK_LINE = "#2C2A3C";
const PAPER = "#F6EFE2";
const GOLD = "#E3A84E";
const SAGE = "#8FA98C";
const TEXT_MUTED = "#A9A5BE";
const TEXT_FAINT = "#726E88";

const ERROR_MESSAGES = {
  username_taken: "That username is already taken.",
  password_too_short: "New password must be at least 8 characters.",
  update_failed: "Couldn't save changes. Please try again.",
};

export default function SettingsModal({ open, onClose, user, onLogout, t }) {
  const { update: updateSession } = useSession();

  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(user?.name || "");
    setNewPassword("");
    setError("");
    setSaved(false);
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setUsername(data.username || "");
        }
      } catch (e) {}
    })();
  }, [open, user]);

  if (!open) return null;

  const handleSave = async () => {
    setError("");
    setSaved(false);
    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        username,
        newPassword: newPassword || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(ERROR_MESSAGES[data.error] || "Something went wrong. Please try again.");
      return;
    }

    // อัปเดต session ทันทีถ้าชื่อที่แสดงเปลี่ยน ไม่ต้อง logout/login ใหม่
    if (data.name && data.name !== user?.name) {
      await updateSession({ name: data.name });
    }
    setNewPassword("");
    setSaved(true);
  };

  return (
    <div
      style={{ background: "rgba(0,0,0,0.55)" }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      onClick={onClose}
    >
      <div
        style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}`, maxHeight: "85vh" }}
        className="w-full max-w-sm rounded-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ borderBottom: `1px solid ${INK_LINE}` }} className="flex items-center justify-between px-5 py-4">
          <div style={{ fontFamily: "var(--font-display), serif", color: PAPER }} className="text-lg">
            {t("settings_title")}
          </div>
          <button onClick={onClose}><X size={18} style={{ color: TEXT_FAINT }} /></button>
        </div>

        <div className="overflow-y-auto px-5 py-5 flex flex-col gap-5">
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

          {/* editable fields */}
          <div className="flex flex-col gap-3">
            <label className="block">
              <span style={{ color: TEXT_MUTED }} className="text-xs">Display name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }}
                className="w-full mt-1 rounded-lg px-3 py-2 outline-none text-sm"
              />
            </label>
            <label className="block">
              <span style={{ color: TEXT_MUTED }} className="text-xs">Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }}
                className="w-full mt-1 rounded-lg px-3 py-2 outline-none text-sm"
              />
            </label>

            <div style={{ borderTop: `1px solid ${INK_LINE}` }} className="pt-3">
              <span style={{ color: TEXT_MUTED }} className="text-xs">Change password</span>
              <div className="relative mt-1">
                <input
                  type={showPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min. 8 characters)"
                  style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }}
                  className="w-full rounded-lg px-3 py-2 pr-9 outline-none text-sm"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2.5 top-2.5">
                  {showPw ? <EyeOff size={15} style={{ color: TEXT_FAINT }} /> : <Eye size={15} style={{ color: TEXT_FAINT }} />}
                </button>
              </div>
              <p style={{ color: TEXT_FAINT }} className="text-xs mt-1.5 leading-relaxed">
                Leave blank to keep your current password.
              </p>
            </div>

            {error && <p style={{ color: "#E38E8E" }} className="text-xs">{error}</p>}
            {saved && !error && (
              <p style={{ color: SAGE }} className="text-xs flex items-center gap-1">
                <Check size={12} /> Saved
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={loading || !name.trim() || !username.trim()}
              style={{ background: GOLD, color: INK }}
              className="w-full rounded-lg py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save changes"}
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
