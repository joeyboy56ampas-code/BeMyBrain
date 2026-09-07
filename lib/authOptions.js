import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { encode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "./supabaseAdmin";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Username and Password",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const { data: user, error } = await supabaseAdmin
          .from("users")
          .select("email, name, username, password_hash")
          .eq("username", credentials.username.trim().toLowerCase())
          .maybeSingle();

        // ไม่พบ username หรือยังไม่เคยตั้งรหัสผ่าน (เช่นบัญชีนี้ยังไม่ผ่านขั้นตอนลงทะเบียนให้ครบ) -> ปฏิเสธ
        if (error || !user || !user.password_hash) return null;

        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;

        return { id: user.email, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const { data: existing } = await supabaseAdmin
          .from("users")
          .select("email, password_hash")
          .eq("email", user.email)
          .maybeSingle();

        // ยังไม่เคยลงทะเบียน -> ห้ามเข้าระบบ ส่งไปหน้าสมัครพร้อมโทเค็นยืนยันว่าอีเมลนี้
        // ผ่านการยืนยันตัวตนกับ Google มาจริง (เซ็นด้วย NEXTAUTH_SECRET ปลอมแปลงไม่ได้)
        if (!existing || !existing.password_hash) {
          const token = await encode({
            token: { email: user.email, name: user.name, purpose: "google_verify" },
            secret: process.env.NEXTAUTH_SECRET,
            maxAge: 600, // อายุ 10 นาที
          });
          return `/signup?verify=${encodeURIComponent(token)}`;
        }

        await supabaseAdmin
          .from("users")
          .update({ last_login: new Date().toISOString(), avatar_url: user.image })
          .eq("email", user.email);
        return true;
      }
      return true; // credentials provider กรองสิทธิ์ไปแล้วใน authorize()
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
