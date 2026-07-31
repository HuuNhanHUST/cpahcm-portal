import { API_BASE, API_ORIGIN as BACKEND_ORIGIN } from "../../lib/config";
export { API_BASE, BACKEND_ORIGIN };

/** Ảnh cover bài viết lưu dạng path tương đối (/uploads/posts/xxx.jpg) — ghép domain backend. */
export const postImageUrl = (imageUrl?: string | null) => (imageUrl ? `${BACKEND_ORIGIN}${imageUrl}` : null);

export const formatDate = (dateStr?: string) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

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

/** 6 chuyên mục cố định do Admin chọn khi đăng bài — nội dung thật, không dịch máy. */
export const POST_CATEGORIES = [
  "Pháp luật & Thuế",
  "Chuẩn mực Kế toán - Kiểm toán",
  "Đào tạo CPA",
  "Tuyển dụng",
  "Giải pháp Doanh nghiệp",
  "Hoạt động CPA HCM",
];
