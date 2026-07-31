"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  BookOpen,
  ImageOff,
  Link2,
  Share2,
  GraduationCap,
  CheckCircle,
  Video,
  FileText,
  Info,
} from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";
import { useAuthUser, AuthGateNotice } from "../../tuyen-dung/shared";
import { API_BASE, courseImageUrl, formatPrice, Course, CourseLessonItem } from "../shared";
import { authFetch } from "../../../lib/authFetch";

export default function CourseDetailClient({ course, relatedCourses }: { course: Course; relatedCourses: Course[] }) {
  const { t } = useLanguage();
  const { authUser, authHeaders } = useAuthUser();
  const [linkCopied, setLinkCopied] = useState(false);
  const [openModuleIdx, setOpenModuleIdx] = useState<number | null>(0);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);

  // Đọc window.location.href thẳng trong lúc render (thay vì trong useEffect) khiến HTML server
  // render (window undefined → "") khác với lần render đầu tiên trên client (window đã có →
  // URL thật) — lỗi hydration mismatch kinh điển của Next.js. Phải khởi tạo "" ở cả 2 phía, chỉ
  // điền URL thật SAU KHI mount xong (trong effect, chạy sau hydration).
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  // Next.js App Router KHÔNG remount component này khi điều hướng phía client giữa 2 khóa học
  // (cùng khớp route /dao-tao/[slug]) — chỉ props (course) thay đổi. Thiếu effect này, trạng thái
  // "đã đăng ký thành công" (enrolled=true) của khóa học TRƯỚC bị giữ lại khi bấm sang khóa học
  // LIÊN QUAN khác, khiến khóa mới hiện nhầm "Đã đăng ký" và ẩn luôn nút đăng ký thật.
  useEffect(() => {
    setEnrolled(false);
    setEnrollError(null);
    setEnrolling(false);
    setOpenModuleIdx(0);
    setLinkCopied(false);
  }, [course.id]);

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  // Trước đây trang này không có framer-motion nào — mọi khối nội dung hiện tĩnh ngay khi tải,
  // khác với Trang chủ/Giới thiệu/Tin tức đã có hiệu ứng xuất hiện khi cuộn tới.
  const revealUp: any = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };
  const stagger: any = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    setEnrollError(null);
    try {
      const res = await authFetch(`${API_BASE}/courses/${course.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || t("training.enrollErrorGeneric"));
      setEnrolled(true);
    } catch (err: any) {
      setEnrollError(err?.message || t("training.enrollErrorGeneric"));
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F6F9] font-sans selection:bg-[#1B3A8F] selection:text-white">
      <Header />

      <main className="flex-grow pb-20 lg:pb-0">
        {/* BREADCRUMB */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-2 text-xs font-semibold text-gray-500">
            <Link href="/" className="hover:text-[#1B3A8F] transition-colors">{t("jobs.detailBreadcrumbHome")}</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <Link href="/dao-tao" className="hover:text-[#1B3A8F] transition-colors">{t("training.detailBreadcrumbList")}</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-[#0F1C47] truncate max-w-[320px]">{course.title}</span>
          </div>
        </div>

        {/* HEADER STRIP */}
        <section className="relative bg-[#0F1C47] text-white overflow-hidden">
          <div className="absolute inset-0 bg-grid-navy opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0F1C47]/40 to-[#0F1C47]" />

          <div className="relative max-w-6xl mx-auto px-6 py-14 md:py-20 grid md:grid-cols-[1fr_320px] gap-10 items-center">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F1C47] bg-[#C9973C] px-3 py-1.5 rounded-sm uppercase tracking-wider">
                  {course.category}
                </span>
                {course.tag && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 border border-white/15 px-3 py-1.5 rounded-sm uppercase tracking-wider">
                    {course.tag}
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-black leading-[1.1] max-w-2xl">{course.title}</h1>
              <p className="text-white/60 text-sm font-medium flex items-center gap-4 flex-wrap">
                {course.instructor && <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-[#C9973C]" /> {course.instructor}</span>}
                <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-[#C9973C]" /> {course.lessons} {t("training.lessons")}</span>
                <span className="flex items-center gap-1.5"><Clock3 className="w-4 h-4 text-[#C9973C]" /> {course.hours} {t("training.hours")}</span>
              </p>
            </div>

            <div className="justify-self-center md:justify-self-end w-full">
              {course.imageUrl ? (
                <div className="relative w-full h-44 md:h-48 rounded-sm border border-white/10 shadow-2xl shadow-black/40 overflow-hidden">
                  <Image src={courseImageUrl(course.imageUrl) ?? ""} alt={course.title} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
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
        <section className="max-w-6xl mx-auto px-6 py-14 grid lg:grid-cols-[1fr_360px] gap-10 items-start">
          <div className="space-y-6">
            {/* Trước đây khối này chỉ có 1 đoạn văn trơ, không tiêu đề — khi mô tả ngắn (thường
                gặp), thẻ trắng lớn với padding rộng nhưng gần như trống trải nhìn như 1 phần
                chưa hoàn thiện của trang. Thêm icon+tiêu đề khớp đúng pattern của khối Giáo Trình
                bên dưới, vừa nhất quán vừa khiến khối này có chủ đích rõ ràng thay vì trống trải. */}
            {(course.longDescription || course.description) && (
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={revealUp}
                className="bg-white p-7 md:p-9 rounded-sm border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 shrink-0 bg-gradient-to-br from-[#1B3A8F] to-[#0F1C47] text-white rounded-sm flex items-center justify-center shadow-md shadow-[#1B3A8F]/20">
                    <Info className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <h2 className="font-bold text-[#0F1C47] text-lg">{t("training.descriptionTitle")}</h2>
                </div>
                {course.longDescription ? (
                  <div className="prose-cpa" dangerouslySetInnerHTML={{ __html: course.longDescription }} />
                ) : (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{course.description}</p>
                )}
              </motion.div>
            )}

            {/* GIÁO TRÌNH — accordion */}
            {course.modules && course.modules.length > 0 && (
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={revealUp}
                className="bg-white p-7 md:p-9 rounded-sm border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 shrink-0 bg-gradient-to-br from-[#1B3A8F] to-[#0F1C47] text-white rounded-sm flex items-center justify-center shadow-md shadow-[#1B3A8F]/20">
                    <BookOpen className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <h2 className="font-bold text-[#0F1C47] text-lg">{t("training.curriculumTitle")}</h2>
                </div>
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="space-y-2">
                  {course.modules.map((mod, idx) => (
                    <motion.div key={mod.id} variants={revealUp} className="border border-gray-100 rounded-sm overflow-hidden">
                      <button
                        onClick={() => setOpenModuleIdx(openModuleIdx === idx ? null : idx)}
                        className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-[#F8F9FA] hover:bg-gray-100 transition-colors text-left"
                      >
                        <span className="font-bold text-[#0F1C47] text-sm">
                          <span className="text-[#C9973C] mr-2">{String(idx + 1).padStart(2, "0")}</span>
                          {mod.title}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${openModuleIdx === idx ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence initial={false}>
                        {openModuleIdx === idx && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <ul className="px-5 py-4 space-y-3 text-sm text-gray-700">
                              {mod.lessons.map((lesson: CourseLessonItem) => (
                                <li key={lesson.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                                  <span className="flex items-start gap-2.5">
                                    <Check className="w-4 h-4 text-[#1B3A8F] shrink-0 mt-0.5" /> {lesson.title}
                                  </span>
                                  {(lesson.videoUrl || lesson.hasFile) && (
                                    <span className="flex items-center gap-3 shrink-0 pl-6 sm:pl-0">
                                      {lesson.videoUrl && (
                                        <a
                                          href={lesson.videoUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-xs font-bold text-[#1B3A8F] hover:underline"
                                        >
                                          <Video className="w-3.5 h-3.5" /> {t("training.watchVideo")}
                                        </a>
                                      )}
                                      {lesson.hasFile && (
                                        <a
                                          href={`${API_BASE}/courses/lessons/${lesson.id}/file`}
                                          className="flex items-center gap-1 text-xs font-bold text-[#C9973C] hover:underline"
                                        >
                                          <FileText className="w-3.5 h-3.5" /> {t("training.downloadDoc")}
                                        </a>
                                      )}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* SIDEBAR: enroll */}
          <div id="enroll-card" className="lg:sticky lg:top-24 space-y-4 scroll-mt-24">
            <div className="bg-white rounded-sm border border-gray-100 overflow-hidden">
              <div className="bg-[#0F1C47] px-6 py-5">
                {course.originalPrice && Number(course.originalPrice) > 0 && (
                  <span className="text-xs text-white/50 line-through block">{formatPrice(course.originalPrice)}</span>
                )}
                <h3 className="font-bold text-white text-2xl">{formatPrice(course.price)}</h3>
                {course.schedule && <p className="text-xs text-white/60 mt-1">{t("training.scheduleLabel")} {course.schedule}</p>}
              </div>
              <div className="p-6">
                {enrolled ? (
                  <div className="text-center py-4 space-y-3">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-500">
                      <CheckCircle className="w-7 h-7" />
                    </div>
                    <p className="text-sm text-gray-600">{t("training.enrollSuccessDesc")}</p>
                  </div>
                ) : !authUser || (authUser.role !== "MEMBER" && authUser.role !== "ADMIN") ? (
                  <AuthGateNotice
                    authUser={authUser}
                    requiredRole="MEMBER"
                    title={t("training.gateEnrollTitle")}
                    desc={t("training.gateEnrollDesc")}
                    loginLabel={t("jobs.gateLoginBtn")}
                  />
                ) : (
                  <div className="space-y-3">
                    {enrollError && <p className="text-xs font-bold text-red-600">{enrollError}</p>}
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="w-full px-6 py-3.5 bg-[#C9973C] hover:bg-[#D4AF37] disabled:opacity-60 text-[#0F1C47] font-bold rounded-sm text-sm uppercase tracking-wide transition-colors"
                    >
                      {enrolling ? t("training.enrolling") : t("training.enrollBtn")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-sm border border-gray-100 p-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                <Share2 className="w-3.5 h-3.5" /> {t("training.shareTitle")}
              </p>
              <div className="flex items-center gap-2">
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center rounded-sm bg-[#F4F6F9] hover:bg-[#1B3A8F] hover:text-white text-gray-500 font-black text-sm transition-colors" aria-label="Facebook">f</a>
                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center rounded-sm bg-[#F4F6F9] hover:bg-[#1B3A8F] hover:text-white text-gray-500 font-black text-[11px] transition-colors" aria-label="LinkedIn">in</a>
                <button onClick={handleCopyLink} className="flex-1 flex items-center justify-center gap-2 px-3 h-9 rounded-sm bg-[#F4F6F9] hover:bg-[#1B3A8F] hover:text-white text-gray-600 text-xs font-bold transition-colors">
                  {linkCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Link2 className="w-3.5 h-3.5" />}
                  {linkCopied ? t("jobs.detailLinkCopied") : t("jobs.detailCopyLink")}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* RELATED */}
        {relatedCourses.length > 0 && (
          <section className="max-w-6xl mx-auto px-6 pb-16">
            <div className="border-t border-gray-200 pt-10">
              <h2 className="text-xl font-bold text-[#0F1C47]">{t("training.relatedTitle")}</h2>
              <p className="text-sm text-gray-500 mt-1 mb-6">{t("training.relatedSubtitle")}</p>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                {relatedCourses.map((rc) => (
                  <motion.div key={rc.id} variants={revealUp}>
                    <Link href={`/dao-tao/${rc.slug}`} className="group bg-white p-5 rounded-sm border border-gray-100 border-t-2 border-t-transparent hover:border-t-[#C9973C] hover:shadow-lg transition-all block">
                      <div className="relative w-full h-28 rounded-sm overflow-hidden bg-[#F4F6F9] border border-gray-100 flex items-center justify-center mb-4">
                        {rc.imageUrl ? (
                          <Image src={courseImageUrl(rc.imageUrl) ?? ""} alt={rc.title} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
                        ) : (
                          <ImageOff className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <h3 className="font-bold text-[#1B3A8F] group-hover:text-[#C9973C] transition-colors text-sm leading-snug line-clamp-2">{rc.title}</h3>
                      <p className="text-xs font-bold text-[#1B3A8F] mt-2">{formatPrice(rc.price)}</p>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>
        )}
      </main>

      {/* Thanh CTA dính đáy — chỉ hiện trên mobile/tablet (ẩn từ lg trở lên vì sidebar đã sticky
          hiện sẵn). Trên màn hình nhỏ, nút "Đăng Ký" nằm sâu bên dưới mô tả + giáo trình, người
          dùng phải cuộn qua rất nhiều nội dung mới thấy — mẫu UI phổ biến ở các trang bán khóa
          học (Udemy, Coursera...). Chỉ cuộn tới thẻ đăng ký có sẵn, không lặp lại state/logic. */}
      {!enrolled && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            {course.originalPrice && Number(course.originalPrice) > 0 && (
              <span className="text-[11px] text-gray-400 line-through block">{formatPrice(course.originalPrice)}</span>
            )}
            <span className="text-base font-bold text-[#1B3A8F] truncate block">{formatPrice(course.price)}</span>
          </div>
          <a
            href="#enroll-card"
            className="shrink-0 px-6 py-3 bg-[#C9973C] hover:bg-[#D4AF37] text-[#0F1C47] font-bold rounded-sm text-sm uppercase tracking-wide transition-colors"
          >
            {t("training.enrollBtn")}
          </a>
        </div>
      )}

      <Footer />
    </div>
  );
}
