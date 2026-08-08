"use client";

import React, { useEffect, useState, useRef } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import HeroScene3D from "../components/HeroScene3D";
import AmbientScene3D from "../components/AmbientScene3D";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  Building2,
  Receipt,
  Network,
  ShieldCheck,
  GraduationCap,
  Users,
  Briefcase,
  ChevronRight,
  Award,
  BadgeCheck,
  Target,
  Clock,
  BookOpen,
  ImageOff,
  Flame,
  PhoneCall,
  ClipboardList,
  FileSignature,
  LifeBuoy
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { API_BASE, API_ORIGIN } from "../lib/config";

type HomePost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string;
  imageUrl: string | null;
  createdAt: string;
};

type HomeCourse = {
  id: string;
  title: string;
  slug: string;
  category: string;
  tag: string | null;
  description: string | null;
  imageUrl: string | null;
  price: string;
  originalPrice: string | null;
  lessons: number;
  hours: number;
  isHot: boolean;
};

const mediaUrl = (imageUrl?: string | null) => (imageUrl ? `${API_ORIGIN}${imageUrl}` : null);

const formatPriceVnd = (price: string | number | null | undefined) => {
  if (price === null || price === undefined) return "—";
  const n = Number(price);
  if (n === 0) return "Liên hệ";
  return n.toLocaleString("vi-VN") + "đ";
};

const formatDateVi = (dateStr?: string) =>
  dateStr ? new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

const fadeIn: any = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

// Animated counter — same implementation as the About page, for a consistent feel across pages.
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

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  // Chuỗi logo khách hàng cuộn vô hạn liên tục — không tôn trọng prefers-reduced-motion (chuyển
  // động liên tục, không do người dùng chủ động kích hoạt, có thể gây khó chịu/chóng mặt cho
  // người có rối loạn tiền đình). Kiểm tra toàn bộ codebase xác nhận chưa nơi nào xử lý setting
  // này — tắt hẳn animation cuộn khi hệ điều hành báo "giảm chuyển động", chỉ hiện logo tĩnh.
  const prefersReducedMotion = useReducedMotion();

  const [latestPosts, setLatestPosts] = useState<HomePost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [featuredCourses, setFeaturedCourses] = useState<HomeCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  useEffect(() => setMounted(true), []);

  // Nội dung thật lấy từ dữ liệu Admin quản lý — thay vì chỉ liệt kê dịch vụ tĩnh, trang chủ giờ
  // hiển thị tin tức & khóa học mới nhất thực tế, luôn khớp với những gì đang có trên hệ thống.
  useEffect(() => {
    fetch(`${API_BASE}/posts?page=1`)
      .then((res) => res.json())
      .then((json) => setLatestPosts(Array.isArray(json?.data?.items) ? json.data.items.slice(0, 3) : []))
      .catch(() => setLatestPosts([]))
      .finally(() => setPostsLoading(false));

    fetch(`${API_BASE}/courses`)
      .then((res) => res.json())
      .then((json) => setFeaturedCourses(Array.isArray(json?.data) ? json.data.slice(0, 3) : []))
      .catch(() => setFeaturedCourses([]))
      .finally(() => setCoursesLoading(false));
  }, []);

  // "href" trỏ đúng slug THẬT trong bảng services (không phải "id" ở đây — id chỉ dùng làm key
  // hiển thị số thứ tự). "giao-dich-lien-ket" chưa có Service tương ứng trong DB nên trỏ tạm về
  // trang danh sách /dich-vu thay vì 1 slug không tồn tại (tránh 404).
  const services = [
    {
      id: "ke-toan",
      href: "/dich-vu/dich-vu-ke-toan-tron-goi",
      title: t("home.service2Title"),
      desc: t("home.service2Desc"),
      icon: Calculator,
    },
    {
      id: "thanh-lap",
      href: "/dich-vu/thanh-lap-doanh-nghiep",
      title: t("services.biz"),
      desc: t("services.bizDesc"),
      icon: Building2,
    },
    {
      id: "tu-van-thue",
      href: "/dich-vu/tu-van-thue-doanh-nghiep",
      title: t("home.service3Title"),
      desc: t("home.service3Desc"),
      icon: Receipt,
    },
    {
      id: "giao-dich-lien-ket",
      href: "/dich-vu",
      title: t("home.service4Title"),
      desc: t("home.service4Desc"),
      icon: Network,
    },
    {
      id: "kiem-toan",
      href: "/dich-vu/dich-vu-kiem-toan-doc-lap",
      title: t("home.service1Title"),
      desc: t("home.service1Desc"),
      icon: ShieldCheck,
    },
    {
      id: "dao-tao",
      href: "/dao-tao",
      title: t("footer.training"),
      desc: t("home.service6Desc"),
      icon: GraduationCap,
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans selection:bg-[#1B3A8F] selection:text-white">
      <Header />

      <main className="flex-grow">
        {/* HERO — same structure as the Giới thiệu (About) page hero: full-bleed photo, giant type, stat bar pinned to bottom */}
        {/* h-[min(100vh,900px)] thay vì h-screen thuần — nội dung bên trong được canh giữa dọc
            (justify-center) trong 1 khối cao 100vh, nên khi zoom trình duyệt ra (Ctrl+-) làm 100vh
            phình to hơn kích thước nội dung thật, khoảng trống rỗng phía trên/dưới nội dung ngày
            càng lớn trông như lỗi layout. Chặn trần ở 900px giữ tỉ lệ đẹp bất kể mức zoom. */}
        <section ref={heroRef} className="relative h-[min(100vh,900px)] min-h-[640px] flex flex-col overflow-hidden bg-[#0F1C47]">
          {/* Nền gradient tĩnh — thay cho ảnh stock trước đây, để render 3D bên dưới là điểm nhấn hình ảnh chính */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F1C47] via-[#132456] to-[#0a1330]" />

          {/* Render 3D chủ đề tài chính - kế toán: biểu đồ tăng trưởng + đồng xu trôi lơ lửng.
              Chỉ hiện từ lg lên — vừa tránh chi phí WebGL trên di động, vừa tránh che nội dung
              văn bản đang chiếm phần bên trái ở màn hình hẹp. */}
          <div className="absolute inset-y-0 right-0 w-full lg:w-[60%] hidden lg:block">
            <HeroScene3D />
            {/* Fade mềm bên trái để hoà vào nền, tránh viền cứng giữa vùng 3D và vùng chữ */}
            <div className="absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-[#0F1C47] via-[#0F1C47]/90 to-transparent pointer-events-none" />
          </div>

          <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1C47] via-[#0F1C47]/20 to-transparent" />
          </motion.div>
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: "linear-gradient(#C9973C 1px, transparent 1px), linear-gradient(90deg, #C9973C 1px, transparent 1px)", backgroundSize: "80px 80px" }}
          />

          {/* Main content — flex-grow to fill available space, exactly like the About hero */}
          {/* pt-36 (144px) thay vì pt-24 (96px) trước đây — Header là `fixed`, cao ~115px khi
              chưa cuộn (py-4, đo thực tế). pt-24 chỉ chừa 96px nên badge "Được Bộ Tài Chính..."
              bị header đè lên/dính sát mép, gần như không có khoảng thở. */}
          <div className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36">
            <motion.div initial={{ opacity: 0 }} animate={mounted ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
              <div className="flex items-center gap-3 mb-5">
                <ShieldCheck className="w-4 h-4 text-[#C9973C]" />
                <span className="text-[#C9973C] text-xs font-bold uppercase tracking-[0.2em]">{t("home.heroBadge")}</span>
              </div>

              <h1 className="text-[clamp(2.25rem,5.5vw,4.5rem)] font-black leading-[1.05] text-white mb-6 tracking-tight max-w-4xl">
                {t("home.heroTitle")}
              </h1>

              <p className="text-blue-200/80 text-base md:text-lg max-w-xl leading-relaxed mb-9 font-light">
                {t("home.heroSubtitle")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-9">
                <Link href="/dich-vu" className="group inline-flex items-center justify-center gap-3 bg-[#C9973C] hover:bg-white text-[#0F1C47] font-bold px-8 py-4 transition-all duration-300 text-sm uppercase tracking-wide">
                  {t("home.heroCta2")}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/lien-he" className="inline-flex items-center justify-center gap-3 border border-white/30 hover:border-white text-white font-bold px-8 py-4 transition-all backdrop-blur-sm text-sm uppercase tracking-wide">
                  {t("home.heroCta1")}
                </Link>
              </div>

              {/* Chứng nhận dạng "badge" thay vì text thường — đúng mẫu "Trust & Authority" cho
                  ngành dịch vụ tài chính (certificates/badges hiển thị rõ ràng, không chìm vào chữ). */}
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { icon: ShieldCheck, label: t("home.credLicense") },
                  { icon: Award, label: "ISO 9001:2015" },
                  { icon: BadgeCheck, label: t("home.credVacpa") },
                ].map((badge, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 pl-2.5 pr-4 py-2 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-[#C9973C]/40 transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#C9973C]/15 flex items-center justify-center shrink-0">
                      <badge.icon className="w-3.5 h-3.5 text-[#C9973C]" />
                    </span>
                    <span className="text-xs font-semibold text-blue-100">{badge.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Stats strip — normal flow, pinned to bottom of section, identical pattern to the About page */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={mounted ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2, duration: 0.4 }}
            className="relative z-10 w-full border-t border-white/10"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/10 bg-white/5 backdrop-blur-md">
              {[
                { n: 16, s: "+", label: t("home.statsYears"), icon: Award },
                { n: 1000, s: "+", label: t("home.statsClients"), icon: Building2 },
                { n: 50, s: "+", label: t("home.statsExperts"), icon: Users },
                { n: 100, s: "%", label: t("home.why3Title"), icon: BadgeCheck }
              ].map((stat, i) => (
                <div key={i} className="group relative py-6 lg:py-7 px-4 text-center overflow-hidden hover:bg-white/[0.04] transition-colors">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-[#C9973C] group-hover:w-12 transition-all duration-300" />
                  <stat.icon className="w-5 h-5 text-[#C9973C] mx-auto mb-2 opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-transform duration-300" />
                  <div className="stat-figure text-2xl lg:text-3xl font-black text-white mb-1">
                    <Counter end={stat.n} suffix={stat.s} />
                  </div>
                  <div className="text-[10px] md:text-[11px] text-blue-300 uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* CLIENT LOGOS INFINITE SCROLL MARQUEE (2 ROWS - CONSTRAINED WIDTH & EQUAL SPEED) */}
        <section className="py-16 bg-white border-b border-gray-100 overflow-hidden relative">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-[#0F1C47] tracking-tight">
              {t("home.clientsTitle")}
            </h2>
            <div className="w-16 h-1 bg-[#C9973C] mx-auto mt-4"></div>
          </motion.div>

          {/* Constrained Container - Not full screen */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative w-full overflow-hidden flex flex-col gap-6">
              {/* Left & Right Gradient Blur Overlay for smooth fade */}
              <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
              <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

              {/* ROW 1 (Right to Left - Speed 25s) */}
              <div className="flex w-full overflow-hidden">
                <motion.div 
                  className="flex gap-6 items-center shrink-0"
                  animate={prefersReducedMotion ? undefined : { x: ["0%", "-50%"] }}
                  transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 25
                  }}
                >
                  {[
                    { name: "LAG", src: "/images/logo/LAGlogo.png" },
                    { name: "Lm", src: "/images/logo/Lmlogo.jpg" },
                    { name: "SSSC", src: "/images/logo/SSSC.png" },
                    { name: "Saitex", src: "/images/logo/Saitex.png" },
                    { name: "Sh", src: "/images/logo/Sh.png" },
                    { name: "TSB", src: "/images/logo/TSBlogo.jpg" },
                    // Duplicate for continuous loop
                    { name: "LAG", src: "/images/logo/LAGlogo.png" },
                    { name: "Lm", src: "/images/logo/Lmlogo.jpg" },
                    { name: "SSSC", src: "/images/logo/SSSC.png" },
                    { name: "Saitex", src: "/images/logo/Saitex.png" },
                    { name: "Sh", src: "/images/logo/Sh.png" },
                    { name: "TSB", src: "/images/logo/TSBlogo.jpg" }
                  ].map((logo, idx) => (
                    <div
                      key={idx}
                      className="w-44 h-20 bg-white rounded-sm border border-gray-100 flex items-center justify-center p-3 hover:border-[#C9973C]/40 transition-colors shrink-0"
                    >
                      <Image
                        src={logo.src}
                        alt={logo.name}
                        width={130}
                        height={56}
                        className="max-h-14 max-w-[130px] w-auto h-auto object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
                      />
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* ROW 2 (Right to Left - Equal Speed 25s) */}
              <div className="flex w-full overflow-hidden">
                <motion.div 
                  className="flex gap-6 items-center shrink-0"
                  animate={prefersReducedMotion ? undefined : { x: ["0%", "-50%"] }}
                  transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 25
                  }}
                >
                  {[
                    { name: "TSN", src: "/images/logo/TSN.png" },
                    { name: "Xinsheng", src: "/images/logo/XinshengLogo.jpg" },
                    { name: "AMA", src: "/images/logo/amalogo.jpg" },
                    { name: "Ogico", src: "/images/logo/ogico1.png" },
                    { name: "Origin", src: "/images/logo/originlogo.png" },
                    { name: "WV", src: "/images/logo/wv.jpg" },
                    // Duplicate for continuous loop
                    { name: "TSN", src: "/images/logo/TSN.png" },
                    { name: "Xinsheng", src: "/images/logo/XinshengLogo.jpg" },
                    { name: "AMA", src: "/images/logo/amalogo.jpg" },
                    { name: "Ogico", src: "/images/logo/ogico1.png" },
                    { name: "Origin", src: "/images/logo/originlogo.png" },
                    { name: "WV", src: "/images/logo/wv.jpg" }
                  ].map((logo, idx) => (
                    <div
                      key={idx}
                      className="w-44 h-20 bg-white rounded-sm border border-gray-100 flex items-center justify-center p-3 hover:border-[#C9973C]/40 transition-colors shrink-0"
                    >
                      <Image
                        src={logo.src}
                        alt={logo.name}
                        width={130}
                        height={56}
                        className="max-h-14 max-w-[130px] w-auto h-auto object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
                      />
                    </div>
                  ))}
                </motion.div>
              </div>

            </div>
          </div>
        </section>

        {/* PREMIUM SERVICES GRID */}
        <section className="relative py-24 bg-[#F8F9FA] overflow-hidden">
          {/* Lớp nền 3D trang trí — mạng lưới node vàng/xanh mờ, gợi ý "hệ sinh thái dịch vụ kết
              nối", đặt phía sau nội dung (z-0) nên không ảnh hưởng khả năng đọc/thao tác. */}
          <AmbientScene3D
            className="absolute inset-0 pointer-events-none opacity-70"
            nodeCount={16}
            colorA="#C9973C"
            colorB="#1B3A8F"
            opacity={0.4}
            seed={7}
          />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8"
            >
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-[1px] w-8 bg-[#1B3A8F]"></div>
                  <span className="text-[#1B3A8F] font-semibold tracking-widest uppercase text-xs">{t("home.servicesKicker")}</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
                  {t("home.servicesTitle")}
                </h2>
              </div>
              <Link href="/dich-vu" className="inline-flex items-center text-[#1B3A8F] font-bold border-b border-[#1B3A8F] pb-1 hover:text-[#C9973C] hover:border-[#C9973C] transition-colors whitespace-nowrap">
                {t("home.servicesViewAll")} <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </motion.div>

            <motion.div 
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {services.map((srv, idx) => (
                <motion.div key={idx} variants={fadeIn}>
                  <Link
                    href={srv.href}
                    className="group block h-full bg-white p-8 lg:p-10 rounded-sm border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-[#1B3A8F]/10 hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden"
                  >
                    {/* Vệt accent trên đầu thẻ khi hover — nhất quán với thẻ Khóa học/Tin tức */}
                    <div className="absolute top-0 left-0 h-[3px] w-0 bg-gradient-to-r from-[#C9973C] to-[#1B3A8F] group-hover:w-full transition-all duration-500" />

                    {/* Number watermark — editorial magazine cue */}
                    <span className="absolute top-4 right-6 text-6xl font-black text-gray-50 select-none leading-none">
                      {String(idx + 1).padStart(2, "0")}
                    </span>

                    <div className="w-16 h-16 bg-gradient-to-br from-[#1B3A8F] to-[#0F1C47] text-white rounded-sm flex items-center justify-center mb-8 shadow-md shadow-[#1B3A8F]/20 group-hover:scale-105 transition-transform duration-300 relative z-10">
                      <srv.icon className="w-8 h-8 stroke-[1.5]" />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#1B3A8F] transition-colors relative z-10">
                      {srv.title}
                    </h3>
                    <p className="text-gray-500 leading-relaxed mb-8 relative z-10">
                      {srv.desc}
                    </p>

                    <div className="relative z-10 flex items-center justify-between pt-5 border-t border-gray-100">
                      <span className="flex items-center text-sm font-bold text-[#1B3A8F] group-hover:text-[#C9973C] transition-colors">
                        {t("home.detailsLabel")} <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                      </span>
                      <span className="w-8 h-8 rounded-full bg-[#F4F6F9] flex items-center justify-center group-hover:bg-[#C9973C] transition-colors duration-300">
                        <ArrowRight className="w-3.5 h-3.5 text-[#1B3A8F] group-hover:text-white transition-colors" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* WHY CHOOSE US — nội dung đã có sẵn trong i18n (why1/2/3) nhưng trước đây chỉ 1 dòng được
            mượn làm nhãn cho ô thống kê cuối hero, chưa từng hiển thị đầy đủ tiêu đề + mô tả. */}
        <section className="relative py-24 bg-white border-t border-gray-100 overflow-hidden">
          <AmbientScene3D
            className="absolute inset-0 pointer-events-none opacity-60"
            nodeCount={14}
            colorA="#C9973C"
            colorB="#1B3A8F"
            opacity={0.3}
            seed={53}
          />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-center mb-16"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="h-[1px] w-8 bg-[#1B3A8F]"></div>
                <span className="text-[#1B3A8F] font-semibold tracking-widest uppercase text-xs">{t("home.servicesKicker")}</span>
                <div className="h-[1px] w-8 bg-[#1B3A8F]"></div>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
                {t("home.whyChooseTitle")}
              </h2>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid md:grid-cols-3 gap-8"
            >
              {[
                { titleKey: "home.why1Title", descKey: "home.why1Desc", icon: Award },
                { titleKey: "home.why2Title", descKey: "home.why2Desc", icon: Target },
                { titleKey: "home.why3Title", descKey: "home.why3Desc", icon: ShieldCheck },
              ].map((item, idx) => (
                <motion.div key={idx} variants={fadeIn} className="text-center px-4">
                  <div className="w-16 h-16 mx-auto bg-[#F4F6F9] text-[#1B3A8F] rounded-full flex items-center justify-center mb-6 border border-gray-100">
                    <item.icon className="w-7 h-7 stroke-[1.5]" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{t(item.titleKey)}</h3>
                  <p className="text-gray-500 leading-relaxed text-sm">{t(item.descKey)}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* QUY TRÌNH HỢP TÁC — nội dung dạng "case study/process" cho khối B2B, thay thế hợp lý
            cho testimonial (không có dữ liệu phản hồi khách hàng thật để trích dẫn danh tính cụ
            thể — bịa quotes sẽ là giả mạo bằng chứng xã hội). 4 bước dùng chung được nối bằng 1
            đường kẻ ngang, đánh số lớn làm điểm nhấn thị giác thay vì chỉ icon nhỏ như các khối khác. */}
        <section className="relative py-24 bg-[#0F1C47] overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{ backgroundImage: "linear-gradient(#C9973C 1px, transparent 1px), linear-gradient(90deg, #C9973C 1px, transparent 1px)", backgroundSize: "60px 60px" }}
          />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-center mb-16"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="h-[1px] w-8 bg-[#C9973C]" />
                <span className="text-[#C9973C] font-semibold tracking-widest uppercase text-xs">{t("home.processKicker")}</span>
                <div className="h-[1px] w-8 bg-[#C9973C]" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                {t("home.processTitle")}
              </h2>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="relative grid md:grid-cols-4 gap-10 md:gap-6"
            >
              {/* Đường nối ngang giữa các bước — chỉ hiện từ md, ẩn trên mobile vì layout xếp dọc */}
              <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-white/10" />

              {[
                { icon: PhoneCall, titleKey: "home.process1Title", descKey: "home.process1Desc" },
                { icon: ClipboardList, titleKey: "home.process2Title", descKey: "home.process2Desc" },
                { icon: FileSignature, titleKey: "home.process3Title", descKey: "home.process3Desc" },
                { icon: LifeBuoy, titleKey: "home.process4Title", descKey: "home.process4Desc" },
              ].map((step, idx) => (
                <motion.div key={idx} variants={fadeIn} className="relative text-center px-2">
                  <div className="relative z-10 w-14 h-14 mx-auto bg-[#0F1C47] border-2 border-[#C9973C]/40 rounded-full flex items-center justify-center mb-5">
                    <step.icon className="w-6 h-6 text-[#C9973C]" />
                  </div>
                  <span className="text-xs font-black text-[#C9973C]/60 tracking-widest">{String(idx + 1).padStart(2, "0")}</span>
                  <h3 className="text-base font-bold text-white mt-1 mb-2">{t(step.titleKey)}</h3>
                  <p className="text-blue-200/70 text-sm leading-relaxed">{t(step.descKey)}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* FEATURED COURSES — trang chủ trước đây không có bất kỳ nội dung nào về mảng Đào tạo dù
            đây là 1 trong 3 mảng kinh doanh chính (Dịch vụ / Đào tạo / Tuyển dụng). Dữ liệu thật
            từ Course API, không phải nội dung tĩnh. */}
        <section className="relative py-24 bg-[#F8F9FA] border-t border-gray-100 overflow-hidden">
          <AmbientScene3D
            className="absolute inset-0 pointer-events-none opacity-60"
            nodeCount={14}
            colorA="#C9973C"
            colorB="#1B3A8F"
            opacity={0.3}
            seed={71}
          />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8"
            >
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-[1px] w-8 bg-[#1B3A8F]"></div>
                  <span className="text-[#1B3A8F] font-semibold tracking-widest uppercase text-xs">{t("home.coursesKicker")}</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
                  {t("home.coursesTitle")}
                </h2>
              </div>
              <Link href="/dao-tao" className="inline-flex items-center text-[#1B3A8F] font-bold border-b border-[#1B3A8F] pb-1 hover:text-[#C9973C] hover:border-[#C9973C] transition-colors whitespace-nowrap">
                {t("home.coursesViewAll")} <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </motion.div>

            {!coursesLoading && featuredCourses.length === 0 ? (
              <p className="text-center text-gray-400 py-12">{t("home.coursesEmpty")}</p>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="grid md:grid-cols-3 gap-6"
              >
                {(coursesLoading ? Array.from({ length: 3 }) : featuredCourses).map((course: any, idx) => (
                  <motion.div key={course?.id ?? idx} variants={fadeIn}>
                    <Link
                      href={course ? `/dao-tao/${course.slug}` : "#"}
                      className="group relative block bg-white rounded-sm border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-[#1B3A8F]/10 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden h-full"
                    >
                      <div className="absolute top-0 left-0 h-[3px] w-0 bg-gradient-to-r from-[#C9973C] to-[#1B3A8F] group-hover:w-full transition-all duration-500 z-10" />
                      <div className="relative h-44 bg-[#0F1C47]/5 overflow-hidden">
                        {course?.imageUrl ? (
                          <Image
                            src={mediaUrl(course.imageUrl) ?? ""}
                            alt={course.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-10 h-10 text-[#1B3A8F]/20" />
                          </div>
                        )}
                        {course?.isHot && (
                          <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-[#C9973C] text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-sm">
                            <Flame className="w-3 h-3" /> {course.tag || "HOT"}
                          </span>
                        )}
                      </div>
                      <div className="p-6">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#C9973C]">{course?.category ?? ""}</span>
                        <h3 className="text-base font-bold text-gray-900 mt-2 mb-3 leading-snug group-hover:text-[#1B3A8F] transition-colors line-clamp-2 min-h-[2.6em]">
                          {course?.title ?? ""}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                          <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {course?.lessons ?? 0} {t("home.coursesLessonsUnit")}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {course?.hours ?? 0} {t("home.coursesHoursUnit")}</span>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <span className="text-base font-bold text-[#1B3A8F]">
                            {course ? formatPriceVnd(course.price) : ""}
                          </span>
                          <span className="text-xs font-bold text-gray-400 group-hover:text-[#C9973C] transition-colors">
                            {t("home.coursesViewDetail")}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>

        {/* LATEST NEWS — cùng lý do như trên: trang chủ trước đây hoàn toàn không dẫn tới nội
            dung Tin tức, dù đây là kênh cập nhật uy tín/pháp lý quan trọng với khách hàng B2B. */}
        <section className="relative py-24 bg-white border-t border-gray-100 overflow-hidden">
          <AmbientScene3D
            className="absolute inset-0 pointer-events-none opacity-50"
            nodeCount={12}
            colorA="#C9973C"
            colorB="#1B3A8F"
            opacity={0.25}
            seed={97}
          />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8"
            >
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-[1px] w-8 bg-[#1B3A8F]"></div>
                  <span className="text-[#1B3A8F] font-semibold tracking-widest uppercase text-xs">{t("home.newsKicker")}</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
                  {t("home.newsTitle")}
                </h2>
              </div>
              <Link href="/tin-tuc" className="inline-flex items-center text-[#1B3A8F] font-bold border-b border-[#1B3A8F] pb-1 hover:text-[#C9973C] hover:border-[#C9973C] transition-colors whitespace-nowrap">
                {t("home.newsViewAll")} <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </motion.div>

            {!postsLoading && latestPosts.length === 0 ? (
              <p className="text-center text-gray-400 py-12">{t("home.newsEmpty")}</p>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="grid md:grid-cols-3 gap-6"
              >
                {(postsLoading ? Array.from({ length: 3 }) : latestPosts).map((post: any, idx) => (
                  <motion.div key={post?.id ?? idx} variants={fadeIn}>
                    <Link
                      href={post ? `/tin-tuc/${post.slug}` : "#"}
                      className="group relative block bg-white rounded-sm border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-[#1B3A8F]/10 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden h-full"
                    >
                      <div className="absolute top-0 left-0 h-[3px] w-0 bg-gradient-to-r from-[#C9973C] to-[#1B3A8F] group-hover:w-full transition-all duration-500 z-10" />
                      <div className="relative h-44 bg-[#0F1C47]/5 overflow-hidden">
                        {post?.imageUrl ? (
                          <Image
                            src={mediaUrl(post.imageUrl) ?? ""}
                            alt={post.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageOff className="w-8 h-8 text-[#1B3A8F]/20" />
                          </div>
                        )}
                        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#1B3A8F] text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-sm">
                          {post?.category ?? ""}
                        </span>
                      </div>
                      <div className="p-6">
                        <span className="text-xs text-gray-400">{post ? formatDateVi(post.createdAt) : ""}</span>
                        <h3 className="text-base font-bold text-gray-900 mt-2 mb-3 leading-snug group-hover:text-[#1B3A8F] transition-colors line-clamp-2 min-h-[2.6em]">
                          {post?.title ?? ""}
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-4">
                          {post?.excerpt ?? ""}
                        </p>
                        <span className="inline-flex items-center text-xs font-bold text-[#1B3A8F] group-hover:text-[#C9973C] transition-colors">
                          {t("home.newsReadMore")} <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>

        {/* ELEGANT HR PORTAL SECTION */}
        <section className="py-24 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="bg-[#0F1C47] rounded-sm overflow-hidden flex flex-col lg:flex-row relative"
            >
              <div className="absolute inset-0 bg-grid-navy opacity-30"></div>
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#C9973C]/10 rounded-full blur-[100px] pointer-events-none"></div>
              {/* Mạng lưới 3D nền — gợi hình "kết nối ứng viên - nhà tuyển dụng" */}
              <AmbientScene3D
                className="absolute inset-0 pointer-events-none"
                nodeCount={14}
                colorA="#C9973C"
                colorB="#3E5AA8"
                opacity={0.45}
                seed={19}
              />

              {/* Job Seeker Side */}
              <div className="flex-1 p-12 lg:p-16 relative z-10 border-b lg:border-b-0 lg:border-r border-white/10 group">
                <div className="w-14 h-14 bg-white/10 rounded-sm flex items-center justify-center text-[#C9973C] mb-8 group-hover:bg-[#C9973C] group-hover:text-[#0F1C47] transition-colors duration-300">
                  <Users className="w-7 h-7" />
                </div>
                <div className="text-[#C9973C] font-semibold tracking-widest uppercase text-xs mb-3">{t("home.hrKicker1")}</div>
                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">{t("home.hrTitle1")}</h3>
                <p className="text-gray-300 mb-8 max-w-sm leading-relaxed">
                  {t("home.hrDesc1")}
                </p>
                <div className="flex items-center gap-6 mb-8 text-sm">
                  <div><span className="text-white font-bold text-lg"><Counter end={20} suffix="+" /></span> <span className="text-gray-400">{t("home.hrStat1")}</span></div>
                </div>
                <Link href="/tuyen-dung" className="inline-flex items-center text-white border border-white/30 px-6 py-3 rounded-sm hover:bg-white hover:text-[#0F1C47] transition-colors text-sm font-bold uppercase tracking-wide group/btn">
                  {t("home.hrBtn1")} <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Employer Side */}
              <div className="flex-1 p-12 lg:p-16 relative z-10 group bg-white/[0.03]">
                <div className="w-14 h-14 bg-[#C9973C]/20 rounded-sm flex items-center justify-center text-[#C9973C] mb-8 group-hover:bg-[#C9973C] group-hover:text-[#0F1C47] transition-colors duration-300">
                  <Briefcase className="w-7 h-7" />
                </div>
                <div className="text-[#C9973C] font-semibold tracking-widest uppercase text-xs mb-3">{t("home.hrKicker2")}</div>
                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">{t("home.hrTitle2")}</h3>
                <p className="text-gray-300 mb-8 max-w-sm leading-relaxed">
                  {t("home.hrDesc2")}
                </p>
                <div className="flex items-center gap-6 mb-8 text-sm">
                  <div><span className="text-white font-bold text-lg"><Counter end={500} suffix="+" /></span> <span className="text-gray-400">{t("home.hrStat2")}</span></div>
                </div>
                <Link href="/lien-he" className="inline-flex items-center bg-[#C9973C] text-[#0F1C47] font-bold px-6 py-3 rounded-sm hover:bg-[#D4AF37] transition-colors text-sm uppercase tracking-wide group/btn">
                  {t("home.hrKicker2")} <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA — trang chủ trước đây kết thúc đột ngột ngay sau khối HR Portal, không có lời kêu
            gọi hành động cuối trang như các trang con (Giới thiệu, Dịch vụ...) đã có. */}
        <section className="relative overflow-hidden bg-[#0F1C47]">
          {/* Render 3D thay cho ảnh stock trước đây — đồng bộ với phong cách 3D xuyên suốt trang */}
          <AmbientScene3D
            className="absolute inset-0 pointer-events-none"
            nodeCount={20}
            colorA="#C9973C"
            colorB="#3E5AA8"
            opacity={0.5}
            seed={31}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F1C47] via-[#0F1C47]/70 to-[#0F1C47]/40 pointer-events-none" />
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col lg:flex-row items-center justify-between gap-10"
          >
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-px bg-[#C9973C]" />
                <span className="text-[#C9973C] text-xs font-bold uppercase tracking-widest">{t("about.ctaTag")}</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight max-w-xl">{t("about.ctaHeadline")}</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 shrink-0">
              <Link href="/lien-he"
                className="inline-flex items-center gap-3 bg-[#C9973C] hover:bg-white hover:text-[#0F1C47] text-white font-bold px-8 py-4 transition-all duration-300 group"
              >
                {t("about.ctaBtn1")}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="tel:19000380"
                className="inline-flex items-center gap-3 border border-white/30 hover:border-white text-white font-bold px-8 py-4 transition-all backdrop-blur-sm"
              >
                <ShieldCheck className="w-4 h-4 text-[#C9973C]" />
                {t("about.ctaBtn2")}
              </a>
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
