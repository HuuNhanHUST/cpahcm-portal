"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";

interface RoleGuardProps {
  allowedRoles: string[];
  deniedTitle: string;
  deniedDesc: string;
  children: React.ReactNode;
}

/**
 * Chặn TOÀN BỘ trang cho tài khoản sai role — khác pattern "AuthGateNotice" (chỉ chặn 1 khối nội
 * dung, phần còn lại của trang vẫn hiển thị bình thường) dùng ở /dien-dan, /tuyen-dung, /dao-tao
 * vì các trang đó có nội dung công khai thật sự đáng xem (danh sách khóa học/việc làm/bài viết).
 * Dùng RoleGuard cho các trang KHÔNG có giá trị công khai nào — vd. /khach-hang chỉ chứa dữ liệu
 * riêng của 1 công ty, người sai role xem cả trang cũng chẳng để làm gì — mirror đúng AdminGuard.
 */
export default function RoleGuard({ allowedRoles, deniedTitle, deniedDesc, children }: RoleGuardProps) {
  const [status, setStatus] = useState<"checking" | "authorized" | "unauthorized">("checking");

  useEffect(() => {
    const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");

    if (!rawUser || !token) {
      setStatus("unauthorized");
      return;
    }

    try {
      const user = JSON.parse(rawUser);
      setStatus(allowedRoles.includes(user?.role) ? "authorized" : "unauthorized");
    } catch {
      setStatus("unauthorized");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B3A8F]" />
          <p className="text-sm font-semibold">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1C47]">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-400" />
          </div>
          <div className="text-[#C9973C] text-xs font-bold uppercase tracking-[0.2em] mb-2">{deniedTitle}</div>
          <h1 className="text-3xl font-black text-white mb-3">Truy Cập Bị Từ Chối</h1>
          <p className="text-blue-200/70 text-sm mb-8 leading-relaxed">{deniedDesc}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => (window.location.href = "/login")}
              className="px-8 py-3 bg-[#C9973C] hover:bg-[#b38531] text-white font-bold rounded-xl text-sm transition-all shadow-lg"
            >
              Đăng Nhập Tài Khoản Khác
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold rounded-xl text-sm transition-all"
            >
              Về Trang Chủ
            </button>
          </div>
          <div className="mt-10 flex items-center justify-center gap-2 text-blue-200/40 text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>CPA HCM Portal — Hệ thống bảo mật phân quyền RBAC</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
