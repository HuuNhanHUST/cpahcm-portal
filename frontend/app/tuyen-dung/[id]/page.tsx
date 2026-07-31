"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import {
  MapPin,
  DollarSign,
  Briefcase,
  Building2,
  Clock3,
  CalendarClock,
  Upload,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  ImageOff,
  Link2,
  Check,
  X,
  FileText,
  ClipboardList,
  Award,
  ShieldCheck,
  Share2,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../../../context/LanguageContext";
import {
  API_BASE,
  jobImageUrl,
  useAuthUser,
  AuthGateNotice,
  locationLabel,
  typeLabel as sharedTypeLabel,
  timeAgo as sharedTimeAgo,
} from "../shared";
import { authFetch } from "../../../lib/authFetch";

export default function JobDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const jobId = params?.id as string;

  const { authUser, authHeaders } = useAuthUser();

  const [job, setJob] = useState<any>(null);
  const [relatedJobs, setRelatedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showApplyForm, setShowApplyForm] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Khối mô tả/yêu cầu/quyền lợi + related jobs trước đây hiện tĩnh ngay khi tải, không có hiệu
  // ứng xuất hiện khi cuộn tới như trang chi tiết khóa học đã có.
  const revealUp: any = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };
  const stagger: any = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };

  // Tự điền tên/SĐT/email từ tài khoản đã đăng nhập — trước đây form luôn trống, bắt gõ lại từ
  // đầu dù hệ thống đã có sẵn dữ liệu. Ưu tiên hồ sơ ứng viên (candidates/me) nếu có vì thường
  // chính xác/đầy đủ hơn thông tin tài khoản (SĐT tài khoản có thể chưa từng được cập nhật).
  const [applyFullName, setApplyFullName] = useState("");
  const [applyPhone, setApplyPhone] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  useEffect(() => {
    if (!authUser) return;
    setApplyFullName(authUser.fullName || "");
    setApplyPhone(authUser.phone || "");
    setApplyEmail(authUser.email || "");
    fetch(`${API_BASE}/recruitment/candidates/me`, { headers: authHeaders })
      .then((r) => r.json())
      .then((j) => {
        const profile = Array.isArray(j?.data) ? j.data[0] : null;
        if (!profile) return;
        setApplyFullName(profile.fullName || authUser.fullName || "");
        setApplyPhone(profile.phone || authUser.phone || "");
        setApplyEmail(profile.email || authUser.email || "");
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    setNotFound(false);

    // Component này KHÔNG remount khi điều hướng phía client giữa 2 tin tuyển dụng (cùng khớp
    // route /tuyen-dung/[id]) — chỉ jobId đổi. Thiếu reset này, "đã nộp hồ sơ thành công"
    // (applied=true) của tin TRƯỚC bị giữ lại khi bấm sang tin liên quan khác, khiến người dùng
    // bị chặn nộp hồ sơ cho tin mới dù chưa từng nộp.
    setShowApplyForm(false);
    setCvFile(null);
    setApplied(false);
    setApplying(false);
    setSubmitError(null);
    setLinkCopied(false);

    fetch(`${API_BASE}/recruitment/jobs/${jobId}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json?.data) setJob(json.data);
        else if (json === null) {} // đã set notFound ở trên
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    fetch(`${API_BASE}/recruitment/jobs/${jobId}/related`)
      .then((res) => res.json())
      .then((json) => setRelatedJobs(Array.isArray(json?.data) ? json.data : []))
      .catch(() => setRelatedJobs([]));
  }, [jobId]);

  const typeLabel = (type?: string | null) => sharedTypeLabel(type, t("jobs.fulltime"));
  const timeAgo = (dateStr?: string) => sharedTimeAgo(dateStr, t);

  // CV là bắt buộc và luôn là file thật gửi qua multipart — trước đây chỉ gửi tên file dạng chuỗi
  // (kể cả nút "Ứng tuyển nhanh" dùng chuỗi giả "ats-profile-cv.pdf"), khiến hồ sơ ATS không hề
  // có CV thật đính kèm. Giờ bắt buộc chọn file PDF thật mỗi lần ứng tuyển.
  const submitApplication = async (payload: { fullName: string; phone: string; email: string }, file: File) => {
    if (!job) return;
    setApplying(true);
    setSubmitError(null);
    try {
      const formData = new FormData();
      formData.append("jobId", job.id);
      formData.append("fullName", payload.fullName);
      formData.append("phone", payload.phone);
      formData.append("email", payload.email);
      formData.append("cv", file);

      const res = await authFetch(`${API_BASE}/recruitment/apply`, {
        method: "POST",
        headers: { ...authHeaders },
        body: formData,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || t("jobs.submitErrorGeneric"));
      setApplied(true);
      setShowApplyForm(false);
    } catch (err: any) {
      setSubmitError(err?.message || t("jobs.submitErrorGeneric"));
    } finally {
      setApplying(false);
    }
  };

  const handleApplyForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvFile) {
      setSubmitError(t("jobs.submitErrorGeneric"));
      return;
    }
    await submitApplication({ fullName: applyFullName, phone: applyPhone, email: applyEmail }, cvFile);
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  // Đọc window.location.href thẳng trong lúc render (thay vì trong useEffect) khiến HTML server
  // render (window undefined → "") khác với lần render đầu tiên trên client (window đã có → URL
  // thật) — lỗi hydration mismatch. Phải khởi tạo "" ở cả 2 phía, chỉ điền URL thật SAU KHI mount
  // xong (trong effect, chạy sau hydration).
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F6F9] font-sans selection:bg-[#1B3A8F] selection:text-white">
      <Header />

      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-5 py-3 rounded-sm shadow-xl text-sm font-semibold flex items-center gap-3 max-w-lg"
          >
            <span>{submitError}</span>
            <button onClick={() => setSubmitError(null)} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow pb-20 lg:pb-0">
        {/* BREADCRUMB */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-2 text-xs font-semibold text-gray-500">
            <Link href="/" className="hover:text-[#1B3A8F] transition-colors">{t("jobs.detailBreadcrumbHome")}</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <Link href="/tuyen-dung" className="hover:text-[#1B3A8F] transition-colors">{t("jobs.detailBreadcrumbList")}</Link>
            {job && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                <span className="text-[#0F1C47] truncate max-w-[320px]">{job.title}</span>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="max-w-6xl mx-auto px-6 py-32 text-center">
            <div className="w-10 h-10 border-2 border-[#1B3A8F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-400">{t("jobs.detailLoading")}</p>
          </div>
        ) : notFound || !job ? (
          <div className="max-w-6xl mx-auto px-6 py-32 text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
              <ImageOff className="w-9 h-9 text-gray-300" />
            </div>
            <h1 className="text-2xl font-bold text-[#0F1C47]">{t("jobs.detailNotFoundTitle")}</h1>
            <p className="text-sm text-gray-500 max-w-md mx-auto">{t("jobs.detailNotFoundDesc")}</p>
            <Link
              href="/tuyen-dung"
              className="inline-flex items-center gap-2 mt-2 px-7 py-3.5 bg-[#1B3A8F] hover:bg-[#0F1C47] text-white font-bold rounded-sm text-sm uppercase tracking-wide transition-colors"
            >
              {t("jobs.detailBackToList")}
            </Link>
          </div>
        ) : (
          <>
            {/* HERO */}
            <section className="relative bg-[#0F1C47] text-white overflow-hidden">
              <div className="absolute inset-0 bg-grid-navy opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0F1C47]/40 to-[#0F1C47]" />

              <div className="relative max-w-6xl mx-auto px-6 py-14 md:py-20 grid md:grid-cols-[1fr_320px] gap-10 items-center">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F1C47] bg-[#C9973C] px-3 py-1.5 rounded-sm uppercase tracking-wider">
                      <Briefcase className="w-3.5 h-3.5" /> {typeLabel(job.type)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 border border-white/15 px-3 py-1.5 rounded-sm uppercase tracking-wider">
                      <Building2 className="w-3.5 h-3.5 text-[#C9973C]" /> {job.department}
                    </span>
                  </div>

                  <h1 className="text-3xl md:text-5xl font-black leading-[1.1] max-w-2xl">{job.title}</h1>

                  <p className="text-white/60 text-sm font-medium flex items-center gap-2">
                    <Clock3 className="w-4 h-4 text-[#C9973C]" />
                    {t("jobs.detailPostedLabel")} {timeAgo(job.createdAt)}
                    {job.deadline && (
                      <>
                        <span className="text-white/30">•</span>
                        <CalendarClock className="w-4 h-4 text-[#C9973C]" />
                        {t("jobs.detailDeadlineLabel")} {new Date(job.deadline).toLocaleDateString("vi-VN")}
                      </>
                    )}
                  </p>
                </div>

                <div className="justify-self-center md:justify-self-end w-full">
                  {job.imageUrl ? (
                    <div className="relative w-full h-44 md:h-48 rounded-sm border border-white/10 shadow-2xl shadow-black/40 overflow-hidden">
                      <Image
                        src={jobImageUrl(job.imageUrl) ?? ""}
                        alt={job.title}
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

            {/* STAT BAR */}
            <section className="bg-white border-b border-gray-100">
              <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
                {[
                  { icon: MapPin, label: t("jobs.modalLocationLabel"), value: locationLabel(job.location) },
                  { icon: DollarSign, label: t("jobs.modalSalaryLabel"), value: job.salary || "—" },
                  { icon: Briefcase, label: t("jobs.detailTypeLabel"), value: typeLabel(job.type) },
                  { icon: Building2, label: t("jobs.detailDepartmentLabel"), value: job.department },
                ].map((s, i) => (
                  <div key={i} className="py-6 px-4 md:px-6 flex items-start gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-sm bg-[#F4F6F9] flex items-center justify-center">
                      <s.icon className="w-4.5 h-4.5 text-[#C9973C]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">{s.label.replace(/:$/, "")}</p>
                      <p className="text-sm font-bold text-[#0F1C47] truncate stat-figure">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* MAIN CONTENT */}
            <section className="max-w-6xl mx-auto px-6 py-14 grid lg:grid-cols-[1fr_360px] gap-10 items-start">
              {/* LEFT: description / requirements / benefits */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="space-y-6">
                <motion.div variants={revealUp} className="bg-white p-7 md:p-9 rounded-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 shrink-0 bg-gradient-to-br from-[#1B3A8F] to-[#0F1C47] text-white rounded-sm flex items-center justify-center shadow-md shadow-[#1B3A8F]/20">
                      <FileText className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <h2 className="font-bold text-[#0F1C47] text-lg">{t("jobs.modalDescTitle")}</h2>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{job.description}</p>
                </motion.div>

                {job.requirements && (
                  <motion.div variants={revealUp} className="bg-white p-7 md:p-9 rounded-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-11 h-11 shrink-0 bg-gradient-to-br from-[#1B3A8F] to-[#0F1C47] text-white rounded-sm flex items-center justify-center shadow-md shadow-[#1B3A8F]/20">
                        <ClipboardList className="w-5 h-5 stroke-[1.5]" />
                      </div>
                      <h2 className="font-bold text-[#0F1C47] text-lg">{t("jobs.modalReqTitle")}</h2>
                    </div>
                    <ul className="space-y-3">
                      {job.requirements.split("\n").filter(Boolean).map((req: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
                          <CheckCircle2 className="w-4.5 h-4.5 text-[#1B3A8F] shrink-0 mt-0.5" />
                          {req.replace(/^[-•]\s*/, "")}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {job.benefits && (
                  <motion.div variants={revealUp} className="bg-white p-7 md:p-9 rounded-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-11 h-11 shrink-0 bg-gradient-to-br from-[#C9973C] to-[#9c7527] text-white rounded-sm flex items-center justify-center shadow-md shadow-[#C9973C]/20">
                        <Award className="w-5 h-5 stroke-[1.5]" />
                      </div>
                      <h2 className="font-bold text-[#0F1C47] text-lg">{t("jobs.modalBenefitsTitle")}</h2>
                    </div>
                    <ul className="grid sm:grid-cols-2 gap-3">
                      {job.benefits.split("\n").filter(Boolean).map((ben: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
                          <Award className="w-4.5 h-4.5 text-[#C9973C] shrink-0 mt-0.5" />
                          {ben.replace(/^[-•]\s*/, "")}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* TRUST STRIP */}
                <motion.div variants={revealUp} className="bg-[#0F1C47] rounded-sm p-7 md:p-9 grid sm:grid-cols-[1fr_auto] gap-6 items-center">
                  <div className="flex flex-wrap gap-8">
                    {[
                      { n: "1.000+", label: t("jobs.statBusinesses") },
                      { n: "500+", label: t("jobs.statCandidates") },
                      { n: "48h", label: t("jobs.statResponse") },
                    ].map((s, i) => (
                      <div key={i}>
                        <p className="text-2xl font-black text-white stat-figure">{s.n}</p>
                        <p className="text-xs text-white/50 font-semibold uppercase tracking-wide">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <a
                    href="tel:19000380"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#C9973C] hover:bg-[#D4AF37] text-[#0F1C47] font-bold rounded-sm text-sm whitespace-nowrap transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" /> Hotline 1900 0380
                  </a>
                </motion.div>
              </motion.div>

              {/* RIGHT SIDEBAR: apply card (sticky) */}
              <div id="apply-card" className="lg:sticky lg:top-24 space-y-4 scroll-mt-24">
                <div className="bg-white rounded-sm border border-gray-100 overflow-hidden">
                  <div className="bg-[#0F1C47] px-6 py-5">
                    {applied ? (
                      <p className="text-white font-bold text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> {t("jobs.modalAppliedTitle")}</p>
                    ) : (
                      <>
                        <h3 className="font-bold text-white text-base">{t("jobs.detailApplyCardTitle")}</h3>
                        <p className="text-xs text-white/60 mt-1">{t("jobs.detailApplyCardDesc")}</p>
                      </>
                    )}
                  </div>

                  <div className="p-6">
                    {applied ? (
                      <div className="text-center py-4 space-y-3">
                        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-500">
                          <CheckCircle className="w-7 h-7" />
                        </div>
                        <p className="text-sm text-gray-600">
                          {t("jobs.modalAppliedDescPrefix")} <strong className="text-[#1B3A8F]">{job.title}</strong> {t("jobs.modalAppliedDescSuffix")}
                        </p>
                      </div>
                    ) : (!authUser || (authUser.role !== "MEMBER" && authUser.role !== "ADMIN")) ? (
                      <AuthGateNotice
                        authUser={authUser}
                        requiredRole="MEMBER"
                        title={t("jobs.gateApplyTitle")}
                        desc={t("jobs.gateApplyDesc")}
                        loginLabel={t("jobs.gateLoginBtn")}
                      />
                    ) : !showApplyForm ? (
                      <button
                        onClick={() => setShowApplyForm(true)}
                        className="w-full px-6 py-3.5 bg-[#1B3A8F] hover:bg-[#0F1C47] text-white font-bold rounded-sm text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" /> {t("jobs.modalUploadCvBtn")}
                      </button>
                    ) : (
                      <form onSubmit={handleApplyForm} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-[#0F1C47] text-sm">{t("jobs.modalFormTitle")}</h4>
                          <button
                            type="button"
                            onClick={() => setShowApplyForm(false)}
                            className="text-xs font-bold text-gray-500 hover:text-gray-700 underline"
                          >
                            {t("jobs.modalCloseForm")}
                          </button>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelFullName")}</label>
                          <input value={applyFullName} onChange={(e) => setApplyFullName(e.target.value)} type="text" required placeholder={t("jobs.fullNamePlaceholder")} className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1B3A8F]/20" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelPhoneStar")}</label>
                          <input value={applyPhone} onChange={(e) => setApplyPhone(e.target.value)} type="tel" required placeholder={t("jobs.phonePlaceholder")} pattern="^(0|\+84)(3[2-9]|5[25689]|7[0678]|8[1-9]|9[0-9])[0-9]{7}$" title={t("jobs.phoneFormatHint")} className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1B3A8F]/20" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-700 block mb-1">Email *</label>
                          <input value={applyEmail} onChange={(e) => setApplyEmail(e.target.value)} type="email" required placeholder={t("jobs.modalEmailPlaceholder")} className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1B3A8F]/20" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.sec7Title")}</label>
                          <div className="border-2 border-dashed border-gray-300 rounded-sm p-4 flex flex-col items-center justify-center gap-2 hover:border-[#1B3A8F] bg-[#F8F9FA] transition-colors cursor-pointer relative overflow-hidden">
                            <Upload className="w-6 h-6 text-[#1B3A8F]" />
                            <span className="text-xs font-bold text-gray-700">{t("jobs.modalUploadCta")}</span>
                            <input
                              type="file"
                              accept=".pdf"
                              required
                              onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            {cvFile && <span className="text-xs font-bold text-[#1B3A8F] bg-blue-50 px-2 py-1 rounded-sm border border-blue-200">{cvFile.name}</span>}
                          </div>
                        </div>
                        <button type="submit" disabled={applying} className="w-full px-6 py-2.5 bg-[#1B3A8F] hover:bg-[#0F1C47] disabled:opacity-60 text-white font-bold rounded-sm text-sm">
                          {t("jobs.modalSubmitPdf")}
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* SHARE CARD */}
                <div className="bg-white rounded-sm border border-gray-100 p-5">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                    <Share2 className="w-3.5 h-3.5" /> {t("jobs.detailShareTitle")}
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
                      {linkCopied ? t("jobs.detailLinkCopied") : t("jobs.detailCopyLink")}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* RELATED JOBS */}
            <section className="max-w-6xl mx-auto px-6 pb-16">
              <div className="border-t border-gray-200 pt-10 flex items-end justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#0F1C47]">{t("jobs.relatedJobsTitle")}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t("jobs.relatedJobsSubtitle")}</p>
                </div>
                <Link href="/tuyen-dung" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1B3A8F] hover:text-[#C9973C] transition-colors shrink-0">
                  {t("jobs.detailBackToList")} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {relatedJobs.length === 0 ? (
                <p className="text-sm text-gray-400">{t("jobs.relatedJobsEmpty")}</p>
              ) : (
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {relatedJobs.map((rj) => (
                    <motion.div key={rj.id} variants={revealUp}>
                      <Link
                        href={`/tuyen-dung/${rj.id}`}
                        className="group bg-white p-5 rounded-sm border border-gray-100 border-t-2 border-t-transparent hover:border-t-[#C9973C] hover:shadow-lg transition-all block"
                      >
                        <div className="relative w-full h-28 rounded-sm overflow-hidden bg-[#F4F6F9] border border-gray-100 flex items-center justify-center mb-4">
                          {rj.imageUrl ? (
                            <Image src={jobImageUrl(rj.imageUrl) ?? ""} alt={rj.title} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <ImageOff className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <h3 className="font-bold text-[#1B3A8F] group-hover:text-[#C9973C] transition-colors text-sm leading-snug line-clamp-2">
                          {rj.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#C9973C]" /> {locationLabel(rj.location)}</p>
                        <p className="text-xs font-bold text-[#1B3A8F] mt-2">{rj.salary || "—"}</p>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </section>

            {/* Thanh CTA dính đáy — chỉ hiện trên mobile/tablet (ẩn từ lg trở lên vì sidebar đã
                sticky hiện sẵn). Nút "Ứng Tuyển" nằm sâu bên dưới mô tả/yêu cầu công việc, người
                dùng phải cuộn qua rất nhiều nội dung mới thấy trên màn hình nhỏ. */}
            {!applied && (
              <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 truncate">{job.department}</p>
                  <p className="text-sm font-bold text-[#1B3A8F] truncate">{job.salary || t("jobs.modalSalaryLabel")}</p>
                </div>
                <a
                  href="#apply-card"
                  className="shrink-0 flex items-center gap-2 px-6 py-3 bg-[#1B3A8F] hover:bg-[#0F1C47] text-white font-bold rounded-sm text-sm transition-colors"
                >
                  <Upload className="w-4 h-4" /> {t("jobs.viewApply")}
                </a>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
