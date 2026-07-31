"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, Lock } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "authorized" | "unauthorized">("checking");

  useEffect(() => {
    // Đọc user từ localStorage hoặc sessionStorage
    const rawUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    const token =
      localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");

    if (!rawUser || !token) {
      setStatus("unauthorized");
      return;
    }

    try {
      const user = JSON.parse(rawUser);
      if (user?.role === "ADMIN") {
        setStatus("authorized");
      } else {
        setStatus("unauthorized");
      }
    } catch {
      setStatus("unauthorized");
    }
  }, []);

  // Đang kiểm tra quyền
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

  // Không có quyền Admin
  if (status === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1C47]">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">
            Truy Cập Bị Từ Chối
          </h1>
          <p className="text-blue-200/70 text-sm mb-8 leading-relaxed">
            Trang này chỉ dành cho Quản Trị Viên (ADMIN) của hệ thống CPA HCM.
            <br />
            Vui lòng đăng nhập bằng tài khoản có quyền Admin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => (window.location.href = "/login")}
              className="px-8 py-3 bg-[#C9973C] hover:bg-[#b38531] text-white font-bold rounded-xl text-sm transition-all shadow-lg"
            >
              Đăng Nhập Tài Khoản Admin
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

  // Có quyền → render trang Admin bình thường
  return <>{children}</>;
}
