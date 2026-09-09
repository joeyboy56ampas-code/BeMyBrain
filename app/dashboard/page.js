"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, X, MapPin, Users, Calendar, LayoutGrid, Rows,
  Star, Image as ImageIcon,
  ChevronRight, Check, Brain, Trash2, Settings2, Pencil
} from "lucide-react";
import { CATEGORY_ICONS } from "../../lib/categoryIcons";
import { t } from "../../lib/i18n";
import { createSaveQueue } from "../../lib/saveQueue";
import { isVideoFile, MAX_VIDEO_BYTES, guessMediaType } from "../../lib/mediaConfig";
import MediaThumb from "../../components/MediaThumb";
import ConfirmDialog from "../../components/ConfirmDialog";
import ManageCategoriesModal from "../../components/ManageCategoriesModal";
import ManagePeopleModal from "../../components/ManagePeopleModal";
import ManageLocationsModal from "../../components/ManageLocationsModal";
import SettingsModal from "../../components/SettingsModal";
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
const FONT_DISPLAY = "var(--font-display), serif";
const FONT_BODY = "var(--font-body), sans-serif";

const DEFAULT_CATEGORIES = [
  { id: "work", label: "Work", icon: "Briefcase" },
  { id: "love", label: "Relationships", icon: "Heart" },
  { id: "health", label: "Health", icon: "Activity" },
  { id: "family", label: "Family", icon: "Home" },
  { id: "general", label: "General", icon: "Sparkles" },
];
const ICONS = CATEGORY_ICONS;

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
// บีบอัดรูปแล้วคืนเป็น Blob (สำหรับอัปโหลดขึ้น Storage) — เล็กกว่า base64 ~33%
function compressImageToBlob(file, maxDimension = 1600, quality = 0.82) {
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
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("compression failed"))),
          "image/jpeg",
          quality
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

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
      updatedAt: data.updatedAt || null,
    };
  } catch (e) {
    console.error("load failed", e);
    return { entries: [], people: [], categories: DEFAULT_CATEGORIES, updatedAt: null };
  }
}

// ลบไฟล์รูปที่ไม่ได้ใช้แล้วออกจาก Storage (best-effort ไม่ต้องรอผล)
function deleteOrphanPhoto(url) {
  if (!url || !url.startsWith("http")) return; // base64 เก่าไม่มีไฟล์ให้ลบ
  fetch("/api/photo", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  }).catch(() => {});
}

async function saveBundle(entries, people, categories, baseUpdatedAt) {
  try {
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries, people, categories, baseUpdatedAt }),
    });
    if (!res.ok) {
      // 413 = payload ใหญ่เกินลิมิต 4.5MB ของ Vercel
      if (res.status === 413) return { ok: false, reason: "too_large" };
      // 409 = อีกเครื่องเซฟแซงไปแล้ว ห้ามทับ
      if (res.status === 409) return { ok: false, reason: "conflict" };
      return { ok: false, reason: "failed" };
    }
    const data = await res.json();
    return { ok: true, updatedAt: data.updatedAt };
  } catch (e) {
    return { ok: false, reason: "offline" };
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

// รายชื่อสถานที่ที่เคยใช้มาแล้ว ดึงจาก entries ตรง ๆ เหมือนกัน สำหรับให้เลือกซ้ำได้ทันทีตอนเพิ่มความทรงจำใหม่
function uniqueLocations(entries) {
  const set = new Set();
  entries.forEach((e) => { if (e.location) set.add(e.location); });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
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
  const [showManagePeople, setShowManagePeople] = useState(false);
  const [showManageLocations, setShowManageLocations] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [query, setQuery] = useState("");
  const [saveTick, setSaveTick] = useState(false);
  const [saveError, setSaveError] = useState("");
  const saveQueue = useRef(null);
  const userEmail = session?.user?.email || null;
  const loadedForEmail = useRef(null);
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    // บัญชี admin (username "admin") ไม่ใช่ user จริงในตาราง users — ถ้าเผลอมาหน้านี้
    // (พิมพ์ URL เอง) ต้องเด้งกลับไป /admin เพราะ /api/data และ /api/heartbeat จะเซฟไม่ได้
    // (ติด foreign key เพราะไม่มีแถวอีเมลนี้ในตาราง users จริง ๆ)
    if (session?.user?.email === "__admin__") router.replace("/admin");
  }, [status, session, router]);

  // *** สำคัญมาก ***
  // ต้องผูก effect กับ "อีเมล" (ข้อความคงที่) ไม่ใช่กับอ็อบเจกต์ session
  // เพราะ NextAuth สร้าง session เป็นอ็อบเจกต์ใหม่ทุกครั้งที่มันรีเฟรชเอง
  // (เกิดเป็นระยะ + ทุกครั้งที่สลับกลับมาที่แท็บ)
  // ถ้าผูกกับ session ตรง ๆ effect จะรันซ้ำ แล้วโหลดข้อมูลจากเซิร์ฟเวอร์มาทับ state ในเครื่อง
  // ทำให้ความทรงจำที่ยังบันทึกไม่เสร็จหายทันที และคิวบันทึกถูกสร้างใหม่ทิ้งงานที่ค้างอยู่
  useEffect(() => {
    if (status !== "authenticated" || !userEmail) return;
    // กันโหลดซ้ำ: โหลดข้อมูลครั้งเดียวต่อผู้ใช้หนึ่งคนเท่านั้น
    if (loadedForEmail.current === userEmail) return;
    loadedForEmail.current = userEmail;

    (async () => {
      const data = await loadBundle();
      setEntries(data.entries);
      setPeople(data.people);
      setCategories(data.categories);

      // สร้างคิวบันทึกครั้งเดียว แล้วใช้ตัวเดิมตลอดอายุหน้านี้ (ห้ามสร้างใหม่ระหว่างทาง)
      saveQueue.current = createSaveQueue({
        send: (payload) =>
          saveBundle(payload.entries, payload.people, payload.categories, payload.baseUpdatedAt),
        onStatusChange: ({ saving, error }) => {
          setSaveTick(saving);
          setSaveError(error || "");
        },
      });
      saveQueue.current.setVersion(data.updatedAt);

      setBooting(false);
    })();
  }, [status, userEmail]);

  // ส่งสัญญาณ "ยังเปิดเว็บอยู่" ทุก 20 วินาที เพื่อให้หน้า Admin รู้ว่าใครกำลังใช้งานจริง ๆ ตอนนี้
  // (แทนการเดาจากเวลา login ล่าสุด ซึ่งไม่แม่นเท่า)
  useEffect(() => {
    if (status !== "authenticated" || !userEmail) return;
    const ping = () => fetch("/api/heartbeat", { method: "POST" }).catch(() => {});
    ping();
    const interval = setInterval(ping, 20000);
    return () => clearInterval(interval);
  }, [status, userEmail]);

  // ส่งเข้าคิวบันทึก — เรียกถี่แค่ไหนก็ได้ คิวจะรวบและทยอยส่งให้เองทีละตัว
  const persist = (nextEntries, nextPeople, nextCategories) => {
    if (!session?.user?.email || !saveQueue.current) return;
    saveQueue.current.enqueue({
      entries: nextEntries,
      people: nextPeople,
      categories: nextCategories,
    });
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
    const target = entries.find((e) => e.id === id);
    const nextEntries = entries.filter((e) => e.id !== id);
    setEntries(nextEntries);
    persist(nextEntries, people, categories);
    // ลบไฟล์รูปที่ผูกกับความทรงจำนี้ออกจาก Storage ด้วย
    if (target?.image) deleteOrphanPhoto(target.image);
  };

  // แก้ไขความทรงจำที่มีอยู่แล้ว — รวมการอัปเดต people roster ไว้ในการเซฟครั้งเดียวเหมือน addEntry
  const updateEntry = (id, patch) => {
    // ถ้าเปลี่ยน/เอารูปเดิมออก ต้องลบไฟล์เก่าใน Storage ไม่ให้ค้าง
    const prev = entries.find((e) => e.id === id);
    if (prev?.image && prev.image !== patch.image) deleteOrphanPhoto(prev.image);

    const nextEntries = entries.map((e) => (e.id === id ? { ...e, ...patch } : e));
    let nextPeople = [...people];
    (patch.people || []).forEach((n) => {
      if (!nextPeople.find((p) => p.name === n)) nextPeople.push({ name: n, favorite: false });
    });
    setEntries(nextEntries);
    setPeople(nextPeople);
    persist(nextEntries, nextPeople, categories);
  };

  const toggleFavorite = (name) => {
    const exists = people.find((p) => p.name === name);
    const next = exists
      ? people.map((p) => (p.name === name ? { ...p, favorite: !p.favorite } : p))
      : [...people, { name, favorite: true }];
    setPeople(next);
    persist(entries, next, categories);
  };

  // เปลี่ยนชื่อบุคคล — อัปเดตทั้งใน people[] และในทุกความทรงจำที่เคยแท็กชื่อเดิมไว้
  const renamePerson = (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    let nextPeople = people.map((p) => (p.name === oldName ? { ...p, name: trimmed } : p));
    if (!people.find((p) => p.name === oldName)) nextPeople.push({ name: trimmed, favorite: false });
    const nextEntries = entries.map((e) => ({
      ...e,
      people: (e.people || []).map((n) => (n === oldName ? trimmed : n)),
    }));
    setPeople(nextPeople);
    setEntries(nextEntries);
    persist(nextEntries, nextPeople, categories);
    if (activeFilter === oldName) setActiveFilter(trimmed);
  };

  // ลบบุคคล — แค่เอาชื่อออกจากทุกความทรงจำที่แท็กไว้ (untag) ไม่ลบความทรงจำนั้นทิ้ง
  const deletePerson = (name) => {
    const nextPeople = people.filter((p) => p.name !== name);
    const nextEntries = entries.map((e) => ({
      ...e,
      people: (e.people || []).filter((n) => n !== name),
    }));
    setPeople(nextPeople);
    setEntries(nextEntries);
    persist(nextEntries, nextPeople, categories);
    if (activeFilter === name) setActiveFilter(null);
  };

  // เปลี่ยนชื่อสถานที่ — อัปเดตทุกความทรงจำที่เคยใช้ชื่อสถานที่เดิม
  const renameLocation = (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    const nextEntries = entries.map((e) => (e.location === oldName ? { ...e, location: trimmed } : e));
    setEntries(nextEntries);
    persist(nextEntries, people, categories);
    if (activeFilter === oldName) setActiveFilter(trimmed);
  };

  // ลบสถานที่ — แค่เอาแท็กสถานที่ออกจากความทรงจำ ไม่ลบความทรงจำทิ้ง (เหมือนกับลบบุคคล)
  const deleteLocationTag = (name) => {
    const nextEntries = entries.map((e) => (e.location === name ? { ...e, location: "" } : e));
    setEntries(nextEntries);
    persist(nextEntries, people, categories);
    if (activeFilter === name) setActiveFilter(null);
  };

  const addCategory = (label, icon = "Sparkles") => {
    const next = [...categories, { id: uid(), label, icon }];
    setCategories(next);
    persist(entries, people, next);
  };

  const renameCategory = (id, label) => {
    const next = categories.map((c) => (c.id === id ? { ...c, label } : c));
    setCategories(next);
    persist(entries, people, next);
  };

  const changeCategoryIcon = (id, icon) => {
    const next = categories.map((c) => (c.id === id ? { ...c, icon } : c));
    setCategories(next);
    persist(entries, people, next);
  };

  // ลบหมวดหมู่ — ตามที่ตกลง: ความทรงจำในหมวดนี้จะถูกลบไปด้วย (มีคำเตือนใน modal ก่อนเสมอ)
  const deleteCategory = (id) => {
    if (categories.length <= 1) return;
    const nextCategories = categories.filter((c) => c.id !== id);
    // หมวดหมู่นี้ถูกลบพร้อมความทรงจำข้างใน -> ต้องลบไฟล์รูปของความทรงจำเหล่านั้นด้วย
    entries.filter((e) => e.category === id && e.image).forEach((e) => deleteOrphanPhoto(e.image));
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
  const locationRoster = uniqueLocations(entries);

  return (
    <div style={{ background: INK, fontFamily: FONT_BODY, minHeight: "100vh" }} className="w-full flex text-sm">
      <Sidebar
        user={user} view={view}
        setView={(v) => { setView(v); setActiveFilter(null); }}
        onOpenCategory={(id) => { setView("category"); setActiveFilter(id); }}
        categories={categories} saving={saveTick} saveError={saveError} t={t}
        onManageCategories={() => setShowManageCategories(true)}
        onOpenSettings={() => setShowSettings(true)}
      />
      <main className="flex-1 min-w-0 flex flex-col" style={{ maxHeight: "100vh" }}>
        <TopBar
          query={query} setQuery={setQuery} onSearch={() => setView("search")} onCompose={() => setShowComposer(true)}
          t={t} user={user}
          onManageCategories={() => setShowManageCategories(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
        {saveError && (
          <div style={{ background: "#3A1F1F", borderBottom: "1px solid #E38E8E" }} className="px-4 sm:px-8 py-3">
            <p style={{ color: "#E38E8E" }} className="text-xs leading-relaxed">
              {saveError === "too_large" ? t("save_failed_too_large") : saveError === "offline" ? t("save_failed_offline") : saveError === "conflict" ? t("save_failed_conflict") : t("save_failed_generic")}
            </p>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-24 md:pb-10">
          {view === "category" && !activeFilter && (
            <CategoryGrid categories={categories} entries={entries} onOpen={(id) => setActiveFilter(id)} t={t} />
          )}
          {view === "category" && activeFilter && (
            <EntryList title={categories.find((c) => c.id === activeFilter)?.label}
              entries={entries.filter((e) => e.category === activeFilter)} onBack={() => setActiveFilter(null)}
              onRequestDelete={setPendingDeleteEntry} onRequestEdit={setEditingEntry} onImageClick={setViewingImage} t={t} />
          )}
          {view === "timeline" && (
            <TimelineGallery entries={entries} mode={galleryMode} setMode={setGalleryMode}
              onRequestDelete={setPendingDeleteEntry} onRequestEdit={setEditingEntry} onImageClick={setViewingImage} t={t} />
          )}
          {view === "location" && (
            <LocationView entries={entries} active={activeFilter} onOpen={setActiveFilter}
              onRequestDelete={setPendingDeleteEntry} onRequestEdit={setEditingEntry} onImageClick={setViewingImage}
              onManageLocations={() => setShowManageLocations(true)} t={t} />
          )}
          {view === "people" && (
            <PeopleView people={peopleRoster} entries={entries} active={activeFilter} onOpen={setActiveFilter}
              onToggleFavorite={toggleFavorite} onRequestDelete={setPendingDeleteEntry}
              onRequestEdit={setEditingEntry} onImageClick={setViewingImage}
              onManagePeople={() => setShowManagePeople(true)} t={t} />
          )}
          {view === "search" && (
            <SearchView query={query} setQuery={setQuery} entries={entries}
              onRequestDelete={setPendingDeleteEntry} onRequestEdit={setEditingEntry} onImageClick={setViewingImage} t={t} />
          )}
        </div>
      </main>

      <MobileNav view={view === "category" && activeFilter ? "category" : view} setView={(v) => { setView(v); setActiveFilter(null); }} t={t} onCompose={() => setShowComposer(true)} />

      {showComposer && (
        <Composer
          categories={categories} people={peopleRoster} locations={locationRoster} t={t}
          onClose={() => setShowComposer(false)}
          onSave={(entry) => { addEntry(entry); setShowComposer(false); }}
        />
      )}

      {editingEntry && (
        <Composer
          categories={categories} people={peopleRoster} locations={locationRoster} t={t}
          initialEntry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={(patch) => { updateEntry(editingEntry.id, patch); setEditingEntry(null); }}
        />
      )}

      {viewingImage && (
        <ImageLightbox src={viewingImage} onClose={() => setViewingImage(null)} />
      )}

      <ManageCategoriesModal
        open={showManageCategories}
        onClose={() => setShowManageCategories(false)}
        categories={categories}
        entries={entries}
        t={t}
        onAdd={addCategory}
        onRename={renameCategory}
        onChangeIcon={changeCategoryIcon}
        onDelete={deleteCategory}
      />

      <ManagePeopleModal
        open={showManagePeople}
        onClose={() => setShowManagePeople(false)}
        people={peopleRoster}
        entries={entries}
        t={t}
        onRename={renamePerson}
        onDelete={deletePerson}
        onToggleFavorite={toggleFavorite}
      />

      <ManageLocationsModal
        open={showManageLocations}
        onClose={() => setShowManageLocations(false)}
        entries={entries}
        t={t}
        onRename={renameLocation}
        onDelete={deleteLocationTag}
      />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        onLogout={async () => {
          await fetch("/api/heartbeat", { method: "DELETE" }).catch(() => {});
          signOut({ callbackUrl: "/login" });
        }}
        t={t}
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
function Sidebar({ user, view, setView, onOpenCategory, categories, saving, saveError, t, onManageCategories, onOpenSettings }) {
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
          const Icon = ICONS[c.icon] || ICONS.Sparkles;
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
        <span style={{ width: 6, height: 6, borderRadius: 999, background: saveError ? "#E38E8E" : saving ? GOLD : SAGE, opacity: saving ? 1 : 0.6 }} />
        <span style={{ color: saveError ? "#E38E8E" : TEXT_FAINT }} className="text-xs">{saveError ? t("save_failed_short") : saving ? t("saving") : t("saved")}</span>
      </div>
      <button onClick={onOpenSettings} style={{ borderTop: `1px solid ${INK_LINE}` }} className="pt-3 px-2 flex items-center gap-2 hover:bg-white/5 rounded-lg -mx-2 pb-1">
        {user.image ? (
          <img src={user.image} alt="" className="w-7 h-7 rounded-full" />
        ) : (
          <div style={{ background: GOLD, color: INK }} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium">
            {(user.name || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1 text-left">
          <div style={{ color: PAPER }} className="text-xs truncate">{user.name}</div>
          <div style={{ color: TEXT_FAINT }} className="text-xs truncate">{user.email}</div>
        </div>
        <Settings2 size={14} style={{ color: TEXT_FAINT }} />
      </button>
    </aside>
  );
}

function TopBar({ query, setQuery, onSearch, onCompose, t, onManageCategories, user, onOpenSettings }) {
  return (
    <div>
      <button onClick={onOpenSettings} className="md:hidden flex items-center gap-2 px-4 pt-4 w-full text-left">
        {user?.image ? (
          <img src={user.image} alt="" className="w-6 h-6 rounded-full shrink-0" />
        ) : (
          <div style={{ background: GOLD, color: INK }} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">
            {(user?.name || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <span style={{ color: PAPER }} className="text-sm truncate">{user?.name}</span>
      </button>
      <div style={{ borderBottom: `1px solid ${INK_LINE}` }} className="flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-4">
      <div style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }} className="flex-1 flex items-center gap-2 rounded-full px-4 py-2 min-w-0">
        <Search size={15} style={{ color: TEXT_FAINT }} className="shrink-0" />
        <input
          value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder={t("search_placeholder")} style={{ background: "transparent", color: PAPER }}
          className="flex-1 min-w-0 outline-none text-sm" />
      </div>

      <button onClick={onManageCategories} className="md:hidden shrink-0 rounded-full p-2" style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }} title={t("manage_categories")}>
        <Settings2 size={15} style={{ color: TEXT_MUTED }} />
      </button>

      <button
        onClick={onCompose}
        style={{ background: GOLD, color: INK }}
        className="hidden md:flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium hover:opacity-90"
      >
        <Plus size={15} /> {t("new_memory")}
      </button>
      </div>
    </div>
  );
}

/* ---------------- entry card ---------------- */

function EntryCard({ entry, onRequestDelete, onRequestEdit, onImageClick }) {
  return (
    <div style={{ background: PAPER, color: INK }} className="group relative rounded-xl p-4 shadow-lg flex flex-col gap-2">
      <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {onRequestEdit && (
          <button
            onClick={() => onRequestEdit(entry)}
            style={{ background: "rgba(21,19,31,0.75)" }}
            className="p-1.5 rounded-full"
            title="Edit"
          >
            <Pencil size={13} style={{ color: PAPER }} />
          </button>
        )}
        {onRequestDelete && (
          <button
            onClick={() => onRequestDelete(entry)}
            style={{ background: "rgba(21,19,31,0.75)" }}
            className="p-1.5 rounded-full"
            title="Delete"
          >
            <Trash2 size={13} style={{ color: PAPER }} />
          </button>
        )}
      </div>
      {entry.image && (
        <button onClick={() => onImageClick && onImageClick(entry.image)} className="block">
          <MediaThumb
            src={entry.image}
            mediaType={entry.mediaType}
            className="w-full aspect-[16/9] object-cover rounded-lg mb-1"
          />
        </button>
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

/* ---------------- image lightbox (click a photo to view full size) ---------------- */
function ImageLightbox({ src, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ background: "rgba(0,0,0,0.85)" }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 cursor-zoom-out"
    >
      <button
        onClick={onClose}
        style={{ background: "rgba(255,255,255,0.1)" }}
        className="absolute top-5 right-5 p-2 rounded-full"
      >
        <X size={18} style={{ color: "#fff" }} />
      </button>
      {guessMediaType(src) === "video" ? (
        // วิดีโอ: เล่นได้จริง มีปุ่มควบคุมครบ และเล่นอัตโนมัติเมื่อเปิดดู
        <video
          src={src}
          controls
          autoPlay
          playsInline
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full rounded-lg cursor-default"
        />
      ) : (
        <img
          src={src}
          alt=""
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full rounded-lg object-contain cursor-default"
        />
      )}
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
          const Icon = ICONS[c.icon] || ICONS.Sparkles;
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

function EntryList({ title, entries, onBack, onRequestDelete, onRequestEdit, onImageClick, t }) {
  return (
    <div className="pt-8">
      <button onClick={onBack} style={{ color: TEXT_FAINT }} className="flex items-center gap-1 text-xs mb-4">
        <ChevronRight size={12} style={{ transform: "rotate(180deg)" }} /> {t("back_to_categories")}
      </button>
      <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }} className="mb-6">{title}</h1>
      {entries.length === 0 ? <EmptyState text={t("empty_category")} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {entries.map((e) => <EntryCard key={e.id} entry={e} onRequestDelete={onRequestDelete} onRequestEdit={onRequestEdit} onImageClick={onImageClick} />)}
        </div>
      )}
    </div>
  );
}

function TimelineGallery({ entries, mode, setMode, onRequestDelete, onRequestEdit, onImageClick, t }) {
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
            {list.map((e) => <EntryCard key={e.id} entry={e} onRequestDelete={onRequestDelete} onRequestEdit={onRequestEdit} onImageClick={onImageClick} />)}
          </div>
        </div>
      ))}
      {mode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).map((e) => (
            <div key={e.id} style={{ background: PAPER }} className="group relative rounded-lg overflow-hidden aspect-square">
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {onRequestEdit && (
                  <button
                    onClick={() => onRequestEdit(e)}
                    style={{ background: "rgba(21,19,31,0.75)" }}
                    className="p-1.5 rounded-full"
                    title="Edit"
                  >
                    <Pencil size={12} style={{ color: PAPER }} />
                  </button>
                )}
                {onRequestDelete && (
                  <button
                    onClick={() => onRequestDelete(e)}
                    style={{ background: "rgba(21,19,31,0.75)" }}
                    className="p-1.5 rounded-full"
                    title="Delete"
                  >
                    <Trash2 size={12} style={{ color: PAPER }} />
                  </button>
                )}
              </div>
              {e.image ? (
                <button onClick={() => onImageClick && onImageClick(e.image)} className="block w-full h-full cursor-zoom-in">
                  <MediaThumb src={e.image} mediaType={e.mediaType} className="w-full h-full object-cover" />
                </button>
              ) : (
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

function LocationView({ entries, active, onOpen, onRequestDelete, onRequestEdit, onImageClick, onManageLocations, t }) {
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
          {locations[active].map((e) => <EntryCard key={e.id} entry={e} onRequestDelete={onRequestDelete} onRequestEdit={onRequestEdit} onImageClick={onImageClick} />)}
        </div>
      </div>
    );
  }
  const keys = Object.keys(locations);
  return (
    <div className="pt-8">
      <div className="flex items-center justify-between mb-6">
        <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }}>{t("locations_title")}</h1>
        {keys.length > 0 && (
          <button
            onClick={onManageLocations}
            style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}`, color: TEXT_MUTED }}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium shrink-0"
          >
            <Settings2 size={13} /> {t("manage_locations")}
          </button>
        )}
      </div>
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

function PeopleView({ people, entries, active, onOpen, onToggleFavorite, onRequestDelete, onRequestEdit, onImageClick, onManagePeople, t }) {
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
          {byPerson(active).map((e) => <EntryCard key={e.id} entry={e} onRequestDelete={onRequestDelete} onRequestEdit={onRequestEdit} onImageClick={onImageClick} />)}
        </div>
      </div>
    );
  }
  const sorted = [...people].sort((a, b) => (b.favorite - a.favorite));
  return (
    <div className="pt-8">
      <div className="flex items-center justify-between mb-6">
        <h1 style={{ fontFamily: FONT_DISPLAY, color: PAPER, fontSize: "1.6rem" }}>{t("people_title")}</h1>
        {sorted.length > 0 && (
          <button
            onClick={onManagePeople}
            style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}`, color: TEXT_MUTED }}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium shrink-0"
          >
            <Settings2 size={13} /> {t("manage_people")}
          </button>
        )}
      </div>
      {sorted.length === 0 ? <EmptyState text={t("empty_people")} /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {sorted.map((p) => (
            <PersonCard key={p.name} person={p} count={byPerson(p.name).length}
              onOpen={onOpen} onToggleFavorite={onToggleFavorite} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function PersonCard({ person: p, count, onOpen, onToggleFavorite, t }) {
  return (
    <div style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }} className="rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div style={{ background: PAPER, color: INK }} className="w-9 h-9 rounded-full flex items-center justify-center text-sm">{p.name.slice(0, 1)}</div>
        <button onClick={() => onToggleFavorite(p.name)}>
          <Star size={15} style={{ color: p.favorite ? GOLD : TEXT_FAINT }} fill={p.favorite ? GOLD : "none"} />
        </button>
      </div>
      <button onClick={() => onOpen(p.name)} className="text-left">
        <div style={{ color: PAPER }} className="mb-0.5">{p.name}</div>
        <div style={{ color: TEXT_FAINT }} className="text-xs">{t("together_count", count)}</div>
      </button>
    </div>
  );
}

function SearchView({ query, setQuery, entries, onRequestDelete, onRequestEdit, onImageClick, t }) {
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
          {results.map((e) => <EntryCard key={e.id} entry={e} onRequestDelete={onRequestDelete} onRequestEdit={onRequestEdit} onImageClick={onImageClick} />)}
        </div>
      )}
    </div>
  );
}

function Composer({ categories, people, locations, onClose, onSave, t, initialEntry }) {
  const isEdit = !!initialEntry;
  const [text, setText] = useState(initialEntry?.text || "");
  const [category, setCategory] = useState(initialEntry?.category || categories[categories.length - 1]?.id || categories[0].id);
  const [date, setDate] = useState(initialEntry?.date || new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState(initialEntry?.location || "");
  const [image, setImage] = useState(initialEntry?.image || null);
  const [selectedPeople, setSelectedPeople] = useState(initialEntry?.people || []);
  const [newPerson, setNewPerson] = useState("");
  const [compressing, setCompressing] = useState(false);
  const [imageError, setImageError] = useState("");
  const [mediaType, setMediaType] = useState(initialEntry?.mediaType || null);
  const fileRef = useRef(null);
  const favorites = [...people].filter((p) => p.favorite);
  const others = [...people].filter((p) => !p.favorite);

  // อัปโหลดได้ทั้งรูปและวิดีโอ
  // รูป -> บีบอัดในเบราว์เซอร์ก่อน (เหลือ ~300KB) แล้วค่อยอัป
  // วิดีโอ -> อัปไฟล์ต้นฉบับตรง ๆ (บีบอัดวิดีโอในเบราว์เซอร์ทำไม่ได้จริงในทางปฏิบัติ)
  // ทั้งสองแบบยิงตรงเข้า Supabase ไม่ผ่าน Vercel จึงไม่ติดเพดาน 4.5MB
  const handleFile = async (f) => {
    if (!f) return;
    const video = isVideoFile(f);

    if (video && f.size > MAX_VIDEO_BYTES) {
      setImageError(t("video_too_large"));
      return;
    }

    setCompressing(true);
    setImageError("");
    try {
      const blob = video ? f : await compressImageToBlob(f);
      const contentType = video ? f.type : "image/jpeg";
      const ext = video ? (f.name.split(".").pop() || "mp4").toLowerCase() : "jpg";

      // 1) ขอลิงก์อัปโหลดชั่วคราวจากเซิร์ฟเวอร์เรา (คำขอเล็กมาก ไม่มีไฟล์แนบ)
      const urlRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: video ? "video" : "image", size: blob.size, ext }),
      });
      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}));
        setImageError(err.error === "file_too_large" ? t("video_too_large") : t("photo_upload_failed"));
        return;
      }
      const { signedUrl, publicUrl } = await urlRes.json();

      // 2) ยิงไฟล์ตรงเข้า Supabase ด้วยลิงก์นั้น
      const putRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob,
      });
      if (!putRes.ok) {
        setImageError(t("photo_upload_failed"));
        return;
      }

      setImage(publicUrl);
      setMediaType(video ? "video" : "image");
    } catch (e) {
      setImageError(t("photo_upload_failed"));
    } finally {
      setCompressing(false);
    }
  };
  // เอารูปออก — ถ้าเป็นรูปที่เพิ่งอัปโหลดใหม่ในรอบนี้ (ยังไม่เคยเซฟ) ให้ลบไฟล์ทิ้งเลย
  // แต่ถ้าเป็นรูปเดิมของความทรงจำที่กำลังแก้อยู่ อย่าเพิ่งลบ เผื่อ user กดยกเลิก
  // (กรณีนั้น updateEntry จะเป็นคนลบให้ตอนกดบันทึกจริง)
  const removeImage = () => {
    if (image && image !== initialEntry?.image) deleteOrphanPhoto(image);
    setImage(null);
  };

  // ปิด/ยกเลิกหน้าต่างโดยไม่กดบันทึก — ถ้าเพิ่งอัปโหลดรูปใหม่ไว้ ต้องลบไฟล์ทิ้ง
  // ไม่งั้นไฟล์จะค้างใน Storage ทั้งที่ไม่มีความทรงจำไหนอ้างถึงเลย (ขยะถาวร)
  const handleClose = () => {
    if (image && image !== initialEntry?.image) deleteOrphanPhoto(image);
    onClose();
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
    onSave({ text: text.trim(), category, date, location: location.trim(), image, mediaType, people: finalPeople });
  };

  return (
    <div style={{ background: "rgba(0,0,0,0.55)" }} className="fixed inset-0 flex items-end sm:items-center justify-center z-50 sm:p-6">
      <div style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}`, maxHeight: "90vh" }} className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
        <div style={{ borderBottom: `1px solid ${INK_LINE}` }} className="flex items-center justify-between px-5 py-4">
          <span style={{ fontFamily: FONT_DISPLAY, color: PAPER }} className="text-lg">{isEdit ? t("composer_edit_title") : t("composer_title")}</span>
          <button onClick={handleClose}><X size={18} style={{ color: TEXT_FAINT }} /></button>
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
          {locations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 -mt-2">
              {locations.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  style={{
                    background: location === loc ? SAGE : INK,
                    color: location === loc ? INK : TEXT_MUTED,
                    border: `1px solid ${location === loc ? SAGE : INK_LINE}`,
                  }}
                  className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1"
                >
                  <MapPin size={10} /> {loc}
                </button>
              ))}
            </div>
          )}
          <div>
            <div style={{ color: TEXT_MUTED }} className="text-xs mb-1.5 flex items-center gap-1"><ImageIcon size={12} /> {t("composer_photo")}</div>
            {image ? (
              <div className="relative">
                <MediaThumb
                  src={image}
                  mediaType={mediaType}
                  className="w-full aspect-[16/9] object-cover rounded-lg"
                  showPlayBadge={false}
                />
                <button onClick={() => { removeImage(); }} style={{ background: INK }} className="absolute top-2 right-2 p-1 rounded-full">
                  <X size={13} style={{ color: PAPER }} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} disabled={compressing} style={{ background: INK, border: `1px dashed ${INK_LINE}`, color: TEXT_FAINT }} className="w-full rounded-lg py-3 text-xs flex items-center justify-center gap-1.5 disabled:opacity-60">
                <Plus size={13} /> {compressing ? t("photo_uploading") : t("composer_add_media")}
              </button>
            )}
            {imageError && <p style={{ color: "#E38E8E" }} className="text-xs mt-1.5">{imageError}</p>}
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
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
          <button onClick={handleClose} style={{ color: TEXT_MUTED }} className="text-sm px-4 py-2">{t("composer_cancel")}</button>
          <button onClick={save} disabled={!text.trim()} style={{ background: text.trim() ? GOLD : INK_LINE, color: text.trim() ? INK : TEXT_FAINT }} className="text-sm px-4 py-2 rounded-lg font-medium flex items-center gap-1.5">
            <Check size={14} /> {isEdit ? t("composer_save_changes") : t("composer_save")}
          </button>
        </div>
      </div>
    </div>
  );
}
