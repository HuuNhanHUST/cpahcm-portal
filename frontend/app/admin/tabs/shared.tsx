"use client";

import { useEffect } from "react";

/** Component/hằng số dùng chung giữa nhiều tab Admin — tách riêng để mỗi tab tự import mà không
 * phải phụ thuộc ngược vào app/admin/page.tsx (tránh vòng lặp import khi page.tsx tải các tab
 * này qua next/dynamic). */

export const PAGE_SIZE = 10;

/** Điều hướng trang dùng chung — trước đây các tab render toàn bộ mảng không giới hạn, với
 * vài trăm bản ghi (users/documents/companies...) sẽ vừa chậm vừa khó dò tìm bằng mắt.
 * `pageSize` mặc định = PAGE_SIZE (khớp cách các tab cắt trang phía client), nhưng tab nào phân
 * trang THẬT ở backend với kích thước trang khác (vd. ChatLogsTab dùng 20) phải truyền đúng số đó
 * — nếu không, tổng số trang tính sai (vd. 15 kết quả / PAGE_SIZE=10 ra "2 trang" trong khi
 * backend trả hết 15 kết quả ngay trang 1, bấm "Sau" ra trang trống dù vẫn còn dữ liệu). */
export function Pagination({ page, totalItems, onChange, pageSize = PAGE_SIZE }: { page: number; totalItems: number; onChange: (p: number) => void; pageSize?: number }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Xóa bản ghi cuối cùng của trang hiện tại (VD: đang ở trang 2/2, xóa nốt item cuối) làm
  // totalPages giảm xuống dưới `page` — nếu không tự lùi lại, danh sách hiển thị "trống" dù vẫn
  // còn dữ liệu ở các trang trước, và nút "← Trước" cũng biến mất luôn vì totalPages <= 1 khiến
  // component return null ngay bên dưới, không còn cách nào bấm quay lại.
  useEffect(() => {
    if (page > totalPages) onChange(totalPages);
  }, [page, totalPages, onChange]);

  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 pt-5">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 disabled:opacity-40 hover:bg-gray-50"
      >
        ← Trước
      </button>
      <span className="text-xs text-gray-500 font-semibold">Trang {page}/{totalPages} · {totalItems} kết quả</span>
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 disabled:opacity-40 hover:bg-gray-50"
      >
        Sau →
      </button>
    </div>
  );
}

export type StatCardData = { label: string; value: number | string; icon: any; accent: string; bg: string };

/** Ô số liệu tổng quan dùng chung cho mọi tab — label phía trên (uppercase, nhỏ), số lớn làm
 * trọng tâm, icon lùi vào góc làm điểm nhấn phụ thay vì chiếm nửa diện tích ô như trước (mẫu
 * "icon-trong-vòng-tròn-màu" lặp lại giống hệt nhau ở cả 9 tab là nguyên nhân chính khiến giao
 * diện trông như template dựng sẵn). Viền + shadow rất nhẹ, chỉ rõ hơn khi hover để có chiều sâu
 * mà không nặng nề. */
function StatCard({ label, value, icon: Icon, accent, bg }: StatCardData) {
  return (
    <div className="group relative bg-white border border-gray-100 rounded-2xl p-5 transition-all duration-200 hover:border-gray-200 hover:shadow-[0_4px_20px_-8px_rgba(15,28,71,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.08em] truncate">{label}</div>
          <div className={`text-[28px] leading-tight font-black tracking-tight mt-1.5 ${accent}`}>{value}</div>
        </div>
        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105`}>
          <Icon className={`w-4 h-4 ${accent}`} />
        </div>
      </div>
    </div>
  );
}

export function StatGrid({ stats, cols = 4 }: { stats: StatCardData[]; cols?: 3 | 4 | 5 }) {
  const colsClass = cols === 5 ? "sm:grid-cols-3 lg:grid-cols-5" : cols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";
  return (
    <div className={`grid grid-cols-2 ${colsClass} gap-3`}>
      {stats.map((s) => <StatCard key={s.label} {...s} />)}
    </div>
  );
}
