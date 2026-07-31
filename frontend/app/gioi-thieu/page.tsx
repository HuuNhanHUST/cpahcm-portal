"use client";

import React, { useEffect, useState, useRef } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import AmbientScene3D from "../../components/AmbientScene3D";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLanguage } from "../../context/LanguageContext";
import {
  MapPin, Phone, ArrowRight, CheckCircle2, ShieldCheck,
  Target, Users, Award, BookOpen, Clock, Star, FileCheck,
  TrendingUp, Briefcase, Globe, BadgeCheck, Landmark, GraduationCap,
} from "lucide-react";

// ── Animated counter ─────────────────────────────────────────────────
function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 1800;
    const step = end / (duration / 16);
    let curr = 0;
    const timer = setInterval(() => {
      curr = Math.min(curr + step, end);
      setCount(Math.floor(curr));
      if (curr >= end) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [started, end]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// Initials from a Vietnamese full name (first + last word) — used instead of stock photos
// for team members, since generic Western stock photos under Vietnamese names read as fake.
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase();
}

// ── Main ─────────────────────────────────────────────────────────────
export default function AboutPage() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState("intro");
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);

  const navItems = [
    { id: "intro",   label: t("about.nav1"), icon: BookOpen },
    { id: "team",    label: t("about.nav2"), icon: Users },
    { id: "history", label: t("about.nav3"), icon: Clock },
    { id: "vision",  label: t("about.nav4"), icon: Target },
    { id: "method",  label: t("about.nav5"), icon: CheckCircle2 },
    { id: "values",  label: t("about.nav6"), icon: Award },
    { id: "certs",   label: t("about.nav7"), icon: BadgeCheck },
  ];

  const timelineData = [
    { year: "2010", event: t("about.tl1event"), desc: t("about.tl1desc") },
    { year: "2012", event: t("about.tl2event"), desc: t("about.tl2desc") },
    { year: "2015", event: t("about.tl3event"), desc: t("about.tl3desc") },
    { year: "2018", event: t("about.tl4event"), desc: t("about.tl4desc") },
    { year: "2022", event: t("about.tl5event"), desc: t("about.tl5desc") },
    { year: "2024", event: t("about.tl6event"), desc: t("about.tl6desc") },
  ];

  const officeList = [
    { city: t("about.office1city"), addr: t("about.office1addr") },
    { city: t("about.office2city"), addr: t("about.office2addr") },
    { city: t("about.office3city"), addr: t("about.office3addr") },
    { city: t("about.office4city"), addr: t("about.office4addr") },
    { city: t("about.office5city"), addr: t("about.office5addr") },
  ];

  const teamMembers = [
    { name: t("about.tm1name"), title: t("about.tm1title") },
    { name: t("about.tm2name"), title: t("about.tm2title") },
    { name: t("about.tm3name"), title: t("about.tm3title") },
    { name: t("about.tm4name"), title: t("about.tm4title") },
    { name: t("about.tm5name"), title: t("about.tm5title") },
    { name: t("about.tm6name"), title: t("about.tm6title") },
    { name: t("about.tm7name"), title: t("about.tm7title") },
    { name: t("about.tm8name"), title: t("about.tm8title") },
  ];

  const workSteps = [
    { n: "01", title: t("about.step1Title"), icon: Target,     items: [t("about.step1i1"), t("about.step1i2"), t("about.step1i3")] },
    { n: "02", title: t("about.step2Title"), icon: FileCheck,  items: [t("about.step2i1"), t("about.step2i2"), t("about.step2i3")] },
    { n: "03", title: t("about.step3Title"), icon: CheckCircle2, items: [t("about.step3i1"), t("about.step3i2"), t("about.step3i3")] },
    { n: "04", title: t("about.step4Title"), icon: Star,       items: [t("about.step4i1"), t("about.step4i2"), t("about.step4i3")] },
  ];

  const values = [
    { icon: ShieldCheck, title: t("about.val1Title"), desc: t("about.val1Desc"), bg: "bg-white" },
    { icon: Star,         title: t("about.val2Title"), desc: t("about.val2Desc"), bg: "bg-[#F7F8FA]" },
    { icon: Globe,        title: t("about.val3Title"), desc: t("about.val3Desc"), bg: "bg-[#F7F8FA]" },
    { icon: Briefcase,    title: t("about.val4Title"), desc: t("about.val4Desc"), bg: "bg-white" },
  ];

  // Chứng nhận/giấy phép — chuẩn hoá thành 1 lưới trực quan thay vì chỉ nhắc thoáng qua trong
  // đoạn văn (giấy phép Bộ Tài Chính) và 1 badge lẻ ở sidebar (ISO 27001) — gộp đủ 5 tiêu chuẩn
  // đã được nhắc rải rác khắp trang (license number ở sec1, ACCA/ICAEW ở sec2, ISO 27001 ở val3)
  // vào cùng 1 nơi để khách hàng B2B thấy ngay đủ căn cứ tin tưởng thay vì phải tự ghép nhặt.
  const certifications = [
    { icon: Landmark,      name: t("about.cert1Name"), desc: t("about.cert1Desc") },
    { icon: BadgeCheck,    name: t("about.cert2Name"), desc: t("about.cert2Desc") },
    { icon: ShieldCheck,   name: t("about.cert3Name"), desc: t("about.cert3Desc") },
    { icon: Users,         name: t("about.cert4Name"), desc: t("about.cert4Desc") },
    { icon: GraduationCap, name: t("about.cert5Name"), desc: t("about.cert5Desc") },
  ];

  const clientLogos = [
    { name: "LAG", src: "/images/logo/LAGlogo.png" },
    { name: "Lm", src: "/images/logo/Lmlogo.jpg" },
    { name: "SSSC", src: "/images/logo/SSSC.png" },
    { name: "Saitex", src: "/images/logo/Saitex.png" },
    { name: "Sh", src: "/images/logo/Sh.png" },
    { name: "TSB", src: "/images/logo/TSBlogo.jpg" },
    { name: "TSN", src: "/images/logo/TSN.png" },
    { name: "Xinsheng", src: "/images/logo/XinshengLogo.jpg" },
    { name: "AMA", src: "/images/logo/amalogo.jpg" },
    { name: "Ogico", src: "/images/logo/ogico1.png" },
    { name: "Origin", src: "/images/logo/originlogo.png" },
    { name: "WV", src: "/images/logo/wv.jpg" },
  ];

  useEffect(() => {
    setMounted(true);
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: "-30% 0px -60% 0px" }
    );
    ["intro","team","history","vision","method","values","certs"].forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Scroll-triggered reveal — trước đây các section (trừ hero) hiện tĩnh ngay khi trang load,
  // không có chuyển động nào khi cuộn xuống, khiến trang dài 6 mục cảm giác "phẳng".
  const revealUp: any = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };
  const stagger: any = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header />

      {/* ═══ HERO ═══ */}
      <section ref={heroRef} className="relative h-[min(100vh,900px)] min-h-[640px] flex flex-col overflow-hidden bg-[#06102B]">
        {/* Ảnh thật thay cho 3D — 3D dùng chung 1 cảnh (biểu đồ cột + đồng xu) trên mọi trang
            (Trang chủ/Dịch vụ/Đào tạo/Tuyển dụng) khiến banner các trang trông giống hệt nhau;
            mỗi trang giờ có 1 ảnh riêng đúng chủ đề để dễ phân biệt hơn khi lướt qua các mục. */}
        <motion.div style={{ y: bgY }} className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30 scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06102B] via-[#06102B]/75 to-[#06102B]/40" />
        </motion.div>
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: "linear-gradient(#C9973C 1px, transparent 1px), linear-gradient(90deg, #C9973C 1px, transparent 1px)", backgroundSize: "80px 80px" }} />

        {/* Main content — flex-grow to fill available space */}
        <div className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-[1400px] mx-auto px-6 lg:px-16 pt-36">
          <motion.div initial={{ opacity: 0 }} animate={mounted ? { opacity: 1 } : {}} transition={{ duration: 1.2 }}>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-px bg-[#C9973C]" />
              <span className="text-[#C9973C] text-xs font-bold uppercase tracking-[0.3em]">{t("about.since")}</span>
            </div>
            <h1 className="text-[clamp(2.5rem,6vw,5.5rem)] font-black leading-[0.9] text-white mb-6 tracking-tight max-w-2xl">
              {t("about.heroTitle1")}<br />
              <span className="text-[#C9973C]">{t("about.heroTitle2")}</span><br />
              <span className="font-light italic">{t("about.heroTitle3")}</span>
            </h1>
            <p className="text-blue-200/80 text-base max-w-xl leading-relaxed mb-8 font-light">
              {t("about.heroDesc")}
            </p>
            <button onClick={() => scrollTo("intro")}
              className="group inline-flex items-center gap-3 bg-[#C9973C] hover:bg-white text-white hover:text-[#0F1C47] font-bold px-8 py-4 transition-all duration-300"
            >
              {t("about.heroCta")}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* Stats strip — normal flow, pinned to bottom of section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={mounted ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.5, duration: 0.8 }}
          className="relative z-10 w-full border-t border-white/10"
        >
          <div className="grid grid-cols-4 divide-x divide-white/10 bg-white/5 backdrop-blur-md">
            {[
              { n: 16,   s: "+", label: t("about.stat1Label") },
              { n: 1000, s: "+", label: t("about.stat2Label") },
              { n: 50,   s: "+", label: t("about.stat3Label") },
              { n: 5,    s: "",  label: t("about.stat4Label") },
            ].map((item, i) => (
              <div key={i} className="py-5 px-6 text-center">
                <div className="text-2xl lg:text-3xl font-black text-white mb-1">
                  <Counter end={item.n} suffix={item.s} />
                </div>
                <div className="text-[10px] text-blue-300 uppercase tracking-widest">{item.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ═══ BODY ═══ */}
      <div className="bg-[#F7F8FA]">
        {/* Mobile/tablet section nav — sidebar bên dưới chỉ hiện ở >= xl, nên < xl (đa số khách
            truy cập) không có cách nào định hướng nhanh giữa 6 mục nội dung dài của trang. */}
        <div className="xl:hidden sticky top-24 z-30 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 overflow-x-auto">
            <div className="flex gap-1.5 py-2.5 min-w-max">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => scrollTo(id)} aria-current={active === id ? "true" : undefined}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap rounded-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B3A8F]/30 ${
                    active === id ? "bg-[#0F1C47] text-white" : "bg-[#F7F8FA] text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-20 flex gap-12 items-start">

          {/* SIDEBAR */}
          <aside className="w-64 shrink-0 sticky top-28 hidden xl:flex flex-col gap-5">
            <nav className="bg-white border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t("about.navContent")}</p>
              </div>
              {navItems.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => scrollTo(id)} aria-current={active === id ? "true" : undefined}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-left transition-all border-l-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B3A8F]/30 ${
                    active === id
                      ? "border-[#C9973C] text-[#0F1C47] bg-[#FDF6E9]"
                      : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active === id ? "text-[#C9973C]" : "text-gray-300"}`} />
                  {label}
                </button>
              ))}
            </nav>
            <div className="bg-[#0F1C47] p-6 text-white">
              <p className="text-xs text-blue-300 uppercase tracking-widest mb-1 font-bold">{t("about.hotline")}</p>
              <a href="tel:19000380" className="text-2xl font-black text-[#C9973C] hover:underline block mb-4">1900 0380</a>
              <a href="/lien-he" className="block text-center text-xs font-bold bg-[#C9973C] hover:bg-[#b38531] text-white py-3 transition-colors">
                {t("about.bookConsult")}
              </a>
            </div>
            <div className="bg-white border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-green-50 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-xs font-black text-gray-900 uppercase tracking-wide">{t("about.cert")}</div>
                <div className="text-sm font-bold text-green-700">{t("about.certName")}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t("about.certDesc")}</div>
              </div>
            </div>
          </aside>

          {/* CONTENT */}
          <div className="flex-1 min-w-0 space-y-0">

            {/* ── 1. INTRO ── */}
            <section id="intro" className="scroll-mt-28 mb-20">
              <div className="flex items-center gap-4 mb-12">
                <span className="text-5xl font-black text-gray-100 leading-none select-none">01</span>
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.25em]">{t("about.sec1Label")}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={revealUp} className="grid lg:grid-cols-2 gap-0">
                <div className="bg-[#0F1C47] p-10 lg:p-14 flex flex-col justify-between min-h-[400px] relative overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
                    style={{ backgroundImage: "linear-gradient(#C9973C 1px, transparent 1px), linear-gradient(90deg, #C9973C 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                  <div className="relative z-10">
                    <h2 className="text-4xl font-black text-white leading-tight mb-6">
                      {t("about.sec1Headline")}
                    </h2>
                    <p className="text-blue-200 text-sm leading-relaxed font-light">
                      {t("about.sec1LicenseNote")}{" "}
                      <span className="font-mono text-[#C9973C]">0310531811</span>{" "}
                      — {t("about.sec1IssuedBy")}
                    </p>
                  </div>
                  <div className="relative z-10 mt-8 pt-6 border-t border-white/10">
                    <p className="text-xs text-blue-400 uppercase tracking-widest font-bold mb-2">{t("about.sec1CoreLabel")}</p>
                    <div className="flex flex-wrap gap-2">
                      {[t("about.svc1"), t("about.svc2"), t("about.svc3"), t("about.svc4"), t("about.svc5")].map((s) => (
                        <span key={s} className="text-xs font-bold text-white border border-white/20 px-3 py-1 hover:border-[#C9973C] hover:text-[#C9973C] transition-colors">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-white p-10 lg:p-14 flex flex-col gap-6">
                  <p className="text-gray-700 leading-relaxed text-base">{t("about.sec1Body1")}</p>
                  <p className="text-gray-600 leading-relaxed text-sm">{t("about.sec1Body2")}</p>
                  <div className="mt-2 border-t border-gray-100 pt-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">{t("about.sec1OfficesLabel")}</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {officeList.map((o) => (
                        <div key={o.city} className="flex gap-3 text-xs bg-[#F7F8FA] p-3.5 border-l-2 border-transparent hover:border-[#C9973C] transition-colors">
                          <MapPin className="w-3.5 h-3.5 text-[#C9973C] mt-0.5 shrink-0" />
                          <div><span className="font-bold text-gray-800 block">{o.city}</span><span className="text-gray-500">{o.addr}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </section>

            {/* ── 2. TEAM ── */}
            <section id="team" className="scroll-mt-28 mb-20">
              <div className="flex items-center gap-4 mb-12">
                <span className="text-5xl font-black text-gray-100 leading-none select-none">02</span>
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.25em]">{t("about.sec2Label")}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              {/* Chairman */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={revealUp}
                className="relative bg-white overflow-hidden mb-10 flex flex-col md:flex-row border-t-2 border-t-transparent hover:border-t-[#C9973C] transition-colors duration-300"
              >
                <div className="md:w-5/12 aspect-[3/4] md:aspect-auto overflow-hidden relative bg-[#0F1C47] flex items-center justify-center">
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{ backgroundImage: "linear-gradient(#C9973C 1px, transparent 1px), linear-gradient(90deg, #C9973C 1px, transparent 1px)", backgroundSize: "40px 40px" }}
                  />
                  <span className="relative z-10 text-7xl font-black text-[#C9973C] tracking-tight">
                    {getInitials(t("about.chairmanName"))}
                  </span>
                </div>
                <div className="md:w-7/12 bg-[#0F1C47] p-10 lg:p-16 flex flex-col justify-center">
                  <div className="text-9xl text-[#C9973C]/20 font-serif leading-none -mb-6 -ml-2 select-none">"</div>
                  <blockquote className="text-white text-2xl md:text-3xl font-light italic leading-snug mb-10">
                    {t("about.chairmanQuote")}
                  </blockquote>
                  <div className="border-l-2 border-[#C9973C] pl-6">
                    <div className="font-black text-white text-lg uppercase tracking-wide">{t("about.chairmanName")}</div>
                    <div className="text-[#C9973C] text-xs font-bold uppercase tracking-widest mt-1">{t("about.chairmanTitle")}</div>
                  </div>
                </div>
              </motion.div>
              {/* Team intro */}
              <div className="bg-white p-8 mb-8">
                <p className="text-gray-600 leading-relaxed max-w-3xl">{t("about.sec2Body")}</p>
              </div>
              {/* Masonry grid */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200">
                {teamMembers.map((m, i) => (
                  <motion.div key={i} variants={revealUp}
                    className={`group relative overflow-hidden bg-[#0F1C47] flex items-center justify-center border-t-2 border-t-transparent hover:border-t-[#C9973C] transition-colors duration-300 ${i === 0 || i === 5 ? "md:col-span-2 aspect-[16/9] md:aspect-auto" : "aspect-square"}`}
                  >
                    <span className="text-4xl font-black text-white/10 group-hover:text-white/15 group-hover:scale-110 transition-all duration-300 select-none">
                      {getInitials(m.name)}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div className="w-8 h-0.5 bg-[#C9973C] mb-3 group-hover:w-12 transition-all duration-300" />
                      <h4 className="text-white font-bold text-sm leading-tight">{m.name}</h4>
                      <p className="text-[#C9973C] text-xs mt-1 font-semibold">{m.title}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </section>

            {/* ── 3. HISTORY ── */}
            <section id="history" className="scroll-mt-28 mb-20">
              <div className="flex items-center gap-4 mb-12">
                <span className="text-5xl font-black text-gray-100 leading-none select-none">03</span>
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.25em]">{t("about.sec3Label")}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={revealUp}
                className="bg-white p-10 lg:p-14 mb-8 overflow-hidden relative"
              >
                <div className="absolute -top-8 -left-4 text-[180px] font-black text-gray-50 select-none pointer-events-none leading-none">2010</div>
                <div className="relative z-10 max-w-2xl ml-auto">
                  <h2 className="text-3xl font-black text-[#0F1C47] mb-4">{t("about.sec3Headline")}</h2>
                  <p className="text-gray-600 leading-relaxed">{t("about.sec3Body")}</p>
                </div>
              </motion.div>
              <div className="bg-white p-8 lg:p-12 overflow-x-auto">
                <div className="flex gap-0 min-w-[600px] relative">
                  <div className="absolute top-6 left-0 right-0 h-px bg-gray-200" />
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="absolute top-6 left-0 right-0 h-px bg-[#C9973C] origin-left"
                  />
                  {timelineData.map((item, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 0.5, delay: i * 0.12 }}
                      className="flex-1 relative pr-6 group"
                    >
                      <div className={`w-3 h-3 rounded-full border-2 mb-6 relative z-10 transition-all group-hover:scale-150 ${
                        i === timelineData.length - 1
                          ? "bg-[#C9973C] border-[#C9973C]"
                          : "bg-white border-[#1B3A8F] group-hover:bg-[#1B3A8F]"
                      }`} />
                      <div className="text-xs font-black text-[#C9973C] mb-1 uppercase tracking-wider">{item.year}</div>
                      <div className="text-sm font-bold text-[#0F1C47] mb-2">{item.event}</div>
                      <p className="text-xs text-gray-500 leading-relaxed pr-4">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── 4. VISION ── */}
            <section id="vision" className="scroll-mt-28 mb-20">
              <div className="flex items-center gap-4 mb-12">
                <span className="text-5xl font-black text-gray-100 leading-none select-none">04</span>
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.25em]">{t("about.sec4Label")}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={revealUp} className="grid lg:grid-cols-3 gap-px bg-gray-200">
                <div className="lg:col-span-2 bg-white p-10 lg:p-14">
                  <div className="flex items-center gap-3 mb-8">
                    <Target className="w-5 h-5 text-[#C9973C]" />
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">{t("about.visionLabel")}</span>
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-black text-[#0F1C47] leading-snug mb-8">{t("about.visionHeadline")}</h2>
                  <p className="text-gray-600 leading-relaxed text-base">{t("about.visionBody")}</p>
                </div>
                <div className="bg-[#C9973C] p-10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                      <ShieldCheck className="w-5 h-5 text-white" />
                      <span className="text-xs font-black uppercase tracking-widest text-white/70">{t("about.missionLabel")}</span>
                    </div>
                    <div className="space-y-6">
                      {[
                        { who: t("about.mission1Who"), what: t("about.mission1What") },
                        { who: t("about.mission2Who"), what: t("about.mission2What") },
                        { who: t("about.mission3Who"), what: t("about.mission3What") },
                      ].map(({ who, what }) => (
                        <div key={who} className="border-l-2 border-white/40 pl-4">
                          <div className="text-xs font-black text-white uppercase tracking-wider mb-1">{who}</div>
                          <p className="text-white/80 text-sm leading-relaxed">{what}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </section>

            {/* ── 5. METHOD ── */}
            <section id="method" className="scroll-mt-28 mb-20">
              <div className="flex items-center gap-4 mb-12">
                <span className="text-5xl font-black text-gray-100 leading-none select-none">05</span>
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.25em]">{t("about.sec5Label")}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={revealUp} className="bg-white">
                <div className="bg-[#0F1C47] p-8 lg:p-12">
                  <h2 className="text-2xl lg:text-3xl font-black text-white mb-3">{t("about.sec5Headline")}</h2>
                  <p className="text-blue-200 text-sm leading-relaxed max-w-2xl">{t("about.sec5Body")}</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {workSteps.map((step, i) => (
                    <div key={step.n} className="group relative flex items-start gap-8 p-8 lg:px-12 hover:bg-[#F7F8FA] transition-colors">
                      {i < workSteps.length - 1 && (
                        <div className="hidden lg:block absolute left-[4.75rem] top-[5.5rem] bottom-0 w-px bg-gray-100 group-hover:bg-[#C9973C]/30 transition-colors" />
                      )}
                      <div className="shrink-0">
                        <div className="text-[4rem] font-black text-gray-100 group-hover:text-[#C9973C]/20 leading-none transition-colors select-none">{step.n}</div>
                      </div>
                      <div className="flex-1 pt-3">
                        <div className="flex items-center gap-3 mb-4">
                          <step.icon className="w-5 h-5 text-[#C9973C]" />
                          <h3 className="font-black text-[#0F1C47] text-lg">{step.title}</h3>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-3">
                          {step.items.map((item, j) => (
                            <div key={j} className="flex items-start gap-2 text-sm text-gray-600">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#C9973C] mt-2 shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </section>

            {/* ── 6. VALUES ── */}
            <section id="values" className="scroll-mt-28 mb-20">
              <div className="flex items-center gap-4 mb-12">
                <span className="text-5xl font-black text-gray-100 leading-none select-none">06</span>
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.25em]">{t("about.sec6Label")}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={revealUp}
                className="bg-[#0F1C47] p-10 lg:p-20 mb-px text-center relative overflow-hidden"
              >
                <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
                  style={{ backgroundImage: "linear-gradient(#C9973C 1px, transparent 1px), linear-gradient(90deg, #C9973C 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
                <AmbientScene3D
                  className="absolute inset-0 pointer-events-none opacity-70"
                  nodeCount={16}
                  colorA="#C9973C"
                  colorB="#3E5AA8"
                  opacity={0.4}
                  seed={61}
                />
                <p className="relative z-10 text-4xl lg:text-6xl font-black text-white leading-tight max-w-3xl mx-auto">
                  {t("about.mottoMain")}<br /><span className="text-[#C9973C]">{t("about.mottoHighlight")}</span>
                </p>
                <p className="relative z-10 text-blue-300 text-sm mt-6 max-w-lg mx-auto leading-relaxed">{t("about.mottoDesc")}</p>
              </motion.div>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="grid grid-cols-2 gap-px bg-gray-200">
                {values.map((v, i) => (
                  <motion.div key={i} variants={revealUp}
                    className={`${v.bg} p-8 lg:p-12 group hover:bg-[#0F1C47] border-t-2 border-t-transparent hover:border-t-[#C9973C] transition-all duration-300`}
                  >
                    <v.icon className="w-7 h-7 text-[#C9973C] mb-6 group-hover:scale-110 transition-transform duration-300" />
                    <h3 className="font-black text-[#0F1C47] group-hover:text-white text-lg mb-4 transition-colors">{v.title}</h3>
                    <p className="text-gray-500 group-hover:text-blue-200 text-sm leading-relaxed transition-colors">{v.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            </section>

            {/* ── 7. CERTIFICATIONS & CLIENTS ── */}
            <section id="certs" className="scroll-mt-28 mb-20">
              <div className="flex items-center gap-4 mb-12">
                <span className="text-5xl font-black text-gray-100 leading-none select-none">07</span>
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.25em]">{t("about.sec7Label")}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={revealUp} className="bg-white p-10 lg:p-14 mb-px">
                <h2 className="text-3xl font-black text-[#0F1C47] mb-4 max-w-xl">{t("about.sec7Headline")}</h2>
                <p className="text-gray-600 leading-relaxed max-w-2xl">{t("about.sec7Body")}</p>
              </motion.div>

              {/* Chứng nhận — lưới 5 ô, đồng bộ pattern border-t-2 hover đã dùng cho values/team */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="grid grid-cols-2 md:grid-cols-5 gap-px bg-gray-200 mb-px">
                {certifications.map((c, i) => (
                  <motion.div key={i} variants={revealUp}
                    className="bg-white p-6 lg:p-8 group hover:bg-[#0F1C47] border-t-2 border-t-transparent hover:border-t-[#C9973C] transition-all duration-300"
                  >
                    <c.icon className="w-6 h-6 text-[#C9973C] mb-5 group-hover:scale-110 transition-transform duration-300" />
                    <h3 className="font-black text-[#0F1C47] group-hover:text-white text-sm mb-2 leading-snug transition-colors">{c.name}</h3>
                    <p className="text-gray-500 group-hover:text-blue-200 text-xs leading-relaxed transition-colors">{c.desc}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Khách hàng tiêu biểu — cùng bộ logo với trang chủ, tái khẳng định "1.000+ doanh
                  nghiệp" bằng bằng chứng trực quan thay vì chỉ nhắc lại con số suông ở đây. */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={revealUp} className="bg-white p-10 lg:p-14">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{t("about.clientsLabel")}</p>
                <p className="text-gray-500 text-sm mb-8 max-w-xl">{t("about.clientsDesc")}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  {clientLogos.map((logo, i) => (
                    <div key={i} className="h-16 sm:h-20 bg-[#F7F8FA] border border-gray-100 flex items-center justify-center p-3 hover:border-[#C9973C]/40 transition-colors">
                      <Image
                        src={logo.src}
                        alt={logo.name}
                        width={110}
                        height={48}
                        className="max-h-10 sm:max-h-12 max-w-[100px] w-auto h-auto object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            </section>

          </div>
        </div>
      </div>

      {/* ═══ CTA ═══ */}
      <section className="relative overflow-hidden bg-[#0F1C47]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F1C47] via-[#132456] to-[#0a1330]" />
        <AmbientScene3D
          className="absolute inset-0 pointer-events-none opacity-60"
          nodeCount={14}
          colorA="#C9973C"
          colorB="#3E5AA8"
          opacity={0.35}
          seed={19}
        />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: "linear-gradient(#C9973C 1px, transparent 1px), linear-gradient(90deg, #C9973C 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }} variants={revealUp}
          className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-16 py-24 flex flex-col lg:flex-row items-center justify-between gap-10"
        >
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-px bg-[#C9973C]" />
              <span className="text-[#C9973C] text-xs font-bold uppercase tracking-widest">{t("about.ctaTag")}</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight max-w-xl">{t("about.ctaHeadline")}</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 shrink-0">
            <a href="/lien-he"
              className="inline-flex items-center gap-3 bg-[#C9973C] hover:bg-white hover:text-[#0F1C47] text-white font-bold px-8 py-4 transition-all duration-300 group"
            >
              {t("about.ctaBtn1")}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="tel:19000380"
              className="inline-flex items-center gap-3 border border-white/30 hover:border-white text-white font-bold px-8 py-4 transition-all backdrop-blur-sm"
            >
              <Phone className="w-4 h-4 text-[#C9973C]" />
              {t("about.ctaBtn2")}
            </a>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
