"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";

/**
 * Backend redirect tới đây sau khi đăng nhập Google/Facebook thành công, kèm accessToken/
 * refreshToken/user qua query string (xem AuthController.redirectWithTokens). Trang này chỉ có
 * nhiệm vụ lưu token đúng chỗ (khớp key localStorage mà /login dùng: accessToken/refreshToken/
 * user) rồi điều hướng tiếp — không hiện UI thật, chỉ 1 màn hình loading thoáng qua.
 */
export default function SocialCallbackPage() {
  return (
    // useSearchParams() bắt buộc phải nằm trong Suspense boundary khi dùng App Router,
    // nếu không "next build" sẽ lỗi lúc prerender trang này (build production sẽ fail hoàn toàn).
    <Suspense fallback={null}>
      <SocialCallbackContent />
    </Suspense>
  );
}

function SocialCallbackContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const userRaw = searchParams.get("user");

    if (!accessToken || !userRaw) {
      setError("Đăng nhập thất bại — thiếu thông tin xác thực từ máy chủ.");
      return;
    }

    try {
      const user = JSON.parse(userRaw);
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));
      window.location.href = user.role === "ADMIN" ? "/admin" : "/";
    } catch {
      setError("Đăng nhập thất bại — dữ liệu tài khoản không hợp lệ.");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      {error ? (
        <div className="text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-gray-600">{error}</p>
          <a href="/login" className="inline-block text-sm font-bold text-[#1B3A8F] hover:underline">
            Quay lại đăng nhập
          </a>
        </div>
      ) : (
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B3A8F] mx-auto" />
          <p className="text-gray-500 text-sm">Đang hoàn tất đăng nhập...</p>
        </div>
      )}
    </div>
  );
}
