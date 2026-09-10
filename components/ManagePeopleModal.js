"use client";

import { useState } from "react";
import { X, Trash2, Pencil, Check, Star } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

const INK = "#15131F";
const INK_SOFT = "#1D1B2A";
const INK_LINE = "#2C2A3C";
const PAPER = "#F6EFE2";
const GOLD = "#E3A84E";
const TEXT_MUTED = "#A9A5BE";
const TEXT_FAINT = "#726E88";

export default function ManagePeopleModal({ open, onClose, people, entries, t, onRename, onDelete, onToggleFavorite }) {
  const [editingName, setEditingName] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null); // person name awaiting confirm

  if (!open) return null;

  const countFor = (name) => entries.filter((e) => (e.people || []).includes(name)).length;
  const sorted = [...people].sort((a, b) => b.favorite - a.favorite);

  const startEdit = (p) => {
    setEditingName(p.name);
    setEditValue(p.name);
  };
  const commitEdit = () => {
    if (editValue.trim()) onRename(editingName, editValue.trim());
    setEditingName(null);
  };

  return (
    <>
      <div
        style={{ background: "rgba(0,0,0,0.55)" }}
        className="fixed inset-0 z-50 flex items-center justify-center px-6 bmb-overlay"
        onClick={onClose}
      >
        <div
          style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}`, maxHeight: "85vh" }}
          className="w-full max-w-md rounded-2xl flex flex-col overflow-hidden bmb-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ borderBottom: `1px solid ${INK_LINE}` }} className="flex items-center justify-between px-5 py-4">
            <div>
              <div style={{ fontFamily: "var(--font-display), serif", color: PAPER }} className="text-lg">
                {t("manage_people_title")}
              </div>
              <div style={{ color: TEXT_FAINT }} className="text-xs mt-0.5">{t("manage_people_desc")}</div>
            </div>
            <button onClick={onClose}><X size={18} style={{ color: TEXT_FAINT }} /></button>
          </div>

          <div className="overflow-y-auto px-5 py-4 flex flex-col gap-2">
            {sorted.length === 0 && (
              <p style={{ color: TEXT_FAINT }} className="text-sm text-center py-6">{t("empty_people")}</p>
            )}
            {sorted.map((p) => {
              const isEditing = editingName === p.name;
              return (
                <div
                  key={p.name}
                  style={{ background: INK, border: `1px solid ${INK_LINE}` }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2"
                >
                  <button onClick={() => onToggleFavorite(p.name)} className="shrink-0" title={t("favorite")}>
                    <Star size={15} style={{ color: p.favorite ? GOLD : TEXT_FAINT }} fill={p.favorite ? GOLD : "none"} />
                  </button>
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") setEditingName(null);
                      }}
                      style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}`, color: PAPER }}
                      className="flex-1 min-w-0 rounded-md px-2 py-1 text-sm outline-none"
                    />
                  ) : (
                    <span style={{ color: PAPER }} className="flex-1 min-w-0 truncate text-sm">{p.name}</span>
                  )}
                  <span style={{ color: TEXT_FAINT }} className="text-xs shrink-0">{countFor(p.name)}</span>
                  {isEditing ? (
                    <button onClick={commitEdit} className="shrink-0">
                      <Check size={15} style={{ color: GOLD }} />
                    </button>
                  ) : (
                    <button onClick={() => startEdit(p)} title={t("rename")} className="shrink-0">
                      <Pencil size={13} style={{ color: TEXT_FAINT }} />
                    </button>
                  )}
                  <button onClick={() => setPendingDelete(p.name)} className="shrink-0">
                    <Trash2 size={13} style={{ color: TEXT_FAINT }} />
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: `1px solid ${INK_LINE}` }} className="px-5 py-4">
            <button
              onClick={onClose}
              style={{ background: "transparent", border: `1px solid ${INK_LINE}`, color: PAPER }}
              className="w-full rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/5"
            >
              {t("done")}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={pendingDelete ? t("delete_person_title") : ""}
        body={t("delete_person_body")}
        confirmLabel={t("delete_memory_confirm")}
        cancelLabel={t("cancel")}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          onDelete(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </>
  );
}
