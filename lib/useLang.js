"use client";

import { useState, useEffect } from "react";
import { makeT } from "./i18n";

export function useLang() {
  const [lang, setLang] = useState("th");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("bemybrain_lang");
      if (saved === "en" || saved === "th") setLang(saved);
    } catch (e) {}
  }, []);

  const toggleLang = () => {
    const next = lang === "th" ? "en" : "th";
    setLang(next);
    try {
      window.localStorage.setItem("bemybrain_lang", next);
    } catch (e) {}
  };

  return { lang, toggleLang, t: makeT(lang) };
}
