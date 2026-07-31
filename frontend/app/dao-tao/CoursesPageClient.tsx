"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { GraduationCap, ImageOff, ChevronRight, Clock3, BookOpen, Filter, Search, Users, Award } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLanguage } from "../../context/LanguageContext";
import { Course, COURSE_CATEGORIES, courseImageUrl, formatPrice } from "./shared";

// Animated counter — same implementation reused across Home/About/Recruitment/News for a consistent feel.
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

export default function CoursesPageClient({ initialCourses }: { initialCourses: Course[] }) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);

  useEffect(() => setMounted(true), []);

  const fadeIn: any = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredCourses = initialCourses
    .filter((c) => selectedCategory === "ALL" || c.category === selectedCategory)
    .filter((c) => !q || c.title.toLowerCase().includes(q) || (c.instructor || "").toLowerCase().includes(q));

  const hasActiveFilters = selectedCategory !== "ALL" || q !== "";

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F6F9] font-sans selection:bg-[#1B3A8F] selection:text-white">
      <Header />

      <main className="flex-grow">
        {/* HERO */}
        <section ref={heroRef} className="relative h-[min(100vh,900px)] min-h-[640px] flex flex-col overflow-hidden bg-[#0F1C47]">
          {/* Ảnh thật thay cho 3D — 3D dùng chung 1 cảnh trên mọi trang khiến banner giống hệt
              nhau; ảnh nhóm học viên/giảng viên khớp đúng chủ đề Đào tạo. */}
          <motion.div style={{ y: bgY }} className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2069&auto=format&fit=crop"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-30 scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1C47] via-[#0F1C47]/75 to-[#0F1C47]/40" />
          </motion.div>
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: "linear-gradient(#C9973C 1px, transparent 1px), linear-gradient(90deg, #C9973C 1px, transparent 1px)", backgroundSize: "80px 80px" }}
          />

          <div className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36">
            <motion.div initial={{ opacity: 0 }} animate={mounted ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
              <div className="flex items-center gap-3 mb-5">
                <GraduationCap className="w-4 h-4 text-[#C9973C]" />
                <span className="text-[#C9973C] text-xs font-bold uppercase tracking-[0.2em]">{t("training.heroBadge")}</span>
              </div>
              <h1 className="text-[clamp(2.25rem,5.5vw,4.5rem)] font-black leading-[1.05] text-white mb-6 tracking-tight max-w-2xl">
                {t("training.title")}
              </h1>
              <p className="text-blue-200/80 text-base md:text-lg max-w-xl leading-relaxed mb-9 font-light">
                {t("training.subtitle")}
              </p>
            </motion.div>
          </div>

          {/* Stats strip — cùng pattern với Trang chủ/Giới thiệu/Tin tức, trước đây hero trang này
              thiếu hẳn dải số liệu này. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={mounted ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2, duration: 0.4 }}
            className="relative z-10 w-full border-t border-white/10"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/10 bg-white/5 backdrop-blur-md">
              {[
                { n: initialCourses.length, label: t("training.statCourses"), icon: BookOpen, animated: false },
                { n: COURSE_CATEGORIES.length, label: t("training.statCategories"), icon: Filter, animated: false },
                { n: 50, s: "+", label: t("training.statInstructors"), icon: Users, animated: true },
                { n: 16, s: "+", label: t("training.statYears"), icon: Award, animated: true },
              ].map((stat, i) => (
                <div key={i} className="py-6 lg:py-7 px-4 text-center">
                  <stat.icon className="w-5 h-5 text-[#C9973C] mx-auto mb-2 opacity-80" />
                  <div className="stat-figure text-2xl lg:text-3xl font-black text-white mb-1">
                    {stat.animated ? <Counter end={stat.n} suffix={stat.s || ""} /> : stat.n.toLocaleString()}
                  </div>
                  <div className="text-[10px] md:text-[11px] text-blue-300 uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* TAB LỌC CHUYÊN MỤC + TÌM KIẾM — trước đây chỉ lọc được theo chuyên mục cố định, không
            tìm được theo tên/giảng viên. Càng nhiều khóa học thì việc lướt qua từng tab càng chậm. */}
        <section className="bg-white border-b border-gray-100 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
            <div className="overflow-x-auto shrink-0">
              <div className="flex">
                {[{ key: "ALL", label: t("training.filterAll") }, ...COURSE_CATEGORIES.map((c) => ({ key: c, label: c }))].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedCategory(tab.key)}
                    className={`flex items-center gap-2 px-6 py-5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B3A8F]/30 ${
                      selectedCategory === tab.key ? "border-[#C9973C] text-[#0F1C47]" : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative flex-1 max-w-sm lg:ml-auto pb-3 lg:pb-0">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("training.searchPlaceholder")}
                className="w-full pl-9 pr-3 py-2.5 bg-[#F8F9FA] border border-gray-200 rounded-sm text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* GRID KHÓA HỌC */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          {filteredCourses.length === 0 ? (
            <div className="bg-white p-12 rounded-sm border border-gray-100 text-center space-y-3">
              <Filter className="w-12 h-12 text-gray-300 mx-auto" />
              <h4 className="text-lg font-bold text-[#0F1C47]">{t("training.noResultsTitle")}</h4>
              <p className="text-sm text-gray-500">{t("training.noResultsDesc")}</p>
              {hasActiveFilters && (
                <button
                  onClick={() => { setSearchQuery(""); setSelectedCategory("ALL"); }}
                  className="inline-block text-sm font-bold text-[#1B3A8F] hover:text-[#C9973C] underline underline-offset-2"
                >
                  {t("training.clearFilters")}
                </button>
              )}
            </div>
          ) : (
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <motion.div
                  key={course.id}
                  variants={fadeIn}
                  className="group bg-white rounded-sm border border-gray-100 border-t-2 border-t-transparent hover:border-t-[#C9973C] hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col"
                >
                  <Link href={`/dao-tao/${course.slug}`} className="h-44 shrink-0 bg-[#F4F6F9] flex items-center justify-center overflow-hidden relative">
                    {course.imageUrl ? (
                      <Image src={courseImageUrl(course.imageUrl) ?? ""} alt={course.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <ImageOff className="w-6 h-6 text-gray-300" />
                    )}
                    {course.isHot && (
                      <span className="absolute top-3 left-3 text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-sm uppercase">HOT</span>
                    )}
                  </Link>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-[#1B3A8F] bg-[#F4F6F9] px-3 py-1 rounded-sm uppercase tracking-wider">{course.category}</span>
                      {course.tag && <span className="text-xs font-bold text-[#0F1C47] bg-[#FDF6E9] border border-amber-200 px-3 py-1 rounded-sm">{course.tag}</span>}
                    </div>
                    <Link href={`/dao-tao/${course.slug}`} className="text-lg font-bold text-[#0F1C47] mb-2 hover:text-[#1B3A8F] transition-colors">
                      {course.title}
                    </Link>
                    {course.instructor && <p className="text-xs text-gray-500 mb-3">{t("training.instructorLabel")} {course.instructor}</p>}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                      <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-[#C9973C]" /> {course.lessons} {t("training.lessons")}</span>
                      <span className="flex items-center gap-1"><Clock3 className="w-3.5 h-3.5 text-[#C9973C]" /> {course.hours} {t("training.hours")}</span>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        {course.originalPrice && Number(course.originalPrice) > 0 && (
                          <span className="text-xs text-gray-400 line-through block">{formatPrice(course.originalPrice)}</span>
                        )}
                        <span className="text-base font-bold text-[#1B3A8F]">{formatPrice(course.price)}</span>
                      </div>
                      <Link href={`/dao-tao/${course.slug}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1B3A8F] group-hover:text-[#C9973C] transition-colors">
                        {t("training.viewDetail")} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
