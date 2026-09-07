import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
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
    // ทุกครั้งที่ login สำเร็จด้วย Google บันทึก/อัปเดตโปรไฟล์ลง Supabase
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await supabaseAdmin.from("users").upsert(
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
