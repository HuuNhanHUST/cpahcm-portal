"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  BookOpen,
  Briefcase,
  Building2,
  LogIn,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
  PhoneCall,
} from "lucide-react";
import {
  API_BASE,
  useAuthUser,
  formatDate,
  StatusBadge,
  ENROLLMENT_STATUS_META,
  APPLICATION_STATUS_META,
  EMPLOYER_REQUEST_STATUS_META,
  LINK_REQUEST_STATUS_META,
  parseEmployerJobDescription,
} from "./shared";
import { authFetch, refreshAccessToken } from "../../lib/authFetch";

type Enrollment = {
  id: string;
  status: string;
  createdAt: string;
  course: { id: string; title: string; slug: string; imageUrl: string | null; instructor: string | null };
};

type CandidateProfile = {
  id: string;
  desiredPosition: string;
  location: string;
  updatedAt: string;
};

type Application = {
  id: string;
  status: string;
  createdAt: string;
  job: { id: string; title: string; department: string; location: string | null } | null;
};

type EmployerRequest = {
  id: string;
  status: string;
  createdAt: string;
  position: string;
  companyName: string;
  phone: string;
  email: string;
  expectedSalary: string | null;
  jobDescription: string | null;
  publishedJobId: string | null;
};

type LinkRequest = {
  id: string;
  status: string;
  taxCode: string;
  companyName: string;
  reviewNote: string | null;
  createdAt: string;
};

export default function MyAccountPage() {
  const { authUser, authHeaders, authMounted } = useAuthUser();

  // Access token chỉ sống 15 phút — làm mới định kỳ trong lúc trang còn mở, tránh Unauthorized
  // khi người dùng để tab này mở lâu (điền form liên kết công ty, đọc trạng thái hồ sơ...).
  useEffect(() => {
    const intervalId = setInterval(() => { refreshAccessToken(); }, 10 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  if (!authMounted) return <div className="min-h-screen" />;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <Header />
      <main className="max-w-5xl mx-auto px-4 lg:px-6 py-28 lg:py-32">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-black text-[#0F1C47]">Tài Khoản Của Tôi</h1>
          <p className="text-sm text-gray-500 mt-1">Theo dõi trạng thái các yêu cầu, hồ sơ bạn đã gửi tới CPA HCM.</p>
        </div>

        {!authUser ? (
          <NeedLogin />
        ) : authUser.role === "MEMBER" ? (
          <MemberAccount authHeaders={authHeaders} />
        ) : authUser.role === "BUSINESS" ? (
          <BusinessAccount authHeaders={authHeaders} authUser={authUser} />
        ) : (
          <AdminNotice />
        )}
      </main>
      <Footer />
    </div>
  );
}

function NeedLogin() {
  return (
    <div className="bg-white p-10 lg:p-14 rounded-2xl border border-gray-100 shadow-sm text-center space-y-4 max-w-xl mx-auto">
      <div className="w-14 h-14 rounded-full bg-[#F4F6F9] flex items-center justify-center mx-auto">
        <ShieldCheck className="w-7 h-7 text-[#C9973C]" />
      </div>
      <h3 className="text-lg font-bold text-[#0F1C47]">Vui lòng đăng nhập</h3>
      <p className="text-sm text-gray-500 leading-relaxed">Đăng nhập để xem trạng thái các yêu cầu và hồ sơ bạn đã gửi.</p>
      <Link
        href="/login"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#C9973C] hover:bg-[#D4AF37] text-[#0F1C47] font-bold rounded-lg text-sm uppercase tracking-wide"
      >
        <LogIn className="w-4 h-4" /> Đăng Nhập
      </Link>
    </div>
  );
}

function AdminNotice() {
  return (
    <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm text-center space-y-3 max-w-xl mx-auto">
      <p className="text-sm text-gray-600">Tài khoản Admin quản lý toàn hệ thống qua Bảng Quản Trị.</p>
      <Link href="/admin" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F1C47] text-white font-bold rounded-lg text-sm">
        Đi tới /admin
      </Link>
    </div>
  );
}

const TABS_WRAP = "flex gap-2 border-b border-gray-200 mb-6";
const TAB_BTN = (active: boolean) =>
  `flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
    active ? "border-[#C9973C] text-[#0F1C47]" : "border-transparent text-gray-400 hover:text-gray-600"
  }`;
const CARD = "bg-white border border-gray-100 rounded-2xl shadow-sm p-5";

function EmptyState({ text }: { text: string }) {
  return <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center text-sm text-gray-400">{text}</div>;
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );
}

// ── MEMBER ─────────────────────────────────────────────────────────────────
function MemberAccount({ authHeaders }: { authHeaders: Record<string, string> }) {
  const [tab, setTab] = useState<"courses" | "applications">("courses");
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null | undefined>(undefined);

  useEffect(() => {
    authFetch(`${API_BASE}/courses/me/enrollments`, { headers: authHeaders })
      .then((r) => r.json())
      .then((j) => setEnrollments(j.data ?? []))
      .catch(() => setEnrollments([]));
    authFetch(`${API_BASE}/recruitment/applications/me`, { headers: authHeaders })
      .then((r) => r.json())
      .then((j) => setApplications(j.data ?? []))
      .catch(() => setApplications([]));
    authFetch(`${API_BASE}/recruitment/candidates/me`, { headers: authHeaders })
      .then((r) => r.json())
      .then((j) => setCandidateProfile(Array.isArray(j.data) && j.data.length > 0 ? j.data[0] : null))
      .catch(() => setCandidateProfile(null));
  }, []);

  const downloadMyCv = async (applicationId: string) => {
    try {
      const res = await authFetch(`${API_BASE}/recruitment/applications/${applicationId}/cv`, { headers: authHeaders });
      if (!res.ok) throw new Error("Không thể tải CV.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "CV-da-nop.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Best-effort — không chặn luồng chính của trang nếu tải CV thất bại.
    }
  };

  return (
    <div>
      {candidateProfile !== undefined && (
        <div className={`${CARD} mb-6 flex items-center justify-between gap-4`}>
          {candidateProfile ? (
            <>
              <div className="min-w-0">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Hồ sơ ứng viên</div>
                <div className="font-bold text-[#0F1C47]">{candidateProfile.desiredPosition} · {candidateProfile.location}</div>
                <div className="text-xs text-gray-400 mt-0.5">Cập nhật lần cuối: {formatDate(candidateProfile.updatedAt)}</div>
              </div>
              <Link href="/tuyen-dung" className="shrink-0 px-4 py-2 bg-[#1B3A8F] hover:bg-[#0F1C47] text-white text-xs font-bold rounded-lg">
                Sửa Hồ Sơ
              </Link>
            </>
          ) : (
            <>
              <div className="text-sm text-gray-500">Bạn chưa tạo hồ sơ ứng viên (ATS).</div>
              <Link href="/tuyen-dung" className="shrink-0 px-4 py-2 bg-[#C9973C] hover:bg-[#D4AF37] text-[#0F1C47] text-xs font-bold rounded-lg">
                Tạo Hồ Sơ
              </Link>
            </>
          )}
        </div>
      )}

      <div className={TABS_WRAP}>
        <button onClick={() => setTab("courses")} className={TAB_BTN(tab === "courses")}>
          <BookOpen className="w-4 h-4" /> Khóa Học Của Tôi
        </button>
        <button onClick={() => setTab("applications")} className={TAB_BTN(tab === "applications")}>
          <Briefcase className="w-4 h-4" /> Đơn Ứng Tuyển Của Tôi
        </button>
      </div>

      {tab === "courses" &&
        (enrollments === null ? (
          <LoadingState />
        ) : enrollments.length === 0 ? (
          <EmptyState text="Bạn chưa đăng ký khóa học nào. Khám phá các khóa học tại /dao-tao." />
        ) : (
          <div className="space-y-3">
            {enrollments.some((e) => e.status === "PENDING") && (
              <div className={`${CARD} flex items-start gap-3 bg-amber-50 border-amber-200`}>
                <PhoneCall className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Khóa học đang ở trạng thái <strong>Chờ thanh toán</strong> — vui lòng liên hệ hotline{" "}
                  <a href="tel:19000380" className="font-bold underline">1900 0380</a> để được hướng dẫn thanh toán và kích hoạt khóa học.
                </p>
              </div>
            )}
            {enrollments.map((e) => (
              <div key={e.id} className={`${CARD} flex items-center justify-between gap-4`}>
                <div className="min-w-0">
                  <Link href={`/dao-tao/${e.course.slug}`} className="font-bold text-[#0F1C47] hover:text-[#C9973C] truncate block">
                    {e.course.title}
                  </Link>
                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Đăng ký ngày {formatDate(e.createdAt)}
                    {e.course.instructor && <span>· GV: {e.course.instructor}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={e.status} meta={ENROLLMENT_STATUS_META} />
                </div>
              </div>
            ))}
          </div>
        ))}

      {tab === "applications" &&
        (applications === null ? (
          <LoadingState />
        ) : applications.length === 0 ? (
          <EmptyState text="Bạn chưa nộp đơn ứng tuyển nào. Xem các vị trí đang tuyển tại /tuyen-dung." />
        ) : (
          <div className="space-y-3">
            {applications.map((a) => (
              <div key={a.id} className={`${CARD} flex items-center justify-between gap-4`}>
                <div className="min-w-0">
                  <div className="font-bold text-[#0F1C47] truncate">{a.job?.title ?? "Vị trí đã gỡ"}</div>
                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Nộp ngày {formatDate(a.createdAt)}
                    {a.job?.department && <span>· {a.job.department}</span>}
                    {a.job?.location && <span>· {a.job.location}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => downloadMyCv(a.id)}
                    className="text-xs font-bold text-[#1B3A8F] hover:underline"
                  >
                    Tải CV đã nộp
                  </button>
                  <StatusBadge status={a.status} meta={APPLICATION_STATUS_META} />
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

// ── BUSINESS ───────────────────────────────────────────────────────────────
function BusinessAccount({ authHeaders, authUser }: { authHeaders: Record<string, string>; authUser: { companyId?: string | null } }) {
  const [tab, setTab] = useState<"jobs" | "company">("jobs");
  const [requests, setRequests] = useState<EmployerRequest[] | null>(null);
  const [linkRequests, setLinkRequests] = useState<LinkRequest[] | null>(null);
  const [taxCode, setTaxCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [editingRequest, setEditingRequest] = useState<EmployerRequest | null>(null);

  const loadRequests = () => {
    authFetch(`${API_BASE}/recruitment/employer-requests/me`, { headers: authHeaders })
      .then((r) => r.json())
      .then((j) => setRequests(j.data ?? []))
      .catch(() => setRequests([]));
  };

  const loadLinkRequests = () => {
    authFetch(`${API_BASE}/companies/link-requests/me`, { headers: authHeaders })
      .then((r) => r.json())
      .then((j) => setLinkRequests(j.data ?? []))
      .catch(() => setLinkRequests([]));
  };

  useEffect(() => {
    loadRequests();
    loadLinkRequests();
  }, []);

  const handleDeleteRequest = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa yêu cầu đăng tin này? Thao tác này không thể hoàn tác.")) return;
    try {
      const res = await authFetch(`${API_BASE}/recruitment/employer-postings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        alert(json?.message || "Không thể xóa yêu cầu.");
        return;
      }
      loadRequests();
    } catch {
      alert("Không thể xóa yêu cầu.");
    }
  };

  const hasPendingLinkRequest = linkRequests?.some((r) => r.status === "PENDING");

  const handleSubmitLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await authFetch(`${API_BASE}/companies/link-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ taxCode, companyName, note: note || undefined }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Gửi yêu cầu thất bại.");
      setSubmitSuccess(true);
      setTaxCode("");
      setCompanyName("");
      setNote("");
      loadLinkRequests();
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err: any) {
      setSubmitError(err?.message || "Gửi yêu cầu thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className={TABS_WRAP}>
        <button onClick={() => setTab("jobs")} className={TAB_BTN(tab === "jobs")}>
          <Briefcase className="w-4 h-4" /> Tin Tuyển Dụng Đã Gửi
        </button>
        <button onClick={() => setTab("company")} className={TAB_BTN(tab === "company")}>
          <Building2 className="w-4 h-4" /> Liên Kết Công Ty
        </button>
      </div>

      {tab === "jobs" &&
        (requests === null ? (
          <LoadingState />
        ) : requests.length === 0 ? (
          <EmptyState text="Bạn chưa gửi yêu cầu đăng tin tuyển dụng nào. Gửi yêu cầu tại /tuyen-dung." />
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className={`${CARD} flex items-center justify-between gap-4`}>
                <div className="min-w-0">
                  <div className="font-bold text-[#0F1C47] truncate">{r.position}</div>
                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Gửi ngày {formatDate(r.createdAt)}
                  </div>
                  {r.publishedJobId && (
                    <Link href={`/tuyen-dung/${r.publishedJobId}`} className="text-xs font-bold text-[#C9973C] hover:underline mt-1 inline-block">
                      Xem tin đã đăng →
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.status === "PENDING" && !r.publishedJobId && (
                    <>
                      <button
                        onClick={() => setEditingRequest(r)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteRequest(r.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg"
                      >
                        Xóa
                      </button>
                    </>
                  )}
                  {r.publishedJobId ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                      Đã xuất bản
                    </span>
                  ) : (
                    <StatusBadge status={r.status} meta={EMPLOYER_REQUEST_STATUS_META} />
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}

      {tab === "company" && (
        <div className="space-y-6">
          {authUser.companyId ? (
            <div className={`${CARD} flex items-center gap-3`}>
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <div>
                <div className="font-bold text-[#0F1C47]">Tài khoản đã được liên kết với công ty</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  Truy cập <Link href="/khach-hang" className="text-[#C9973C] font-semibold hover:underline">Cổng Khách Hàng</Link> để quản lý chứng từ.
                </div>
              </div>
            </div>
          ) : (
            <>
              {submitSuccess && (
                <div className={`${CARD} flex items-center gap-3 bg-emerald-50 border-emerald-200`}>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-sm text-emerald-700 font-semibold">Đã gửi yêu cầu liên kết công ty thành công, vui lòng chờ Admin xét duyệt.</p>
                </div>
              )}
              {linkRequests !== null && linkRequests.length > 0 && (
                <div className="space-y-3">
                  {linkRequests.map((r) => (
                    <div key={r.id} className={`${CARD} flex items-center justify-between gap-4`}>
                      <div className="min-w-0">
                        <div className="font-bold text-[#0F1C47] truncate">{r.companyName}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          MST: {r.taxCode} · Gửi ngày {formatDate(r.createdAt)}
                        </div>
                        {r.status === "REJECTED" && r.reviewNote && (
                          <div className="text-xs text-red-500 mt-1">Lý do từ chối: {r.reviewNote}</div>
                        )}
                      </div>
                      <StatusBadge status={r.status} meta={LINK_REQUEST_STATUS_META} />
                    </div>
                  ))}
                </div>
              )}

              {!hasPendingLinkRequest && (
                <div className={CARD}>
                  <h3 className="font-bold text-[#0F1C47] mb-1">Gửi yêu cầu liên kết công ty</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Tài khoản của bạn chưa được gán vào công ty nào. Điền thông tin bên dưới để CPA HCM xét duyệt và cấp quyền truy cập Cổng Khách Hàng.
                  </p>
                  <form onSubmit={handleSubmitLinkRequest} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Mã số thuế</label>
                      <input
                        required
                        value={taxCode}
                        onChange={(e) => setTaxCode(e.target.value)}
                        pattern="\d{10}(\d{3})?"
                        title="Mã số thuế gồm 10 hoặc 13 chữ số"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9973C]"
                        placeholder="VD: 0312345678"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Tên công ty</label>
                      <input
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9973C]"
                        placeholder="Tên công ty theo giấy phép đăng ký kinh doanh"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Ghi chú (tùy chọn)</label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9973C]"
                      />
                    </div>
                    {submitError && <p className="text-xs text-red-500">{submitError}</p>}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#C9973C] hover:bg-[#D4AF37] text-[#0F1C47] font-bold rounded-lg text-sm disabled:opacity-60"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Gửi Yêu Cầu
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {editingRequest && (
        <EditJobRequestModal
          request={editingRequest}
          onClose={() => setEditingRequest(null)}
          onSaved={() => { setEditingRequest(null); loadRequests(); }}
        />
      )}
    </div>
  );
}

// Sửa yêu cầu đăng tin đã gửi — chỉ áp dụng khi còn PENDING (guard cả 2 phía FE/BE). Tách field
// riêng của jobDescription (1 chuỗi ghép) qua parseEmployerJobDescription() để tái tạo đúng form,
// PATCH lại nguyên bộ field giống lúc tạo mới (composeEmployerPostingData ở backend).
function EditJobRequestModal({
  request, onClose, onSaved,
}: {
  request: EmployerRequest;
  onClose: () => void;
  onSaved: () => void;
}) {
  const parsed = parseEmployerJobDescription(request.jobDescription || "");
  const salaryParts = (request.expectedSalary || "").split(" - ");
  const minSalary = (salaryParts[0] || "").trim();
  const maxSalary = (salaryParts[1] || "").replace(/VND$/, "").trim();

  const [form, setForm] = useState({
    title: request.position || "",
    companyName: request.companyName || "",
    phone: request.phone || "",
    email: request.email || "",
    description: parsed.description || "",
    requirements: parsed.requirements || "",
    industry: parsed.industry || "",
    location: parsed.location || "",
    workType: parsed.workType || "",
    experience: parsed.experience || "",
    level: parsed.level || "",
    education: parsed.education || "",
    address: parsed.address || "",
    companySize: parsed.companySize || "",
    companyDesc: parsed.companyDesc || "",
    benefits: parsed.benefits || "",
    minSalary,
    maxSalary,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch(`${API_BASE}/recruitment/employer-postings/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          gender: "Không yêu cầu",
          currency: "VND",
          benefits: form.benefits ? form.benefits.split(",").map((b) => b.trim()).filter(Boolean) : [],
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể lưu thay đổi.");
      onSaved();
    } catch (err: any) {
      setError(err?.message || "Không thể lưu thay đổi.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9973C]";
  const labelCls = "text-xs font-bold text-gray-600 block mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <h3 className="text-lg font-black text-[#0F1C47]">Sửa Yêu Cầu Đăng Tin</h3>

          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Vị trí tuyển dụng</label><input required value={form.title} onChange={(e) => update("title", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Tên công ty</label><input required value={form.companyName} onChange={(e) => update("companyName", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Điện thoại liên hệ</label><input required value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Email nhận hồ sơ</label><input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Ngành nghề</label><input required value={form.industry} onChange={(e) => update("industry", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Địa điểm làm việc</label><input required value={form.location} onChange={(e) => update("location", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Hình thức làm việc</label><input required value={form.workType} onChange={(e) => update("workType", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Kinh nghiệm yêu cầu</label><input required value={form.experience} onChange={(e) => update("experience", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Cấp bậc</label><input required value={form.level} onChange={(e) => update("level", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Bằng cấp</label><input required value={form.education} onChange={(e) => update("education", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Lương tối thiểu (triệu)</label><input value={form.minSalary} onChange={(e) => update("minSalary", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Lương tối đa (triệu)</label><input value={form.maxSalary} onChange={(e) => update("maxSalary", e.target.value)} className={inputCls} /></div>
          </div>

          <div><label className={labelCls}>Mô tả công việc</label><textarea required rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Yêu cầu công việc</label><textarea required rows={3} value={form.requirements} onChange={(e) => update("requirements", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Phúc lợi (phân cách bởi dấu phẩy)</label><input value={form.benefits} onChange={(e) => update("benefits", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Địa chỉ trụ sở</label><input required value={form.address} onChange={(e) => update("address", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Quy mô công ty</label><input value={form.companySize} onChange={(e) => update("companySize", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Giới thiệu công ty</label><textarea rows={2} value={form.companyDesc} onChange={(e) => update("companyDesc", e.target.value)} className={inputCls} /></div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-sm">
              Hủy
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-[#C9973C] hover:bg-[#D4AF37] text-[#0F1C47] font-bold rounded-lg text-sm disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
