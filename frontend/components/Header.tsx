"use client";

import React, { useState, useEffect } from "react";
import Logo from "./Logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogIn, ChevronDown, LogOut, Briefcase, User, Edit3, Save, CheckCircle2, ShieldCheck, AlertCircle, Building2, Lock } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { API_BASE } from "../lib/config";
import { authFetch } from "../lib/authFetch";

const VietnamFlag = () => (
  <svg viewBox="0 0 24 16" width="24" height="16" className="shadow-sm border border-gray-100 rounded-[2px]">
    <rect width="24" height="16" fill="#da251d"/>
    <polygon points="12,3 13.5,7.5 18,7.5 14.5,10.5 15.5,15 12,12 8.5,15 9.5,10.5 6,7.5 10.5,7.5" fill="#ffff00"/>
  </svg>
);

const UKFlag = () => (
  <svg viewBox="0 0 60 30" width="24" height="16" className="shadow-sm border border-gray-100 rounded-[2px]">
    <clipPath id="s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
    <clipPath id="t"><path d="M30,15 h30 v15 z v-15 h-30 z h-30 v-15 z v15 h30 z"/></clipPath>
    <g clipPath="url(#s)">
      <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
    </g>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="#1877F2">
    <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5.01 3.66 9.15 8.44 9.9v-7.03H7.9v-2.87h2.54V9.8c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.87h-2.33v7.03C18.34 21.2 22 17.06 22 12.06c0-5.53-4.5-10.02-10-10.02z" />
  </svg>
);

const ZaloIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="#0068FF">
    <path d="M21.731 11.233c0-4.887-4.143-8.835-9.317-8.835-5.176 0-9.319 3.948-9.319 8.835 0 2.222.951 4.298 2.585 5.922.259.256.326.634.195.957-.468 1.157-1.42 2.628-2.613 3.619-.245.204-.047.608.271.564 1.761-.247 3.659-.971 4.909-1.854.276-.195.632-.234.942-.128 1.05.356 2.164.536 3.297.536 5.174 0 9.318-3.948 9.318-8.835z" />
  </svg>
);

const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="#FF0000">
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
  </svg>
);

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Edit Profile Form State
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Đổi mật khẩu — trước đây backend đã có sẵn POST /users/change-password nhưng chưa từng có
  // UI nào gọi tới, người dùng muốn đổi mật khẩu không có cách nào tự làm.
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPwFields, setShowPwFields] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);

    // Đọc trạng thái đăng nhập — kiểm tra cả localStorage VÀ sessionStorage vì /login lưu vào
    // sessionStorage khi người dùng bỏ tick "Ghi nhớ đăng nhập" (xem app/login/page.tsx).
    try {
      const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setEditFullName(parsed.fullName || "");
        setEditPhone(parsed.phone || "");
      }
    } catch (e) {}

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getAuthToken = () => localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");

  const handleLogout = async () => {
    const token = getAuthToken();
    if (token) {
      // Best-effort: thu hồi session refresh-token thật trên Redis phía server. Vẫn xóa
      // storage phía client dù request này lỗi (mất mạng...) để không kẹt người dùng lại.
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }

    for (const store of [localStorage, sessionStorage]) {
      store.removeItem("accessToken");
      store.removeItem("refreshToken");
      store.removeItem("user");
      store.removeItem("token");
    }
    setUser(null);
    setShowUserDropdown(false);
    window.location.href = "/login";
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const res = await authFetch(`${API_BASE}/users/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: editFullName, phone: editPhone }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Cập nhật thông tin thất bại.");

      // Lưu đúng dữ liệu đã được backend xác nhận (không tự suy đoán ở client) — ghi lại vào
      // đúng storage đang chứa session hiện tại (local hoặc session, theo "Ghi nhớ đăng nhập").
      const updatedUser = { ...user, ...json.user };
      const activeStore = localStorage.getItem("user") ? localStorage : sessionStorage;
      activeStore.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
        setShowProfileModal(false);
      }, 1200);
    } catch (err: any) {
      setSaveError(err?.message || "Cập nhật thông tin thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (newPassword !== confirmNewPassword) {
      setPwError("Mật khẩu mới xác nhận không trùng khớp.");
      return;
    }
    setPwSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/users/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Đổi mật khẩu thất bại.");

      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => { setPwSuccess(false); setShowPwFields(false); }, 1500);
    } catch (err: any) {
      setPwError(err?.message || "Đổi mật khẩu thất bại.");
    } finally {
      setPwSaving(false);
    }
  };

  // "Cổng Khách Hàng" chỉ dành cho tài khoản Doanh nghiệp (BUSINESS) hoặc ADMIN đã đăng nhập.
  // Đã thử thêm 1 nút riêng luôn hiện trên thanh header (ngoài dropdown) để dễ tìm hơn, nhưng nav
  // chính dùng `absolute left-1/2` để tự canh giữa — KHÔNG chiếm chỗ trong flex layout, nên bất kỳ
  // thay đổi độ rộng nào ở khối bên phải (kể cả 1 nút nhỏ) đều có thể đè lên nav tùy độ rộng màn
  // hình thực tế (đã xác nhận vỡ layout, kể cả ở màn hình rộng — không chỉ 1 khoảng hẹp cụ thể).
  // Đã revert, chỉ còn: mục nổi bật (nền xanh) trong dropdown tài khoản + 1 nút trong menu mobile
  // (an toàn vì danh sách dọc, không tranh chỗ ngang với nav). Muốn nút riêng trên header thật sự
  // cần tái cấu trúc nav sang flex/grid chia sẻ không gian đúng cách (không phải absolute), việc
  // lớn hơn — để bàn sau.
  const canSeeClientPortal = user && (user.role === "BUSINESS" || user.role === "ADMIN");

  const navLinks = [
    { name: t("header.home"), href: "/" },
    { name: t("header.introduce"), href: "/gioi-thieu" },
    { name: t("header.services"), href: "/dich-vu" },
    { name: t("header.course"), href: "/dao-tao" },
    { name: t("header.recruitment"), href: "/tuyen-dung" },
    { name: t("header.news"), href: "/tin-tuc" },
    { name: t("header.forum"), href: "/dien-dan" },
    { name: t("header.library"), href: "#" },
    { name: t("header.contact"), href: "/lien-he" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white ${
        scrolled ? "py-2 shadow-md border-b border-gray-100" : "py-4 border-b border-gray-100"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2">
          
          {/* Left: Logo */}
          <Link href="/" className="flex-shrink-0 hover:opacity-90 transition-opacity">
            <Logo width={180} height={60} />
          </Link>

          {/* Center: Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-5 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-[12px] whitespace-nowrap uppercase tracking-wider transition-colors duration-200 relative group py-2 ${
                    isActive
                      ? "text-[#1b3a8f] font-bold"
                      : "font-semibold text-gray-700 hover:text-[#1b3a8f]"
                  }`}
                >
                  {link.name}
                  <span className={`absolute bottom-0 left-0 h-[2px] bg-[#C9973C] transition-all duration-300 ${isActive ? "w-full" : "w-0 group-hover:w-full"}`}></span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="hidden xl:flex items-center gap-6">
            <div className="flex items-center gap-3 border-r border-gray-200 pr-6">
              <button 
                onClick={() => setLanguage("vi")}
                className={`transition-all duration-200 ${language === "vi" ? "opacity-100 scale-110 shadow-md ring-2 ring-[#c9973c]/50 rounded-[2px]" : "opacity-40 hover:opacity-80"} hover:scale-110`}
              >
                <VietnamFlag />
              </button>
              <button 
                onClick={() => setLanguage("en")}
                className={`transition-all duration-200 ${language === "en" ? "opacity-100 scale-110 shadow-md ring-2 ring-[#c9973c]/50 rounded-[2px]" : "opacity-40 hover:opacity-80"} hover:scale-110`}
              >
                <UKFlag />
              </button>
            </div>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 px-3.5 py-2 bg-[#F8F9FA] hover:bg-gray-100 border border-gray-200 rounded-full transition-all text-xs font-bold text-[#0F1C47] shadow-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-[#1B3A8F] text-white flex items-center justify-center font-bold text-xs">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : "U")}
                  </div>
                  <span className="max-w-[120px] truncate">{user.fullName || user.email?.split('@')[0] || "Tài khoản"}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="text-xs font-bold text-[#0F1C47] truncate flex items-center justify-between">
                        <span>{user.fullName || "Thành viên CPA HCM"}</span>
                        {user.role === "ADMIN" && (
                          <span className="bg-[#C9973C] text-white px-1.5 py-0.5 text-[9px] font-black rounded uppercase">Admin</span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
                    </div>

                    <button
                      onClick={() => {
                        setEditFullName(user?.fullName || "");
                        setEditPhone(user?.phone || "");
                        setSaveError(null);
                        setShowProfileModal(true);
                        setShowUserDropdown(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Edit3 className="w-4 h-4 text-[#C9973C]" /> Chỉnh Sửa Thông Tin Cá Nhân
                    </button>

                    {user?.role === "ADMIN" && (
                      <Link
                        href="/admin"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-[#0F1C47] bg-amber-50 hover:bg-amber-100 transition-colors border-y border-amber-200"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#C9973C]" /> Bảng Quản Trị Admin
                      </Link>
                    )}

                    {canSeeClientPortal && (
                      <Link
                        href="/khach-hang"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-[#0F1C47] bg-blue-50 hover:bg-blue-100 transition-colors border-y border-blue-200"
                      >
                        <Building2 className="w-4 h-4 text-[#1B3A8F]" /> Cổng Khách Hàng
                      </Link>
                    )}

                    {(user?.role === "MEMBER" || user?.role === "BUSINESS") && (
                      <Link
                        href="/tai-khoan"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <User className="w-4 h-4 text-[#1B3A8F]" /> Tài Khoản Của Tôi
                      </Link>
                    )}

                    <Link
                      href="/tuyen-dung"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Briefcase className="w-4 h-4 text-[#1B3A8F]" /> Việc Làm Đang Tuyển
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-1"
                    >
                      <LogOut className="w-4 h-4 text-red-500" /> Đăng Xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0F1C47] hover:bg-[#1B3A8F] text-white text-xs font-bold rounded-sm transition-colors duration-200 uppercase tracking-wide"
              >
                <LogIn className="w-4 h-4" /> {t("header.login")}
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="xl:hidden flex items-center gap-4">
            <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
              <button onClick={() => setLanguage("vi")} className={`transition-opacity ${language === "vi" ? "opacity-100" : "opacity-40"}`}><VietnamFlag /></button>
              <button onClick={() => setLanguage("en")} className={`transition-opacity ${language === "en" ? "opacity-100" : "opacity-40"}`}><UKFlag /></button>
            </div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-[#1b3a8f] hover:bg-gray-100 focus:outline-none transition-colors duration-200"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 right-0 border-b border-gray-100 bg-white shadow-xl transition-all duration-300 overflow-hidden ${
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2.5 rounded-md text-sm uppercase tracking-wide ${
                  isActive
                    ? "font-bold text-[#1b3a8f] bg-blue-50"
                    : "font-semibold text-gray-700 hover:text-[#1b3a8f] hover:bg-gray-50"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          
          <hr className="border-gray-100 my-4" />
          
          <div className="flex flex-col gap-4 px-3">
            {user ? (
              <div className="space-y-2">
                <div className="p-3 bg-gray-50 rounded-xl text-xs">
                  <div className="font-bold text-[#0F1C47]">{user.fullName || "Tài khoản của tôi"}</div>
                  <div className="text-gray-400">{user.email}</div>
                </div>
                {canSeeClientPortal && (
                  <Link
                    href="/khach-hang"
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-[#1B3A8F] font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 text-sm"
                  >
                    <Building2 className="w-4 h-4" /> Cổng Khách Hàng
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white font-bold bg-red-600 hover:bg-red-700 shadow-md text-sm uppercase"
                >
                  <LogOut className="w-4 h-4" /> Đăng Xuất
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 py-3 rounded-lg text-white font-bold bg-[#1b3a8f] hover:bg-[#152e72] shadow-md text-sm uppercase"
              >
                <LogIn className="w-4 h-4" /> {t("header.login")}
              </Link>
            )}
            
            <div className="flex items-center justify-center gap-6 py-2">
              <button 
                onClick={() => { setLanguage("vi"); setIsOpen(false); }}
                className={`transition-opacity ${language === "vi" ? "opacity-100 scale-110" : "opacity-50"}`}
              >
                <VietnamFlag />
              </button>
              <button 
                onClick={() => { setLanguage("en"); setIsOpen(false); }}
                className={`transition-opacity ${language === "en" ? "opacity-100 scale-110" : "opacity-50"}`}
              >
                <UKFlag />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowProfileModal(false)} />
          
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 lg:p-8 shadow-2xl z-10 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div className="w-10 h-10 rounded-full bg-[#1B3A8F] text-white flex items-center justify-center font-bold">
                <Edit3 className="w-5 h-5 text-[#C9973C]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#0F1C47]">Chỉnh Sửa Thông Tin</h3>
                <p className="text-xs text-gray-500">Cập nhật tên hiển thị & thông tin cá nhân</p>
              </div>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Cập nhật thông tin thành công!</span>
              </div>
            )}

            {saveError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Email đăng nhập (Cố định)</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ""}
                  className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-500 outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Họ và tên hiển thị *</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-xl p-3 text-sm outline-none font-semibold text-gray-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Số điện thoại *</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="0901234567"
                  pattern="^(0|\+84)(3[2-9]|5[25689]|7[0678]|8[1-9]|9[0-9])[0-9]{7}$"
                  title="Số điện thoại Việt Nam hợp lệ, VD: 0912345678"
                  className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-xl p-3 text-sm outline-none font-semibold text-gray-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#1B3A8F] hover:bg-[#0F1C47] disabled:opacity-60 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>

            {/* Đổi mật khẩu — thu gọn mặc định, tách riêng khỏi form thông tin cá nhân */}
            <div className="mt-5 pt-5 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setShowPwFields((s) => !s); setPwError(null); }}
                className="w-full flex items-center justify-between text-xs font-bold text-[#0F1C47]"
              >
                <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-[#C9973C]" /> Đổi Mật Khẩu</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPwFields ? "rotate-180" : ""}`} />
              </button>

              {showPwFields && (
                <form onSubmit={handleChangePassword} className="space-y-3 mt-4">
                  {pwSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Đổi mật khẩu thành công!
                    </div>
                  )}
                  {pwError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" /> {pwError}
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Mật khẩu hiện tại</label>
                    <input
                      type="password" required value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-xl p-3 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Mật khẩu mới</label>
                    <input
                      type="password" required minLength={8} value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-xl p-3 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Xác nhận mật khẩu mới</label>
                    <input
                      type="password" required value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-xl p-3 text-sm outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={pwSaving}
                    className="w-full flex items-center justify-center gap-1.5 px-6 py-2.5 bg-[#0F1C47] hover:bg-[#1B3A8F] disabled:opacity-60 text-white font-bold rounded-xl text-xs shadow-md"
                  >
                    <Lock className="w-4 h-4" /> {pwSaving ? "Đang đổi..." : "Xác Nhận Đổi Mật Khẩu"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
