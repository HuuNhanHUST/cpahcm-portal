"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, LogIn } from "lucide-react";

import { API_BASE, API_ORIGIN as BACKEND_ORIGIN } from "../../lib/config";
import { authFetch } from "../../lib/authFetch";
export { API_BASE, BACKEND_ORIGIN };

/** Ảnh vị trí tuyển dụng lưu dạng path tương đối (/uploads/jobs/xxx.jpg) — ghép domain backend. */
export const jobImageUrl = (imageUrl?: string | null) => (imageUrl ? `${BACKEND_ORIGIN}${imageUrl}` : null);

export type AuthUser = { id: string; role: string; fullName?: string; email?: string; phone?: string; companyId?: string | null };

/**
 * Đọc trạng thái đăng nhập từ localStorage/sessionStorage (khớp cách /login lưu, tùy
 * "Ghi nhớ đăng nhập"). Dùng chung cho trang danh sách và trang chi tiết tuyển dụng.
 */
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

      // Đồng bộ lại companyId/role mới nhất từ server — user trong storage chỉ ghi lúc đăng nhập,
      // nếu admin duyệt link-request công ty trong lúc phiên vẫn mở thì companyId cũ sẽ khiến tab
      // "Đăng tin tuyển dụng" vẫn báo "chưa liên kết công ty" dù đã được duyệt.
      authFetch(`${API_BASE}/auth/profile`, {})
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          const fresh = json?.data ?? json;
          if (!fresh?.id) return;
          const merged: AuthUser = { id: fresh.id, role: fresh.role, fullName: fresh.fullName, email: fresh.email, phone: fresh.phone, companyId: fresh.companyId ?? null };
          setAuthUser(merged);
          const store = localStorage.getItem("user") ? localStorage : sessionStorage;
          store.setItem("user", JSON.stringify({ ...JSON.parse(userRaw), ...merged }));
        })
        .catch(() => {
          // Không chặn render nếu refresh thất bại — vẫn dùng dữ liệu cache cũ.
        });
    }
  }, []);

  const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  return { authUser, authToken, authHeaders, authMounted };
}

/**
 * Chặn hành động cần đăng nhập + đúng role (ứng tuyển = MEMBER, đăng tin = BUSINESS).
 * ADMIN luôn được phép — khớp với RolesGuard phía backend (Admin bypass mọi @Roles()).
 * Trả về `null` (không chặn) khi user đã đủ điều kiện; ngược lại render thông báo.
 */
export function AuthGateNotice({
  authUser, requiredRole, title, desc, loginLabel,
}: {
  authUser: AuthUser | null;
  requiredRole: "MEMBER" | "BUSINESS";
  title: string;
  desc: string;
  loginLabel: string;
}) {
  if (authUser && (authUser.role === requiredRole || authUser.role === "ADMIN")) return null;

  return (
    <div className="bg-white p-10 lg:p-14 rounded-sm border border-gray-100 text-center space-y-4 max-w-xl mx-auto">
      <div className="w-14 h-14 rounded-full bg-[#F4F6F9] flex items-center justify-center mx-auto">
        <ShieldCheck className="w-7 h-7 text-[#C9973C]" />
      </div>
      <h3 className="text-lg font-bold text-[#0F1C47]">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
      {!authUser && (
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#C9973C] hover:bg-[#D4AF37] text-[#0F1C47] font-bold rounded-sm text-sm uppercase tracking-wide"
        >
          <LogIn className="w-4 h-4" /> {loginLabel}
        </Link>
      )}
    </div>
  );
}

/** Vị trí/loại hình là nội dung thật do Admin nhập — hiển thị nguyên văn, không dịch máy. */
export const locationLabel = (loc?: string | null) => loc || "—";
export const typeLabel = (type?: string | null, fulltimeLabel?: string) => type || fulltimeLabel || "—";

export const timeAgo = (
  dateStr: string | undefined,
  t: (key: string) => string,
) => {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return t("jobs.postedToday");
  if (diffDays === 1) return `1 ${t("jobs.dayAgoSuffix")}`;
  if (diffDays < 7) return `${diffDays} ${t("jobs.daysAgoSuffix")}`;
  const diffWeeks = Math.floor(diffDays / 7);
  return diffWeeks === 1 ? `1 ${t("jobs.weekAgoSuffix")}` : `${diffWeeks} ${t("jobs.weeksAgoSuffix")}`;
};
