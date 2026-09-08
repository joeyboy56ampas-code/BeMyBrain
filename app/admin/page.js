"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Shield, Users, HardDrive, Activity, Trash2, X, AlertTriangle,
  ChevronRight, MapPin, Loader2, LogOut,
} from "lucide-react";

const BG = "#050805";
const PANEL = "#0A120A";
const LINE = "#123312";
const GREEN = "#33FF66";
const GREEN_DIM = "#1F9944";
const RED = "#FF4444";
const TEXT_DIM = "#5F9B6F";

const BOOT_LINES = [
  "> verifying admin session...",
  "> access granted.",
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function timeAgo(iso) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

export default function AdminPage() {
  const { status } = useSession();
  const router = useRouter();

  const [phase, setPhase] = useState("checking"); // checking | denied | booting | ready
  const [bootLineIdx, setBootLineIdx] = useState(0);

  const [users, setUsers] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState(null);
  const [wipeText, setWipeText] = useState("");
  const [wiping, setWiping] = useState(false);
  const [actionError, setActionError] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  const loadUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (!res.ok) {
      setPhase("denied");
      return false;
    }
    const data = await res.json();
    setUsers(data.users || []);
    return true;
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    setBootLineIdx(0);
    setPhase("booting");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (phase !== "booting") return;
    if (bootLineIdx >= BOOT_LINES.length) {
      (async () => {
        const ok = await loadUsers();
        if (ok) setPhase("ready");
      })();
      return;
    }
    const timer = setTimeout(() => setBootLineIdx((i) => i + 1), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootLineIdx, phase]);

  const openUser = async (email) => {
    setSelectedEmail(email);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDetailError(data.error === "not_found" ? "User not found." : `Couldn't load this account (${res.status}).`);
      } else {
        setDetail(await res.json());
      }
    } catch (e) {
      setDetailError("Network error while loading this account.");
    }
    setDetailLoading(false);
  };

  // เงียบ ๆ รีเฟรชโดยไม่โชว์ loading spinner ซ้ำ ใช้สำหรับ auto-refresh เป็นระยะ
  const refreshUsersQuiet = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {}
  };

  const refreshDetailQuiet = async (email) => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`);
      if (res.ok) setDetail(await res.json());
    } catch (e) {}
  };

  // auto-refresh รายชื่อ user ทุก 5 วิ ขณะเปิดหน้า admin ค้างไว้ (ไม่ต้องกด refresh เว็บเอง)
  useEffect(() => {
    if (phase !== "ready") return;
    const interval = setInterval(refreshUsersQuiet, 5000);
    return () => clearInterval(interval);
  }, [phase]);

  // ถ้าเปิดดูรายละเอียดของ user คนใดคนหนึ่งอยู่ ก็ auto-refresh หน้านั้นด้วยเช่นกัน
  useEffect(() => {
    if (!selectedEmail) return;
    const interval = setInterval(() => refreshDetailQuiet(selectedEmail), 5000);
    return () => clearInterval(interval);
  }, [selectedEmail]);

  const deleteEntry = async (entryId) => {
    await fetch(`/api/admin/users/${encodeURIComponent(selectedEmail)}/entry/${entryId}`, { method: "DELETE" });
    setPendingDeleteEntry(null);
    openUser(selectedEmail);
    loadUsers();
  };

  const deleteUser = async (email) => {
    setActionError("");
    const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setActionError(data.error === "cannot_delete_self" ? "You can't delete your own admin account from here." : "Delete failed.");
      setPendingDeleteUser(null);
      return;
    }
    setPendingDeleteUser(null);
    setSelectedEmail(null);
    setDetail(null);
    loadUsers();
  };

  const wipeAll = async () => {
    setWiping(true);
    const res = await fetch("/api/admin/wipe-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: wipeText }),
    });
    setWiping(false);
    if (!res.ok) {
      setActionError("Confirmation text didn't match exactly. Nothing was deleted.");
      return;
    }
    setWipeText("");
    setSelectedEmail(null);
    setDetail(null);
    loadUsers();
  };

  const totalSize = users.reduce((sum, u) => sum + u.sizeBytes, 0);
  const activeNow = users.filter((u) => u.recentlyActive).length;

  if (status === "loading" || status === "unauthenticated") {
    return <div style={{ background: BG, minHeight: "100vh" }} />;
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "monospace" }} className="w-full text-sm">
      <style>{`
        @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .admin-cursor { animation: blink 1s step-start infinite; }
      `}</style>

      {phase === "checking" && (
        <div className="min-h-screen flex items-center justify-center" style={{ color: GREEN }}>
          <Loader2 className="animate-spin" size={20} />
        </div>
      )}

      {phase === "booting" && (
        <div style={{ color: GREEN }} className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-md">
            {BOOT_LINES.slice(0, bootLineIdx + 1).map((line, i) => (
              <div key={i} style={{ textShadow: `0 0 8px ${GREEN_DIM}` }} className="mb-1">
                {line}
              </div>
            ))}
            <span className="admin-cursor">▊</span>
          </div>
        </div>
      )}

      {phase === "denied" && (
        <div style={{ color: RED }} className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
          <Shield size={32} />
          <div className="text-lg">ACCESS DENIED</div>
          <p style={{ color: TEXT_DIM }} className="text-xs max-w-xs">
            This account isn't authorized for admin access.
          </p>
          <button
            onClick={() => router.replace("/dashboard")}
            style={{ border: `1px solid ${LINE}`, color: GREEN }}
            className="mt-2 px-4 py-2 rounded text-xs"
          >
            back to dashboard
          </button>
        </div>
      )}

      {phase === "ready" && (
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2" style={{ color: GREEN, textShadow: `0 0 10px ${GREEN_DIM}` }}>
              <Shield size={20} />
              <span className="text-lg">BEMYBRAIN // ADMIN</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{ color: TEXT_DIM }}
              className="flex items-center gap-1.5 text-xs hover:text-white"
            >
              <LogOut size={13} /> logout
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            <div style={{ background: PANEL, border: `1px solid ${LINE}` }} className="rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1" style={{ color: TEXT_DIM }}>
                <Users size={13} /> <span className="text-xs">registered accounts</span>
              </div>
              <div style={{ color: GREEN }} className="text-2xl">{users.length}</div>
            </div>
            <div style={{ background: PANEL, border: `1px solid ${LINE}` }} className="rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1" style={{ color: TEXT_DIM }}>
                <HardDrive size={13} /> <span className="text-xs">total storage used</span>
              </div>
              <div style={{ color: GREEN }} className="text-2xl">{formatBytes(totalSize)}</div>
            </div>
            <div style={{ background: PANEL, border: `1px solid ${LINE}` }} className="rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1" style={{ color: TEXT_DIM }}>
                <Activity size={13} /> <span className="text-xs">active now</span>
              </div>
              <div style={{ color: GREEN }} className="text-2xl">{activeNow}</div>
            </div>
          </div>

          {actionError && (
            <div style={{ color: RED, border: `1px solid ${RED}` }} className="rounded-lg px-4 py-2 mb-4 text-xs">
              {actionError}
            </div>
          )}

          <div style={{ background: PANEL, border: `1px solid ${LINE}` }} className="rounded-lg overflow-hidden mb-8">
            <div style={{ borderBottom: `1px solid ${LINE}`, color: TEXT_DIM }} className="grid grid-cols-12 gap-2 px-4 py-2 text-xs">
              <div className="col-span-4">user</div>
              <div className="col-span-2">size</div>
              <div className="col-span-2">memories</div>
              <div className="col-span-3">last seen</div>
              <div className="col-span-1"></div>
            </div>
            {users.length === 0 && (
              <div style={{ color: TEXT_DIM }} className="px-4 py-6 text-center text-xs">no registered users</div>
            )}
            {users.map((u) => (
              <button
                key={u.email}
                onClick={() => openUser(u.email)}
                style={{ borderBottom: `1px solid ${LINE}`, color: GREEN }}
                className="w-full grid grid-cols-12 gap-2 px-4 py-3 text-left hover:bg-white/5 items-center"
              >
                <div className="col-span-4 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: u.recentlyActive ? GREEN : LINE }} />
                    <span className="truncate">{u.name || u.username}</span>
                  </div>
                  <div style={{ color: TEXT_DIM }} className="text-xs truncate">{u.email}</div>
                </div>
                <div className="col-span-2 text-xs">{formatBytes(u.sizeBytes)}</div>
                <div className="col-span-2 text-xs">{u.entryCount}</div>
                <div className="col-span-3 text-xs" style={{ color: TEXT_DIM }}>{timeAgo(u.lastSeen)}</div>
                <div className="col-span-1 flex justify-end">
                  <ChevronRight size={14} />
                </div>
              </button>
            ))}
          </div>

          <div style={{ background: PANEL, border: `1px solid ${RED}` }} className="rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2" style={{ color: RED }}>
              <AlertTriangle size={15} /> <span className="text-sm">danger zone</span>
            </div>
            <p style={{ color: TEXT_DIM }} className="text-xs mb-3">
              This permanently deletes every registered account and all their data. There is no undo.
              Type <span style={{ color: RED }}>WIPE ALL DATA</span> below to enable the button.
            </p>
            <div className="flex gap-2">
              <input
                value={wipeText}
                onChange={(e) => setWipeText(e.target.value)}
                placeholder="type WIPE ALL DATA to confirm"
                style={{ background: BG, border: `1px solid ${LINE}`, color: GREEN }}
                className="flex-1 rounded px-3 py-2 text-xs outline-none"
              />
              <button
                onClick={wipeAll}
                disabled={wipeText !== "WIPE ALL DATA" || wiping}
                style={{ background: RED, color: BG }}
                className="rounded px-4 py-2 text-xs font-medium disabled:opacity-30"
              >
                {wiping ? "wiping…" : "wipe everything"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEmail && (
        <div
          style={{ background: "rgba(0,0,0,0.7)" }}
          className="fixed inset-0 z-40 flex items-center justify-center px-4"
          onClick={() => setSelectedEmail(null)}
        >
          <div
            style={{ background: PANEL, border: `1px solid ${LINE}`, maxHeight: "85vh" }}
            className="w-full max-w-lg rounded-lg flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ borderBottom: `1px solid ${LINE}`, color: GREEN }} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm truncate">{selectedEmail}</span>
              <button onClick={() => setSelectedEmail(null)}><X size={16} style={{ color: TEXT_DIM }} /></button>
            </div>

            {detailLoading && (
              <div style={{ color: GREEN }} className="p-8 flex justify-center"><Loader2 className="animate-spin" size={18} /></div>
            )}

            {detailError && !detailLoading && (
              <div style={{ color: RED }} className="p-6 text-xs text-center">{detailError}</div>
            )}

            {detail && !detailLoading && (
              <div className="overflow-y-auto px-5 py-4 flex flex-col gap-2">
                {detail.entries.length === 0 && (
                  <p style={{ color: TEXT_DIM }} className="text-xs text-center py-4">no memories</p>
                )}
                {detail.entries.map((e) => (
                  <div key={e.id} style={{ background: BG, border: `1px solid ${LINE}` }} className="rounded p-3 flex items-start gap-3">
                    {e.image && (
                      <button onClick={() => setLightboxImage(e.image)} className="shrink-0">
                        <img src={e.image} alt="" className="w-16 h-16 rounded object-cover" style={{ border: `1px solid ${LINE}` }} />
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <div style={{ color: TEXT_DIM }} className="text-xs mb-1">{e.date}</div>
                      <div style={{ color: GREEN }} className="text-xs whitespace-pre-wrap break-words">{e.text}</div>
                      <div className="flex gap-2 mt-1" style={{ color: TEXT_DIM }}>
                        {e.location && <span className="flex items-center gap-1 text-xs"><MapPin size={10} /> {e.location}</span>}
                        {(e.people || []).map((p) => (
                          <span key={p} className="flex items-center gap-1 text-xs"><Users size={10} /> {p}</span>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setPendingDeleteEntry(e.id)} className="shrink-0">
                      <Trash2 size={13} style={{ color: RED }} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => setPendingDeleteUser(selectedEmail)}
                  style={{ border: `1px solid ${RED}`, color: RED }}
                  className="mt-3 rounded px-4 py-2 text-xs font-medium"
                >
                  delete this account entirely
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {pendingDeleteEntry && (
        <div style={{ background: "rgba(0,0,0,0.75)" }} className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div style={{ background: PANEL, border: `1px solid ${RED}` }} className="w-full max-w-xs rounded-lg p-5">
            <p style={{ color: GREEN }} className="text-sm mb-4">Delete this memory permanently?</p>
            <div className="flex gap-2">
              <button onClick={() => setPendingDeleteEntry(null)} style={{ border: `1px solid ${LINE}`, color: TEXT_DIM }} className="flex-1 rounded py-2 text-xs">cancel</button>
              <button onClick={() => deleteEntry(pendingDeleteEntry)} style={{ background: RED, color: BG }} className="flex-1 rounded py-2 text-xs font-medium">delete</button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteUser && (
        <div style={{ background: "rgba(0,0,0,0.75)" }} className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div style={{ background: PANEL, border: `1px solid ${RED}` }} className="w-full max-w-xs rounded-lg p-5">
            <p style={{ color: GREEN }} className="text-sm mb-1">Delete this account permanently?</p>
            <p style={{ color: TEXT_DIM }} className="text-xs mb-4">{pendingDeleteUser} — all their memories and login access will be gone.</p>
            <div className="flex gap-2">
              <button onClick={() => setPendingDeleteUser(null)} style={{ border: `1px solid ${LINE}`, color: TEXT_DIM }} className="flex-1 rounded py-2 text-xs">cancel</button>
              <button onClick={() => deleteUser(pendingDeleteUser)} style={{ background: RED, color: BG }} className="flex-1 rounded py-2 text-xs font-medium">delete account</button>
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{ background: "rgba(0,0,0,0.9)" }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-6 cursor-zoom-out"
        >
          <button onClick={() => setLightboxImage(null)} style={{ background: "rgba(255,255,255,0.1)" }} className="absolute top-5 right-5 p-2 rounded-full">
            <X size={18} style={{ color: "#fff" }} />
          </button>
          <img
            src={lightboxImage}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full rounded object-contain cursor-default"
          />
        </div>
      )}
    </div>
  );
}
