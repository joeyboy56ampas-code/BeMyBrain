import "./globals.css";
import Providers from "../components/Providers";
import { Noto_Sans_Thai, Noto_Serif_Thai } from "next/font/google";

// โหลดฟอนต์แบบ self-host ผ่าน next/font แทนการ @import จาก Google Fonts โดยตรงใน CSS
// วิธีเดิม (@import) ทำให้เบราว์เซอร์ต้องหยุดรอโหลดฟอนต์จากเซิร์ฟเวอร์ Google ก่อนค่อยวาดหน้าเว็บ (render-blocking)
// วิธีนี้ Next.js จะดาวน์โหลดไฟล์ฟอนต์มาเก็บไว้ในโปรเจกต์เราเองตอน build แล้วเสิร์ฟจากโดเมนเราเอง
// ทำให้หน้าเว็บขึ้นเร็วขึ้น ไม่ต้องรอเซิร์ฟเวอร์ภายนอก
const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500"],
  variable: "--font-body",
  display: "swap",
});

const notoSerifThai = Noto_Serif_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: "BeMyBrain",
  description: "สมองอีกอันของคุณ — จดบันทึกความทรงจำอย่างเป็นระบบ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${notoSansThai.variable} ${notoSerifThai.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
