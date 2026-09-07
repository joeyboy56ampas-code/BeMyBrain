"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, X, MapPin, Users, Calendar, LayoutGrid, Rows,
  Briefcase, Heart, Activity, Home, Sparkles, Star, Image as ImageIcon,
  ChevronRight, Check, Brain, LogOut, Trash2, Settings2, Globe
} from "lucide-react";
import { makeT } from "../../lib/i18n";
import ConfirmDialog from "../../components/ConfirmDialog";
import ManageCategoriesModal from "../../components/ManageCategoriesModal";
import MobileNav from "../../components/MobileNav";

const INK = "#15131F";
const INK_SOFT = "#1D1B2A";
const INK_LINE = "#2C2A3C";
const PAPER = "#F6EFE2";
const PAPER_DIM = "#EAE0CC";
const GOLD = "#E3A84E";
const GOLD_SOFT = "#8B6F3C";
const SAGE = "#8FA98C";
const TEXT_MUTED = "#A9A5BE";
const TEXT_FAINT = "#726E88";
const FONT_DISPLAY = "'Noto Serif Thai', serif";
const FONT_BODY = "'Noto Sans Thai', sans-serif";

const DEFAULT_CATEGORIES = [
  { id: "work", label: "งาน", icon: "Briefcase" },
  { id: "love", label: "ความสัมพันธ์", icon: "Heart" },
  { id: "health", label: "สุขภาพ", icon: "Activity" },
  { id: "family", label: "ครอบครัว", icon: "Home" },
  { id: "general", label: "ทั่วไป", icon: "Sparkles" },
];
const ICONS = { Briefcase, Heart, Activity, Home, Sparkles };

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const months = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
};
const monthKey = (iso) => {
  const d = new Date(iso);
  const months = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  return `${months[d.getMonth()]} ${d.getFullYear() + 543}`;
};

// บีบอัดรูปก่อนเก็บ (resize ด้านยาวสุดไม่เกิน 1600px + แปลงเป็น JPEG คุณภาพ 80%)
// เพราะรูปถูกเก็บเป็น base64 ปนอยู่ใน Supabase database (จำกัดที่ 500MB บนแพลนฟรี)
// ลดขนาดตรงนี้ช่วยยืดอายุพื้นที่เก็บข้อมูลได้มาก
function compressImage(file, maxDimension = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- persistence via our own server API (not direct Supabase from browser) ---------- */
async function loadBundle() {
  try {
    const res = await fetch("/api/data");
    if (!res.ok) return { entries: [], people: [], categories: DEFAULT_CATEGORIES };
    const data = await res.json();
    return {
      entries: data.entries || [],
      people: data.people || [],
      categories: data.categories || DEFAULT_CATEGORIES,
    };
  } catch (e) {
    console.error("load failed", e);
    return { entries: [], people: [], categories: DEFAULT_CATEGORIES };
  }
}

async function saveBundle(entries, people, categories) {
  try {
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries, people, categories }),
    });
    if (!res.ok) console.error("save failed", await res.text());
  } catch (e) {
    console.error("save failed", e);
  }
}

// รายชื่อบุคคลที่แสดงจริงคำนวณจาก entries โดยตรงเสมอ (ไม่พึ่งพา people[] ที่เก็บแยกไว้เพียงอย่างเดียว)
// เพื่อกันปัญหาชื่อหลุดหายถ้า people[] เคยไม่ sync กับ entries ในอดีต — และซ่อมข้อมูลเก่าที่เคยพังไปแล้วโดยอัตโนมัติด้วย
function mergedPeopleRoster(entries, people) {
  const map = new Map();
  people.forEach((p) => map.set(p.name, { name: p.name, favorite: !!p.favorite }));
  entries.forEach((e) => {
    (e.people || []).forEach((n) => {
      if (!map.has(n)) map.set(n, { name: n, favorite: false });
    });
  });
  return Array.from(map.values());
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [booting, setBooting] = useState(true);
  const [entries, setEntries] = useState([]);
  const [people, setPeople] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [view, setView] = useState("category");
  const [activeFilter, setActiveFilter] = useState(null);
  const [galleryMode, setGalleryMode] = useState("timeline");
  const [showComposer, setShowComposer] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [query, setQuery] = useState("");
  const [saveTick, setSaveTick] = useState(false);
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState(null);
  const [lang, setLang] = useState("th");

  const t = makeT(lang);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("bemybrain_lang");
      if (saved === "en" || saved === "th") setLang(saved);
    } catch (e) {}
  }, []);

  const toggleLang = () => {
    const next = lang === "th" ? "en" : "th";
    setLang(next);
    try { window.localStorage.setItem("bemybrain_lang", next); } catch (e) {}
  };

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return;
    (async () => {
      const data = await loadBundle();
      setEntries(data.entries);
      setPeople(data.people);
      setCategories(data.categories);
      setBooting(false);
    })();
  }, [status, session]);

  const persist = (nextEntries, nextPeople, nextCategories) => {
    if (!session?.user?.email) return;
    setSaveTick(true);
    saveBundle(nextEntries, nextPeople, nextCategories).finally(() =>
      setTimeout(() => setSaveTick(false), 700)
    );
  };

  // รวมการเพิ่มบันทึกใหม่และเพิ่มรายชื่อคนไว้ในการอัปเดตเดียว แล้วเซฟครั้งเดียว
  // (เดิมเรียก persist() สองครั้งซ้อนกัน ทำให้เกิด race condition ข้อมูลทับกันจนบันทึกหาย)
  const addEntry = (entry) => {
    const newEntry = { ...entry, id: uid(), createdAt: new Date().toISOString() };
    const nextEntries = [newEntry, ...entries];

    let nextPeople = [...people];
    (entry.people || []).forEach((n) => {
      if (!nextPeople.find((p) => p.name === n)) nextPeople.push({ name: n, favorite: false });
    });

    setEntries(nextEntries);
    setPeople(nextPeople);
    persist(nextEntries, nextPeople, categories);
  };

  const deleteEntry = (id) => {
    const nextEntries = entries.filter((e) => e.id !== id);
    setEntries(nextEntries);
    persist(nextEntries, people, categories);
  };

  const toggleFavorite = (name) => {
    const exists = people.find((p) => p.name === name);
    const next = exists
      ? people.map((p) => (p.name === name ? { ...p, favorite: !p.favorite } : p))
      : [...people, { name, favorite: true }];
    setPeople(next);
    persist(entries, next, categories);
  };

  const addCategory = (label) => {
    const next = [...categories, { id: uid(), label, icon: "Sparkles" }];
    setCategories(next);
    persist(entries, people, next);
  };

  const renameCategory = (id, label) => {
    const next = categories.map((c) => (c.id === id ? { ...c, label } : c));
    setCategories(next);
    persist(entries, people, next);
  };

  // ลบหมวดหมู่ — ตามที่ตกลง: ความทรงจำในหมวดนี้จะถูกลบไปด้วย (มีคำเตือนใน modal ก่อนเสมอ)
  const deleteCategory = (id) => {
    if (categories.length <= 1) return;
    const nextCategories = categories.filter((c) => c.id !== id);
    const nextEntries = entries.filter((e) => e.category !== id);
    setCategories(nextCategories);
    setEntries(nextEntries);
    persist(nextEntries, people, nextCategories);
    if (activeFilter === id) setActiveFilter(null);
  };

  if (status === "loading" || booting) {
    return <DashboardSkeleton />;
  }
  if (!session) return null;
  const user = { name: session.user.name, email: session.user.email, image: session.user.image };
  const peopleRoster = mergedPeopleRoster(entries, people);

  return (
    <div style={{ background: INK, fontFamily: FONT_BODY, minHeight: "100vh" }} className="w-full flex text-sm">
      <Sidebar
        user={user} view={view}
        setView={(v) => { setView(v); setActiveFilter(null); }}
        onOpenCategory={(id) => { setView("category"); setActiveFilter(id); }}
        categories={categories} saving={saveTick} t={t}
        onManageCategories={() => setShowManageCategories(true)}
      />
      <main className="flex-1 min-w-0 flex flex-col" style={{ maxHeight: "100vh" }}>
        <TopBar
          query={query} setQuery={setQuery} onSearch={() => setView("search")} onCompose={() => setShowComposer(true)}
          lang={lang} onToggleLang={toggleLang} t={t}
          onManageCategories={() => setShowManageCategories(true)}
          onLogout={() => signOut({ callbackUrl: "/login" })}
        />
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-24 md:pb-10">
          {view === "category" && !activeFilter && (
            <CategoryGrid categories={categories} entries={entries} onOpen={(id) => setActiveFilter(id)} t={t} />
          )}
          {view === "category" && activeFilter && (
            <EntryList title={categories.find((c) => c.id === activeFilter)?.label}
              entries={entries.filter((e) => e.category === activeFilter)} onBack={() => setActiveFilter(null)}
              onRequestDelete={setPendingDeleteEntry} t={t} />
          )}
          {view === "timeline" && (
            <TimelineGallery entries={entries} mode={galleryMode} setMode={setGalleryMode}
              onRequestDelete={setPendingDeleteEntry} t={t} />
          )}
          {view === "location" && (
            <LocationView entries={entries} active={activeFilter} onOpen={setActiveFilter}
              onRequestDelete={setPendingDeleteEntry} t={t} />
          )}
          {view === "people" && (
            <PeopleView people={peopleRoster} entries={entries} active={activeFilter} onOpen={setActiveFilter}
              onToggleFavorite={toggleFavorite} onRequestDelete={setPendingDeleteEntry} t={t} />
          )}
          {view === "search" && (
            <SearchView query={query} setQuery={setQuery} entries={entries} onRequestDelete={setPendingDeleteEntry} t={t} />
          )}
        </div>
      </main>

      <MobileNav view={view === "category" && activeFilter ? "category" : view} setView={(v) => { setView(v); setActiveFilter(null); }} t={t} onCompose={() => setShowComposer(true)} />

      {showComposer && (
        <Composer
          categories={categories} people={peopleRoster} t={t}
          onClose={() => setShowComposer(false)}
          onSave={(entry) => { addEntry(entry); setShowComposer(false); }}
        />
      )}

      <ManageCategoriesModal
        open={showManageCategories}
        onClose={() => setShowManageCategories(false)}
        categories={categories}
        entries={entries}
        t={t}
        onAdd={addCategory}
        onRename={renameCategory}
        onDelete={deleteCategory}
      />

      <ConfirmDialog
        open={!!pendingDeleteEntry}
        title={t("delete_memory_title")}
        body={t("delete_memory_body")}
        confirmLabel={t("delete_memory_confirm")}
        cancelLabel={t("cancel")}
        onCancel={() => setPendingDeleteEntry(null)}
        onConfirm={() => {
          deleteEntry(pendingDeleteEntry.id);
          setPendingDeleteEntry(null);
        }}
      />
    </div>
  );
}

/* ---------------- loading skeleton (matches the real layout shape) ---------------- */
function Shimmer({ className = "", style = {} }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: INK_LINE, ...style }}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ background: INK, fontFamily: FONT_BODY, minHeight: "100vh" }} className="w-full flex text-sm">
      <aside style={{ background: INK_SOFT, borderRight: `1px solid ${INK_LINE}`, width: "232px" }} className="hidden md:flex shrink-0 flex-col py-6 px-4 gap-2">
        <div className="flex items-center gap-2 px-2 mb-6">
          <Brain size={18} style={{ color: GOLD, opacity: 0.4 }} />
          <Shimmer className="h-4 w-24" />
        </div>
        {[...Array(4)].map((_, i) => <Shimmer key={i} className="h-8 w-full" />)}
        <div className="h-4" />
        {[...Array(3)].map((_, i) => <Shimmer key={i} className="h-6 w-full" />)}
      </aside>
      <main className="flex-1 min-w-0 flex flex-col">
        <div style={{ borderBottom: `1px solid ${INK_LINE}` }} className="flex items-center gap-3 px-4 sm:px-8 py-4">
          <Shimmer className="h-9 flex-1 rounded-full" />
          <Shimmer className="h-9 w-16 rounded-full shrink-0" />
        </div>
        <div className="px-4 sm:px-8 pt-8">
          <Shimmer className="h-7 w-32 mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Shimmer key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------------- sidebar / top bar ---------------- */
function Sidebar({ user, view, setView, onOpenCategory, categories, saving, t, onManageCategories }) {
  const items = [
    { id: "category", label: t("nav_categories"), icon: LayoutGrid },
    { id: "timeline", label: t("nav_timeline"), icon: Rows },
    { id: "location", label: t("nav_locations"), icon: MapPin },
    { id: "people", label: t("nav_people"), icon: Users },
  ];
  return (
    <aside style={{ background: INK_SOFT, borderRight: `1px solid ${INK_LINE}`, width: "232px" }} className="hidden md:flex shrink-0 flex-col py-6 px-4">
      <div className="flex items-center gap-2 px-2 mb-8">
        <Brain size={18} style={{ color: GOLD }} />
        <span style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.05rem" }}>BeMyBrain</span>
      </div>
      <nav className="flex flex-col gap-1 mb-6">
        {items.map((it) => {
          const Icon = it.icon; const activeSel = view === it.id;
          return (
            <button key={it.id} onClick={() => setView(it.id)}
              style={{ background: activeSel ? INK_LINE : "transparent", color: activeSel ? PAPER : TEXT_MUTED }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors">
              <Icon size={16} style={{ color: activeSel ? GOLD : TEXT_FAINT }} />
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>
      <div style={{ color: TEXT_FAINT }} className="px-3 text-xs uppercase tracking-wide mb-2">{t("categories_title")}</div>
      <div className="flex flex-col gap-0.5 mb-3 overflow-y-auto">
        {categories.map((c) => {
          const Icon = ICONS[c.icon] || Sparkles;
          return (
            <button key={c.id} onClick={() => onOpenCategory(c.id)} style={{ color: TEXT_MUTED }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-left hover:bg-white/5">
              <Icon size={13} style={{ color: TEXT_FAINT }} />
              <span className="truncate">{c.label}</span>
            </button>
          );
        })}
      </div>
      <button onClick={onManageCategories} style={{ color: TEXT_FAINT }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs hover:text-white">
        <Settings2 size={12} /> {t("manage_categories")}
      </button>
      <div className="flex-1" />
      <div className="px-3 flex items-center gap-2 mb-2">
        <span style={{ width: 6, height: 6, borderRadius: 999, background: saving ? GOLD : SAGE, opacity: saving ? 1 : 0.6 }} />
        <span style={{ color: TEXT_FAINT }} className="text-xs">{saving ? t("saving") : t("saved")}</span>
      </div>
      <div style={{ borderTop: `1px solid ${INK_LINE}` }} className="pt-3 px-2 flex items-center gap-2">
        {user.image ? (
          <img src={user.image} alt="" className="w-7 h-7 rounded-full" />
        ) : (
          <div style={{ background: GOLD, color: INK }} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium">
            {(user.name || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div style={{ color: PAPER }} className="text-xs truncate">{user.name}</div>
          <div style={{ color: TEXT_FAINT }} className="text-xs truncate">{user.email}</div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })} title={t("logout")}>
          <LogOut size={14} style={{ color: TEXT_FAINT }} />
        </button>
      </div>
    </aside>
  );
}

function TopBar({ query, setQuery, onSearch, onCompose, lang, onToggleLang, t, onManageCategories, onLogout }) {
  return (
    <div style={{ borderBottom: `1px solid ${INK_LINE}` }} className="flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-4">
      <div style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }} className="flex-1 flex items-center gap-2 rounded-full px-4 py-2 min-w-0">
        <Search size={15} style={{ color: TEXT_FAINT }} className="shrink-0" />
        <input
          value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder={t("search_placeholder")} style={{ background: "transparent", color: PAPER }}
          className="flex-1 min-w-0 outline-none text-sm" />
      </div>

      <button
        onClick={onToggleLang}
        style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}`, color: TEXT_MUTED }}
        className="shrink-0 flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium"
        title="Switch language / เปลี่ยนภาษา"
      >
        <Globe size={13} /> {lang === "th" ? "TH" : "EN"}
      </button>

      <button onClick={onManageCategories} className="md:hidden shrink-0 rounded-full p-2" style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }} title={t("manage_categories")}>
        <Settings2 size={15} style={{ color: TEXT_MUTED }} />
      </button>

      <button onClick={onLogout} className="md:hidden shrink-0 rounded-full p-2" style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }} title={t("logout")}>
        <LogOut size={15} style={{ color: TEXT_MUTED }} />
      </button>

      <button
        onClick={onCompose}
        style={{ background: GOLD, color: INK }}
        className="hidden md:flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium hover:opacity-90"
      >
        <Plus size={15} /> {t("new_memory")}
      </button>
    </div>
  );
}

/* ---------------- entry card ---------------- */

function EntryCard({ entry, onRequestDelete }) {
  return (
    <div style={{ background: PAPER, color: INK }} className="group relative rounded-xl p-4 shadow-lg flex flex-col gap-2">
      {onRequestDelete && (
        <button
          onClick={() => onRequestDelete(entry)}
          style={{ background: "rgba(21,19,31,0.75)" }}
          className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full z-10"
          title="Delete"
        >
          <Trash2 size={13} style={{ color: PAPER }} />
        </button>
      )}
      {entry.image && (
        <img src={entry.image} alt="" className="w-full aspect-[16/9] object-cover rounded-lg mb-1" />
      )}
      <span style={{ color: GOLD_SOFT }} className="text-xs font-medium">{fmtDate(entry.date)}</span>
      <p className="leading-relaxed">{entry.text}</p>
      <div className="flex flex-wrap gap-2 mt-1">
        {entry.location && (
          <span style={{ background: PAPER_DIM, color: GOLD_SOFT }} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full">
            <MapPin size={10} /> {entry.location}
          </span>
        )}
        {(entry.people || []).map((p) => (
          <span key={p} style={{ background: PAPER_DIM, color: "#4A6B47" }} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full">
            <Users size={10} /> {p}
          </span>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ color: TEXT_FAINT }} className="flex flex-col items-center justify-center py-24 gap-2">
      <Brain size={26} style={{ color: TEXT_FAINT }} />
      <span>{text}</span>
    </div>
  );
}

function CategoryGrid({ categories, entries, onOpen, t }) {
  return (
    <div className="pt-8">
      <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }} className="mb-6">{t("categories_title")}</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {categories.map((c) => {
          const Icon = ICONS[c.icon] || Sparkles;
          const count = entries.filter((e) => e.category === c.id).length;
          return (
            <button key={c.id} onClick={() => onOpen(c.id)} style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }}
              className="rounded-2xl p-5 text-left flex flex-col gap-4">
              <Icon size={20} style={{ color: GOLD }} />
              <div>
                <div style={{ color: PAPER }} className="mb-0.5">{c.label}</div>
                <div style={{ color: TEXT_FAINT }} className="text-xs">{t("memory_count", count)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EntryList({ title, entries, onBack, onRequestDelete, t }) {
  return (
    <div className="pt-8">
      <button onClick={onBack} style={{ color: TEXT_FAINT }} className="flex items-center gap-1 text-xs mb-4">
        <ChevronRight size={12} style={{ transform: "rotate(180deg)" }} /> {t("back_to_categories")}
      </button>
      <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }} className="mb-6">{title}</h1>
      {entries.length === 0 ? <EmptyState text={t("empty_category")} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {entries.map((e) => <EntryCard key={e.id} entry={e} onRequestDelete={onRequestDelete} />)}
        </div>
      )}
    </div>
  );
}

function TimelineGallery({ entries, mode, setMode, onRequestDelete, t }) {
  const grouped = useMemo(() => {
    const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
    const map = {};
    sorted.forEach((e) => { const k = monthKey(e.date); if (!map[k]) map[k] = []; map[k].push(e); });
    return map;
  }, [entries]);

  return (
    <div className="pt-8">
      <div className="flex items-center justify-between mb-6">
        <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }}>{t("timeline_title")}</h1>
        <div style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }} className="flex rounded-full p-1">
          <button onClick={() => setMode("timeline")} style={{ background: mode === "timeline" ? INK_LINE : "transparent", color: mode === "timeline" ? PAPER : TEXT_FAINT }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs">
            <Rows size={13} /> {t("view_timeline")}
          </button>
          <button onClick={() => setMode("grid")} style={{ background: mode === "grid" ? INK_LINE : "transparent", color: mode === "grid" ? PAPER : TEXT_FAINT }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs">
            <LayoutGrid size={13} /> {t("view_album")}
          </button>
        </div>
      </div>
      {entries.length === 0 && <EmptyState text={t("empty_timeline")} />}
      {mode === "timeline" && Object.entries(grouped).map(([month, list]) => (
        <div key={month} className="mb-8">
          <div style={{ color: GOLD }} className="text-xs mb-3">{month}</div>
          <div className="flex flex-col gap-3 pl-4" style={{ borderLeft: `1px solid ${INK_LINE}` }}>
            {list.map((e) => <EntryCard key={e.id} entry={e} onRequestDelete={onRequestDelete} />)}
          </div>
        </div>
      ))}
      {mode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).map((e) => (
            <div key={e.id} style={{ background: PAPER }} className="group relative rounded-lg overflow-hidden aspect-square">
              {onRequestDelete && (
                <button
                  onClick={() => onRequestDelete(e)}
                  style={{ background: "rgba(21,19,31,0.75)" }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full z-10"
                  title="Delete"
                >
                  <Trash2 size={12} style={{ color: PAPER }} />
                </button>
              )}
              {e.image ? <img src={e.image} alt="" className="w-full h-full object-cover" /> : (
                <div className="w-full h-full flex items-center justify-center p-3">
                  <span style={{ color: INK }} className="text-xs line-clamp-4">{e.text}</span>
                </div>
              )}
              <div style={{ background: "linear-gradient(to top, rgba(0,0,0,.65), transparent 50%)" }} className="absolute inset-0 flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="text-white text-xs">{fmtDate(e.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LocationView({ entries, active, onOpen, onRequestDelete, t }) {
  const locations = useMemo(() => {
    const map = {};
    entries.forEach((e) => { if (!e.location) return; if (!map[e.location]) map[e.location] = []; map[e.location].push(e); });
    return map;
  }, [entries]);
  if (active && locations[active]) {
    return (
      <div className="pt-8">
        <button onClick={() => onOpen(null)} style={{ color: TEXT_FAINT }} className="flex items-center gap-1 text-xs mb-4">
          <ChevronRight size={12} style={{ transform: "rotate(180deg)" }} /> {t("back_to_locations")}
        </button>
        <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }} className="mb-6 flex items-center gap-2">
          <MapPin size={20} style={{ color: GOLD }} /> {active}
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {locations[active].map((e) => <EntryCard key={e.id} entry={e} onRequestDelete={onRequestDelete} />)}
        </div>
      </div>
    );
  }
  const keys = Object.keys(locations);
  return (
    <div className="pt-8">
      <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }} className="mb-6">{t("locations_title")}</h1>
      {keys.length === 0 ? <EmptyState text={t("empty_locations")} /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {keys.map((loc) => (
            <button key={loc} onClick={() => onOpen(loc)} style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }} className="rounded-2xl p-5 text-left flex flex-col gap-4">
              <MapPin size={20} style={{ color: GOLD }} />
              <div>
                <div style={{ color: PAPER }} className="mb-0.5">{loc}</div>
                <div style={{ color: TEXT_FAINT }} className="text-xs">{t("memory_count", locations[loc].length)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PeopleView({ people, entries, active, onOpen, onToggleFavorite, onRequestDelete, t }) {
  const byPerson = (name) => entries.filter((e) => (e.people || []).includes(name));
  if (active) {
    return (
      <div className="pt-8">
        <button onClick={() => onOpen(null)} style={{ color: TEXT_FAINT }} className="flex items-center gap-1 text-xs mb-4">
          <ChevronRight size={12} style={{ transform: "rotate(180deg)" }} /> {t("back_to_people")}
        </button>
        <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }} className="mb-6 flex items-center gap-2">
          <Users size={20} style={{ color: GOLD }} /> {active}
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {byPerson(active).map((e) => <EntryCard key={e.id} entry={e} onRequestDelete={onRequestDelete} />)}
        </div>
      </div>
    );
  }
  const sorted = [...people].sort((a, b) => (b.favorite - a.favorite));
  return (
    <div className="pt-8">
      <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }} className="mb-6">{t("people_title")}</h1>
      {sorted.length === 0 ? <EmptyState text={t("empty_people")} /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {sorted.map((p) => (
            <div key={p.name} style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }} className="rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div style={{ background: PAPER, color: INK }} className="w-9 h-9 rounded-full flex items-center justify-center text-sm">{p.name.slice(0, 1)}</div>
                <button onClick={() => onToggleFavorite(p.name)}>
                  <Star size={15} style={{ color: p.favorite ? GOLD : TEXT_FAINT }} fill={p.favorite ? GOLD : "none"} />
                </button>
              </div>
              <button onClick={() => onOpen(p.name)} className="text-left">
                <div style={{ color: PAPER }} className="mb-0.5">{p.name}</div>
                <div style={{ color: TEXT_FAINT }} className="text-xs">{t("together_count", byPerson(p.name).length)}</div>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchView({ query, setQuery, entries, onRequestDelete, t }) {
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return entries.filter((e) =>
      (e.text || "").toLowerCase().includes(q) ||
      (e.location || "").toLowerCase().includes(q) ||
      (e.people || []).some((p) => p.toLowerCase().includes(q))
    );
  }, [entries, query]);
  return (
    <div className="pt-8">
      <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }} className="mb-6">
        {t("search_results_title")} {query && <span style={{ color: TEXT_FAINT, fontSize: "0.9rem" }}>{t("search_results_for", query)}</span>}
      </h1>
      {!query.trim() ? <EmptyState text={t("empty_search_prompt")} /> :
        results.length === 0 ? <EmptyState text={t("empty_search_results")} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((e) => <EntryCard key={e.id} entry={e} onRequestDelete={onRequestDelete} />)}
        </div>
      )}
    </div>
  );
}

function Composer({ categories, people, onClose, onSave, t }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState(categories[categories.length - 1]?.id || categories[0].id);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState("");
  const [image, setImage] = useState(null);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [newPerson, setNewPerson] = useState("");
  const [compressing, setCompressing] = useState(false);
  const fileRef = useRef(null);
  const favorites = [...people].filter((p) => p.favorite);
  const others = [...people].filter((p) => !p.favorite);

  const handleFile = async (f) => {
    if (!f) return;
    setCompressing(true);
    try {
      const compressed = await compressImage(f);
      setImage(compressed);
    } catch (e) {
      console.error("image compression failed", e);
    } finally {
      setCompressing(false);
    }
  };
  const togglePerson = (name) => setSelectedPeople((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
  const addTypedPerson = () => {
    if (newPerson.trim()) {
      togglePerson(newPerson.trim());
      setNewPerson("");
    }
  };
  const save = () => {
    if (!text.trim()) return;
    // ถ้าพิมพ์ชื่อคนไว้ในช่องแต่ลืมกด Enter/+ ก่อนกดบันทึก ให้เก็บชื่อนั้นเข้าไปด้วยเสมอ กันข้อมูลตกหล่น
    const pending = newPerson.trim();
    const finalPeople = pending && !selectedPeople.includes(pending) ? [...selectedPeople, pending] : selectedPeople;
    onSave({ text: text.trim(), category, date, location: location.trim(), image, people: finalPeople });
  };

  return (
    <div style={{ background: "rgba(0,0,0,0.55)" }} className="fixed inset-0 flex items-end sm:items-center justify-center z-50 sm:p-6">
      <div style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}`, maxHeight: "90vh" }} className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
        <div style={{ borderBottom: `1px solid ${INK_LINE}` }} className="flex items-center justify-between px-5 py-4">
          <span style={{ fontFamily: FONT_DISPLAY, color: PAPER }} className="text-lg">{t("composer_title")}</span>
          <button onClick={onClose}><X size={18} style={{ color: TEXT_FAINT }} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={t("composer_placeholder")} rows={4}
            style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }} className="w-full rounded-lg px-3 py-2.5 outline-none resize-none leading-relaxed" />
          <div>
            <div style={{ color: TEXT_MUTED }} className="text-xs mb-1.5">{t("composer_topic")}</div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  style={{ background: category === c.id ? GOLD : INK, color: category === c.id ? INK : TEXT_MUTED, border: `1px solid ${category === c.id ? GOLD : INK_LINE}` }}
                  className="text-xs px-3 py-1.5 rounded-full">{c.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <div style={{ color: TEXT_MUTED }} className="text-xs mb-1.5 flex items-center gap-1"><Calendar size={12} /> {t("composer_date")}</div>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }} className="w-full rounded-lg px-3 py-2 outline-none text-sm" />
            </label>
            <label className="block">
              <div style={{ color: TEXT_MUTED }} className="text-xs mb-1.5 flex items-center gap-1"><MapPin size={12} /> {t("composer_location")}</div>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("composer_location_ph")} style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }} className="w-full rounded-lg px-3 py-2 outline-none text-sm" />
            </label>
          </div>
          <div>
            <div style={{ color: TEXT_MUTED }} className="text-xs mb-1.5 flex items-center gap-1"><ImageIcon size={12} /> {t("composer_photo")}</div>
            {image ? (
              <div className="relative">
                <img src={image} alt="" className="w-full aspect-[16/9] object-cover rounded-lg" />
                <button onClick={() => setImage(null)} style={{ background: INK }} className="absolute top-2 right-2 p-1 rounded-full">
                  <X size={13} style={{ color: PAPER }} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} disabled={compressing} style={{ background: INK, border: `1px dashed ${INK_LINE}`, color: TEXT_FAINT }} className="w-full rounded-lg py-3 text-xs flex items-center justify-center gap-1.5 disabled:opacity-60">
                <Plus size={13} /> {compressing ? "…" : t("composer_add_photo")}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </div>
          <div>
            <div style={{ color: TEXT_MUTED }} className="text-xs mb-1.5 flex items-center gap-1"><Users size={12} /> {t("composer_people")}</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[...favorites, ...others].map((p) => (
                <button key={p.name} onClick={() => togglePerson(p.name)}
                  style={{ background: selectedPeople.includes(p.name) ? SAGE : INK, color: selectedPeople.includes(p.name) ? INK : TEXT_MUTED, border: `1px solid ${selectedPeople.includes(p.name) ? SAGE : INK_LINE}` }}
                  className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                  {p.favorite && <Star size={9} fill="currentColor" />} {p.name}
                </button>
              ))}
              {selectedPeople.filter((n) => !people.find((p) => p.name === n)).map((n) => (
                <button key={n} onClick={() => togglePerson(n)}
                  style={{ background: SAGE, color: INK, border: `1px solid ${SAGE}` }}
                  className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                  {n} <X size={10} />
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input value={newPerson} onChange={(e) => setNewPerson(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTypedPerson(); } }}
                placeholder={t("composer_add_person_ph")} style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }} className="flex-1 min-w-0 rounded-lg px-3 py-1.5 outline-none text-xs" />
              <button type="button" onClick={addTypedPerson} style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }} className="shrink-0 rounded-lg px-3 py-1.5">
                <Plus size={13} />
              </button>
            </div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${INK_LINE}` }} className="px-5 py-4 flex justify-end gap-2">
          <button onClick={onClose} style={{ color: TEXT_MUTED }} className="text-sm px-4 py-2">{t("composer_cancel")}</button>
          <button onClick={save} disabled={!text.trim()} style={{ background: text.trim() ? GOLD : INK_LINE, color: text.trim() ? INK : TEXT_FAINT }} className="text-sm px-4 py-2 rounded-lg font-medium flex items-center gap-1.5">
            <Check size={14} /> {t("composer_save")}
          </button>
        </div>
      </div>
    </div>
  );
}
