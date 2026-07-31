"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import viDict from "../i18n/vi.json";
import enDict from "../i18n/en.json";

type Language = "vi" | "en";
type Dictionary = any;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const dictionaries: Record<Language, Dictionary> = {
  vi: viDict,
  en: enDict,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("vi");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check local storage for saved language preference on mount
    const savedLang = localStorage.getItem("app_language") as Language;
    if (savedLang && (savedLang === "vi" || savedLang === "en")) {
      setLanguage(savedLang);
    }
    setMounted(true);
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("app_language", lang);
  };

  // Helper function to resolve nested keys like "header.home"
  const t = (key: string): string => {
    const keys = key.split(".");
    let current: any = dictionaries[language];
    
    for (const k of keys) {
      if (current === undefined || current === null) return key;
      current = current[k];
    }
    
    return typeof current === "string" ? current : key;
  };

  // Prevent hydration mismatch by rendering nothing until mounted (or render default vi text)
  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ language: "vi", setLanguage: handleSetLanguage, t }}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
