import GoogleProvider from "next-auth/providers/google";
import { supabase } from "./supabaseClient";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // ทุกครั้งที่ login สำเร็จ บันทึก/อัปเดตชื่อผู้ใช้ลงตาราง users ใน Supabase
    async signIn({ user }) {
      try {
        await supabase.from("users").upsert(
          {
            email: user.email,
            name: user.name,
            avatar_url: user.image,
            last_login: new Date().toISOString(),
          },
          { onConflict: "email" }
        );
      } catch (e) {
        console.error("supabase upsert user failed", e);
      }
      return true;
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
