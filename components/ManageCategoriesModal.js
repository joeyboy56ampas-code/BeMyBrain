"use client";

import { useState } from "react";
import { X, Plus, Trash2, Pencil, Check, Sparkles, Briefcase, Heart, Activity, Home } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

const INK = "#15131F";
const INK_SOFT = "#1D1B2A";
const INK_LINE = "#2C2A3C";
const PAPER = "#F6EFE2";
const GOLD = "#E3A84E";
const TEXT_MUTED = "#A9A5BE";
const TEXT_FAINT = "#726E88";

const ICONS = { Briefcase, Heart, Activity, Home, Sparkles };

export default function ManageCategoriesModal({ open, onClose, categories, entries, t, onAdd, onRename, onDelete }) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null); // category object awaiting confirm

  if (!open) return null;

  const countFor = (id) => entries.filter((e) => e.category === id).length;

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditValue(c.label);
  };
  const commitEdit = () => {
    if (editValue.trim()) onRename(editingId, editValue.trim());
    setEditingId(null);
  };

  const confirmDeleteBody = pendingDelete
    ? countFor(pendingDelete.id) > 0
      ? t("delete_category_body_with_entries", countFor(pendingDelete.id))
      : t("delete_category_body_empty")
    : "";
  const confirmDeleteLabel = pendingDelete
    ? countFor(pendingDelete.id) > 0
      ? t("delete_category_confirm")
      : t("delete_category_confirm_empty")
    : "";

  return (
    <>
      <div
        style={{ background: "rgba(0,0,0,0.55)" }}
        className="fixed inset-0 z-50 flex items-center justify-center px-6"
        onClick={onClose}
      >
        <div
          style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}`, maxHeight: "85vh" }}
          className="w-full max-w-md rounded-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ borderBottom: `1px solid ${INK_LINE}` }} className="flex items-center justify-between px-5 py-4">
            <div>
              <div style={{ fontFamily: "'Noto Serif Thai', serif", color: PAPER }} className="text-lg">
                {t("manage_categories_title")}
              </div>
              <div style={{ color: TEXT_FAINT }} className="text-xs mt-0.5">{t("manage_categories_desc")}</div>
            </div>
            <button onClick={onClose}><X size={18} style={{ color: TEXT_FAINT }} /></button>
          </div>

          <div className="overflow-y-auto px-5 py-4 flex flex-col gap-2">
            {categories.map((c) => {
              const Icon = ICONS[c.icon] || Sparkles;
              const isEditing = editingId === c.id;
              return (
                <div
                  key={c.id}
                  style={{ background: INK, border: `1px solid ${INK_LINE}` }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2"
                >
                  <Icon size={15} style={{ color: GOLD }} className="shrink-0" />
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}`, color: PAPER }}
                      className="flex-1 min-w-0 rounded-md px-2 py-1 text-sm outline-none"
                    />
                  ) : (
                    <span style={{ color: PAPER }} className="flex-1 min-w-0 truncate text-sm">{c.label}</span>
                  )}
                  <span style={{ color: TEXT_FAINT }} className="text-xs shrink-0">{countFor(c.id)}</span>
                  {isEditing ? (
                    <button onClick={commitEdit} className="shrink-0">
                      <Check size={15} style={{ color: GOLD }} />
                    </button>
                  ) : (
                    <button onClick={() => startEdit(c)} title={t("rename")} className="shrink-0">
                      <Pencil size={13} style={{ color: TEXT_FAINT }} />
                    </button>
                  )}
                  <button
                    onClick={() => (categories.length > 1 ? setPendingDelete(c) : null)}
                    disabled={categories.length <= 1}
                    title={categories.length <= 1 ? t("cannot_delete_last") : undefined}
                    className="shrink-0 disabled:opacity-30"
                  >
                    <Trash2 size={13} style={{ color: TEXT_FAINT }} />
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: `1px solid ${INK_LINE}` }} className="px-5 py-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    onAdd(newName.trim());
                    setNewName("");
                  }
                }}
                placeholder={t("add_new_category_ph")}
                style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }}
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={() => {
                  if (newName.trim()) {
                    onAdd(newName.trim());
                    setNewName("");
                  }
                }}
                style={{ background: GOLD, color: INK }}
                className="rounded-lg px-3 py-2 flex items-center gap-1 text-sm font-medium shrink-0"
              >
                <Plus size={14} /> {t("add")}
              </button>
            </div>
            <button
              onClick={onClose}
              style={{ background: "transparent", border: `1px solid ${INK_LINE}`, color: PAPER }}
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/5"
            >
              {t("done")}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={pendingDelete ? t("delete_category_title", pendingDelete.label) : ""}
        body={confirmDeleteBody}
        confirmLabel={confirmDeleteLabel}
        cancelLabel={t("cancel")}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </>
  );
}
