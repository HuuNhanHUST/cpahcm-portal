"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, KeyRound, ArrowLeft } from "lucide-react";
import { API_BASE } from "../../lib/config";

// Phải khớp STRONG_PASSWORD_REGEX ở backend/src/common/validators/strong-password.validator.ts
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Liên kết đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu lại từ trang đăng nhập.");
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 50) {
      setError("Mật khẩu phải có từ 8 đến 50 ký tự.");
      return;
    }
    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      setError("Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt (@$!%*?&).");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Đặt lại mật khẩu thất bại. Liên kết có thể đã hết hạn.");
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F4FF] to-[#F4F6F9] flex flex-col font-sans">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-28">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 lg:p-10">
          <div className="w-14 h-14 rounded-2xl bg-[#1B3A8F]/10 flex items-center justify-center mb-5">
            <KeyRound className="w-7 h-7 text-[#1B3A8F]" />
          </div>

          {done ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle className="w-5 h-5" />
                <h1 className="text-lg font-black">Đặt lại mật khẩu thành công!</h1>
              </div>
              <p className="text-sm text-gray-500">Đang chuyển tới trang đăng nhập...</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-black text-[#0F1C47] mb-1">Đặt Lại Mật Khẩu</h1>
              <p className="text-sm text-gray-500 mb-6">Nhập mật khẩu mới cho tài khoản của bạn.</p>

              {!token && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  Không tìm thấy token trong liên kết. Vui lòng mở lại email hoặc yêu cầu đặt lại mật khẩu mới từ trang đăng nhập.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Mật khẩu mới</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-11 py-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20"
                    />
                    <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Xác nhận mật khẩu</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-600 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#1B3A8F] hover:bg-[#0F1C47] disabled:opacity-60 text-white font-bold rounded-2xl text-sm shadow-lg transition-all"
                >
                  {loading ? "Đang xử lý..." : "Đặt Lại Mật Khẩu"}
                </button>
              </form>

              <Link href="/login" className="mt-5 flex items-center justify-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#1B3A8F]">
                <ArrowLeft className="w-3.5 h-3.5" /> Quay lại đăng nhập
              </Link>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
