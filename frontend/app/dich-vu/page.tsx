import type { Metadata } from "next";
import ServicesPageClient from "./ServicesPageClient";
import { API_BASE, Service } from "./shared";

// ISR 5 phút — nội dung do Admin cập nhật không cần realtime tuyệt đối, đủ nhanh để thấy
// hiệu lực sau khi sửa, đủ dài để giảm tải DB. Trang catalog/marketing — ưu tiên SEO/tốc độ
// tải đầu qua Server Component, khác với /tuyen-dung /tin-tuc dùng "use client" + useEffect.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Dịch Vụ Kế Toán, Kiểm Toán & Thuế | CPA HCM",
  description:
    "Giải pháp kế toán trọn gói, kiểm toán độc lập, tư vấn thuế chuyên sâu và thành lập doanh nghiệp — đồng hành cùng sự phát triển bền vững của doanh nghiệp bạn.",
};

async function getServices(): Promise<Service[]> {
  try {
    const res = await fetch(`${API_BASE}/services`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export default async function ServicesPage() {
  const services = await getServices();
  return <ServicesPageClient initialServices={services} />;
}
