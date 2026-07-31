import { API_BASE, API_ORIGIN as BACKEND_ORIGIN } from "../../lib/config";
export { API_BASE, BACKEND_ORIGIN };

/** Ảnh cover khóa học lưu dạng path tương đối (/uploads/courses/xxx.jpg) — ghép domain backend. */
export const courseImageUrl = (imageUrl?: string | null) => (imageUrl ? `${BACKEND_ORIGIN}${imageUrl}` : null);

/** 4 chuyên mục cố định — phải khớp đúng COURSE_CATEGORIES ở backend/src/courses/dto/create-course.dto.ts. */
export const COURSE_CATEGORIES = ["CPA", "Kế toán trưởng", "Kế toán tổng hợp", "Thuế"];

/** Khóa học đào tạo OFFLINE — tài liệu ôn tập (video/PDF) công khai luôn, không yêu cầu đăng nhập/
 * đóng học phí, khớp cách trang chính thức cpahcm.com.vn/khoa-dao-tao cho tải tài liệu công khai. */
export type CourseLessonItem = {
  id: string;
  title: string;
  videoUrl: string | null;
  fileName: string | null;
  hasFile: boolean;
  order: number;
};

export type CourseModuleItem = {
  id: string;
  title: string;
  lessons: CourseLessonItem[];
  order: number;
};

export type Course = {
  id: string;
  title: string;
  slug: string;
  category: string;
  tag: string | null;
  description: string | null;
  longDescription: string | null;
  imageUrl: string | null;
  instructor: string | null;
  price: string; // Decimal đến từ Prisma qua JSON là string
  originalPrice: string | null;
  lessons: number;
  hours: number;
  level: string | null;
  schedule: string | null;
  isHot: boolean;
  isActive: boolean;
  displayOrder: number;
  modules?: CourseModuleItem[];
  createdAt: string;
  updatedAt: string;
};

export const formatPrice = (price: string | number | null | undefined) => {
  if (price === null || price === undefined) return "—";
  const n = Number(price);
  if (n === 0) return "Liên hệ";
  return n.toLocaleString("vi-VN") + "đ";
};
