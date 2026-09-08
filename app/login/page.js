"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { Brain, Eye, EyeOff, Globe } from "lucide-react";
import { useLang } from "../../lib/useLang";

const INK = "#15131F";
const INK_SOFT = "#1D1B2A";
const INK_LINE = "#2C2A3C";
const PAPER = "#F6EFE2";
const GOLD = "#E3A84E";
const TEXT_MUTED = "#A9A5BE";
const TEXT_FAINT = "#726E88";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, toggleLang, t } = useLang();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "AccessDenied") {
      setError(t("login_error_access_denied"));
    } else if (err) {
      setError(t("login_error_generic"));
    }
  }, [searchParams, t]);

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(t("login_error_credentials"));
      return;
    }
    router.replace("/dashboard");
  };

  return (
    <div
      style={{
        background: `radial-gradient(circle at 20% 10%, #2A2640 0%, ${INK} 55%)`,
        minHeight: "100vh",
        fontFamily: "var(--font-body), sans-serif",
      }}
      className="w-full flex items-center justify-center px-6 py-12 relative"
    >
      <button
        onClick={toggleLang}
        style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}`, color: TEXT_MUTED }}
        className="absolute top-5 right-5 flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium"
        title="Switch language / เปลี่ยนภาษา"
      >
        <Globe size={13} /> {lang === "th" ? "TH" : "EN"}
      </button>

      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Brain size={22} style={{ color: GOLD }} />
          <span style={{ fontFamily: "var(--font-display), serif", color: PAPER, fontSize: "1.35rem" }}>
            BeMyBrain
          </span>
        </div>

        <div style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }} className="rounded-2xl p-7">
          <h1 style={{ fontFamily: "var(--font-display), serif", color: PAPER, fontSize: "1.25rem" }} className="mb-1">
            {t("login_title")}
          </h1>
          <p style={{ color: TEXT_FAINT }} className="mb-6 leading-relaxed text-sm">
            {t("auth_tagline")}
          </p>

          <form onSubmit={handleCredentialsLogin} className="flex flex-col gap-3 mb-4">
            <label className="block">
              <span style={{ color: TEXT_MUTED }} className="text-xs">{t("username_label")}</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }}
                className="w-full mt-1 rounded-lg px-3 py-2 outline-none text-sm"
                required
              />
            </label>
            <label className="block">
              <span style={{ color: TEXT_MUTED }} className="text-xs">{t("password_label")}</span>
              <div className="relative mt-1">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }}
                  className="w-full rounded-lg px-3 py-2 pr-9 outline-none text-sm"
                  required
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2.5 top-2.5">
                  {showPw ? <EyeOff size={15} style={{ color: TEXT_FAINT }} /> : <Eye size={15} style={{ color: TEXT_FAINT }} />}
                </button>
              </div>
            </label>

            {error && (
              <p style={{ color: "#E38E8E" }} className="text-xs">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ background: GOLD, color: INK }}
              className="w-full rounded-lg py-2.5 font-medium hover:opacity-90 disabled:opacity-60"
            >
              {loading ? t("login_loading") : t("login_button")}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div style={{ flex: 1, height: 1, background: INK_LINE }} />
            <span style={{ color: TEXT_FAINT }} className="text-xs">{t("or_divider")}</span>
            <div style={{ flex: 1, height: 1, background: INK_LINE }} />
          </div>

          <button
            onClick={handleGoogleLogin}
            style={{ background: "transparent", border: `1px solid ${INK_LINE}`, color: PAPER }}
            className="w-full rounded-lg py-2.5 font-medium flex items-center justify-center gap-2 hover:bg-white/5"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.4C29.4 34.9 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.4C41.6 35.6 44 30.2 44 24c0-1.3-.1-2.7-.4-3.5z"/>
            </svg>
            {t("google_login_button")}
          </button>
        </div>

        <p style={{ color: TEXT_FAINT }} className="text-xs text-center mt-5">
          {t("no_account_prompt")}{" "}
          <Link href="/signup" style={{ color: GOLD }} className="hover:underline">
            {t("signup_link")}
          </Link>
        </p>
      </div>
    </div>
  );
}
