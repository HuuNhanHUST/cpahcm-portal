"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  Newspaper,
  Calendar,
  Eye,
  Search,
  Filter,
  ChevronRight,
  ImageOff,
  Building2,
  Award,
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLanguage } from "../../context/LanguageContext";
import { API_BASE, postImageUrl, formatDate, POST_CATEGORIES } from "./shared";

// Animated counter — same implementation reused across Home/About/Recruitment for a consistent feel.
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

export default function NewsPage() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);

  const [posts, setPosts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const perPage = 9;

  useEffect(() => setMounted(true), []);

  // Trì hoãn 400ms trước khi đưa searchQuery vào debouncedQuery — tránh bắn 1 request/ký tự khi
  // gõ nhanh (mỗi lần gõ trước đó vốn gọi API ngay lập tức, gây nghẽn không cần thiết).
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Response của 1 request CŨ (VD: đã gõ rồi xóa) có thể trả về SAU response mới nhất, ghi đè
  // state bằng kết quả lỗi thời (thường là rỗng), làm trang trông như "mất hết dữ liệu" dù dữ
  // liệu thật vẫn còn nguyên. requestIdRef đảm bảo chỉ response của request MỚI NHẤT mới được
  // phép cập nhật state.
  const requestIdRef = useRef(0);
  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (selectedCategory !== "ALL") params.set("category", selectedCategory);
    if (debouncedQuery) params.set("q", debouncedQuery);

    fetch(`${API_BASE}/posts?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (requestId !== requestIdRef.current) return;
        setPosts(Array.isArray(json?.data?.items) ? json.data.items : []);
        setTotal(json?.data?.total || 0);
      })
      .catch(() => { if (requestId === requestIdRef.current) { setPosts([]); setTotal(0); } })
      .finally(() => { if (requestId === requestIdRef.current) setLoading(false); });
  }, [page, selectedCategory, debouncedQuery]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const fadeIn: any = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F6F9] font-sans selection:bg-[#1B3A8F] selection:text-white">
      <Header />

      <main className="flex-grow">
        {/* HERO — same h-screen navy pattern as Home/About/Recruitment */}
        <section ref={heroRef} className="relative h-screen min-h-[640px] flex flex-col overflow-hidden bg-[#0F1C47]">
          <motion.div style={{ y: bgY }} className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=2069&auto=format&fit=crop"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-25 scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1C47] via-[#0F1C47]/70 to-[#0F1C47]/30" />
          </motion.div>
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: "linear-gradient(#C9973C 1px, transparent 1px), linear-gradient(90deg, #C9973C 1px, transparent 1px)", backgroundSize: "80px 80px" }}
          />

          <div className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36">
            <motion.div initial={{ opacity: 0 }} animate={mounted ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
              <div className="flex items-center gap-3 mb-5">
                <Newspaper className="w-4 h-4 text-[#C9973C]" />
                <span className="text-[#C9973C] text-xs font-bold uppercase tracking-[0.2em]">{t("news.heroBadge")}</span>
              </div>

              <h1 className="text-[clamp(2.25rem,5.5vw,4.5rem)] font-black leading-[1.05] text-white mb-6 tracking-tight max-w-4xl">
                {t("news.title")}
              </h1>

              <p className="text-blue-200/80 text-base md:text-lg max-w-xl leading-relaxed mb-9 font-light">
                {t("news.subtitle")}
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={mounted ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2, duration: 0.4 }}
            className="relative z-10 w-full border-t border-white/10"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/10 bg-white/5 backdrop-blur-md">
              {[
                { n: total, label: t("news.statArticles"), icon: Newspaper, animated: false },
                { n: POST_CATEGORIES.length, label: t("news.statCategories"), icon: Filter, animated: false },
                { n: 1000, s: "+", label: t("news.statBusinesses"), icon: Building2, animated: true },
                { n: 16, s: "+", label: t("news.statYears"), icon: Award, animated: true },
              ].map((stat, i) => (
                <div key={i} className="py-6 lg:py-7 px-4 text-center">
                  <stat.icon className="w-5 h-5 text-[#C9973C] mx-auto mb-2 opacity-80" />
                  <div className="stat-figure text-2xl lg:text-3xl font-black text-white mb-1">
                    {/* Đếm số thật (tổng bài viết/chuyên mục) chỉ có sau khi fetch xong — hiển thị
                        tĩnh, KHÔNG dùng Counter animate-from-0 vì số nhỏ (VD: 1 bài) sẽ đứng ở "0"
                        gần hết 1.8s rồi mới nhảy lên, trông như lỗi. Chỉ số liệu tin cậy tĩnh lớn
                        (1.000+ doanh nghiệp, 16+ năm) mới đáng animate. */}
                    {stat.animated ? <Counter end={stat.n} suffix={stat.s || ""} /> : stat.n.toLocaleString()}
                  </div>
                  <div className="text-[10px] md:text-[11px] text-blue-300 uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* BODY */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Sidebar Filter */}
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-sm border border-gray-100">
              <h3 className="font-bold text-[#0F1C47] text-base mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Filter className="w-5 h-5 text-[#C9973C]" /> {t("news.filterTitle")}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-2">{t("news.filterSearchLabel")}</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                      placeholder={t("news.filterSearchPlaceholder")}
                      className="w-full pl-9 pr-3 py-2.5 bg-[#F8F9FA] border border-gray-200 rounded-sm text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-2">{t("news.filterCategoryLabel")}</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                    className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20 font-medium text-gray-700"
                  >
                    <option value="ALL">{t("news.filterAllCategories")}</option>
                    {POST_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {(searchQuery || selectedCategory !== "ALL") && (
                  <button
                    onClick={() => { setSearchQuery(""); setDebouncedQuery(""); setSelectedCategory("ALL"); setPage(1); }}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-sm text-xs transition-colors"
                  >
                    {t("news.clearFilter")}
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* List */}
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="lg:col-span-3 space-y-4">
            {loading ? (
              <div className="bg-white p-12 rounded-sm border border-gray-100 text-center text-sm text-gray-400">
                {t("news.loadingPosts")}
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white p-12 rounded-sm border border-gray-100 text-center space-y-3">
                <Search className="w-12 h-12 text-gray-300 mx-auto" />
                <h4 className="text-lg font-bold text-[#0F1C47]">{t("news.noResultsTitle")}</h4>
                <p className="text-sm text-gray-500">{t("news.noResultsDesc")}</p>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="group bg-white p-6 rounded-sm border border-gray-100 border-t-2 border-t-transparent hover:border-t-[#C9973C] hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row gap-6"
                >
                  <Link href={`/tin-tuc/${post.slug}`} className="relative md:w-1/3 aspect-[4/3] shrink-0 rounded-sm overflow-hidden bg-[#F4F6F9] border border-gray-100 flex items-center justify-center">
                    {post.imageUrl ? (
                      <Image src={postImageUrl(post.imageUrl) ?? ""} alt={post.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <ImageOff className="w-6 h-6 text-gray-300" />
                    )}
                  </Link>
                  <div className="md:w-2/3 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                      <span className="px-3 py-1 bg-[#F4F6F9] text-[#1B3A8F] font-bold text-xs rounded-sm uppercase tracking-wider">{post.category}</span>
                      <div className="flex gap-4 text-xs text-gray-400 font-medium">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(post.createdAt)}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {post.viewCount}</span>
                      </div>
                    </div>
                    <Link href={`/tin-tuc/${post.slug}`} className="text-xl font-bold text-[#0F1C47] mb-3 hover:text-[#1B3A8F] transition-colors">
                      {post.title}
                    </Link>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{post.excerpt || post.content}</p>
                    <Link href={`/tin-tuc/${post.slug}`} className="text-[#C9973C] font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all w-max">
                      {t("news.readMore")} <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-bold bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 rounded-sm"
                >
                  {t("news.paginationPrev")}
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 flex items-center justify-center font-bold rounded-sm text-sm ${
                      p === page ? "bg-[#1B3A8F] text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-bold bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 rounded-sm"
                >
                  {t("news.paginationNext")}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
