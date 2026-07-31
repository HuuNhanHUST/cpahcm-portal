"use client";

import React from "react";
import Logo from "./Logo";
import Link from "next/link";
import { Mail, Phone, MapPin, CheckCircle2, Globe } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// Danh sách chi nhánh thật — hardcode trực tiếp (giống MST/Hotline ở trên) vì đây là địa chỉ
// thật của công ty, không phải nội dung cần dịch song ngữ.
const BRANCHES = [
  { label: "TP.HCM (Trụ sở)", address: "228 Phan Văn Hân, P.17, Q. Bình Thạnh" },
  { label: "TP. Thủ Đức", address: "61/1 Đường số 23, P. Hiệp Bình Chánh" },
  { label: "Hà Nội", address: "1A Ngõ 140 Trần Duy Hưng, Cầu Giấy" },
  { label: "Bình Phước", address: "KCN Minh Hưng – Hàn Quốc, Chơn Thành" },
  { label: "Đắk Nông", address: "201 đường 23/3, Thị xã Gia Nghĩa" },
];

export default function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-[#f8f9fa] border-t-2 border-t-[#C9973C] pt-16 pb-8 text-gray-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-12">
          {/* Col 1: Brand details */}
          <div className="lg:col-span-4 space-y-6">
            <Logo />
            <p className="text-sm leading-relaxed text-gray-500">
              {t("home.heroSubtitle")}
            </p>
            <div className="flex flex-col gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1b3a8f]" />
                <span className="font-semibold">MST:</span> 0310531811
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#1b3a8f]" />
                <span className="font-semibold">HOTLINE:</span> <a href="tel:19000380" className="text-[#c9973c] font-bold hover:underline">1900 0380</a>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#1b3a8f]" />
                <span className="font-semibold">Website:</span> <a href="https://cpahcm.com.vn" className="hover:text-[#1b3a8f] transition-colors">cpahcm.com.vn</a>
              </div>
            </div>
          </div>

          {/* Col 2: Services */}
          <div className="lg:col-span-2">
            <h3 className="text-gray-900 font-bold text-base mb-5 tracking-wide">
              {t("footer.servicesList")}
            </h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/dich-vu" className="hover:text-[#1b3a8f] hover:font-medium transition-all duration-200">{t("footer.accounting")}</Link></li>
              <li><Link href="/dich-vu" className="hover:text-[#1b3a8f] hover:font-medium transition-all duration-200">{t("services.biz")}</Link></li>
              <li><Link href="/dich-vu" className="hover:text-[#1b3a8f] hover:font-medium transition-all duration-200">{t("footer.tax")}</Link></li>
              <li><Link href="/dich-vu" className="hover:text-[#1b3a8f] hover:font-medium transition-all duration-200">{t("footer.audit")}</Link></li>
            </ul>
          </div>

          {/* Col 3: Academy */}
          <div className="lg:col-span-2">
            <h3 className="text-gray-900 font-bold text-base mb-5 tracking-wide">
              {t("header.course")} & {t("header.recruitment")}
            </h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/dao-tao" className="hover:text-[#1b3a8f] hover:font-medium transition-all duration-200">{t("footer.training")}</Link></li>
              <li><Link href="/tuyen-dung" className="hover:text-[#1b3a8f] hover:font-medium transition-all duration-200">{t("footer.recruitment")}</Link></li>
              <li><Link href="/tin-tuc" className="hover:text-[#1b3a8f] hover:font-medium transition-all duration-200">{t("footer.news")}</Link></li>
            </ul>
          </div>

          {/* Col 4: Contact info / Locations */}
          <div className="lg:col-span-4">
            <h3 className="text-gray-900 font-bold text-base mb-5 tracking-wide">
              {t("footer.branches")}
            </h3>
            <ul className="space-y-3 text-[13px] text-gray-600 leading-snug">
              {BRANCHES.map((b) => (
                <li key={b.label} className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#c9973c] flex-shrink-0 mt-0.5" />
                  <div><strong className="text-gray-800">{b.label}:</strong> {b.address}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom copyright area */}
        <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© {currentYear} CPA HCM. {t("footer.rights")}</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-[#1b3a8f] transition-colors duration-200">Chính sách bảo mật</Link>
            <Link href="#" className="hover:text-[#1b3a8f] transition-colors duration-200">Điều khoản dịch vụ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
