import type { Metadata } from "next";
import CoursesPageClient from "./CoursesPageClient";
import { API_BASE, Course } from "./shared";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Đào Tạo CPA Academy | CPA HCM",
  description:
    "Trung tâm đào tạo CPA Academy — luyện thi Chứng chỉ Kiểm toán viên, Kế toán trưởng, Kế toán tổng hợp và Thuế, trang bị kiến thức chuyên sâu và kỹ năng thực tế.",
};

async function getCourses(): Promise<Course[]> {
  try {
    const res = await fetch(`${API_BASE}/courses`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export default async function CoursesPage() {
  const courses = await getCourses();
  return <CoursesPageClient initialCourses={courses} />;
}
