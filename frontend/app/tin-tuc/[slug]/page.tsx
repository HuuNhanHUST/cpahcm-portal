"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import {
  Calendar,
  Eye,
  ChevronRight,
  ImageOff,
  Link2,
  Check,
  Building2,
  ShieldCheck,
  Share2,
} from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";
import { API_BASE, postImageUrl, formatDate } from "../shared";

export default function PostDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const slug = params?.slug as string;

  const [post, setPost] = useState<any>(null);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Khối nội dung bài viết + related posts trước đây hiện tĩnh ngay khi tải, không có hiệu ứng
  // xuất hiện khi cuộn tới như trang chi tiết khóa học/tuyển dụng đã có.
  const revealUp: any = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };
  const stagger: any = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };

  // Backend tăng viewCount trên MỖI lần GET /posts/:slug — chặn effect chạy 2 lần cho cùng 1 slug
  // (React StrictMode ở dev cố ý double-invoke effect khi mount), tránh lượt xem tăng gấp đôi.
  const loadedSlugRef = useRef<string | null>(null);
  useEffect(() => {
    if (!slug || loadedSlugRef.current === slug) return;
    loadedSlugRef.current = slug;
    setLoading(true);
    setNotFound(false);
    fetch(`${API_BASE}/posts/${slug}`)
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); return null; }
        return res.json();
      })
      .then((json) => {
        if (json?.data) setPost(json.data);
        else if (json !== null) setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    fetch(`${API_BASE}/posts/${slug}/related`)
      .then((res) => res.json())
      .then((json) => setRelatedPosts(Array.isArray(json?.data) ? json.data : []))
      .catch(() => setRelatedPosts([]));
  }, [slug]);

  // Đọc window.location.href thẳng trong lúc render (thay vì trong useEffect) khiến HTML server
  // render (window undefined → "") khác với lần render đầu tiên trên client (window đã có → URL
  // thật) — lỗi hydration mismatch. Phải khởi tạo "" ở cả 2 phía, chỉ điền URL thật SAU KHI mount
  // xong (trong effect, chạy sau hydration).
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F6F9] font-sans selection:bg-[#1B3A8F] selection:text-white">
      <Header />

      <main className="flex-grow">
        {/* BREADCRUMB */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-2 text-xs font-semibold text-gray-500">
            <Link href="/" className="hover:text-[#1B3A8F] transition-colors">{t("jobs.detailBreadcrumbHome")}</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <Link href="/tin-tuc" className="hover:text-[#1B3A8F] transition-colors">{t("news.detailBreadcrumbList")}</Link>
            {post && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                <span className="text-[#0F1C47] truncate max-w-[320px]">{post.title}</span>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="max-w-6xl mx-auto px-6 py-32 text-center">
            <div className="w-10 h-10 border-2 border-[#1B3A8F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-400">{t("news.detailLoading")}</p>
          </div>
        ) : notFound || !post ? (
          <div className="max-w-6xl mx-auto px-6 py-32 text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
              <ImageOff className="w-9 h-9 text-gray-300" />
            </div>
            <h1 className="text-2xl font-bold text-[#0F1C47]">{t("news.detailNotFoundTitle")}</h1>
            <p className="text-sm text-gray-500 max-w-md mx-auto">{t("news.detailNotFoundDesc")}</p>
            <Link
              href="/tin-tuc"
              className="inline-flex items-center gap-2 mt-2 px-7 py-3.5 bg-[#1B3A8F] hover:bg-[#0F1C47] text-white font-bold rounded-sm text-sm uppercase tracking-wide transition-colors"
            >
              {t("news.detailBackToList")}
            </Link>
          </div>
        ) : (
          <>
            {/* HEADER STRIP */}
            <section className="relative bg-[#0F1C47] text-white overflow-hidden">
              <div className="absolute inset-0 bg-grid-navy opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0F1C47]/40 to-[#0F1C47]" />

              <div className="relative max-w-6xl mx-auto px-6 py-14 md:py-20 grid md:grid-cols-[1fr_320px] gap-10 items-center">
                <div className="space-y-5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F1C47] bg-[#C9973C] px-3 py-1.5 rounded-sm uppercase tracking-wider">
                    {post.category}
                  </span>

                  <h1 className="text-3xl md:text-5xl font-black leading-[1.1] max-w-2xl">{post.title}</h1>

                  <p className="text-white/60 text-sm font-medium flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-[#C9973C]" /> {t("news.detailPostedLabel")} {formatDate(post.createdAt)}</span>
                    <span className="flex items-center gap-1.5"><Eye className="w-4 h-4 text-[#C9973C]" /> {post.viewCount} {t("news.viewsLabel")}</span>
                  </p>
                </div>

                <div className="justify-self-center md:justify-self-end w-full">
                  {post.imageUrl ? (
                    <div className="relative w-full h-44 md:h-48 rounded-sm border border-white/10 shadow-2xl shadow-black/40 overflow-hidden">
                      <Image
                        src={postImageUrl(post.imageUrl) ?? ""}
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 400px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-44 md:h-48 rounded-sm border border-white/10 bg-white/5 flex items-center justify-center">
                      <Building2 className="w-10 h-10 text-white/20" />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* MAIN CONTENT */}
            <section className="max-w-6xl mx-auto px-6 py-14 grid lg:grid-cols-[1fr_320px] gap-10 items-start">
              {/* LEFT: article content */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={revealUp}
                className="bg-white p-7 md:p-10 rounded-sm border border-gray-100"
              >
                <div className="prose-cpa">
                  <ReactMarkdown>{post.content}</ReactMarkdown>
                </div>
              </motion.div>

              {/* RIGHT SIDEBAR */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="lg:sticky lg:top-24 space-y-4">
                <motion.div variants={revealUp} className="bg-white rounded-sm border border-gray-100 p-5">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                    <Share2 className="w-3.5 h-3.5" /> {t("news.detailShareTitle")}
                  </p>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 flex items-center justify-center rounded-sm bg-[#F4F6F9] hover:bg-[#1B3A8F] hover:text-white text-gray-500 font-black text-sm transition-colors"
                      aria-label="Facebook"
                    >
                      f
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 flex items-center justify-center rounded-sm bg-[#F4F6F9] hover:bg-[#1B3A8F] hover:text-white text-gray-500 font-black text-[11px] transition-colors"
                      aria-label="LinkedIn"
                    >
                      in
                    </a>
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 flex items-center justify-center gap-2 px-3 h-9 rounded-sm bg-[#F4F6F9] hover:bg-[#1B3A8F] hover:text-white text-gray-600 text-xs font-bold transition-colors"
                    >
                      {linkCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Link2 className="w-3.5 h-3.5" />}
                      {linkCopied ? t("news.detailLinkCopied") : t("news.detailCopyLink")}
                    </button>
                  </div>
                </motion.div>

                <motion.div variants={revealUp} className="bg-[#0F1C47] rounded-sm p-6 text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-grid-navy opacity-30" />
                  <div className="relative z-10 space-y-3">
                    <ShieldCheck className="w-6 h-6 text-[#C9973C]" />
                    <h3 className="font-bold text-base">CPA HCM</h3>
                    <p className="text-xs text-white/60 leading-relaxed">
                      Được Bộ Tài Chính cấp phép, hoạt động từ 2010 — đồng hành cùng hơn 1.000+ doanh nghiệp trong lĩnh vực kế toán, kiểm toán và tư vấn thuế.
                    </p>
                    <a
                      href="tel:19000380"
                      className="inline-flex items-center gap-2 mt-2 px-4 py-2.5 bg-[#C9973C] hover:bg-[#D4AF37] text-[#0F1C47] font-bold rounded-sm text-xs uppercase tracking-wide transition-colors"
                    >
                      Hotline 1900 0380
                    </a>
                  </div>
                </motion.div>
              </motion.div>
            </section>

            {/* RELATED POSTS */}
            <section className="max-w-6xl mx-auto px-6 pb-16">
              <div className="border-t border-gray-200 pt-10">
                <h2 className="text-xl font-bold text-[#0F1C47]">{t("news.relatedPostsTitle")}</h2>
                <p className="text-sm text-gray-500 mt-1 mb-6">{t("news.relatedPostsSubtitle")}</p>

                {relatedPosts.length === 0 ? (
                  <p className="text-sm text-gray-400">{t("news.relatedPostsEmpty")}</p>
                ) : (
                  <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {relatedPosts.map((rp) => (
                      <motion.div key={rp.id} variants={revealUp}>
                      <Link
                        href={`/tin-tuc/${rp.slug}`}
                        className="group bg-white p-5 rounded-sm border border-gray-100 border-t-2 border-t-transparent hover:border-t-[#C9973C] hover:shadow-lg transition-all block"
                      >
                        <div className="relative w-full h-28 rounded-sm overflow-hidden bg-[#F4F6F9] border border-gray-100 flex items-center justify-center mb-4">
                          {rp.imageUrl ? (
                            <Image src={postImageUrl(rp.imageUrl) ?? ""} alt={rp.title} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <ImageOff className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <h3 className="font-bold text-[#1B3A8F] group-hover:text-[#C9973C] transition-colors text-sm leading-snug line-clamp-2">
                          {rp.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#C9973C]" /> {formatDate(rp.createdAt)}</p>
                      </Link>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
