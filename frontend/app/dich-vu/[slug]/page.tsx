import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ServiceDetailClient from "./ServiceDetailClient";
import { API_BASE, Service } from "../shared";

export const revalidate = 300;

async function getService(slug: string): Promise<Service | null> {
  try {
    const res = await fetch(`${API_BASE}/services/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

async function getRelatedServices(slug: string): Promise<Service[]> {
  try {
    const res = await fetch(`${API_BASE}/services/${slug}/related`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return { title: "Dịch vụ không tồn tại | CPA HCM" };
  return {
    title: `${service.title} | CPA HCM`,
    description: service.shortDesc,
  };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();

  const relatedServices = await getRelatedServices(slug);
  return <ServiceDetailClient service={service} relatedServices={relatedServices} />;
}
