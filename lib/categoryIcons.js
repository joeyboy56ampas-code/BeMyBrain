import {
  Briefcase, Heart, Activity, Home, Sparkles, Plane, Utensils, DollarSign,
  GraduationCap, PawPrint, Dumbbell, Music, Palette, Trees, ShoppingBag,
  PartyPopper, Moon, BookOpen, Camera, Gamepad2, Coffee, Gift, Car, Sun,
  Smile, Film, Baby, Bike,
} from "lucide-react";

// คลังไอคอนสำหรับหมวดหมู่ทั้งหมด — เพิ่ม/ลดไอคอนได้ที่นี่ที่เดียว
// ทั้งหน้า dashboard และหน้าต่างจัดการหมวดหมู่จะใช้ชุดเดียวกันเสมอ ไม่มีทางหลุด sync กัน
export const CATEGORY_ICONS = {
  Briefcase, Heart, Activity, Home, Sparkles, Plane, Utensils, DollarSign,
  GraduationCap, PawPrint, Dumbbell, Music, Palette, Trees, ShoppingBag,
  PartyPopper, Moon, BookOpen, Camera, Gamepad2, Coffee, Gift, Car, Sun,
  Smile, Film, Baby, Bike,
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);
