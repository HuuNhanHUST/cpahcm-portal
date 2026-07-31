"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { ShieldCheck, ImageOff, ChevronRight, Filter } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLanguage } from "../../context/LanguageContext";
import { Service, SERVICE_CATEGORIES, serviceImageUrl } from "./shared";

export default function ServicesPageClient({ initialServices }: { initialServices: Service[] }) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);

  useEffect(() => setMounted(true), []);

  const fadeIn: any = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  const filteredServices =
    selectedCategory === "ALL" ? initialServices : initialServices.filter((s) => s.category === selectedCategory);

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F6F9] font-sans selection:bg-[#1B3A8F] selection:text-white">
      <Header />

      <main className="flex-grow">
        {/* HERO */}
        <section ref={heroRef} className="relative h-[min(100vh,900px)] min-h-[640px] flex flex-col overflow-hidden bg-[#0F1C47]">
          {/* Ảnh thật thay cho 3D — 3D dùng chung 1 cảnh trên mọi trang khiến banner giống hệt
              nhau; ảnh tay đang ghi số liệu tài chính khớp đúng chủ đề Dịch vụ kế toán/kiểm toán. */}
          <motion.div style={{ y: bgY }} className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop"
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
                <ShieldCheck className="w-4 h-4 text-[#C9973C]" />
                <span className="text-[#C9973C] text-xs font-bold uppercase tracking-[0.2em]">{t("services.heroBadge")}</span>
              </div>
              <h1 className="text-[clamp(2.25rem,5.5vw,4.5rem)] font-black leading-[1.05] text-white mb-6 tracking-tight max-w-2xl">
                {t("services.title")}
              </h1>
              <p className="text-blue-200/80 text-base md:text-lg max-w-xl leading-relaxed mb-9 font-light">
                {t("services.subtitle")}
              </p>
            </motion.div>
          </div>
        </section>

        {/* TAB LỌC CHUYÊN MỤC */}
        <section className="bg-white border-b border-gray-100 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
            <div className="flex">
              {[{ key: "ALL", label: t("services.filterAll") }, ...SERVICE_CATEGORIES.map((c) => ({ key: c, label: c }))].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedCategory(tab.key)}
                  className={`flex items-center gap-2 px-6 py-5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                    selectedCategory === tab.key ? "border-[#C9973C] text-[#0F1C47]" : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* GRID DỊCH VỤ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          {filteredServices.length === 0 ? (
            <div className="bg-white p-12 rounded-sm border border-gray-100 text-center space-y-3">
              <Filter className="w-12 h-12 text-gray-300 mx-auto" />
              <h4 className="text-lg font-bold text-[#0F1C47]">{t("services.noResultsTitle")}</h4>
            </div>
          ) : (
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <motion.div
                  key={service.id}
                  variants={fadeIn}
                  className="group bg-white rounded-sm border border-gray-100 border-t-2 border-t-transparent hover:border-t-[#C9973C] hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col"
                >
                  <Link href={`/dich-vu/${service.slug}`} className="relative h-44 shrink-0 bg-[#F4F6F9] flex items-center justify-center overflow-hidden">
                    {service.imageUrl ? (
                      <Image src={serviceImageUrl(service.imageUrl) ?? ""} alt={service.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <ImageOff className="w-6 h-6 text-gray-300" />
                    )}
                  </Link>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-[#1B3A8F] bg-[#F4F6F9] px-3 py-1 rounded-sm uppercase tracking-wider">{service.category}</span>
                      {service.tag && <span className="text-xs font-bold text-[#0F1C47] bg-[#FDF6E9] border border-amber-200 px-3 py-1 rounded-sm">{service.tag}</span>}
                    </div>
                    <Link href={`/dich-vu/${service.slug}`} className="text-lg font-bold text-[#0F1C47] mb-2 hover:text-[#1B3A8F] transition-colors">
                      {service.title}
                    </Link>
                    <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2 flex-1">{service.shortDesc}</p>
                    {service.features.length > 0 && (
                      <ul className="space-y-1.5 mb-5 text-xs text-gray-600">
                        {service.features.slice(0, 3).map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#C9973C] shrink-0 mt-0.5" /> {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link href={`/dich-vu/${service.slug}`} className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold text-[#1B3A8F] group-hover:text-[#C9973C] transition-colors">
                      {t("services.viewDetail")} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
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
