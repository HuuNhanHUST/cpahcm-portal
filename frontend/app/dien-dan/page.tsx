"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

// TipTap (RichTextEditor) chỉ cần khi mở modal "Tạo Chủ Đề Mới" — tải động thay vì gộp thẳng vào
// bundle trang, vì phần lớn khách chỉ đọc/tìm chủ đề mà không bao giờ mở modal này.
const RichTextEditor = dynamic(() => import("../../components/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="w-full h-40 bg-[#F8F9FA] border border-gray-200 rounded-sm animate-pulse" />,
});
import {
  MessageSquare,
  Search,
  Filter,
  ChevronRight,
  Pin,
  Lock,
  Eye,
  MessagesSquare,
  X,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useLanguage } from "../../context/LanguageContext";
import { API_BASE, useAuthUser, AuthGateNotice, formatDate } from "./shared";
import { authFetch } from "../../lib/authFetch";

export default function ForumPage() {
  const { t } = useLanguage();
  const { authUser, authMounted } = useAuthUser();
  const [mounted, setMounted] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);

  const [categories, setCategories] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const perPage = 15;

  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => setMounted(true), []);

  // Trước đây modal chỉ đóng được bằng nút X — không đóng khi bấm ra ngoài (nền tối) hay nhấn
  // Esc, không đúng hành vi modal chuẩn mà người dùng thường mong đợi.
  useEffect(() => {
    if (!showNewTopicModal) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setShowNewTopicModal(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showNewTopicModal]);

  useEffect(() => {
    fetch(`${API_BASE}/forum/categories`)
      .then((res) => res.json())
      .then((json) => setCategories(Array.isArray(json?.data) ? json.data : []))
      .catch(() => setCategories([]));
  }, []);

  // Trì hoãn 400ms trước khi đưa searchQuery vào debouncedQuery — tránh bắn 1 request/ký tự khi
  // gõ nhanh.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Response của 1 request CŨ có thể trả về SAU response mới nhất, ghi đè state bằng kết quả lỗi
  // thời (thường rỗng), làm trang trông như "mất hết dữ liệu" dù dữ liệu thật vẫn còn. requestIdRef
  // chỉ cho response MỚI NHẤT cập nhật state.
  const requestIdRef = useRef(0);
  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (selectedCategory !== "ALL") params.set("category", selectedCategory);
    if (debouncedQuery) params.set("q", debouncedQuery);

    fetch(`${API_BASE}/forum/topics?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (requestId !== requestIdRef.current) return;
        setTopics(Array.isArray(json?.data?.items) ? json.data.items : []);
        setTotal(json?.data?.total || 0);
      })
      .catch(() => { if (requestId === requestIdRef.current) { setTopics([]); setTotal(0); } })
      .finally(() => { if (requestId === requestIdRef.current) setLoading(false); });
  }, [page, selectedCategory, debouncedQuery]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const openNewTopicModal = () => {
    setNewTitle("");
    setNewCategoryId(categories[0]?.id || "");
    setNewContent("");
    setFormError("");
    setShowNewTopicModal(true);
  };

  const submitNewTopic = async () => {
    setFormError("");
    if (newTitle.trim().length < 10) {
      setFormError("Tiêu đề phải có ít nhất 10 ký tự.");
      return;
    }
    if (newContent.replace(/<[^>]*>/g, "").trim().length < 10) {
      setFormError("Nội dung phải có ít nhất 10 ký tự.");
      return;
    }
    if (!newCategoryId) {
      setFormError("Vui lòng chọn danh mục.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch(`${API_BASE}/forum/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, content: newContent, categoryId: newCategoryId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json?.message || "Có lỗi xảy ra, vui lòng thử lại.");
        return;
      }
      setShowNewTopicModal(false);
      setPage(1);
      setSelectedCategory("ALL");
      setSearchQuery("");
      // Refetch danh sách để thấy chủ đề vừa tạo (đứng đầu do sort createdAt desc).
      const listRes = await fetch(`${API_BASE}/forum/topics?page=1`);
      const listJson = await listRes.json();
      setTopics(Array.isArray(listJson?.data?.items) ? listJson.data.items : []);
      setTotal(listJson?.data?.total || 0);
    } catch {
      setFormError("Không thể kết nối tới máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  const fadeIn: any = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  const totalReplies = topics.reduce((sum, tp) => sum + (tp._count?.replies || 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F6F9] font-sans selection:bg-[#1B3A8F] selection:text-white">
      <Header />

      <main className="flex-grow">
        <section ref={heroRef} className="relative h-screen min-h-[640px] flex flex-col overflow-hidden bg-[#0F1C47]">
          <motion.div style={{ y: bgY }} className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2069&auto=format&fit=crop"
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
                <MessageSquare className="w-4 h-4 text-[#C9973C]" />
                <span className="text-[#C9973C] text-xs font-bold uppercase tracking-[0.2em]">{t("forum.heroBadge")}</span>
              </div>

              <h1 className="text-[clamp(2.25rem,5.5vw,4.5rem)] font-black leading-[1.05] text-white mb-6 tracking-tight max-w-4xl">
                {t("forum.title")}
              </h1>

              <p className="text-blue-200/80 text-base md:text-lg max-w-xl leading-relaxed mb-9 font-light">
                {t("forum.subtitle")}
              </p>

              <button
                onClick={openNewTopicModal}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#C9973C] hover:bg-[#D4AF37] text-[#0F1C47] font-bold rounded-sm text-sm uppercase tracking-wide transition-colors"
              >
                <MessageSquare className="w-4 h-4" /> {t("forum.newTopicBtn")}
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={mounted ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2, duration: 0.4 }}
            className="relative z-10 w-full border-t border-white/10"
          >
            <div className="grid grid-cols-3 divide-x divide-white/10 bg-white/5 backdrop-blur-md">
              {[
                { n: total, label: t("forum.statTopics"), icon: MessageSquare },
                { n: categories.length, label: t("forum.statCategories"), icon: Filter },
                { n: totalReplies, label: t("forum.statReplies"), icon: MessagesSquare },
              ].map((stat, i) => (
                <div key={i} className="py-6 lg:py-7 px-4 text-center">
                  <stat.icon className="w-5 h-5 text-[#C9973C] mx-auto mb-2 opacity-80" />
                  <div className="text-2xl lg:text-3xl font-black text-white mb-1">{stat.n.toLocaleString()}</div>
                  <div className="text-[10px] md:text-[11px] text-blue-300 uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-sm border border-gray-100">
              <h3 className="font-bold text-[#0F1C47] text-base mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Filter className="w-5 h-5 text-[#C9973C]" /> {t("forum.filterTitle")}
              </h3>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    placeholder={t("forum.searchPlaceholder")}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#F8F9FA] border border-gray-200 rounded-sm text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20 transition-colors"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                  className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20 font-medium text-gray-700"
                >
                  <option value="ALL">{t("forum.allCategories")}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
                {(searchQuery || selectedCategory !== "ALL") && (
                  <button
                    onClick={() => { setSearchQuery(""); setDebouncedQuery(""); setSelectedCategory("ALL"); setPage(1); }}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-sm text-xs transition-colors"
                  >
                    {t("forum.clearFilter")}
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="lg:col-span-3 space-y-3">
            {loading ? (
              <div className="bg-white p-12 rounded-sm border border-gray-100 text-center text-sm text-gray-400">
                {t("forum.loading")}
              </div>
            ) : topics.length === 0 ? (
              <div className="bg-white p-12 rounded-sm border border-gray-100 text-center space-y-3">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto" />
                <h4 className="text-lg font-bold text-[#0F1C47]">{t("forum.noResultsTitle")}</h4>
                <p className="text-sm text-gray-500">{t("forum.noResultsDesc")}</p>
              </div>
            ) : (
              topics.map((topic) => (
                <Link
                  key={topic.id}
                  href={`/dien-dan/${topic.slug}`}
                  className="group block bg-white p-5 rounded-sm border border-gray-100 border-l-2 border-l-transparent hover:border-l-[#C9973C] hover:shadow-md transition-all duration-300"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {topic.isPinned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FDF3E1] text-[#C9973C] font-bold text-[10px] rounded-sm uppercase">
                            <Pin className="w-3 h-3" /> {t("forum.pinnedLabel")}
                          </span>
                        )}
                        {topic.isLocked && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 font-bold text-[10px] rounded-sm uppercase">
                            <Lock className="w-3 h-3" /> {t("forum.lockedLabel")}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-[#F4F6F9] text-[#1B3A8F] font-bold text-[10px] rounded-sm uppercase tracking-wider">
                          {topic.category?.name}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#0F1C47] group-hover:text-[#1B3A8F] transition-colors truncate">
                        {topic.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {topic.author?.fullName || "—"} · {formatDate(topic.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><MessagesSquare className="w-3.5 h-3.5" /> {topic._count?.replies ?? 0} {t("forum.repliesCount")}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {topic.viewCount} {t("forum.viewsCount")}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-bold bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 rounded-sm"
                >
                  {t("forum.paginationPrev")}
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
                  {t("forum.paginationNext")}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <AnimatePresence>
        {showNewTopicModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewTopicModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-topic-modal-title"
          >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white rounded-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 id="new-topic-modal-title" className="font-bold text-[#0F1C47] text-lg">{t("forum.newTopicBtn")}</h3>
              <button onClick={() => setShowNewTopicModal(false)} className="text-gray-400 hover:text-gray-600 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B3A8F]/30">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {authMounted && !authUser ? (
                <AuthGateNotice
                  authUser={authUser}
                  title={t("forum.authGateTitle")}
                  desc={t("forum.authGateDesc")}
                  loginLabel={t("forum.loginLabel")}
                />
              ) : (
                <>
                  <div>
                    <label className="text-sm font-bold text-gray-700 block mb-1.5">{t("forum.modalCategoryLabel")}</label>
                    <select
                      value={newCategoryId}
                      onChange={(e) => setNewCategoryId(e.target.value)}
                      className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-700 block mb-1.5">{t("forum.modalTitleLabel")}</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder={t("forum.modalTitlePlaceholder")}
                      className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-700 block mb-1.5">{t("forum.modalContentLabel")}</label>
                    <RichTextEditor value={newContent} onChange={setNewContent} />
                  </div>
                  {formError && <p className="text-sm text-red-600">{formError}</p>}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={submitNewTopic}
                      disabled={submitting}
                      className="flex-1 py-3 bg-[#C9973C] hover:bg-[#D4AF37] text-[#0F1C47] font-bold rounded-sm text-sm uppercase tracking-wide disabled:opacity-50"
                    >
                      {submitting ? t("forum.modalSubmitting") : t("forum.modalSubmit")}
                    </button>
                    <button
                      onClick={() => setShowNewTopicModal(false)}
                      className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-sm text-sm"
                    >
                      {t("forum.modalCancel")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
