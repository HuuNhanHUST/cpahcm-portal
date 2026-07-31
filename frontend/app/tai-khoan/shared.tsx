"use client";

import { useState, useEffect } from "react";
import { authFetch } from "../../lib/authFetch";
import { API_BASE } from "../../lib/config";

export { API_BASE, API_ORIGIN as BACKEND_ORIGIN } from "../../lib/config";

export type AuthUser = {
  id: string;
  role: string;
  fullName?: string;
  email?: string;
  companyId?: string | null;
};

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

      // Đồng bộ lại companyId/role mới nhất từ server — user trong storage chỉ ghi lúc đăng nhập,
      // nếu admin duyệt link-request công ty trong lúc phiên vẫn mở thì dữ liệu cũ trong storage
      // không tự cập nhật, khiến trang vẫn hiện sai trạng thái cho tới khi đăng xuất/đăng nhập lại.
      authFetch(`${API_BASE}/auth/profile`, {})
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          const fresh = json?.data ?? json;
          if (!fresh?.id) return;
          const merged: AuthUser = { id: fresh.id, role: fresh.role, fullName: fresh.fullName, email: fresh.email, companyId: fresh.companyId ?? null };
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

export function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export const ENROLLMENT_STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chờ thanh toán", className: "bg-amber-50 text-amber-700 border-amber-200" },
  PAID: { label: "Đã thanh toán", className: "bg-blue-50 text-blue-700 border-blue-200" },
  STUDYING: { label: "Đang học", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  COMPLETED: { label: "Đã hoàn thành", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export const APPLICATION_STATUS_META: Record<string, { label: string; className: string }> = {
  NEW: { label: "Mới nộp", className: "bg-amber-50 text-amber-700 border-amber-200" },
  REVIEWING: { label: "Đang xem xét", className: "bg-blue-50 text-blue-700 border-blue-200" },
  INTERVIEW: { label: "Mời phỏng vấn", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  HIRED: { label: "Đã tuyển", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Từ chối", className: "bg-red-50 text-red-700 border-red-200" },
};

export const EMPLOYER_REQUEST_STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chờ duyệt", className: "bg-amber-50 text-amber-700 border-amber-200" },
  CONTACTED: { label: "Đã liên hệ", className: "bg-blue-50 text-blue-700 border-blue-200" },
  IN_PROGRESS: { label: "Đang xử lý", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  CLOSED: { label: "Đã đóng", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

export const LINK_REQUEST_STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chờ duyệt", className: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED: { label: "Đã duyệt", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Từ chối", className: "bg-red-50 text-red-700 border-red-200" },
};

// Khớp CHÍNH XÁC với composeEmployerPostingData() ở backend (recruitment.service.ts) — dùng để
// tách jobDescription (1 chuỗi ghép) ngược lại thành từng field riêng khi mở form Sửa.
export const EMPLOYER_DESC_LABELS: [string, string][] = [
  ["description", "Mô tả: "],
  ["requirements", "Yêu cầu: "],
  ["industry", "Ngành nghề: "],
  ["location", "Địa điểm: "],
  ["workType", "Hình thức: "],
  ["gender", "Giới tính: "],
  ["experience", "Kinh nghiệm: "],
  ["level", "Cấp bậc: "],
  ["education", "Bằng cấp: "],
  ["benefits", "Phúc lợi: "],
  ["address", "Địa chỉ trụ sở: "],
  ["companySize", "Quy mô công ty: "],
  ["companyDesc", "Giới thiệu công ty: "],
];

export function parseEmployerJobDescription(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!text) return result;
  for (let i = 0; i < EMPLOYER_DESC_LABELS.length; i++) {
    const [key, label] = EMPLOYER_DESC_LABELS[i];
    const start = i === 0
      ? (text.startsWith(label) ? label.length : -1)
      : (() => { const idx = text.indexOf(`\n${label}`); return idx >= 0 ? idx + 1 + label.length : -1; })();
    if (start === -1) continue;

    let end = text.length;
    for (let j = i + 1; j < EMPLOYER_DESC_LABELS.length; j++) {
      const idx = text.indexOf(`\n${EMPLOYER_DESC_LABELS[j][1]}`, start);
      if (idx >= 0) { end = idx; break; }
    }
    result[key] = text.slice(start, end).trim();
  }
  return result;
}

export function StatusBadge({ status, meta }: { status: string; meta: Record<string, { label: string; className: string }> }) {
  const m = meta[status] || { label: status, className: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${m.className}`}>
      {m.label}
    </span>
  );
}
