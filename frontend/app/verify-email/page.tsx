"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { CheckCircle, XCircle, Loader2, MailCheck, ArrowRight } from "lucide-react";
import { API_BASE } from "../../lib/config";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("");
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (!token) {
      setStatus("error");
      setMessage("Liên kết xác thực không hợp lệ — thiếu token.");
      return;
    }

    fetch(`${API_BASE}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || "Xác thực email thất bại.");
        setStatus("success");
        setMessage(data?.message || "Xác thực email thành công!");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.message || "Liên kết đã hết hạn hoặc không hợp lệ.");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F4FF] to-[#F4F6F9] flex flex-col font-sans">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-28">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 lg:p-10 text-center space-y-4">
          {status === "verifying" && (
            <>
              <Loader2 className="w-10 h-10 text-[#1B3A8F] animate-spin mx-auto" />
              <h1 className="text-lg font-black text-[#0F1C47]">Đang xác thực email...</h1>
            </>
          )}
          {status === "success" && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <h1 className="text-lg font-black text-[#0F1C47]">Xác Thực Thành Công!</h1>
              <p className="text-sm text-gray-500">{message}</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 mt-2 px-6 py-3 bg-[#1B3A8F] hover:bg-[#0F1C47] text-white font-bold rounded-2xl text-sm shadow-lg transition-all"
              >
                Đăng Nhập Ngay <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
                <XCircle className="w-7 h-7 text-red-500" />
              </div>
              <h1 className="text-lg font-black text-[#0F1C47]">Xác Thực Thất Bại</h1>
              <p className="text-sm text-gray-500">{message}</p>
              <Link href="/login" className="inline-flex items-center gap-2 mt-2 text-xs font-bold text-[#1B3A8F] hover:underline">
                <MailCheck className="w-3.5 h-3.5" /> Quay lại đăng nhập
              </Link>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
