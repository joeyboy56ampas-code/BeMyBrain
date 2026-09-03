"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import {
  Search, Plus, X, MapPin, Users, Calendar, LayoutGrid, Rows,
  Briefcase, Heart, Activity, Home, Sparkles, Star, Image as ImageIcon,
  ChevronRight, Check, Loader2, Brain, LogOut
} from "lucide-react";

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
  { id: "love", label: "ความสัมพันธ์กับคนรัก", icon: "Heart" },
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

/* ---------- Supabase persistence: one JSON blob per user ---------- */
async function loadBundle(email) {
  const { data, error } = await supabase
    .from("brain_data")
    .select("payload")
    .eq("user_email", email)
    .maybeSingle();
  if (error || !data) return { entries: [], people: [], categories: DEFAULT_CATEGORIES };
  return {
    entries: data.payload?.entries || [],
    people: data.payload?.people || [],
    categories: data.payload?.categories || DEFAULT_CATEGORIES,
  };
}

async function saveBundle(email, entries, people, categories) {
  await supabase.from("brain_data").upsert(
    { user_email: email, payload: { entries, people, categories }, updated_at: new Date().toISOString() },
    { onConflict: "user_email" }
  );
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
  const [query, setQuery] = useState("");
  const [saveTick, setSaveTick] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return;
    (async () => {
      const data = await loadBundle(session.user.email);
      setEntries(data.entries);
      setPeople(data.people);
      setCategories(data.categories);
      setBooting(false);
    })();
  }, [status, session]);

  const persist = (nextEntries, nextPeople, nextCategories) => {
    if (!session?.user?.email) return;
    setSaveTick(true);
    saveBundle(session.user.email, nextEntries, nextPeople, nextCategories).finally(() =>
      setTimeout(() => setSaveTick(false), 700)
    );
  };

  const addEntry = (entry) => {
    const next = [{ ...entry, id: uid(), createdAt: new Date().toISOString() }, ...entries];
    setEntries(next);
    persist(next, people, categories);
  };

  const upsertPeople = (names) => {
    let next = [...people];
    names.forEach((n) => { if (!next.find((p) => p.name === n)) next.push({ name: n, favorite: false }); });
    setPeople(next);
    persist(entries, next, categories);
  };

  const toggleFavorite = (name) => {
    const next = people.map((p) => (p.name === name ? { ...p, favorite: !p.favorite } : p));
    setPeople(next);
    persist(entries, next, categories);
  };

  const addCategory = (label) => {
    const next = [...categories, { id: uid(), label, icon: "Sparkles" }];
    setCategories(next);
    persist(entries, people, next);
  };

  if (status === "loading" || booting) {
    return (
      <div style={{ background: INK, minHeight: "100vh", fontFamily: FONT_BODY }} className="w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3" style={{ color: TEXT_MUTED }}>
          <Loader2 className="animate-spin" size={22} style={{ color: GOLD }} />
          <span>กำลังเปิดสมองของคุณ…</span>
        </div>
      </div>
    );
  }
  if (!session) return null;
  const user = { name: session.user.name, email: session.user.email, image: session.user.image };

  return (
    <div style={{ background: INK, fontFamily: FONT_BODY, minHeight: "100vh" }} className="w-full flex text-sm">
      <Sidebar
        user={user} view={view}
        setView={(v) => { setView(v); setActiveFilter(null); }}
        categories={categories} onAddCategory={addCategory}
        entries={entries} saving={saveTick}
      />
      <main className="flex-1 min-w-0 flex flex-col" style={{ maxHeight: "100vh" }}>
        <TopBar query={query} setQuery={setQuery} onSearch={() => setView("search")} onCompose={() => setShowComposer(true)} />
        <div className="flex-1 overflow-y-auto px-8 pb-10">
          {view === "category" && !activeFilter && (
            <CategoryGrid categories={categories} entries={entries} onOpen={(id) => setActiveFilter(id)} />
          )}
          {view === "category" && activeFilter && (
            <EntryList title={categories.find((c) => c.id === activeFilter)?.label}
              entries={entries.filter((e) => e.category === activeFilter)} onBack={() => setActiveFilter(null)} />
          )}
          {view === "timeline" && <TimelineGallery entries={entries} mode={galleryMode} setMode={setGalleryMode} />}
          {view === "location" && <LocationView entries={entries} active={activeFilter} onOpen={setActiveFilter} />}
          {view === "people" && (
            <PeopleView people={people} entries={entries} active={activeFilter} onOpen={setActiveFilter} onToggleFavorite={toggleFavorite} />
          )}
          {view === "search" && <SearchView query={query} setQuery={setQuery} entries={entries} />}
        </div>
      </main>
      {showComposer && (
        <Composer
          categories={categories} people={people}
          onClose={() => setShowComposer(false)}
          onSave={(entry) => { addEntry(entry); upsertPeople(entry.people); setShowComposer(false); }}
        />
      )}
    </div>
  );
}

/* ---------------- sidebar / top bar ---------------- */
function Sidebar({ user, view, setView, categories, onAddCategory, entries, saving }) {
  const [addingCat, setAddingCat] = useState(false);
  const [catName, setCatName] = useState("");
  const items = [
    { id: "category", label: "หมวดหมู่", icon: LayoutGrid },
    { id: "timeline", label: "Timeline", icon: Rows },
    { id: "location", label: "สถานที่", icon: MapPin },
    { id: "people", label: "บุคคล", icon: Users },
  ];
  return (
    <aside style={{ background: INK_SOFT, borderRight: `1px solid ${INK_LINE}`, width: "232px" }} className="shrink-0 flex flex-col py-6 px-4">
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
      <div style={{ color: TEXT_FAINT }} className="px-3 text-xs uppercase tracking-wide mb-2">หมวดหมู่ของฉัน</div>
      <div className="flex flex-col gap-0.5 mb-3 overflow-y-auto">
        {categories.map((c) => {
          const Icon = ICONS[c.icon] || Sparkles;
          const count = entries.filter((e) => e.category === c.id).length;
          return (
            <button key={c.id} onClick={() => setView("category")} style={{ color: TEXT_MUTED }}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg text-left hover:bg-white/5">
              <span className="flex items-center gap-2 truncate">
                <Icon size={13} style={{ color: TEXT_FAINT }} />
                <span className="truncate">{c.label}</span>
              </span>
              <span style={{ color: TEXT_FAINT }} className="text-xs">{count}</span>
            </button>
          );
        })}
      </div>
      {addingCat ? (
        <div className="px-2 flex gap-1">
          <input autoFocus value={catName} onChange={(e) => setCatName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && catName.trim()) { onAddCategory(catName.trim()); setCatName(""); setAddingCat(false); }
              if (e.key === "Escape") setAddingCat(false);
            }}
            placeholder="ชื่อหัวข้อใหม่" style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }}
            className="w-full rounded-md px-2 py-1 text-xs outline-none" />
        </div>
      ) : (
        <button onClick={() => setAddingCat(true)} style={{ color: TEXT_FAINT }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs">
          <Plus size={12} /> เพิ่มหัวข้อ
        </button>
      )}
      <div className="flex-1" />
      <div className="px-3 flex items-center gap-2 mb-2">
        <span style={{ width: 6, height: 6, borderRadius: 999, background: saving ? GOLD : SAGE, opacity: saving ? 1 : 0.6 }} />
        <span style={{ color: TEXT_FAINT }} className="text-xs">{saving ? "กำลังบันทึก…" : "บันทึกอัตโนมัติแล้ว"}</span>
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
        <button onClick={() => signOut({ callbackUrl: "/login" })} title="ออกจากระบบ">
          <LogOut size={14} style={{ color: TEXT_FAINT }} />
        </button>
      </div>
    </aside>
  );
}

function TopBar({ query, setQuery, onSearch, onCompose }) {
  return (
    <div style={{ borderBottom: `1px solid ${INK_LINE}` }} className="flex items-center gap-3 px-8 py-4">
      <div style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }} className="flex-1 flex items-center gap-2 rounded-full px-4 py-2">
        <Search size={15} style={{ color: TEXT_FAINT }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder="ค้นหาความทรงจำ ชื่อคน สถานที่ หรือโปรเจค…" style={{ background: "transparent", color: PAPER }}
          className="flex-1 outline-none text-sm" />
      </div>
      <button onClick={onCompose} style={{ background: GOLD, color: INK }} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium">
        <Plus size={15} /> บันทึกใหม่
      </button>
    </div>
  );
}

function EntryCard({ entry }) {
  return (
    <div style={{ background: PAPER, color: INK }} className="rounded-xl p-4 shadow-lg flex flex-col gap-2">
      {entry.image && <img src={entry.image} alt="" className="w-full h-40 object-cover rounded-lg mb-1" />}
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

function CategoryGrid({ categories, entries, onOpen }) {
  return (
    <div className="pt-8">
      <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }} className="mb-6">หมวดหมู่</h1>
      <div className="grid grid-cols-3 gap-4">
        {categories.map((c) => {
          const Icon = ICONS[c.icon] || Sparkles;
          const count = entries.filter((e) => e.category === c.id).length;
          return (
            <button key={c.id} onClick={() => onOpen(c.id)} style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }}
              className="rounded-2xl p-5 text-left flex flex-col gap-4">
              <Icon size={20} style={{ color: GOLD }} />
              <div>
                <div style={{ color: PAPER }} className="mb-0.5">{c.label}</div>
                <div style={{ color: TEXT_FAINT }} className="text-xs">{count} บันทึก</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EntryList({ title, entries, onBack }) {
  return (
    <div className="pt-8">
      <button onClick={onBack} style={{ color: TEXT_FAINT }} className="flex items-center gap-1 text-xs mb-4">
        <ChevronRight size={12} style={{ transform: "rotate(180deg)" }} /> กลับไปหมวดหมู่ทั้งหมด
      </button>
      <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }} className="mb-6">{title}</h1>
      {entries.length === 0 ? <EmptyState text="ยังไม่มีบันทึกในหัวข้อนี้" /> : (
        <div className="grid grid-cols-2 gap-4">{entries.map((e) => <EntryCard key={e.id} entry={e} />)}</div>
      )}
    </div>
  );
}

function TimelineGallery({ entries, mode, setMode }) {
  const grouped = useMemo(() => {
    const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
    const map = {};
    sorted.forEach((e) => { const k = monthKey(e.date); if (!map[k]) map[k] = []; map[k].push(e); });
    return map;
  }, [entries]);
  return (
    <div className="pt-8">
      <div className="flex items-center justify-between mb-6">
        <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }}>Timeline ความทรงจำ</h1>
        <div style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }} className="flex rounded-full p-1">
          <button onClick={() => setMode("timeline")} style={{ background: mode === "timeline" ? INK_LINE : "transparent", color: mode === "timeline" ? PAPER : TEXT_FAINT }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs">
            <Rows size={13} /> Timeline
          </button>
          <button onClick={() => setMode("grid")} style={{ background: mode === "grid" ? INK_LINE : "transparent", color: mode === "grid" ? PAPER : TEXT_FAINT }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs">
            <LayoutGrid size={13} /> อัลบั้ม
          </button>
        </div>
      </div>
      {entries.length === 0 && <EmptyState text="ยังไม่มีความทรงจำถูกบันทึกไว้" />}
      {mode === "timeline" && Object.entries(grouped).map(([month, list]) => (
        <div key={month} className="mb-8">
          <div style={{ color: GOLD }} className="text-xs mb-3">{month}</div>
          <div className="flex flex-col gap-3 pl-4" style={{ borderLeft: `1px solid ${INK_LINE}` }}>
            {list.map((e) => <EntryCard key={e.id} entry={e} />)}
          </div>
        </div>
      ))}
      {mode === "grid" && (
        <div className="grid grid-cols-4 gap-3">
          {[...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).map((e) => (
            <div key={e.id} style={{ background: PAPER }} className="rounded-lg overflow-hidden aspect-square relative group">
              {e.image ? <img src={e.image} alt="" className="w-full h-full object-cover" /> : (
                <div className="w-full h-full flex items-center justify-center p-3">
                  <span style={{ color: INK }} className="text-xs line-clamp-4">{e.text}</span>
                </div>
              )}
              <div style={{ background: "linear-gradient(to top, rgba(0,0,0,.65), transparent 50%)" }} className="absolute inset-0 flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs">{fmtDate(e.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LocationView({ entries, active, onOpen }) {
  const locations = useMemo(() => {
    const map = {};
    entries.forEach((e) => { if (!e.location) return; if (!map[e.location]) map[e.location] = []; map[e.location].push(e); });
    return map;
  }, [entries]);
  if (active && locations[active]) {
    return (
      <div className="pt-8">
        <button onClick={() => onOpen(null)} style={{ color: TEXT_FAINT }} className="flex items-center gap-1 text-xs mb-4">
          <ChevronRight size={12} style={{ transform: "rotate(180deg)" }} /> กลับไปสถานที่ทั้งหมด
        </button>
        <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }} className="mb-6 flex items-center gap-2">
          <MapPin size={20} style={{ color: GOLD }} /> {active}
        </h1>
        <div className="grid grid-cols-2 gap-4">{locations[active].map((e) => <EntryCard key={e.id} entry={e} />)}</div>
      </div>
    );
  }
  const keys = Object.keys(locations);
  return (
    <div className="pt-8">
      <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }} className="mb-6">สถานที่</h1>
      {keys.length === 0 ? <EmptyState text="ยังไม่มีบันทึกที่ระบุสถานที่" /> : (
        <div className="grid grid-cols-3 gap-4">
          {keys.map((loc) => (
            <button key={loc} onClick={() => onOpen(loc)} style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }} className="rounded-2xl p-5 text-left flex flex-col gap-4">
              <MapPin size={20} style={{ color: GOLD }} />
              <div>
                <div style={{ color: PAPER }} className="mb-0.5">{loc}</div>
                <div style={{ color: TEXT_FAINT }} className="text-xs">{locations[loc].length} บันทึก</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PeopleView({ people, entries, active, onOpen, onToggleFavorite }) {
  const byPerson = (name) => entries.filter((e) => (e.people || []).includes(name));
  if (active) {
    return (
      <div className="pt-8">
        <button onClick={() => onOpen(null)} style={{ color: TEXT_FAINT }} className="flex items-center gap-1 text-xs mb-4">
          <ChevronRight size={12} style={{ transform: "rotate(180deg)" }} /> กลับไปบุคคลทั้งหมด
        </button>
        <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }} className="mb-6 flex items-center gap-2">
          <Users size={20} style={{ color: GOLD }} /> {active}
        </h1>
        <div className="grid grid-cols-2 gap-4">{byPerson(active).map((e) => <EntryCard key={e.id} entry={e} />)}</div>
      </div>
    );
  }
  const sorted = [...people].sort((a, b) => (b.favorite - a.favorite));
  return (
    <div className="pt-8">
      <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }} className="mb-6">บุคคล</h1>
      {sorted.length === 0 ? <EmptyState text="ยังไม่มีบุคคลถูกบันทึกไว้" /> : (
        <div className="grid grid-cols-3 gap-4">
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
                <div style={{ color: TEXT_FAINT }} className="text-xs">{byPerson(p.name).length} บันทึกร่วมกัน</div>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchView({ query, setQuery, entries }) {
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
        ผลการค้นหา {query && <span style={{ color: TEXT_FAINT, fontSize: "0.9rem" }}>สำหรับ "{query}"</span>}
      </h1>
      {!query.trim() ? <EmptyState text="พิมพ์คำค้นหาด้านบนเพื่อเริ่มค้นหา" /> :
        results.length === 0 ? <EmptyState text="ไม่พบบันทึกที่เกี่ยวข้อง" /> : (
        <div className="grid grid-cols-2 gap-4">{results.map((e) => <EntryCard key={e.id} entry={e} />)}</div>
      )}
    </div>
  );
}

function Composer({ categories, people, onClose, onSave }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState(categories[categories.length - 1]?.id || categories[0].id);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState("");
  const [image, setImage] = useState(null);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [newPerson, setNewPerson] = useState("");
  const fileRef = useRef(null);
  const favorites = [...people].filter((p) => p.favorite);
  const others = [...people].filter((p) => !p.favorite);

  const handleFile = (f) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(f);
  };
  const togglePerson = (name) => setSelectedPeople((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
  const save = () => { if (!text.trim()) return; onSave({ text: text.trim(), category, date, location: location.trim(), image, people: selectedPeople }); };

  return (
    <div style={{ background: "rgba(0,0,0,0.55)" }} className="fixed inset-0 flex items-center justify-center z-50 p-6">
      <div style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}`, maxHeight: "85vh" }} className="w-full max-w-lg rounded-2xl flex flex-col overflow-hidden">
        <div style={{ borderBottom: `1px solid ${INK_LINE}` }} className="flex items-center justify-between px-5 py-4">
          <span style={{ fontFamily: FONT_DISPLAY, color: PAPER }} className="text-lg">บันทึกความทรงจำใหม่</span>
          <button onClick={onClose}><X size={18} style={{ color: TEXT_FAINT }} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="วันนี้เกิดอะไรขึ้นบ้าง…" rows={4}
            style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }} className="w-full rounded-lg px-3 py-2.5 outline-none resize-none leading-relaxed" />
          <div>
            <div style={{ color: TEXT_MUTED }} className="text-xs mb-1.5">หัวข้อ</div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  style={{ background: category === c.id ? GOLD : INK, color: category === c.id ? INK : TEXT_MUTED, border: `1px solid ${category === c.id ? GOLD : INK_LINE}` }}
                  className="text-xs px-3 py-1.5 rounded-full">{c.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div style={{ color: TEXT_MUTED }} className="text-xs mb-1.5 flex items-center gap-1"><Calendar size={12} /> วันที่</div>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }} className="w-full rounded-lg px-3 py-2 outline-none text-sm" />
            </label>
            <label className="block">
              <div style={{ color: TEXT_MUTED }} className="text-xs mb-1.5 flex items-center gap-1"><MapPin size={12} /> สถานที่</div>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="ชื่อร้าน / สถานที่" style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }} className="w-full rounded-lg px-3 py-2 outline-none text-sm" />
            </label>
          </div>
          <div>
            <div style={{ color: TEXT_MUTED }} className="text-xs mb-1.5 flex items-center gap-1"><ImageIcon size={12} /> รูปภาพ</div>
            {image ? (
              <div className="relative">
                <img src={image} alt="" className="w-full h-32 object-cover rounded-lg" />
                <button onClick={() => setImage(null)} style={{ background: INK }} className="absolute top-2 right-2 p-1 rounded-full">
                  <X size={13} style={{ color: PAPER }} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} style={{ background: INK, border: `1px dashed ${INK_LINE}`, color: TEXT_FAINT }} className="w-full rounded-lg py-3 text-xs flex items-center justify-center gap-1.5">
                <Plus size={13} /> แนบรูป
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </div>
          <div>
            <div style={{ color: TEXT_MUTED }} className="text-xs mb-1.5 flex items-center gap-1"><Users size={12} /> บุคคลที่เกี่ยวข้อง</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[...favorites, ...others].map((p) => (
                <button key={p.name} onClick={() => togglePerson(p.name)}
                  style={{ background: selectedPeople.includes(p.name) ? SAGE : INK, color: selectedPeople.includes(p.name) ? INK : TEXT_MUTED, border: `1px solid ${selectedPeople.includes(p.name) ? SAGE : INK_LINE}` }}
                  className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                  {p.favorite && <Star size={9} fill="currentColor" />} {p.name}
                </button>
              ))}
            </div>
            <input value={newPerson} onChange={(e) => setNewPerson(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newPerson.trim()) { togglePerson(newPerson.trim()); setNewPerson(""); } }}
              placeholder="เพิ่มชื่อใหม่แล้วกด Enter" style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }} className="w-full rounded-lg px-3 py-1.5 outline-none text-xs" />
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${INK_LINE}` }} className="px-5 py-4 flex justify-end gap-2">
          <button onClick={onClose} style={{ color: TEXT_MUTED }} className="text-sm px-4 py-2">ยกเลิก</button>
          <button onClick={save} disabled={!text.trim()} style={{ background: text.trim() ? GOLD : INK_LINE, color: text.trim() ? INK : TEXT_FAINT }} className="text-sm px-4 py-2 rounded-lg font-medium flex items-center gap-1.5">
            <Check size={14} /> บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
