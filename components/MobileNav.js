"use client";

import { LayoutGrid, Rows, MapPin, Users, Plus } from "lucide-react";

const INK_SOFT = "#1D1B2A";
const INK_LINE = "#2C2A3C";
const GOLD = "#E3A84E";
const TEXT_FAINT = "#726E88";

export default function MobileNav({ view, setView, t, onCompose }) {
  const items = [
    { id: "category", label: t("nav_categories"), icon: LayoutGrid },
    { id: "timeline", label: t("nav_timeline"), icon: Rows },
    { id: "location", label: t("nav_locations"), icon: MapPin },
    { id: "people", label: t("nav_people"), icon: Users },
  ];

  return (
    <nav
      style={{ background: INK_SOFT, borderTop: `1px solid ${INK_LINE}` }}
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2"
    >
      {items.slice(0, 2).map((it) => {
        const Icon = it.icon;
        const active = view === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setView(it.id)}
            className="flex flex-col items-center gap-0.5 py-2 px-3 flex-1 bmb-press"
          >
            <Icon size={20} style={{ color: active ? GOLD : TEXT_FAINT }} />
            <span style={{ color: active ? GOLD : TEXT_FAINT }} className="text-[10px]">{it.label}</span>
          </button>
        );
      })}

      <button
        onClick={onCompose}
        style={{ background: GOLD, color: "#15131F" }}
        className="w-12 h-12 rounded-full flex items-center justify-center -mt-5 shadow-lg shrink-0 bmb-press"
      >
        <Plus size={22} />
      </button>

      {items.slice(2).map((it) => {
        const Icon = it.icon;
        const active = view === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setView(it.id)}
            className="flex flex-col items-center gap-0.5 py-2 px-3 flex-1 bmb-press"
          >
            <Icon size={20} style={{ color: active ? GOLD : TEXT_FAINT }} />
            <span style={{ color: active ? GOLD : TEXT_FAINT }} className="text-[10px]">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
