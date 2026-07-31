"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, LogIn } from "lucide-react";

export { API_BASE } from "../../lib/config";

export type AuthUser = { id: string; role: string; fullName?: string; email?: string; avatarUrl?: string | null };

/** Đọc trạng thái đăng nhập từ localStorage/sessionStorage — khớp cách /login lưu. */
export function useAuthUser() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authMounted, setAuthMounted] = useState(false);

  useEffect(() => {
    setAuthMounted(true);
    const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
    const userRaw = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (token && userRaw) {
      try {
        setAuthToken(token);
        setAuthUser(JSON.parse(userRaw));
      } catch {
        // dữ liệu lưu trữ hỏng — coi như chưa đăng nhập, không chặn render trang.
      }
    }
  }, []);

  const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  return { authUser, authToken, authHeaders, authMounted };
}

/** Tạo chủ đề/trả lời yêu cầu MEMBER hoặc BUSINESS — ADMIN luôn bypass (khớp RolesGuard BE). */
export function AuthGateNotice({
  authUser, title, desc, loginLabel,
}: {
  authUser: AuthUser | null;
  title: string;
  desc: string;
  loginLabel: string;
}) {
  if (authUser && ["MEMBER", "BUSINESS", "ADMIN"].includes(authUser.role)) return null;

  return (
    <div className="bg-white p-8 rounded-sm border border-gray-100 text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-[#F4F6F9] flex items-center justify-center mx-auto">
        <ShieldCheck className="w-7 h-7 text-[#C9973C]" />
      </div>
      <h3 className="text-lg font-bold text-[#0F1C47]">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
      <Link
        href="/login"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#C9973C] hover:bg-[#D4AF37] text-[#0F1C47] font-bold rounded-sm text-sm uppercase tracking-wide"
      >
        <LogIn className="w-4 h-4" /> {loginLabel}
      </Link>
    </div>
  );
}

export const canModify = (authUser: AuthUser | null, authorId: string) =>
  !!authUser && (authUser.id === authorId || authUser.role === "ADMIN");

export function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
