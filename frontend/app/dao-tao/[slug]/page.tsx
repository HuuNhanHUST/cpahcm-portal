import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CourseDetailClient from "./CourseDetailClient";
import { API_BASE, Course } from "../shared";

export const revalidate = 300;

async function getCourse(slug: string): Promise<Course | null> {
  try {
    const res = await fetch(`${API_BASE}/courses/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

async function getRelatedCourses(slug: string): Promise<Course[]> {
  try {
    const res = await fetch(`${API_BASE}/courses/${slug}/related`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) return { title: "Khóa học không tồn tại | CPA HCM" };
  return {
    title: `${course.title} | CPA Academy`,
    description: course.description || course.title,
  };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) notFound();

  const relatedCourses = await getRelatedCourses(slug);
  return <CourseDetailClient course={course} relatedCourses={relatedCourses} />;
}
