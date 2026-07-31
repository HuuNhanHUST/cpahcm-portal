"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, LogIn } from "lucide-react";

import { API_BASE } from "../../lib/config";
import { authFetch } from "../../lib/authFetch";
export { API_BASE };

export type AuthUser = { id: string; role: string; fullName?: string; email?: string; companyId?: string | null };

export const DOCUMENT_CATEGORIES: { value: string; label: string }[] = [
  { value: "INVOICE", label: "Hóa đơn" },
  { value: "TAX_REPORT", label: "Báo cáo thuế" },
  { value: "CONTRACT", label: "Hợp đồng" },
  { value: "ACCOUNTING", label: "Chứng từ kế toán" },
  { value: "OTHER", label: "Khác" },
];

export const categoryLabel = (value: string) => DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label || value;

export const STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chờ xử lý", className: "bg-amber-50 text-amber-700 border-amber-200" },
  PROCESSING: { label: "Đang xử lý", className: "bg-blue-50 text-blue-700 border-blue-200" },
  COMPLETED: { label: "Hoàn tất", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Từ chối", className: "bg-red-50 text-red-700 border-red-200" },
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

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

      // `user` trong storage chỉ được ghi lúc đăng nhập — nếu admin duyệt link-request công ty
      // (hoặc đổi role...) trong lúc phiên vẫn đang mở, companyId cũ trong storage không tự cập
      // nhật, khiến trang vẫn hiện "chưa liên kết công ty" dù backend đã cho phép truy cập. Đồng
      // bộ lại 1 lần khi mount bằng dữ liệu mới nhất từ server thay vì bắt người dùng đăng xuất/
      // đăng nhập lại.
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

/**
 * `authUser` quyết định thông điệp: chưa đăng nhập → mời đăng nhập; ĐÃ đăng nhập nhưng sai role
 * (vd. MEMBER) → không hiện nút "Đăng nhập" (gây hiểu lầm là chưa đăng nhập), thay bằng thông
 * báo rõ đây là tính năng dành riêng cho tài khoản Doanh nghiệp.
 */
export function AuthGateNotice({
  authUser, title, desc, wrongRoleDesc, loginLabel,
}: {
  authUser: AuthUser | null;
  title: string;
  desc: string;
  wrongRoleDesc: string;
  loginLabel: string;
}) {
  const isLoggedInWrongRole = !!authUser;

  return (
    <div className="bg-white p-10 lg:p-14 rounded-sm border border-gray-100 text-center space-y-4 max-w-xl mx-auto">
      <div className="w-14 h-14 rounded-full bg-[#F4F6F9] flex items-center justify-center mx-auto">
        <ShieldCheck className="w-7 h-7 text-[#C9973C]" />
      </div>
      <h3 className="text-lg font-bold text-[#0F1C47]">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{isLoggedInWrongRole ? wrongRoleDesc : desc}</p>
      {!isLoggedInWrongRole && (
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

/** Tải file có xác thực JWT — endpoint /documents/:id/download (hoặc /result-file) yêu cầu
 * Authorization header, không thể dùng <a href> tĩnh như ảnh public, phải fetch → blob → trigger
 * download thủ công. `path` mặc định "download" (file gốc khách hàng tải lên); truyền "result-file"
 * để tải file kết quả Admin đính kèm.
 *
 * Dùng authFetch() thay vì fetch() thô + header chụp sẵn — token access hết hạn sau 15 phút, và
 * header được truyền vào trước đây chỉ là ảnh chụp lúc mount (không tự cập nhật dù có interval
 * refresh chạy ngầm), nên phiên đăng nhập vẫn còn hợp lệ nhưng request tải xuống lại mang token cũ
 * → 401 → hiện nhầm thông báo "không có quyền truy cập". authFetch tự đọc token mới nhất từ storage
 * và tự retry 1 lần sau khi refresh nếu dính 401. */
export async function downloadDocumentFile(
  id: string,
  fileName: string,
  path: "download" | "result-file" = "download",
): Promise<void> {
  const res = await authFetch(`${API_BASE}/documents/${id}/${path}`, {});
  if (!res.ok) {
    throw new Error("Không thể tải xuống chứng từ. Bạn có thể không có quyền truy cập.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  a.download = fileName;
  window.document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
