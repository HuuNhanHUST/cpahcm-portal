"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import {
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  ImageOff,
  Link2,
  Share2,
  ShieldCheck,
  Award,
} from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";
import { API_BASE, serviceImageUrl, Service } from "../shared";

export default function ServiceDetailClient({ service, relatedServices }: { service: Service; relatedServices: Service[] }) {
  const { t } = useLanguage();
  const [linkCopied, setLinkCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Đọc window.location.href thẳng trong lúc render (thay vì trong useEffect) khiến HTML server
  // render (window undefined → "") khác với lần render đầu tiên trên client (window đã có → URL
  // thật) — lỗi hydration mismatch. Phải khởi tạo "" ở cả 2 phía, chỉ điền URL thật SAU KHI mount
  // xong (trong effect, chạy sau hydration).
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  // Next.js App Router KHÔNG remount component này khi điều hướng phía client giữa 2 dịch vụ
  // (cùng khớp route /dich-vu/[slug]) — chỉ props (service) thay đổi. Thiếu effect này, trạng
  // thái "đã gửi yêu cầu tư vấn thành công" (submitted=true) của dịch vụ TRƯỚC bị giữ lại khi bấm
  // sang dịch vụ liên quan khác, khiến dịch vụ mới hiện nhầm "Đã gửi yêu cầu".
  useEffect(() => {
    setSubmitted(false);
    setSubmitError(null);
    setSubmitting(false);
    setLinkCopied(false);
  }, [service.id]);

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/service-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: (form.querySelector('[name="companyName"]') as HTMLInputElement)?.value || "",
          taxCode: (form.querySelector('[name="taxCode"]') as HTMLInputElement)?.value || undefined,
          contactName: (form.querySelector('[name="contactName"]') as HTMLInputElement)?.value || "",
          phone: (form.querySelector('[name="phone"]') as HTMLInputElement)?.value || "",
          email: (form.querySelector('[name="email"]') as HTMLInputElement)?.value || "",
          address: (form.querySelector('[name="address"]') as HTMLInputElement)?.value || undefined,
          service: service.title,
          message: (form.querySelector('[name="message"]') as HTMLTextAreaElement)?.value || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || t("services.submitErrorGeneric"));
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message || t("services.submitErrorGeneric"));
    } finally {
      setSubmitting(false);
    }
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
            <Link href="/dich-vu" className="hover:text-[#1B3A8F] transition-colors">{t("services.detailBreadcrumbList")}</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-[#0F1C47] truncate max-w-[320px]">{service.title}</span>
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
                  {service.category}
                </span>
                {service.tag && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 border border-white/15 px-3 py-1.5 rounded-sm uppercase tracking-wider">
                    {service.tag}
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-black leading-[1.1] max-w-2xl">{service.title}</h1>
              <p className="text-white/70 text-base max-w-xl leading-relaxed">{service.shortDesc}</p>
            </div>

            <div className="justify-self-center md:justify-self-end w-full">
              {service.imageUrl ? (
                <div className="relative w-full h-44 md:h-48 rounded-sm border border-white/10 shadow-2xl shadow-black/40 overflow-hidden">
                  <Image
                    src={serviceImageUrl(service.imageUrl) ?? ""}
                    alt={service.title}
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
        <section className="max-w-6xl mx-auto px-6 py-14 grid lg:grid-cols-[1fr_360px] gap-10 items-start">
          <div className="space-y-6">
            {service.longDescription && (
              <div className="bg-white p-7 md:p-9 rounded-sm border border-gray-100">
                <div className="prose-cpa" dangerouslySetInnerHTML={{ __html: service.longDescription }} />
              </div>
            )}

            {service.features.length > 0 && (
              <div className="bg-white p-7 md:p-9 rounded-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 shrink-0 bg-gradient-to-br from-[#1B3A8F] to-[#0F1C47] text-white rounded-sm flex items-center justify-center shadow-md shadow-[#1B3A8F]/20">
                    <CheckCircle2 className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <h2 className="font-bold text-[#0F1C47] text-lg">{t("services.includes")}</h2>
                </div>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {service.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
                      <CheckCircle2 className="w-4.5 h-4.5 text-[#1B3A8F] shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {service.deliverables.length > 0 && (
              <div className="bg-white p-7 md:p-9 rounded-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 shrink-0 bg-gradient-to-br from-[#C9973C] to-[#9c7527] text-white rounded-sm flex items-center justify-center shadow-md shadow-[#C9973C]/20">
                    <Award className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <h2 className="font-bold text-[#0F1C47] text-lg">{t("services.deliverables")}</h2>
                </div>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {service.deliverables.map((d, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
                      <Award className="w-4.5 h-4.5 text-[#C9973C] shrink-0 mt-0.5" /> {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* SIDEBAR: quote request */}
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="bg-white rounded-sm border border-gray-100 overflow-hidden">
              <div className="bg-[#0F1C47] px-6 py-5">
                <h3 className="font-bold text-white text-base">{t("services.getQuote")}</h3>
                <p className="text-xs text-white/60 mt-1">{t("services.quoteDesc")}</p>
              </div>
              <div className="p-6">
                {submitted ? (
                  <div className="text-center py-4 space-y-3">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-500">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <p className="text-sm text-gray-600">{t("services.quoteSuccessDesc")}</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitQuote} className="space-y-3">
                    <input name="companyName" type="text" required placeholder={t("services.formCompanyPlaceholder")} className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-2.5 text-sm outline-none" />
                    <input name="taxCode" type="text" placeholder={t("services.formTaxCodePlaceholder")} className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-2.5 text-sm outline-none" />
                    <input name="contactName" type="text" required placeholder={t("services.formContactPlaceholder")} className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-2.5 text-sm outline-none" />
                    <input name="phone" type="tel" required placeholder={t("services.formPhonePlaceholder")} pattern="^(0|\+84)(3[2-9]|5[25689]|7[0678]|8[1-9]|9[0-9])[0-9]{7}$" title={t("jobs.phoneFormatHint")} className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-2.5 text-sm outline-none" />
                    <input name="email" type="email" required placeholder={t("services.formEmailPlaceholder")} className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-2.5 text-sm outline-none" />
                    <input name="address" type="text" placeholder={t("services.formAddressPlaceholder")} className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-2.5 text-sm outline-none" />
                    <textarea name="message" rows={3} placeholder={t("services.formMessagePlaceholder")} className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-2.5 text-sm outline-none" />
                    {submitError && <p className="text-xs font-bold text-red-600">{submitError}</p>}
                    <button type="submit" disabled={submitting} className="w-full px-6 py-3 bg-[#C9973C] hover:bg-[#D4AF37] disabled:opacity-60 text-[#0F1C47] font-bold rounded-sm text-sm transition-colors">
                      {submitting ? t("services.formSubmitting") : t("services.getQuote")}
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="bg-white rounded-sm border border-gray-100 p-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                <Share2 className="w-3.5 h-3.5" /> {t("services.shareTitle")}
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
        {relatedServices.length > 0 && (
          <section className="max-w-6xl mx-auto px-6 pb-16">
            <div className="border-t border-gray-200 pt-10">
              <h2 className="text-xl font-bold text-[#0F1C47]">{t("services.relatedTitle")}</h2>
              <p className="text-sm text-gray-500 mt-1 mb-6">{t("services.relatedSubtitle")}</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                {relatedServices.map((rs) => (
                  <Link key={rs.id} href={`/dich-vu/${rs.slug}`} className="group bg-white p-5 rounded-sm border border-gray-100 border-t-2 border-t-transparent hover:border-t-[#C9973C] hover:shadow-lg transition-all block">
                    <div className="relative w-full h-28 rounded-sm overflow-hidden bg-[#F4F6F9] border border-gray-100 flex items-center justify-center mb-4">
                      {rs.imageUrl ? (
                        <Image src={serviceImageUrl(rs.imageUrl) ?? ""} alt={rs.title} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
                      ) : (
                        <ImageOff className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <h3 className="font-bold text-[#1B3A8F] group-hover:text-[#C9973C] transition-colors text-sm leading-snug line-clamp-2">{rs.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{rs.shortDesc}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
