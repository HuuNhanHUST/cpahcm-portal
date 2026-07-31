import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import FloatingContact from "../components/FloatingContact";
import ChatWidget from "../components/ChatWidget";
import { LanguageProvider } from "../context/LanguageContext";

// Thiếu weight "900" trong khi rất nhiều nơi dùng Tailwind `font-black` (font-weight: 900) —
// trình duyệt phải tự "giả lập" độ đậm 900 bằng cách làm dày nét từ weight 800 có sẵn (synthetic/
// faux bold), thuật toán này không hiểu cấu trúc dấu tổ hợp tiếng Việt nên làm biến dạng các chữ
// có dấu chồng (vd. "ể" = ê + dấu hỏi) thành hình vệt đen loang lổ. Thêm "900" để trình duyệt tải
// đúng bộ chữ đậm thật, chữ có dấu render sạch ở mọi nơi dùng font-black.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "CPA HCM Portal - Nền Tảng Kế Toán, Kiểm Toán & Đào Tạo Chuyên Nghiệp",
  description: "Cổng thông tin dịch vụ kế toán doanh nghiệp B2B, đào tạo kiểm toán viên chất lượng cao và tuyển dụng nhân sự chuyên ngành tài chính.",
  keywords: ["CPA HCM", "kế toán", "kiểm toán", "đào tạo kế toán", "dịch vụ thuế", "tuyển dụng kế toán"],
  authors: [{ name: "CPA HCM Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground relative">
        <LanguageProvider>
          {children}
          <ChatWidget />
          <FloatingContact />
        </LanguageProvider>
      </body>
    </html>
  );
}
