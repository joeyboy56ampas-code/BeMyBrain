"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Brain, CheckCircle2 } from "lucide-react";
import PasswordField from "../../components/PasswordField";
import { t } from "../../lib/i18n";

const INK = "#15131F";
const INK_SOFT = "#1D1B2A";
const INK_LINE = "#2C2A3C";
const PAPER = "#F6EFE2";
const GOLD = "#E3A84E";
const SAGE = "#8FA98C";
const TEXT_MUTED = "#A9A5BE";
const TEXT_FAINT = "#726E88";

const ERROR_KEYS = {
  missing_fields: "err_missing_fields",
  password_too_short: "err_password_too_short",
  already_exists: "err_already_exists",
  signup_failed: "err_signup_failed",
  google_not_verified: "err_google_not_verified",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.4C29.4 34.9 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.4C41.6 35.6 44 30.2 44 24c0-1.3-.1-2.7-.4-3.5z"/>
    </svg>
  );
}

function SignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawToken = searchParams.get("verify");

  const [checking, setChecking] = useState(!!rawToken);
  const [verifiedEmail, setVerifiedEmail] = useState(null);
  const [tokenError, setTokenError] = useState("");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!rawToken) return;
    (async () => {
      const res = await fetch("/api/verify-google-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: rawToken }),
      });
      const data = await res.json();
      setChecking(false);
      if (!res.ok) {
        setTokenError(t(ERROR_KEYS[data.error]) || t("err_google_not_verified"));
        return;
      }
      setVerifiedEmail(data.email);
      if (data.name) setName(data.name);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError(t("signup_error_password_mismatch"));
      return;
    }

    setLoading(true);
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: rawToken, name, username, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(t(ERROR_KEYS[data.error]) || t("signup_error_generic"));
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", { username, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) {
      router.replace("/login");
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
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Brain size={22} style={{ color: GOLD }} />
          <span style={{ fontFamily: "var(--font-display), serif", color: PAPER, fontSize: "1.35rem" }}>
            BeMyBrain
          </span>
        </div>

        <div style={{ background: INK_SOFT, border: `1px solid ${INK_LINE}` }} className="rounded-2xl p-7">
          <h1 style={{ fontFamily: "var(--font-display), serif", color: PAPER, fontSize: "1.25rem" }} className="mb-1">
            {t("signup_title")}
          </h1>
          <p style={{ color: TEXT_FAINT }} className="mb-6 leading-relaxed text-sm">
            {t("signup_tagline")}
          </p>

          {checking && (
            <p style={{ color: TEXT_FAINT }} className="text-sm text-center py-6">{t("signup_checking")}</p>
          )}

          {!checking && !verifiedEmail && (
            <div className="flex flex-col gap-3">
              {tokenError && <p style={{ color: "#E38E8E" }} className="text-xs">{tokenError}</p>}
              <button
                onClick={() => signIn("google", { callbackUrl: "/signup" })}
                style={{ background: GOLD, color: INK }}
                className="w-full rounded-lg py-2.5 font-medium flex items-center justify-center gap-2 hover:opacity-90"
              >
                <GoogleIcon /> {t("connect_gmail_button")}
              </button>
              <p style={{ color: TEXT_FAINT }} className="text-xs text-center leading-relaxed">
                {t("connect_gmail_desc")}
              </p>
            </div>
          )}

          {!checking && verifiedEmail && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div
                style={{ background: INK, border: `1px solid ${SAGE}` }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
              >
                <CheckCircle2 size={16} style={{ color: SAGE }} />
                <span style={{ color: PAPER }} className="truncate">{verifiedEmail}</span>
                <span style={{ color: SAGE }} className="text-xs ml-auto shrink-0">{t("email_verified_badge")}</span>
              </div>

              <label className="block">
                <span style={{ color: TEXT_MUTED }} className="text-xs">{t("display_name_label")}</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("display_name_ph")}
                  style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }}
                  className="w-full mt-1 rounded-lg px-3 py-2 outline-none text-sm"
                />
              </label>
              <label className="block">
                <span style={{ color: TEXT_MUTED }} className="text-xs">{t("username_label")} (username)</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("username_ph")}
                  style={{ background: INK, border: `1px solid ${INK_LINE}`, color: PAPER }}
                  className="w-full mt-1 rounded-lg px-3 py-2 outline-none text-sm"
                  required
                />
              </label>
              <PasswordField
                label={t("password_hint_label")}
                value={password}
                onChange={setPassword}
                required
                minLength={8}
              />
              <PasswordField
                label={t("confirm_password_label")}
                value={confirm}
                onChange={setConfirm}
                required
              />

              {error && <p style={{ color: "#E38E8E" }} className="text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                style={{ background: GOLD, color: INK }}
                className="w-full rounded-lg py-2.5 font-medium mt-1 hover:opacity-90 disabled:opacity-60"
              >
                {loading ? t("signup_submitting") : t("signup_submit")}
              </button>
            </form>
          )}
        </div>

        <p style={{ color: TEXT_FAINT }} className="text-xs text-center mt-5">
          {t("have_account_prompt")}{" "}
          <Link href="/login" style={{ color: GOLD }} className="hover:underline">
            {t("login_link")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}
