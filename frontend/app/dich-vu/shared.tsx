import { API_BASE, API_ORIGIN as BACKEND_ORIGIN } from "../../lib/config";
export { API_BASE, BACKEND_ORIGIN };

/** Ảnh cover dịch vụ lưu dạng path tương đối (/uploads/services/xxx.jpg) — ghép domain backend. */
export const serviceImageUrl = (imageUrl?: string | null) => (imageUrl ? `${BACKEND_ORIGIN}${imageUrl}` : null);

/** 4 chuyên mục cố định — phải khớp đúng SERVICE_CATEGORIES ở backend/src/services/dto/create-service.dto.ts. */
export const SERVICE_CATEGORIES = ["Kế toán", "Kiểm toán", "Thuế", "Doanh nghiệp"];

export type Service = {
  id: string;
  slug: string;
  category: string;
  tag: string | null;
  title: string;
  shortDesc: string;
  longDescription: string | null;
  imageUrl: string | null;
  features: string[];
  deliverables: string[];
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
