"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import { Search, MapPin, Briefcase, GraduationCap, Wallet, Clock, ShieldAlert, Loader2, Lock, Send, CheckCircle2, XCircle } from "lucide-react";
import { useAuthUser, AuthGateNotice, API_BASE } from "../shared";
import { authFetch } from "../../../lib/authFetch";

type Candidate = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  desiredPosition: string;
  desiredLevel: string;
  location: string;
  industry: string;
  educationLevel: string;
  experienceYears: string;
  workType: string;
  minSalary: string | null;
  maxSalary: string | null;
  careerGoal: string | null;
  introductionStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
};

function formatSalary(min: string | null, max: string | null) {
  if (!min && !max) return "Thỏa thuận";
  const fmt = (v: string) => `${(Number(v) / 1_000_000).toLocaleString("vi-VN")} triệu`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  return fmt(min || max || "0");
}

export default function FindCandidatesPage() {
  const { authUser, authHeaders, authMounted } = useAuthUser();

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const canUse = authUser && (authUser.role === "BUSINESS" || authUser.role === "ADMIN");

  const fetchCandidates = () => {
    if (!canUse) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (location) params.set("location", location);
    authFetch(`${API_BASE}/recruitment/candidates?${params.toString()}`, { headers: authHeaders })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.message || "Không thể tải danh sách ứng viên.");
        setCandidates(Array.isArray(json?.data) ? json.data : []);
      })
      .catch((err) => setError(err?.message || "Không thể tải danh sách ứng viên."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authMounted) return;
    fetchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authMounted, authUser?.role]);

  const handleRequestIntroduction = async (candidateId: string) => {
    setRequestingId(candidateId);
    try {
      const res = await authFetch(`${API_BASE}/recruitment/candidates/${candidateId}/introduction-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ note: noteDraft[candidateId] || undefined }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể gửi yêu cầu.");
      setCandidates((prev) => prev?.map((c) => (c.id === candidateId ? { ...c, introductionStatus: "PENDING" } : c)) || null);
    } catch (err: any) {
      setError(err?.message || "Không thể gửi yêu cầu.");
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Header />
      <main className="max-w-5xl mx-auto px-4 lg:px-0 py-10 lg:py-16">
        {!authMounted ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#1B3A8F]" />
          </div>
        ) : !canUse ? (
          <AuthGateNotice
            authUser={authUser}
            requiredRole="BUSINESS"
            title="Tìm Kiếm Ứng Viên"
            desc="Vui lòng đăng nhập bằng tài khoản Doanh nghiệp để tìm kiếm hồ sơ ứng viên trong kho dữ liệu của CPA HCM."
            loginLabel="Đăng nhập"
          />
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold text-[#0F1C47] mb-2">Tìm Kiếm Ứng Viên</h1>
              <p className="text-sm text-gray-500">
                Thông tin liên hệ (SĐT/email) được ẩn cho tới khi CPA HCM duyệt yêu cầu của bạn — đảm bảo quyền riêng tư cho ứng viên.
              </p>
            </div>

            <div className="bg-white p-4 rounded-sm border border-gray-100 mb-6 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchCandidates()}
                  placeholder="Vị trí, ngành nghề, tên ứng viên..."
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F8F9FA] border border-gray-200 rounded-sm text-sm outline-none focus:border-[#1B3A8F]"
                />
              </div>
              <div className="relative sm:w-56">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchCandidates()}
                  placeholder="Khu vực..."
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F8F9FA] border border-gray-200 rounded-sm text-sm outline-none focus:border-[#1B3A8F]"
                />
              </div>
              <button
                onClick={fetchCandidates}
                className="px-6 py-2.5 bg-[#0F1C47] hover:bg-[#1B3A8F] text-white text-sm font-bold rounded-sm transition-colors"
              >
                Tìm kiếm
              </button>
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-[#1B3A8F]" />
              </div>
            ) : !candidates || candidates.length === 0 ? (
              <p className="text-center text-gray-400 py-20">Không tìm thấy hồ sơ ứng viên phù hợp.</p>
            ) : (
              <div className="space-y-3">
                {candidates.map((c) => (
                  <div key={c.id} className="bg-white p-5 rounded-sm border border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-[#0F1C47]">{c.fullName}</span>
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-[#1B3A8F] rounded-full font-semibold">{c.desiredLevel}</span>
                        </div>
                        <div className="text-sm text-gray-700 font-semibold mb-2">{c.desiredPosition}</div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {c.location}</span>
                          <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {c.industry}</span>
                          <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {c.educationLevel}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {c.experienceYears}</span>
                          <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> {formatSalary(c.minSalary, c.maxSalary)}</span>
                        </div>
                        {c.careerGoal && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{c.careerGoal}</p>}
                      </div>

                      <div className="shrink-0 w-full sm:w-56">
                        {c.introductionStatus === "APPROVED" ? (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-3 space-y-1">
                            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mb-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Đã duyệt liên hệ
                            </div>
                            <div className="text-xs text-gray-700">SĐT: <strong>{c.phone}</strong></div>
                            <div className="text-xs text-gray-700 truncate">Email: <strong>{c.email}</strong></div>
                          </div>
                        ) : c.introductionStatus === "PENDING" ? (
                          <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Đang chờ CPA HCM duyệt
                          </div>
                        ) : c.introductionStatus === "REJECTED" ? (
                          <div className="bg-red-50 border border-red-200 rounded-sm p-3 text-xs text-red-700 font-semibold flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" /> Yêu cầu bị từ chối
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Lock className="w-3.5 h-3.5" /> Liên hệ đã được ẩn
                            </div>
                            <input
                              type="text"
                              value={noteDraft[c.id] || ""}
                              onChange={(e) => setNoteDraft({ ...noteDraft, [c.id]: e.target.value })}
                              placeholder="Vị trí cần tuyển (không bắt buộc)"
                              className="w-full px-2.5 py-1.5 bg-[#F8F9FA] border border-gray-200 rounded-sm text-xs outline-none focus:border-[#1B3A8F]"
                            />
                            <button
                              onClick={() => handleRequestIntroduction(c.id)}
                              disabled={requestingId === c.id}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#C9973C] hover:bg-[#D4AF37] disabled:opacity-60 text-[#0F1C47] text-xs font-bold rounded-sm transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" /> {requestingId === c.id ? "Đang gửi..." : "Yêu cầu xem liên hệ"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
