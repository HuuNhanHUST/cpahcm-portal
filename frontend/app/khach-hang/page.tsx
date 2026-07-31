"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import RoleGuard from "../../components/RoleGuard";
import Image from "next/image";
import {
  Building2,
  Upload,
  FileText,
  Download,
  Trash2,
  ShieldAlert,
  Clock,
  CheckCircle2,
  FolderOpen,
  UploadCloud,
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLanguage } from "../../context/LanguageContext";
import {
  API_BASE,
  useAuthUser,
  DOCUMENT_CATEGORIES,
  categoryLabel,
  STATUS_META,
  formatFileSize,
  formatDate,
  downloadDocumentFile,
} from "./shared";
import { authFetch, refreshAccessToken } from "../../lib/authFetch";

/**
 * Tách riêng khỏi ClientPortalPage vì lý do timing: RoleGuard (component cha) không mount phần
 * children (bao gồm section này) cho tới khi xác định xong quyền truy cập (status "checking" →
 * "authorized"), nhưng useScroll({ target: heroRef }) ở ClientPortalPage lại chạy NGAY từ lần
 * render đầu tiên — lúc đó heroRef.current vẫn null vì section chưa từng vào DOM, khiến Motion
 * ném lỗi runtime "Target ref is defined but not hydrated". Đưa heroRef + useScroll vào 1
 * component riêng chỉ mount SAU KHI RoleGuard cho phép thì ref sẽ luôn gắn xong trước khi
 * useScroll's layout effect chạy (React attach ref trong commit phase, trước layout effect).
 */
function HeroSection({
  t, mounted, canUseDocuments, hasCompany, documentsCount, pendingCount, completedCount,
}: {
  t: (key: string) => string;
  mounted: boolean;
  canUseDocuments: boolean;
  hasCompany: boolean;
  documentsCount: number;
  pendingCount: number;
  completedCount: number;
}) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);

  return (
    <section ref={heroRef} className="relative h-screen min-h-[560px] flex flex-col overflow-hidden bg-[#0F1C47]">
      <motion.div style={{ y: bgY }} className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=2069&auto=format&fit=crop"
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
            <Building2 className="w-4 h-4 text-[#C9973C]" />
            <span className="text-[#C9973C] text-xs font-bold uppercase tracking-[0.2em]">{t("clientPortal.heroBadge")}</span>
          </div>

          <h1 className="text-[clamp(2.25rem,5.5vw,4.5rem)] font-black leading-[1.05] text-white mb-6 tracking-tight max-w-4xl">
            {t("clientPortal.title")}
          </h1>

          <p className="text-blue-200/80 text-base md:text-lg max-w-xl leading-relaxed font-light">
            {t("clientPortal.subtitle")}
          </p>
        </motion.div>
      </div>

      {canUseDocuments && hasCompany && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={mounted ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2, duration: 0.4 }}
          className="relative z-10 w-full border-t border-white/10"
        >
          <div className="grid grid-cols-3 divide-x divide-white/10 bg-white/5 backdrop-blur-md">
            {[
              { n: documentsCount, label: t("clientPortal.statTotal"), icon: FolderOpen },
              { n: pendingCount, label: t("clientPortal.statPending"), icon: Clock },
              { n: completedCount, label: t("clientPortal.statCompleted"), icon: CheckCircle2 },
            ].map((stat, i) => (
              <div key={i} className="py-6 lg:py-7 px-4 text-center">
                <stat.icon className="w-5 h-5 text-[#C9973C] mx-auto mb-2 opacity-80" />
                <div className="text-2xl lg:text-3xl font-black text-white mb-1">{stat.n}</div>
                <div className="text-[10px] md:text-[11px] text-blue-300 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </section>
  );
}

export default function ClientPortalPage() {
  const { t } = useLanguage();
  const { authUser, authHeaders, authMounted } = useAuthUser();
  const [mounted, setMounted] = useState(false);

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0].value);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    // Access token chỉ sống 15 phút — làm mới định kỳ trong lúc trang còn mở để tránh Cổng
    // Khách Hàng (phiên làm việc thường kéo dài khi soạn/tải nhiều chứng từ) bị Unauthorized.
    const intervalId = setInterval(() => { refreshAccessToken(); }, 10 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  const canUseDocuments = authUser && (authUser.role === "BUSINESS" || authUser.role === "ADMIN");
  const hasCompany = !!authUser?.companyId || authUser?.role === "ADMIN";

  const loadDocuments = useCallback(async () => {
    if (!canUseDocuments) return;
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/documents`);
      const json = await res.json();
      setDocuments(Array.isArray(json?.data) ? json.data : []);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseDocuments, authUser?.id]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const handleUpload = async () => {
    setFormError("");
    if (!file) {
      setFormError(t("clientPortal.errorNoFile"));
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("category", category);
      if (note) formData.append("note", note);
      formData.append("file", file);

      const res = await authFetch(`${API_BASE}/documents`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json?.message || t("clientPortal.errorGeneric"));
        return;
      }
      setNote("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadDocuments();
    } catch {
      setFormError(t("clientPortal.errorGeneric"));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      await downloadDocumentFile(doc.id, doc.fileName);
    } catch (e: any) {
      alert(e?.message || t("clientPortal.errorGeneric"));
    }
  };

  const handleDownloadResult = async (doc: any) => {
    try {
      await downloadDocumentFile(doc.id, doc.resultFileName || "ket-qua.pdf", "result-file");
    } catch (e: any) {
      alert(e?.message || t("clientPortal.errorGeneric"));
    }
  };

  const handleDelete = async (doc: any) => {
    if (!window.confirm(t("clientPortal.deleteConfirm"))) return;
    const res = await authFetch(`${API_BASE}/documents/${doc.id}`, { method: "DELETE" });
    if (res.ok) loadDocuments();
  };

  const pendingCount = documents.filter((d) => d.status === "PENDING").length;
  const completedCount = documents.filter((d) => d.status === "COMPLETED").length;

  const fadeIn: any = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <RoleGuard
      allowedRoles={["BUSINESS", "ADMIN"]}
      deniedTitle="Cổng Khách Hàng"
      deniedDesc="Trang này chỉ dành cho tài khoản Doanh nghiệp (BUSINESS) đã đăng ký dịch vụ với CPA HCM hoặc Quản trị viên. Vui lòng đăng nhập bằng tài khoản phù hợp."
    >
    <div className="flex flex-col min-h-screen bg-[#F4F6F9] font-sans selection:bg-[#1B3A8F] selection:text-white">
      <Header />

      <main className="flex-grow">
        <HeroSection
          t={t}
          mounted={mounted}
          canUseDocuments={!!canUseDocuments}
          hasCompany={hasCompany}
          documentsCount={documents.length}
          pendingCount={pendingCount}
          completedCount={completedCount}
        />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
          {!authMounted ? null : !hasCompany ? (
            <div className="bg-white p-10 lg:p-14 rounded-sm border border-gray-100 text-center space-y-4 max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-[#0F1C47]">{t("clientPortal.noCompanyTitle")}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{t("clientPortal.noCompanyDesc")}</p>
              <a href="/lien-he" className="inline-flex items-center gap-2 px-6 py-3 bg-[#C9973C] hover:bg-[#D4AF37] text-[#0F1C47] font-bold rounded-sm text-sm uppercase tracking-wide">
                {t("clientPortal.contactLink")}
              </a>
            </div>
          ) : (
            <>
              {authUser?.role === "ADMIN" && (
                <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-sm">
                  {t("clientPortal.adminNotice")}
                </motion.div>
              )}

              {/* Upload form */}
              <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-white p-6 lg:p-8 rounded-sm border border-gray-100 border-t-2 border-t-[#C9973C]">
                <h2 className="font-bold text-[#0F1C47] text-lg mb-6 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#F4F6F9] flex items-center justify-center shrink-0">
                    <Upload className="w-4.5 h-4.5 text-[#C9973C]" />
                  </div>
                  {t("clientPortal.uploadTitle")}
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      const dropped = e.dataTransfer.files?.[0];
                      if (dropped) setFile(dropped);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`lg:col-span-2 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-sm px-4 py-8 text-center cursor-pointer transition-colors ${
                      dragActive ? "border-[#C9973C] bg-[#FDF7EC]" : "border-gray-200 bg-[#F8F9FA] hover:border-gray-300"
                    }`}
                  >
                    <UploadCloud className={`w-8 h-8 ${file ? "text-[#C9973C]" : "text-gray-300"}`} />
                    {file ? (
                      <p className="text-sm font-bold text-[#0F1C47] break-all px-2">{file.name}</p>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-gray-600">{t("clientPortal.fileLabel")}</p>
                        <p className="text-xs text-gray-400">{t("clientPortal.fileHint")}</p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.xls,.xlsx,.doc,.docx,image/jpeg,image/png"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </div>

                  <div className="lg:col-span-3 space-y-4">
                    <div>
                      <label className="text-sm font-bold text-gray-700 block mb-1.5">{t("clientPortal.categoryLabel")}</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-2.5 text-sm focus:border-[#1B3A8F] outline-none"
                      >
                        {DOCUMENT_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-gray-700 block mb-1.5">{t("clientPortal.noteLabel")}</label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder={t("clientPortal.notePlaceholder")}
                        className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-2.5 text-sm focus:border-[#1B3A8F] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {formError && <p className="text-sm text-red-600 mt-4">{formError}</p>}
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="mt-6 inline-flex items-center gap-2 px-7 py-3.5 bg-[#C9973C] hover:bg-[#D4AF37] text-[#0F1C47] font-bold rounded-sm text-sm uppercase tracking-wide disabled:opacity-50 transition-colors"
                >
                  <Upload className="w-4 h-4" /> {uploading ? t("clientPortal.uploading") : t("clientPortal.uploadBtn")}
                </button>
              </motion.div>

              {/* Documents list */}
              <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-white rounded-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="font-bold text-[#0F1C47] text-lg">{t("clientPortal.listTitle")} ({documents.length})</h2>
                </div>
                {loading ? (
                  <p className="p-12 text-sm text-gray-400 italic text-center">{t("clientPortal.loading")}</p>
                ) : documents.length === 0 ? (
                  <div className="p-16 text-center space-y-3">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto" />
                    <p className="text-sm text-gray-500">{t("clientPortal.emptyList")}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {documents.map((doc) => {
                      const meta = STATUS_META[doc.status] || STATUS_META.PENDING;
                      return (
                        <div key={doc.id} className="p-5 flex items-center justify-between gap-4 hover:bg-gray-50/60 transition-colors">
                          <div className="min-w-0 flex items-start gap-3">
                            <div className="w-10 h-10 rounded-sm bg-[#F4F6F9] flex items-center justify-center shrink-0">
                              <FileText className="w-4.5 h-4.5 text-[#1B3A8F]" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[#0F1C47] text-sm truncate">{doc.fileName}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {categoryLabel(doc.category)} · {formatFileSize(doc.fileSize)} · {doc.uploadedBy?.fullName || "—"} · {formatDate(doc.createdAt)}
                              </p>
                              {doc.status === "REJECTED" && doc.reviewNote && (
                                <p className="text-xs text-red-600 mt-1">{t("clientPortal.rejectReasonLabel")}: {doc.reviewNote}</p>
                              )}
                              {doc.resultFileUrl && (
                                <button
                                  onClick={() => handleDownloadResult(doc)}
                                  className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline mt-1.5"
                                >
                                  <FileText className="w-3.5 h-3.5" /> Tải kết quả: {doc.resultFileName}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${meta.className}`}>{meta.label}</span>
                            <button onClick={() => handleDownload(doc)} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title={t("clientPortal.downloadBtn")}>
                              <Download className="w-4 h-4" />
                            </button>
                            {doc.status === "PENDING" && (
                              <button onClick={() => handleDelete(doc)} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title={t("clientPortal.deleteBtn")}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
    </RoleGuard>
  );
}
