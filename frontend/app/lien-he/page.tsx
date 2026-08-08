"use client";

import React, { useState, useEffect, useRef } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Image from "next/image";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, AlertCircle, Headset, CalendarClock, ShieldCheck, Zap, Gift, ChevronDown } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { API_BASE } from "../../lib/config";
import { useLanguage } from "../../context/LanguageContext";

// Hệ thống chi nhánh thật — đồng bộ với components/Footer.tsx (BRANCHES). Tên thành phố/địa chỉ
// KHÔNG dịch (giữ nguyên tên riêng/địa chỉ thật dù đổi ngôn ngữ) — chỉ nhãn "(Trụ sở)" mới dịch.
const BRANCHES = [
  { city: "TP.HCM", isHq: true, address: "228 Phan Văn Hân, P.17, Q. Bình Thạnh" },
  { city: "TP. Thủ Đức", isHq: false, address: "61/1 Đường số 23, P. Hiệp Bình Chánh" },
  { city: "Hà Nội", isHq: false, address: "1A Ngõ 140 Trần Duy Hưng, Cầu Giấy" },
  { city: "Bình Phước", isHq: false, address: "KCN Minh Hưng – Hàn Quốc, Chơn Thành" },
  { city: "Đắk Nông", isHq: false, address: "201 đường 23/3, Thị xã Gia Nghĩa" },
];

// Nhúng Google Maps không cần API key — dùng dạng "?q=<địa chỉ>&output=embed".
const MAP_EMBED_SRC =
  "https://www.google.com/maps?q=" +
  encodeURIComponent("61/1 Đường số 23, Phường Hiệp Bình, TP.HCM, Việt Nam") +
  "&output=embed";

export default function ContactPage() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);

  // Giá trị "service" gửi lên backend giữ CỐ ĐỊNH tiếng Việt bất kể ngôn ngữ hiển thị — nhân
  // viên CPA HCM đọc lead luôn bằng tiếng Việt, chỉ nhãn hiển thị trên form mới đổi theo t().
  const QUICK_CONTACTS = [
    { icon: Phone, label: t("contact.hotline"), value: "1900 0380", href: "tel:19000380" },
    { icon: Mail, label: t("contact.emailConsult"), value: "info@cpahcm.com.vn", href: "mailto:info@cpahcm.com.vn" },
    { icon: CalendarClock, label: t("contact.bookConsult"), value: t("contact.fillFormBelow"), href: "#contact-form" },
  ];

  const COMMITMENTS = [
    { icon: Zap, title: t("contact.commit1Title"), desc: t("contact.commit1Desc") },
    { icon: Gift, title: t("contact.commit2Title"), desc: t("contact.commit2Desc") },
    { icon: ShieldCheck, title: t("contact.commit3Title"), desc: t("contact.commit3Desc") },
  ];

  const FAQS = [
    { q: t("contact.faq1Q"), a: t("contact.faq1A") },
    { q: t("contact.faq2Q"), a: t("contact.faq2A") },
    { q: t("contact.faq3Q"), a: t("contact.faq3A") },
    { q: t("contact.faq4Q"), a: t("contact.faq4A") },
    { q: t("contact.faq5Q"), a: t("contact.faq5A") },
  ];

  const [form, setForm] = useState({
    companyName: "",
    taxCode: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    service: "Kiểm toán Báo cáo tài chính",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/admin/service-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName || form.name,
          taxCode: form.taxCode || undefined,
          contactName: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address || undefined,
          service: form.service,
          message: form.message,
        }),
      });

      if (res.ok) {
        // Chỉ tải canvas-confetti (thư viện trang trí, không cần thiết cho luồng chính) đúng lúc
        // gửi form thành công — tránh gộp vào bundle ban đầu của trang cho một hiệu ứng hiếm khi
        // xảy ra (chỉ 1 lần/lượt gửi form).
        import("canvas-confetti").then(({ default: confetti }) => {
          confetti({
            particleCount: 150,
            spread: 80,
            colors: ["#0F1C47", "#C9973C", "#ffffff"],
          });
        });
        setSubmitted(true);
        setForm({
          companyName: "",
          taxCode: "",
          name: "",
          phone: "",
          email: "",
          address: "",
          service: "Kiểm toán Báo cáo tài chính",
          message: "",
        });
      } else {
        const json = await res.json();
        setErrorMsg(json.message || t("contact.errorDefault"));
      }
    } catch (err) {
      // Mất mạng/không kết nối được server — PHẢI báo lỗi thật, không được giả lập thành công
      // (bug trước đây: hiện confetti + "đã gửi" dù request chưa hề tới server, khiến khách hàng
      // tưởng đã gửi yêu cầu tư vấn thành công trong khi CPA HCM không nhận được gì cả).
      setErrorMsg(t("contact.errorNetwork"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F8FA] font-sans selection:bg-[#1B3A8F] selection:text-white">
      <Header />

      {/* Hero — h-screen, cùng chuẩn thiết kế /dien-dan, /khach-hang */}
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
              <Headset className="w-4 h-4 text-[#C9973C]" />
              <span className="text-[#C9973C] text-xs font-bold uppercase tracking-[0.2em]">{t("contact.heroBadge")}</span>
            </div>

            <h1 className="text-[clamp(2.25rem,5.5vw,4.5rem)] font-black leading-[1.05] text-white mb-6 tracking-tight max-w-4xl">
              {t("contact.heroTitle")}
            </h1>

            <p className="text-blue-200/80 text-base md:text-lg max-w-xl leading-relaxed font-light">
              {t("contact.heroSubtitle")}
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={mounted ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2, duration: 0.4 }}
          className="relative z-10 w-full border-t border-white/10"
        >
          <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-white/10 bg-white/5 backdrop-blur-md">
            {BRANCHES.map((b) => (
              <div key={b.city} className="py-6 px-4 text-center">
                <MapPin className="w-4 h-4 text-[#C9973C] mx-auto mb-2 opacity-80" />
                <div className="text-xs font-bold text-white mb-1">
                  {b.city}{b.isHq ? ` ${t("contact.branchHqSuffix")}` : ""}
                </div>
                <div className="text-[10px] text-blue-300 leading-snug">{b.address}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Nhiều cách liên hệ nhanh — lối vào trực quan ngay dưới hero thay vì bắt khách phải đọc
          hết sidebar mới thấy số hotline, khớp cách các trang khác (Dịch vụ/Đào tạo) đều có 1
          dải nội dung ngang ngay sau hero thay vì nhảy thẳng vào khối 2 cột dày đặc chữ. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border border-gray-200 shadow-lg p-2">
          {QUICK_CONTACTS.map((c) => (
            <a
              key={c.label}
              href={c.href}
              className="group flex items-center gap-4 p-5 hover:bg-[#F7F8FA] transition-colors"
            >
              <div className="w-12 h-12 bg-[#0F1C47] group-hover:bg-[#C9973C] flex items-center justify-center shrink-0 transition-colors">
                <c.icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{c.label}</p>
                <p className="text-sm font-black text-[#0F1C47] truncate">{c.value}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-16">
        {/* Contact Info Cards */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-8 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-black text-[#0F1C47] mb-6 border-b border-gray-100 pb-4 uppercase tracking-wider">{t("contact.hqInfoTitle")}</h3>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#0F1C47]/5 text-[#C9973C] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-black text-[#0F1C47] text-xs uppercase tracking-wider">{t("contact.hqLabel")}</p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">228 Phan Văn Hân, P.17, Q. Bình Thạnh, TP. Hồ Chí Minh</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#0F1C47]/5 text-[#C9973C] flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-black text-[#0F1C47] text-xs uppercase tracking-wider">{t("contact.hotline")}</p>
                  <a href="tel:19000380" className="text-base text-[#1B3A8F] hover:underline font-black mt-0.5 inline-block">1900 0380</a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#0F1C47]/5 text-[#C9973C] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-black text-[#0F1C47] text-xs uppercase tracking-wider">{t("contact.emailConsult")}</p>
                  <a href="mailto:info@cpahcm.com.vn" className="text-xs text-[#1B3A8F] hover:underline font-bold mt-0.5 inline-block">info@cpahcm.com.vn</a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#0F1C47]/5 text-[#C9973C] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-black text-[#0F1C47] text-xs uppercase tracking-wider">{t("contact.workingHoursLabel")}</p>
                  <p className="text-xs text-gray-600 mt-1">{t("contact.workingHoursValue")}<br />{t("contact.workingHoursValue2")}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-black text-[#0F1C47] mb-6 border-b border-gray-100 pb-4 uppercase tracking-wider">{t("contact.branchSystemTitle")}</h3>
            <ul className="space-y-4">
              {BRANCHES.map((b) => (
                <li key={b.city} className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#C9973C] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-[#0F1C47] text-xs">
                      {b.city}{b.isHq ? ` ${t("contact.branchHqSuffix")}` : ""}
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed">{b.address}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-2 border border-gray-200 shadow-sm">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 py-2">{t("contact.mapCaption")}</p>
            <div className="h-64 overflow-hidden">
              <iframe
                src={MAP_EMBED_SRC}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </div>

        {/* Contact Form + Commitments — bọc chung 1 flex-col col-span-8 để card cam kết luôn nối
            liền ngay dưới form trong CÙNG 1 cột, tránh phụ thuộc auto-placement của CSS Grid (dễ
            đẩy lệch hàng nếu chỉ thêm 1 item col-span-8 rời rạc thứ 3 vào grid 12 cột). */}
        <div className="lg:col-span-8 flex flex-col gap-6">
        <div id="contact-form" className="scroll-mt-28 bg-white p-8 md:p-12 border border-gray-200 shadow-sm">
          <h2 className="text-2xl font-black text-[#0F1C47] mb-2 uppercase tracking-tight">{t("contact.formTitle")}</h2>
          <p className="text-gray-500 mb-8 text-sm font-light">{t("contact.formSubtitle")}</p>

          {errorMsg && (
            <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {submitted ? (
            <div className="p-10 bg-green-50 border border-green-200 text-center rounded-xl space-y-4">
              <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
              <h3 className="text-xl font-black text-green-900">{t("contact.successTitle")}</h3>
              <p className="text-sm text-green-700 max-w-md mx-auto leading-relaxed">
                {t("contact.successDesc")}
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 px-6 py-2.5 bg-[#0F1C47] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1B3A8F]"
              >
                {t("contact.sendAnother")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-[#0F1C47] uppercase tracking-wider block mb-2">{t("contact.labelCompany")}</label>
                  <input
                    type="text"
                    required
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] focus:ring-1 focus:ring-[#1B3A8F] p-3.5 text-xs text-gray-900 transition-all outline-none"
                    placeholder={t("contact.placeholderCompany")}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0F1C47] uppercase tracking-wider block mb-2">{t("contact.labelContactName")}</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] focus:ring-1 focus:ring-[#1B3A8F] p-3.5 text-xs text-gray-900 transition-all outline-none"
                    placeholder={t("contact.placeholderContactName")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-[#0F1C47] uppercase tracking-wider block mb-2">{t("contact.labelTaxCode")}</label>
                  <input
                    type="text"
                    value={form.taxCode}
                    onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
                    className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] focus:ring-1 focus:ring-[#1B3A8F] p-3.5 text-xs text-gray-900 transition-all outline-none"
                    placeholder={t("contact.placeholderTaxCode")}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0F1C47] uppercase tracking-wider block mb-2">{t("contact.labelAddress")}</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] focus:ring-1 focus:ring-[#1B3A8F] p-3.5 text-xs text-gray-900 transition-all outline-none"
                    placeholder={t("contact.placeholderAddress")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-[#0F1C47] uppercase tracking-wider block mb-2">{t("contact.labelPhone")}</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] focus:ring-1 focus:ring-[#1B3A8F] p-3.5 text-xs text-gray-900 transition-all outline-none"
                    placeholder={t("contact.placeholderPhone")}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0F1C47] uppercase tracking-wider block mb-2">{t("contact.labelEmail")}</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] focus:ring-1 focus:ring-[#1B3A8F] p-3.5 text-xs text-gray-900 transition-all outline-none"
                    placeholder={t("contact.placeholderEmail")}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F1C47] uppercase tracking-wider block mb-2">{t("contact.labelServiceInterest")}</label>
                <select
                  value={form.service}
                  onChange={(e) => setForm({ ...form, service: e.target.value })}
                  className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] focus:ring-1 focus:ring-[#1B3A8F] p-3.5 text-xs text-gray-900 transition-all outline-none"
                >
                  <option value="Kiểm toán Báo cáo tài chính">{t("contact.serviceOpt1")}</option>
                  <option value="Dịch vụ Kế toán trọn gói">{t("contact.serviceOpt2")}</option>
                  <option value="Tư vấn Thuế & Chuyển giá">{t("contact.serviceOpt3")}</option>
                  <option value="Thành lập & Tái cấu trúc">{t("contact.serviceOpt4")}</option>
                  <option value="Đào tạo CPA Academy">{t("contact.serviceOpt5")}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F1C47] uppercase tracking-wider block mb-2">{t("contact.labelMessage")}</label>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] focus:ring-1 focus:ring-[#1B3A8F] p-3.5 text-xs text-gray-900 transition-all outline-none resize-none"
                  placeholder={t("contact.placeholderMessage")}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-8 py-4 bg-[#C9973C] hover:bg-[#0F1C47] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 shadow-md"
              >
                {loading ? t("contact.submitting") : t("contact.submitBtn")}
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Cam kết dịch vụ — vừa bổ sung nội dung thật (không chỉ để lấp khoảng trống), vừa củng
            cố niềm tin ngay tại điểm khách sắp bấm gửi form. */}
        <div className="bg-[#0F1C47] p-8 md:p-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{ backgroundImage: "linear-gradient(#C9973C 1px, transparent 1px), linear-gradient(90deg, #C9973C 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <h3 className="relative z-10 text-sm font-black text-white uppercase tracking-wider mb-6">{t("contact.commitmentsTitle")}</h3>
          <div className="relative z-10 grid sm:grid-cols-3 gap-6">
            {COMMITMENTS.map((c) => (
              <div key={c.title} className="flex flex-col gap-3">
                <c.icon className="w-6 h-6 text-[#C9973C]" />
                <div>
                  <p className="font-black text-white text-sm mb-1">{c.title}</p>
                  <p className="text-blue-200 text-xs leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>

      {/* Câu hỏi thường gặp — nội dung tự phục vụ giúp khách tự giải đáp thắc mắc phổ biến trước
          khi cần gọi/nhắn trực tiếp, đồng thời lấp thêm nội dung thật cho trang thay vì chỉ có
          1 form + 1 sidebar như trước. */}
      <div className="bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-[#0F1C47] uppercase tracking-tight">{t("contact.faqTitle")}</h2>
            <div className="w-16 h-1 bg-[#C9973C] mx-auto mt-4"></div>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={i} className="border border-gray-200">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-[#F7F8FA] transition-colors"
                >
                  <span className="font-bold text-[#0F1C47] text-sm">{f.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#C9973C] shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: openFaq === i ? "auto" : 0, opacity: openFaq === i ? 1 : 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">{f.a}</p>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
