"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Upload,
  Search,
  Filter,
  CheckCircle,
  CheckCircle2,
  Building2,
  Users,
  Send,
  ShieldCheck,
  Award,
  UserCheck,
  PhoneCall,
  Plus,
  Trash2,
  FileText,
  ChevronRight,
  ArrowRight,
  UserPlus,
  X,
  Check,
  Clock3,
  ImageOff,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useLanguage } from "../../context/LanguageContext";
import {
  API_BASE,
  BACKEND_ORIGIN,
  jobImageUrl,
  AuthUser,
  useAuthUser,
  AuthGateNotice,
  locationLabel,
  typeLabel as sharedTypeLabel,
  timeAgo as sharedTimeAgo,
} from "./shared";
import { authFetch } from "../../lib/authFetch";

// Animated counter — same implementation reused across Home/About for a consistent feel.
function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 1800;
    const step = end / (duration / 16);
    let curr = 0;
    const timer = setInterval(() => {
      curr = Math.min(curr + step, end);
      setCount(Math.floor(curr));
      if (curr >= end) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [started, end]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

export default function RecruitmentPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"candidate" | "employer">("candidate");
  const [candidateSubMode, setCandidateSubMode] = useState<"jobs" | "create-profile">("jobs");

  // Job Filter States — stable codes, not translated text, so filtering survives language switches.
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");

  // CV file cho form "Tạo Hồ Sơ Ứng Viên" (bước 4 của wizard) — ứng tuyển 1 job cụ thể
  // giờ nằm ở trang chi tiết riêng /tuyen-dung/[id], không còn dùng modal ở đây nữa.
  const [cvFile, setCvFile] = useState<File | null>(null);
  // File CV được upload NGAY khi chọn (không đợi tới lúc submit cả wizard) — path server trả về
  // lưu ở đây và gửi kèm khi tạo/sửa hồ sơ. Trước đây bước này chỉ lưu tên file client tự khai,
  // không có file thật nào lên server.
  const [uploadedCvUrl, setUploadedCvUrl] = useState<string | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [employerSubmitted, setEmployerSubmitted] = useState(false);
  const [profileSubmitted, setProfileSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hồ sơ ứng viên đã có sẵn (nếu có) — chuyển form sang chế độ SỬA thay vì tạo mới, tránh tạo
  // hồ sơ trùng lặp mỗi lần submit lại (trước đây backend không chặn, tạo rác không có cách sửa).
  const [existingProfileId, setExistingProfileId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Stepper State for Candidate Profile Form (1 to 4)
  const [profileStep, setProfileStep] = useState(1);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);

  // ── Auth state — đọc từ localStorage/sessionStorage (khớp cách /login lưu, tùy "Ghi nhớ đăng nhập") ──
  const { authUser, authHeaders } = useAuthUser();

  // Đăng nhập đúng vai trò nào (MEMBER/BUSINESS) chỉ được thấy đúng 1 tab tương ứng — tránh
  // Doanh nghiệp mở nhầm tab Ứng viên (và ngược lại). Khách chưa đăng nhập & ADMIN thấy cả 2.
  const visibleTabs: Array<"candidate" | "employer"> =
    authUser?.role === "MEMBER" ? ["candidate"]
    : authUser?.role === "BUSINESS" ? ["employer"]
    : ["candidate", "employer"];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Công ty đã liên kết (nếu có) — tự điền tên/địa chỉ vào form đăng tin thay vì bắt gõ lại mỗi
  // lần, khớp pattern đã áp dụng cho SĐT/email (authUser không có sẵn tên công ty nên phải gọi
  // riêng GET /companies/me).
  const [myCompany, setMyCompany] = useState<{ name?: string; address?: string } | null>(null);
  useEffect(() => {
    if (authUser?.role !== "BUSINESS") return;
    authFetch(`${API_BASE}/companies/me`, { headers: authHeaders })
      .then((r) => r.json())
      .then((j) => setMyCompany(j?.data || null))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.role]);

  // Nếu tab hiện tại không còn hợp lệ với vai trò vừa xác định được (VD: BUSINESS đăng nhập
  // nhưng activeTab mặc định đang là "candidate"), tự chuyển sang tab duy nhất được phép xem.
  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  // ── Job postings thật từ backend (thay cho dữ liệu mẫu cố định) ──
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/recruitment/jobs`)
      .then((res) => res.json())
      .then((json) => setJobs(Array.isArray(json?.data) ? json.data : []))
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false));
  }, []);

  // Tải hồ sơ ứng viên hiện có (nếu MEMBER đã từng tạo) — prefill toàn bộ wizard + chuyển form
  // sang chế độ SỬA (PATCH) thay vì tạo mới (POST), khớp với ràng buộc "không tạo trùng" mới
  // thêm ở backend (createCandidateProfile giờ throw ConflictException nếu đã có hồ sơ).
  useEffect(() => {
    if (authUser?.role !== "MEMBER") {
      setProfileLoading(false);
      return;
    }
    authFetch(`${API_BASE}/recruitment/candidates/me`, { headers: authHeaders })
      .then((res) => res.json())
      .then((json) => {
        const profile = Array.isArray(json?.data) ? json.data[0] : null;
        if (!profile) {
          // Chưa từng tạo hồ sơ — tự điền tên/SĐT/email từ tài khoản đã đăng nhập thay vì bắt
          // gõ lại từ đầu, người dùng vẫn có thể sửa nếu muốn dùng thông tin khác.
          if (authUser?.fullName || authUser?.phone) {
            setProfileForm((prev) => ({
              ...prev,
              fullName: authUser?.fullName || prev.fullName,
              phone: authUser?.phone || prev.phone,
              email: authUser?.email || prev.email,
            }));
          }
          return;
        }
        setExistingProfileId(profile.id);
        setProfileForm({
          fullName: profile.fullName || "",
          phone: profile.phone || "",
          email: profile.email || "",
          address: profile.address || "",
          desiredPosition: profile.desiredPosition || "",
          desiredLevel: profile.desiredLevel || "NhanVien",
          workLocation: profile.location || "HCM",
          industry: profile.industry || "KeToanKiemToan",
          educationLevel: profile.educationLevel || "DaiHoc",
          expYears: profile.experienceYears || "ChuaCo",
          workForm: profile.workType || "FullTime",
          salaryFrom: profile.minSalary != null ? String(profile.minSalary) : "",
          salaryTo: profile.maxSalary != null ? String(profile.maxSalary) : "",
          careerGoal: profile.careerGoal || "",
          computerSkill: profile.computerSkills || "",
          foreignLang: profile.languages || "",
        });
        if (Array.isArray(profile.experiences) && profile.experiences.length > 0) {
          setExperiences(profile.experiences.map((e: any) => ({
            company: e.company || "", position: e.position || "",
            startDate: e.startDate ? e.startDate.slice(0, 10) : "", endDate: e.endDate ? e.endDate.slice(0, 10) : "",
            salary: e.salary || "", description: e.description || "",
          })));
        }
        if (Array.isArray(profile.educations) && profile.educations.length > 0) {
          setEducations(profile.educations.map((e: any) => ({
            degree: e.degree || "", school: e.school || "", major: e.major || "",
            grade: e.grade || "Gioi", gradYear: e.gradYear ? String(e.gradYear) : "",
          })));
        }
        if (Array.isArray(profile.references) && profile.references.length > 0) {
          setReferences(profile.references.map((r: any) => ({
            fullName: r.fullName || "", company: r.company || "", phone: r.phone || "", position: r.position || "",
          })));
        }
        if (profile.cvUrl) setUploadedCvUrl(profile.cvUrl);
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.role]);

  // Chọn file CV → upload thật ngay lập tức (không đợi submit cả wizard), lưu path server trả về.
  // Ô input file không bị disable trong lúc đang upload, nên người dùng vẫn có thể chọn file khác
  // trước khi request trước đó xong — dùng token tăng dần để chỉ áp dụng kết quả của lần chọn MỚI
  // NHẤT, tránh trường hợp UI hiển thị tên file B nhưng uploadedCvUrl (giá trị thật sự được nộp)
  // lại trỏ tới nội dung file A do request cũ hoàn tất sau request mới.
  const cvUploadTokenRef = useRef(0);
  const handleCvFileChange = async (file: File | null) => {
    const token = ++cvUploadTokenRef.current;
    setCvFile(file);
    setCvUploadError(null);
    if (!file) return;
    setCvUploading(true);
    try {
      const formData = new FormData();
      formData.append("cv", file);
      const res = await authFetch(`${API_BASE}/recruitment/candidates/cv-upload`, {
        method: "POST",
        headers: { ...authHeaders },
        body: formData,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Tải CV thất bại.");
      if (token !== cvUploadTokenRef.current) return; // đã có lần chọn file mới hơn ghi đè
      setUploadedCvUrl(json.cvUrl);
    } catch (err: any) {
      if (token !== cvUploadTokenRef.current) return;
      setCvUploadError(err?.message || "Tải CV thất bại.");
      setUploadedCvUrl(null);
    } finally {
      if (token === cvUploadTokenRef.current) setCvUploading(false);
    }
  };

  const fadeIn: any = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const staggerContainer: any = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  // Vị trí tuyển dụng là nội dung thật do Admin nhập (sau khi duyệt yêu cầu của Doanh nghiệp),
  // hiển thị nguyên văn — không dịch máy, giống cách tên nhân sự/nội dung do người dùng nhập
  // được giữ nguyên ở các trang khác (Giới thiệu). Chỉ nhãn giao diện (label, nút...) qua t().
  const typeLabel = (type?: string | null) => sharedTypeLabel(type, t("jobs.fulltime"));
  const timeAgo = (dateStr?: string) => sharedTimeAgo(dateStr, t);

  // Filter logic — so khớp trực tiếp trên field thật (location/type do Admin nhập từ danh
  // sách cố định trong form đăng tin, xem admin/page.tsx), không qua hệ thống code/i18n nữa.
  const filteredJobs = jobs.filter((job) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      job.title?.toLowerCase().includes(q) ||
      job.department?.toLowerCase().includes(q) ||
      job.description?.toLowerCase().includes(q);

    const matchesLocation = selectedLocation === "ALL" || job.location === selectedLocation;
    const matchesType = selectedType === "ALL" || job.type === selectedType;
    const matchesDepartment = selectedDepartment === "ALL" || job.department === selectedDepartment;

    return matchesSearch && matchesLocation && matchesType && matchesDepartment;
  });

  // ── Candidate profile wizard — fully controlled state ───────────────────────
  // Previously this form read values via `document/form.querySelector(...)` at submit time.
  // Because each step's fields are conditionally rendered (`{profileStep === N && (...)}`),
  // React unmounts earlier steps' inputs once you move on — so by the time you reached Step 4
  // and hit submit, Step 1/3's fields no longer existed in the DOM and the submit silently used
  // the hardcoded fallback values instead of what the candidate actually typed. Controlled state
  // (one source of truth that survives step navigation) fixes this at the root.
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    desiredPosition: "",
    desiredLevel: "NhanVien",
    workLocation: "HCM",
    industry: "KeToanKiemToan",
    educationLevel: "DaiHoc",
    expYears: "ChuaCo",
    workForm: "FullTime",
    salaryFrom: "",
    salaryTo: "",
    careerGoal: "",
    computerSkill: "",
    foreignLang: "",
  });
  const updateProfileField = (field: keyof typeof profileForm, value: string) =>
    setProfileForm((prev) => ({ ...prev, [field]: value }));

  const [experiences, setExperiences] = useState([
    { company: "", position: "", startDate: "", endDate: "", salary: "", description: "" }
  ]);
  const [educations, setEducations] = useState([
    { degree: "", school: "", major: "", grade: "Gioi", gradYear: "" }
  ]);
  const [references, setReferences] = useState([
    { fullName: "", company: "", phone: "", position: "" }
  ]);

  // Xác thực từng bước của wizard TRƯỚC KHI cho đi tiếp — trước đây nút "Tiếp tục" và các ô số
  // bước (stepper) chỉ đổi profileStep, không kiểm tra gì, nên có thể nhảy thẳng tới Bước 4 rồi
  // nộp với các trường bắt buộc ở Bước 1-2 còn trống. Backend vẫn chặn (DTO @IsNotEmpty) nhưng lỗi
  // chỉ hiện ra ở bước cuối, không rõ phải quay lại sửa gì — validate sớm ở đây để trải nghiệm khớp
  // với những gì backend thực sự yêu cầu.
  const validateProfileStep1 = (): string | null => {
    if (!profileForm.fullName.trim()) return "Vui lòng nhập họ và tên.";
    if (!profileForm.email.trim()) return "Vui lòng nhập email.";
    if (!profileForm.phone.trim()) return "Vui lòng nhập số điện thoại.";
    if (!profileForm.address.trim()) return "Vui lòng nhập địa chỉ.";
    if (!profileForm.desiredPosition.trim()) return "Vui lòng nhập vị trí mong muốn.";
    if (!profileForm.careerGoal.trim()) return "Vui lòng nhập mục tiêu nghề nghiệp.";
    return null;
  };

  const validateProfileStep2 = (): string | null => {
    for (const exp of experiences) {
      if (!exp.company.trim() || !exp.position.trim()) {
        return "Vui lòng điền đầy đủ Công ty và Vị trí cho mỗi kinh nghiệm làm việc đã thêm (hoặc xóa bớt nếu không có).";
      }
    }
    for (const edu of educations) {
      if (!edu.degree.trim() || !edu.school.trim()) {
        return "Vui lòng điền đầy đủ Bằng cấp và Trường học cho mỗi mục học vấn đã thêm (hoặc xóa bớt nếu không có).";
      }
    }
    return null;
  };

  const validateProfileStepN = (step: number): string | null => {
    if (step === 1) return validateProfileStep1();
    if (step === 2) return validateProfileStep2();
    return null; // Bước 3 không có trường bắt buộc
  };

  // Nhảy nhiều bước cùng lúc (VD: bấm thẳng vào ô "Bước 4" từ "Bước 1") phải validate LẦN LƯỢT
  // từng bước bị bỏ qua ở giữa, không chỉ bước hiện tại — nếu không, "Bước 2" (kinh nghiệm/học vấn)
  // vẫn có thể bị nhảy qua mà không ai phát hiện.
  const goToProfileStep = (target: number) => {
    if (target > profileStep) {
      for (let s = profileStep; s < target; s++) {
        const err = validateProfileStepN(s);
        if (err) {
          setSubmitError(err);
          setProfileStep(s);
          return;
        }
      }
    }
    setSubmitError(null);
    setProfileStep(target);
  };

  const addExperience = () => {
    setExperiences([...experiences, { company: "", position: "", startDate: "", endDate: "", salary: "", description: "" }]);
  };
  const removeExperience = (index: number) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };
  const updateExperience = (index: number, field: keyof typeof experiences[number], value: string) => {
    setExperiences((prev) => prev.map((exp, i) => (i === index ? { ...exp, [field]: value } : exp)));
  };

  const addEducation = () => {
    setEducations([...educations, { degree: "", school: "", major: "", grade: "Gioi", gradYear: "" }]);
  };
  const removeEducation = (index: number) => {
    setEducations(educations.filter((_, i) => i !== index));
  };
  const updateEducation = (index: number, field: keyof typeof educations[number], value: string) => {
    setEducations((prev) => prev.map((edu, i) => (i === index ? { ...edu, [field]: value } : edu)));
  };

  const addReference = () => {
    setReferences([...references, { fullName: "", company: "", phone: "", position: "" }]);
  };
  const removeReference = (index: number) => {
    setReferences(references.filter((_, i) => i !== index));
  };
  const updateReference = (index: number, field: keyof typeof references[number], value: string) => {
    setReferences((prev) => prev.map((ref, i) => (i === index ? { ...ref, [field]: value } : ref)));
  };

  // NOTE on the DOM-query submit handler below (employer form): this is a single-view form
  // (nothing unmounts before submit), so a direct DOM read at submit time is safe. It keys on
  // stable `name` attributes instead of (translatable) placeholder text, so switching the UI
  // language doesn't cause the lookup to miss the field. The candidate profile wizard below is
  // different — it spans multiple conditionally-rendered steps, which is exactly why it now
  // uses controlled state (`profileForm` above) instead. The job-apply flow (1-Click / upload CV)
  // now lives on the dedicated detail page at /tuyen-dung/[id].
  const handleEmployerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;

    const dataPayload = {
      title: (form.querySelector('[name="empTitle"]') as HTMLInputElement)?.value || "Tin đăng B2B",
      description: (form.querySelector('[name="empDesc"]') as HTMLTextAreaElement)?.value || "Mô tả công việc",
      requirements: (form.querySelector('[name="empReq"]') as HTMLTextAreaElement)?.value || "Yêu cầu công việc",
      industry: (form.querySelector('[name="empIndustry"]') as HTMLSelectElement)?.value || "ke-toan",
      location: (form.querySelector('[name="empLocation"]') as HTMLSelectElement)?.value || "hcm",
      workType: (form.querySelector('[name="empWorkType"]') as HTMLSelectElement)?.value || "Toàn thời gian",
      minSalary: (form.querySelector('[name="empMinSalary"]') as HTMLInputElement)?.value || "15",
      maxSalary: (form.querySelector('[name="empMaxSalary"]') as HTMLInputElement)?.value || "25",
      currency: "VND",
      showSalary: true,
      deadline: (form.querySelector('[name="empDeadline"]') as HTMLInputElement)?.value || "2026-12-31",
      benefits: Array.from(form.querySelectorAll('input[name="empBenefit"]:checked')).map((el) => (el as HTMLInputElement).value),
      gender: (form.querySelector('input[name="empGender"]:checked') as HTMLInputElement)?.value || "Không yêu cầu",
      experience: (form.querySelector('[name="empExperience"]') as HTMLSelectElement)?.value || "1 - 3 năm",
      level: (form.querySelector('[name="empLevel"]') as HTMLSelectElement)?.value || "Nhân viên",
      education: (form.querySelector('[name="empEducation"]') as HTMLSelectElement)?.value || "Đại học",
      companyName: (form.querySelector('[name="empCompanyName"]') as HTMLInputElement)?.value || "Doanh nghiệp B2B",
      phone: (form.querySelector('[name="empPhone"]') as HTMLInputElement)?.value || "0901234567",
      email: (form.querySelector('[name="empEmail"]') as HTMLInputElement)?.value || "b2b@company.com",
      address: (form.querySelector('[name="empAddress"]') as HTMLInputElement)?.value || "",
      companyDesc: (form.querySelector('[name="empCompanyDesc"]') as HTMLTextAreaElement)?.value || undefined,
      companySize: (form.querySelector('[name="empCompanySize"]') as HTMLSelectElement)?.value || undefined,
    };

    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/recruitment/employer-postings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(dataPayload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || t("jobs.submitErrorGeneric"));
      setEmployerSubmitted(true);
      setTimeout(() => setEmployerSubmitted(false), 3500);
    } catch (err: any) {
      setSubmitError(err?.message || t("jobs.submitErrorGeneric"));
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const candidatePayload = {
      fullName: profileForm.fullName,
      phone: profileForm.phone,
      email: profileForm.email,
      address: profileForm.address,
      desiredPosition: profileForm.desiredPosition,
      desiredLevel: profileForm.desiredLevel,
      location: profileForm.workLocation,
      industry: profileForm.industry,
      educationLevel: profileForm.educationLevel,
      experienceYears: profileForm.expYears,
      workType: profileForm.workForm,
      minSalary: profileForm.salaryFrom ? Number(profileForm.salaryFrom) : undefined,
      maxSalary: profileForm.salaryTo ? Number(profileForm.salaryTo) : undefined,
      careerGoal: profileForm.careerGoal,
      computerSkills: profileForm.computerSkill,
      languages: profileForm.foreignLang,
      cvUrl: uploadedCvUrl || undefined,
      experiences: experiences.map((exp) => ({
        company: exp.company,
        position: exp.position,
        startDate: exp.startDate || undefined,
        endDate: exp.endDate || undefined,
        salary: exp.salary || undefined,
        description: exp.description || undefined,
      })),
      educations: educations.map((edu) => ({
        degree: edu.degree,
        school: edu.school,
        major: edu.major || undefined,
        grade: edu.grade || undefined,
        gradYear: edu.gradYear ? Number(edu.gradYear) : undefined,
      })),
      references: references
        .filter((ref) => ref.fullName.trim() !== "")
        .map((ref) => ({
          fullName: ref.fullName,
          company: ref.company || undefined,
          position: ref.position || undefined,
          phone: ref.phone || undefined,
        })),
    };

    setSubmitError(null);
    try {
      const res = await authFetch(
        existingProfileId ? `${API_BASE}/recruitment/candidates/me` : `${API_BASE}/recruitment/candidates`,
        {
          method: existingProfileId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify(candidatePayload),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || t("jobs.submitErrorGeneric"));
    } catch (err: any) {
      setSubmitError(err?.message || t("jobs.submitErrorGeneric"));
      return;
    }

    setProfileSubmitted(true);
    window.scrollTo({ top: 400, behavior: "smooth" });
    setTimeout(() => {
      setProfileSubmitted(false);
      setCandidateSubMode("jobs");
      setProfileStep(1);
    }, 4000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F6F9] font-sans selection:bg-[#1B3A8F] selection:text-white">
      <Header />

      {/* Toast lỗi submit dùng chung cho cả 3 form (ứng tuyển / đăng tin / tạo hồ sơ) */}
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-5 py-3 rounded-sm shadow-xl text-sm font-semibold flex items-center gap-3 max-w-lg"
          >
            <span>{submitError}</span>
            <button onClick={() => setSubmitError(null)} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow">
        {/* HERO — same structure as Home/About: full-bleed photo, giant type, stat bar pinned to bottom */}
        <section ref={heroRef} className="relative h-[min(100vh,900px)] min-h-[640px] flex flex-col overflow-hidden bg-[#0F1C47]">
          {/* Ảnh thật thay cho 3D — 3D dùng chung 1 cảnh trên mọi trang khiến banner giống hệt
              nhau; ảnh buổi họp nhóm/brainstorm khớp đúng chủ đề Tuyển dụng. */}
          <motion.div style={{ y: bgY }} className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2069&auto=format&fit=crop"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-30 scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1C47] via-[#0F1C47]/75 to-[#0F1C47]/40" />
          </motion.div>
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: "linear-gradient(#C9973C 1px, transparent 1px), linear-gradient(90deg, #C9973C 1px, transparent 1px)", backgroundSize: "80px 80px" }}
          />

          <div className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36">
            <motion.div initial={{ opacity: 0 }} animate={mounted ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
              <div className="flex items-center gap-3 mb-5">
                <Briefcase className="w-4 h-4 text-[#C9973C]" />
                <span className="text-[#C9973C] text-xs font-bold uppercase tracking-[0.2em]">{t("jobs.heroBadge")}</span>
              </div>

              <h1 className="text-[clamp(2.25rem,5.5vw,4.5rem)] font-black leading-[1.05] text-white mb-6 tracking-tight max-w-2xl">
                {t("jobs.title")}
              </h1>

              <p className="text-blue-200/80 text-base md:text-lg max-w-xl leading-relaxed mb-9 font-light">
                {t("jobs.subtitle")}
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={mounted ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2, duration: 0.4 }}
            className="relative z-10 w-full border-t border-white/10"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/10 bg-white/5 backdrop-blur-md">
              {[
                { n: 20, s: "+", label: t("jobs.statPositions"), icon: Briefcase },
                { n: 1000, s: "+", label: t("jobs.statBusinesses"), icon: Building2 },
                { n: 500, s: "+", label: t("jobs.statCandidates"), icon: UserCheck },
                { n: 48, s: "h", label: t("jobs.statResponse"), icon: Clock3 }
              ].map((stat, i) => (
                <div key={i} className="py-6 lg:py-7 px-4 text-center">
                  <stat.icon className="w-5 h-5 text-[#C9973C] mx-auto mb-2 opacity-80" />
                  <div className="stat-figure text-2xl lg:text-3xl font-black text-white mb-1">
                    <Counter end={stat.n} suffix={stat.s} />
                  </div>
                  <div className="text-[10px] md:text-[11px] text-blue-300 uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* TAB SWITCHER — segmented control, own section right below the hero (not part of the marketing banner) */}
        <section className="bg-white border-b border-gray-100 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex">
              {[
                { key: "candidate" as const, label: t("jobs.tabCandidate"), icon: Users },
                { key: "employer" as const, label: t("jobs.tabEmployer"), icon: Building2 },
              ].filter((tab) => visibleTabs.includes(tab.key)).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2.5 px-6 py-5 text-sm font-bold border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-[#C9973C] text-[#0F1C47]"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.key ? "text-[#C9973C]" : "text-gray-300"}`} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* MAIN PORTAL BODY */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <AnimatePresence mode="wait">

            {/* ========================================================================= */}
            {/* TAB 1: DÀNH CHO ỨNG VIÊN */}
            {/* ========================================================================= */}
            {activeTab === "candidate" && (
              <motion.div
                key="candidate-tab"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={staggerContainer}
                className="space-y-10"
              >
                {/* SUB NAVIGATION FOR CANDIDATE: JOBS LISTING vs CREATE DETAILED PROFILE */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-sm border border-gray-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCandidateSubMode("jobs")}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-sm font-bold text-sm transition-colors ${
                        candidateSubMode === "jobs"
                          ? "bg-[#1B3A8F] text-white"
                          : "text-gray-600 hover:bg-[#F8F9FA]"
                      }`}
                    >
                      <Briefcase className="w-4 h-4" /> {t("jobs.subNavJobs")} ({filteredJobs.length})
                    </button>
                    <button
                      onClick={() => setCandidateSubMode("create-profile")}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-sm font-bold text-sm transition-colors ${
                        candidateSubMode === "create-profile"
                          ? "bg-[#1B3A8F] text-white"
                          : "text-gray-600 hover:bg-[#F8F9FA]"
                      }`}
                    >
                      <UserPlus className="w-4 h-4 text-[#C9973C]" /> {t("jobs.subNavProfile")}
                    </button>
                  </div>
                  <span className="text-xs font-bold text-[#1B3A8F] bg-[#F4F6F9] px-3 py-1.5 rounded-sm border border-gray-100">
                    {t("jobs.atsNote")}
                  </span>
                </div>

                {/* MODE A: JOBS LISTING */}
                {candidateSubMode === "jobs" && (
                  <div className="space-y-12">
                    {/* Benefits Bar for Candidate */}
                    <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { icon: ShieldCheck, title: t("jobs.benefit1Title"), desc: t("jobs.benefit1Desc") },
                        { icon: Award, title: t("jobs.benefit2Title"), desc: t("jobs.benefit2Desc") },
                        { icon: UserCheck, title: t("jobs.benefit3Title"), desc: t("jobs.benefit3Desc") }
                      ].map((benefit, i) => (
                        <div key={i} className="bg-white p-6 rounded-sm border border-gray-100 flex items-start gap-4">
                          <div className="w-12 h-12 rounded-sm bg-gradient-to-br from-[#1B3A8F] to-[#0F1C47] text-white flex items-center justify-center shrink-0">
                            <benefit.icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-[#0F1C47] text-base mb-1">{benefit.title}</h4>
                            <p className="text-gray-500 text-sm leading-relaxed">{benefit.desc}</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>

                    {/* Main Job Section: Filter Sidebar + List */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">

                      {/* Left Sidebar Filter */}
                      <motion.div variants={fadeIn} className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-sm border border-gray-100">
                          <h3 className="font-bold text-[#0F1C47] text-base mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                            <Filter className="w-5 h-5 text-[#C9973C]" /> {t("jobs.filter")}
                          </h3>

                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-bold text-gray-700 block mb-2">{t("jobs.filterKeyword")}</label>
                              <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  placeholder={t("jobs.filterKeywordPlaceholder")}
                                  className="w-full pl-9 pr-3 py-2.5 bg-[#F8F9FA] border border-gray-200 rounded-sm text-sm focus:border-[#1B3A8F] outline-none focus:ring-2 focus:ring-[#1B3A8F]/20 transition-colors"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-bold text-gray-700 block mb-2">{t("jobs.filterLocation")}</label>
                              <select
                                value={selectedLocation}
                                onChange={(e) => setSelectedLocation(e.target.value)}
                                className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-2.5 text-sm focus:border-[#1B3A8F] outline-none focus:ring-2 focus:ring-[#1B3A8F]/20 font-medium text-gray-700"
                              >
                                <option value="ALL">{t("jobs.filterAllLocations")}</option>
                                <option value="TP. Hồ Chí Minh">{t("jobs.locHCM")}</option>
                                <option value="Hà Nội">{t("jobs.locHN")}</option>
                                <option value="Bình Phước">{t("jobs.locBP")}</option>
                                <option value="Đắk Nông">{t("jobs.locDN")}</option>
                                <option value="Hải Phòng">{t("jobs.locHP")}</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-sm font-bold text-gray-700 block mb-2">{t("jobs.filterWorkType")}</label>
                              <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-2.5 text-sm focus:border-[#1B3A8F] outline-none focus:ring-2 focus:ring-[#1B3A8F]/20 font-medium text-gray-700"
                              >
                                <option value="ALL">{t("jobs.filterAllTypes")}</option>
                                <option value="Toàn thời gian">{t("jobs.filterFulltimeLabel")}</option>
                                <option value="Bán thời gian">{t("jobs.workType2")}</option>
                                <option value="Thực tập">{t("jobs.filterInternLabel")}</option>
                                <option value="Remote">{t("jobs.workType4")}</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-sm font-bold text-gray-700 block mb-2">{t("jobs.filterDepartment")}</label>
                              <select
                                value={selectedDepartment}
                                onChange={(e) => setSelectedDepartment(e.target.value)}
                                className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-2.5 text-sm focus:border-[#1B3A8F] outline-none focus:ring-2 focus:ring-[#1B3A8F]/20 font-medium text-gray-700"
                              >
                                <option value="ALL">{t("jobs.filterAllDepartments")}</option>
                                <option value="Kiểm toán">{t("jobs.deptAudit")}</option>
                                <option value="Thuế">{t("jobs.deptTax")}</option>
                                <option value="Kiểm toán XDCB">{t("jobs.deptAuditXDCB")}</option>
                                <option value="Kế toán">{t("jobs.deptAccounting")}</option>
                              </select>
                            </div>

                            {(searchQuery || selectedLocation !== "ALL" || selectedType !== "ALL" || selectedDepartment !== "ALL") && (
                              <button
                                onClick={() => {
                                  setSearchQuery("");
                                  setSelectedLocation("ALL");
                                  setSelectedType("ALL");
                                  setSelectedDepartment("ALL");
                                }}
                                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-sm text-xs transition-colors"
                              >
                                {t("jobs.clearFilter")}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Create Profile CTA Box */}
                        <div className="bg-[#0F1C47] p-6 rounded-sm text-white relative overflow-hidden">
                          <div className="absolute inset-0 bg-grid-navy opacity-30"></div>
                          <h3 className="font-bold text-lg mb-2 relative z-10">{t("jobs.createProfileBoxTitle")}</h3>
                          <p className="text-sm text-blue-100 mb-5 leading-relaxed relative z-10">{t("jobs.createProfileBoxDesc")}</p>
                          <button
                            onClick={() => setCandidateSubMode("create-profile")}
                            className="w-full py-3 bg-[#C9973C] text-[#0F1C47] font-bold rounded-sm text-sm uppercase tracking-wide hover:bg-[#D4AF37] transition-colors relative z-10 flex items-center justify-center gap-2"
                          >
                            <FileText className="w-4 h-4" /> {t("jobs.createProfileBoxBtn")}
                          </button>
                        </div>
                      </motion.div>

                      {/* Right Job Listings */}
                      <motion.div variants={staggerContainer} className="lg:col-span-3 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <h2 className="text-xl font-bold text-[#0F1C47]">{t("jobs.listTitle")} ({filteredJobs.length})</h2>
                        </div>

                        {jobsLoading ? (
                          <div className="bg-white p-12 rounded-sm border border-gray-100 text-center text-sm text-gray-400">
                            {t("jobs.loadingJobs")}
                          </div>
                        ) : filteredJobs.length === 0 ? (
                          <div className="bg-white p-12 rounded-sm border border-gray-100 text-center space-y-3">
                            <Search className="w-12 h-12 text-gray-300 mx-auto" />
                            <h4 className="text-lg font-bold text-[#0F1C47]">{t("jobs.noResultsTitle")}</h4>
                            <p className="text-sm text-gray-500">{t("jobs.noResultsDesc")}</p>
                          </div>
                        ) : (
                          filteredJobs.map((job) => (
                            <motion.div
                              variants={fadeIn}
                              key={job.id}
                              className="group bg-white p-6 lg:p-8 rounded-sm border border-gray-100 border-t-2 border-t-transparent hover:border-t-[#C9973C] hover:shadow-lg transition-all duration-300"
                            >
                              <div className="flex flex-col md:flex-row md:items-start gap-6">
                                {/* Ảnh vị trí tuyển dụng — placeholder icon nếu Admin chưa gắn ảnh */}
                                <Link
                                  href={`/tuyen-dung/${job.id}`}
                                  className="relative w-full md:w-40 h-28 shrink-0 rounded-sm overflow-hidden bg-[#F4F6F9] border border-gray-100 flex items-center justify-center cursor-pointer"
                                >
                                  {job.imageUrl ? (
                                    <Image src={jobImageUrl(job.imageUrl) ?? ""} alt={job.title} fill sizes="(max-width: 768px) 100vw, 160px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                  ) : (
                                    <ImageOff className="w-6 h-6 text-gray-300" />
                                  )}
                                </Link>

                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 flex-1">
                                  <div className="space-y-3 flex-1">
                                    <Link
                                      href={`/tuyen-dung/${job.id}`}
                                      className="block text-xl font-bold text-[#1B3A8F] hover:text-[#C9973C] transition-colors cursor-pointer"
                                    >
                                      {job.title}
                                    </Link>
                                    <p className="text-sm font-bold text-gray-800">{job.department}</p>

                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 pt-1">
                                      <span className="flex items-center gap-1.5 font-medium"><MapPin className="w-4 h-4 text-[#C9973C]" /> {locationLabel(job.location)}</span>
                                      <span className="flex items-center gap-1.5 font-medium"><DollarSign className="w-4 h-4 text-[#C9973C]" /> {job.salary || "—"}</span>
                                      <span className="flex items-center gap-1.5 font-medium"><Briefcase className="w-4 h-4 text-[#C9973C]" /> {typeLabel(job.type)}</span>
                                    </div>

                                    <p className="text-base text-gray-700 leading-relaxed pt-3 border-t border-gray-100 line-clamp-2">{job.description}</p>
                                  </div>

                                  <div className="flex md:flex-col items-center md:items-end justify-between min-w-[140px] shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
                                    <span className="text-xs font-semibold text-gray-500 bg-[#F8F9FA] px-3 py-1.5 rounded-sm border border-gray-200 mb-4">{timeAgo(job.createdAt)}</span>
                                    <Link
                                      href={`/tuyen-dung/${job.id}`}
                                      className="px-6 py-2.5 bg-[#1B3A8F] hover:bg-[#0F1C47] text-white font-bold rounded-sm text-sm transition-colors"
                                    >
                                      {t("jobs.viewApply")}
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </motion.div>

                    </div>
                  </div>
                )}

                {/* MODE B: FULL CANDIDATE PROFILE CREATION FORM (TẠO HỒ SƠ TỪNG BƯỚC) WITH STEPPER */}
                {/* Bắt buộc đăng nhập + đúng role MEMBER mới được tạo hồ sơ — chặn ngay tại đây trước khi hiện form. */}
                {candidateSubMode === "create-profile" && (!authUser || (authUser.role !== "MEMBER" && authUser.role !== "ADMIN")) && (
                  <motion.div variants={fadeIn}>
                    <AuthGateNotice
                      authUser={authUser}
                      requiredRole="MEMBER"
                      title={t("jobs.gateProfileTitle")}
                      desc={t("jobs.gateProfileDesc")}
                      loginLabel={t("jobs.gateLoginBtn")}
                    />
                  </motion.div>
                )}
                {candidateSubMode === "create-profile" && authUser && (authUser.role === "MEMBER" || authUser.role === "ADMIN") && (
                  <motion.div variants={fadeIn} className="bg-white rounded-sm p-8 lg:p-12 border border-gray-100 max-w-5xl mx-auto">
                    <div className="border-b border-gray-100 pb-6 mb-8 text-center">
                      <div className="inline-flex items-center gap-2 bg-[#F4F6F9] text-[#1B3A8F] px-4 py-1.5 rounded-sm text-xs font-bold uppercase mb-3">
                        <FileText className="w-4 h-4 text-[#C9973C]" /> {t("jobs.atsSystemBadge")}
                      </div>
                      <h2 className="text-2xl md:text-4xl font-bold text-[#0F1C47]">{t("jobs.createProfileTitle")}</h2>
                      <div className="w-16 h-1 bg-[#C9973C] mx-auto my-4"></div>

                      {/* STEPPER INDICATOR */}
                      <div className="grid grid-cols-4 gap-2 max-w-2xl mx-auto mt-6">
                        {[
                          { num: 1, label: t("jobs.step1Label") },
                          { num: 2, label: t("jobs.step2Label") },
                          { num: 3, label: t("jobs.step3Label") },
                          { num: 4, label: t("jobs.step4Label") }
                        ].map((s) => (
                          <button
                            key={s.num}
                            type="button"
                            onClick={() => goToProfileStep(s.num)}
                            className={`p-3 rounded-sm border text-center transition-colors ${
                              profileStep === s.num
                                ? "bg-[#1B3A8F] text-white border-[#1B3A8F]"
                                : profileStep > s.num
                                ? "bg-blue-50 text-[#1B3A8F] border-blue-200"
                                : "bg-gray-50 text-gray-400 border-gray-200"
                            }`}
                          >
                            <div className="text-xs font-bold uppercase tracking-wider mb-1">{t("jobs.stepWord")} {s.num}</div>
                            <div className="text-xs font-semibold hidden md:block">{s.label}</div>
                          </button>
                        ))}
                      </div>

                      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-sm text-amber-900 text-xs md:text-sm text-left space-y-1">
                        <p className="font-bold">{t("jobs.profileRulesTitle")}</p>
                        <p>• {t("jobs.profileRule1")}</p>
                        <p>• {t("jobs.profileRule2")}</p>
                      </div>
                    </div>

                    {profileSubmitted ? (
                      <div className="bg-green-50 border border-green-200 text-green-800 p-12 rounded-sm text-center space-y-4">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                        <h3 className="text-2xl font-bold">{t("jobs.profileSuccessTitle")}</h3>
                        <p className="text-base text-gray-700 max-w-lg mx-auto">{t("jobs.profileSuccessDesc")}</p>
                      </div>
                    ) : (
                      <form onSubmit={handleProfileSubmit} className="space-y-10">

                        {/* BƯỚC 1: LIÊN HỆ & THÔNG TIN CHUNG */}
                        {profileStep === 1 && (
                          <motion.div variants={fadeIn} className="space-y-8">
                            <div className="space-y-4">
                              <h3 className="text-lg font-bold text-[#0F1C47] border-l-4 border-[#1B3A8F] pl-3 py-1 bg-[#F8F9FA]">
                                {t("jobs.sec1Title")}
                              </h3>
                              <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                  <label className="text-sm font-bold text-gray-700 block mb-1.5">{t("jobs.labelFullName")}</label>
                                  <input
                                    name="profileFullName" type="text" required placeholder={t("jobs.fullNamePlaceholder")}
                                    value={profileForm.fullName} onChange={(e) => updateProfileField("fullName", e.target.value)}
                                    className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm focus:border-[#1B3A8F] outline-none focus:ring-2 focus:ring-[#1B3A8F]/20"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-bold text-gray-700 block mb-1.5">{t("jobs.labelEmail")}</label>
                                  <input
                                    name="profileEmail" type="email" required placeholder={t("jobs.emailPlaceholderCandidate")}
                                    value={profileForm.email} onChange={(e) => updateProfileField("email", e.target.value)}
                                    className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm focus:border-[#1B3A8F] outline-none focus:ring-2 focus:ring-[#1B3A8F]/20"
                                  />
                                </div>
                              </div>
                              <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                  <label className="text-sm font-bold text-gray-700 block mb-1.5">{t("jobs.labelPhoneStar")}</label>
                                  <input
                                    name="profilePhone" type="tel" required placeholder={t("jobs.phonePlaceholder")}
                                    pattern="^(0|\+84)(3[2-9]|5[25689]|7[0678]|8[1-9]|9[0-9])[0-9]{7}$"
                                    title={t("jobs.phoneFormatHint")}
                                    value={profileForm.phone} onChange={(e) => updateProfileField("phone", e.target.value)}
                                    className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm focus:border-[#1B3A8F] outline-none focus:ring-2 focus:ring-[#1B3A8F]/20"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-bold text-gray-700 block mb-1.5">{t("jobs.labelAddressStar")}</label>
                                  <input
                                    name="profileAddress" type="text" required placeholder={t("jobs.addressPlaceholderCandidate")}
                                    value={profileForm.address} onChange={(e) => updateProfileField("address", e.target.value)}
                                    className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm focus:border-[#1B3A8F] outline-none focus:ring-2 focus:ring-[#1B3A8F]/20"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h3 className="text-lg font-bold text-[#0F1C47] border-l-4 border-[#1B3A8F] pl-3 py-1 bg-[#F8F9FA]">
                                {t("jobs.sec2Title")}
                              </h3>

                              <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                  <label className="text-sm font-bold text-gray-700 block mb-1">{t("jobs.labelDesiredPosition")}</label>
                                  <input
                                    name="profileDesiredPosition" type="text" required placeholder={t("jobs.desiredPositionPlaceholder")}
                                    value={profileForm.desiredPosition} onChange={(e) => updateProfileField("desiredPosition", e.target.value)}
                                    className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm focus:border-[#1B3A8F] outline-none focus:ring-2 focus:ring-[#1B3A8F]/20"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-bold text-gray-700 block mb-1">{t("jobs.labelDesiredLevel")}</label>
                                  <select required value={profileForm.desiredLevel} onChange={(e) => updateProfileField("desiredLevel", e.target.value)} className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm focus:border-[#1B3A8F] outline-none focus:ring-2 focus:ring-[#1B3A8F]/20">
                                    <option value="NhanVien">{t("jobs.profileLevel1")}</option>
                                    <option value="TruongNhom">{t("jobs.profileLevel2")}</option>
                                    <option value="TruongPhong">{t("jobs.profileLevel3")}</option>
                                    <option value="KeToanTruong">{t("jobs.profileLevel4")}</option>
                                    <option value="GiamDoc">{t("jobs.profileLevel5")}</option>
                                    <option value="ThucTapSinh">{t("jobs.profileLevel6")}</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid md:grid-cols-3 gap-5">
                                <div>
                                  <label className="text-sm font-bold text-gray-700 block mb-1.5">{t("jobs.labelWorkLocation")}</label>
                                  <select required value={profileForm.workLocation} onChange={(e) => updateProfileField("workLocation", e.target.value)} className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm focus:border-[#1B3A8F] outline-none focus:ring-2 focus:ring-[#1B3A8F]/20">
                                    <option value="HCM">{t("jobs.locHCM")}</option>
                                    <option value="HN">{t("jobs.locHN")}</option>
                                    <option value="BP">{t("jobs.locBP")}</option>
                                    <option value="DN">{t("jobs.locDN")}</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-sm font-bold text-gray-700 block mb-1.5">{t("jobs.labelIndustryStar")}</label>
                                  <select required value={profileForm.industry} onChange={(e) => updateProfileField("industry", e.target.value)} className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm focus:border-[#1B3A8F] outline-none focus:ring-2 focus:ring-[#1B3A8F]/20">
                                    <option value="KeToanKiemToan">{t("jobs.profileIndustry1")}</option>
                                    <option value="TaiChinhNganHang">{t("jobs.profileIndustry2")}</option>
                                    <option value="TuvangThue">{t("jobs.profileIndustry3")}</option>
                                    <option value="Khac">{t("jobs.profileIndustry4")}</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-sm font-bold text-gray-700 block mb-1.5">{t("jobs.labelEducationLevel")}</label>
                                  <select required value={profileForm.educationLevel} onChange={(e) => updateProfileField("educationLevel", e.target.value)} className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm focus:border-[#1B3A8F] outline-none focus:ring-2 focus:ring-[#1B3A8F]/20">
                                    <option value="DaiHoc">{t("jobs.eduLevel1")}</option>
                                    <option value="ThacSi">{t("jobs.eduLevel2")}</option>
                                    <option value="CaoDang">{t("jobs.eduLevel3")}</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid md:grid-cols-3 gap-5">
                                <div>
                                  <label className="text-sm font-bold text-gray-700 block mb-1.5">{t("jobs.labelExpYears")}</label>
                                  <select required value={profileForm.expYears} onChange={(e) => updateProfileField("expYears", e.target.value)} className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm focus:border-[#1B3A8F] outline-none focus:ring-2 focus:ring-[#1B3A8F]/20">
                                    <option value="ChuaCo">{t("jobs.expYears1")}</option>
                                    <option value="1Nam">{t("jobs.expYears2")}</option>
                                    <option value="2-3Nam">{t("jobs.expYears3")}</option>
                                    <option value="3-5Nam">{t("jobs.expYears4")}</option>
                                    <option value="Trên5Nam">{t("jobs.expYears5")}</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-sm font-bold text-gray-700 block mb-1.5">{t("jobs.labelWorkForm")}</label>
                                  <select required value={profileForm.workForm} onChange={(e) => updateProfileField("workForm", e.target.value)} className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm focus:border-[#1B3A8F] outline-none focus:ring-2 focus:ring-[#1B3A8F]/20">
                                    <option value="FullTime">{t("jobs.workForm1")}</option>
                                    <option value="PartTime">{t("jobs.workForm2")}</option>
                                    <option value="Intern">{t("jobs.workForm3")}</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-sm font-bold text-gray-700 block mb-1.5">{t("jobs.labelDesiredSalary")}</label>
                                  <div className="flex gap-2">
                                    <input type="number" placeholder={t("jobs.salaryFromPlaceholder")} value={profileForm.salaryFrom} onChange={(e) => updateProfileField("salaryFrom", e.target.value)} className="w-1/2 bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                    <input type="number" placeholder={t("jobs.salaryToPlaceholder")} value={profileForm.salaryTo} onChange={(e) => updateProfileField("salaryTo", e.target.value)} className="w-1/2 bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-bold text-gray-700 block mb-1.5">{t("jobs.labelCareerGoal")}</label>
                                <textarea
                                  name="profileCareerGoal" rows={3} required placeholder={t("jobs.careerGoalPlaceholder")}
                                  value={profileForm.careerGoal} onChange={(e) => updateProfileField("careerGoal", e.target.value)}
                                  className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm focus:border-[#1B3A8F] outline-none focus:ring-2 focus:ring-[#1B3A8F]/20"
                                ></textarea>
                              </div>
                            </div>

                            <div className="flex justify-end pt-4">
                              <button
                                type="button"
                                onClick={() => goToProfileStep(2)}
                                className="px-8 py-3.5 bg-[#1B3A8F] text-white font-bold rounded-sm text-sm hover:bg-[#0F1C47] transition-colors flex items-center gap-2"
                              >
                                {t("jobs.btnContinueStep2")} <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        )}

                        {/* BƯỚC 2: KINH NGHIỆM LÀM VIỆC & HỌC VẤN */}
                        {profileStep === 2 && (
                          <motion.div variants={fadeIn} className="space-y-8">
                            {/* KINH NGHIỆM */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between bg-[#F8F9FA] p-2 pr-4 border-l-4 border-[#1B3A8F]">
                                <h3 className="text-lg font-bold text-[#0F1C47] pl-2">
                                  {t("jobs.sec3Title")}
                                </h3>
                                <button
                                  type="button"
                                  onClick={addExperience}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#1B3A8F] text-white px-3 py-1.5 rounded-sm hover:bg-[#0F1C47] transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" /> {t("jobs.addExperience")}
                                </button>
                              </div>

                              {experiences.map((exp, idx) => (
                                <div key={idx} className="p-5 border border-gray-200 rounded-sm bg-gray-50/50 relative space-y-4">
                                  {experiences.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeExperience(idx)}
                                      className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelExpCompany")}</label>
                                      <input type="text" required placeholder={t("jobs.expCompanyPlaceholder")} value={exp.company} onChange={(e) => updateExperience(idx, "company", e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                    </div>
                                    <div>
                                      <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelExpPosition")}</label>
                                      <input type="text" required placeholder={t("jobs.expPositionPlaceholder")} value={exp.position} onChange={(e) => updateExperience(idx, "position", e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                    </div>
                                  </div>
                                  <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                      <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelFromDate")}</label>
                                      <input type="date" value={exp.startDate} onChange={(e) => updateExperience(idx, "startDate", e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                    </div>
                                    <div>
                                      <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelToDate")}</label>
                                      <input type="date" value={exp.endDate} onChange={(e) => updateExperience(idx, "endDate", e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                    </div>
                                    <div>
                                      <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelExpSalary")}</label>
                                      <input type="text" placeholder={t("jobs.expSalaryPlaceholder")} value={exp.salary} onChange={(e) => updateExperience(idx, "salary", e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelExpDesc")}</label>
                                    <textarea rows={2} placeholder={t("jobs.expDescPlaceholder")} value={exp.description} onChange={(e) => updateExperience(idx, "description", e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20"></textarea>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* HỌC VẤN */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between bg-[#F8F9FA] p-2 pr-4 border-l-4 border-[#1B3A8F]">
                                <h3 className="text-lg font-bold text-[#0F1C47] pl-2">
                                  {t("jobs.sec4Title")}
                                </h3>
                                <button
                                  type="button"
                                  onClick={addEducation}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#1B3A8F] text-white px-3 py-1.5 rounded-sm hover:bg-[#0F1C47] transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" /> {t("jobs.addEducation")}
                                </button>
                              </div>

                              {educations.map((edu, idx) => (
                                <div key={idx} className="p-5 border border-gray-200 rounded-sm bg-gray-50/50 relative space-y-4">
                                  {educations.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeEducation(idx)}
                                      className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelDegreeName")}</label>
                                      <input type="text" required placeholder={t("jobs.degreeNamePlaceholder")} value={edu.degree} onChange={(e) => updateEducation(idx, "degree", e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                    </div>
                                    <div>
                                      <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelSchool")}</label>
                                      <input type="text" required placeholder={t("jobs.schoolPlaceholder")} value={edu.school} onChange={(e) => updateEducation(idx, "school", e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                    </div>
                                  </div>
                                  <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                      <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelMajor")}</label>
                                      <input type="text" required placeholder={t("jobs.majorPlaceholder")} value={edu.major} onChange={(e) => updateEducation(idx, "major", e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                    </div>
                                    <div>
                                      <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelGradeType")}</label>
                                      <select value={edu.grade} onChange={(e) => updateEducation(idx, "grade", e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20">
                                        <option value="XuatSac">{t("jobs.grade1")}</option>
                                        <option value="Gioi">{t("jobs.grade2")}</option>
                                        <option value="Kha">{t("jobs.grade3")}</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelGradYear")}</label>
                                      <input type="number" placeholder={t("jobs.gradYearPlaceholder")} value={edu.gradYear} onChange={(e) => updateEducation(idx, "gradYear", e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-between pt-4">
                              <button
                                type="button"
                                onClick={() => goToProfileStep(1)}
                                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-sm text-sm"
                              >
                                {t("jobs.btnBackStep1")}
                              </button>
                              <button
                                type="button"
                                onClick={() => goToProfileStep(3)}
                                className="px-8 py-3.5 bg-[#1B3A8F] text-white font-bold rounded-sm text-sm hover:bg-[#0F1C47] transition-colors flex items-center gap-2"
                              >
                                {t("jobs.btnContinueStep3")} <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        )}

                        {/* BƯỚC 3: KỸ NĂNG & NGƯỜI THAM KHẢO */}
                        {profileStep === 3 && (
                          <motion.div variants={fadeIn} className="space-y-8">
                            <div className="space-y-4">
                              <h3 className="text-lg font-bold text-[#0F1C47] border-l-4 border-[#1B3A8F] pl-3 py-1 bg-[#F8F9FA]">
                                {t("jobs.sec5Title")}
                              </h3>
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelComputerSkill")}</label>
                                  <input type="text" placeholder={t("jobs.computerSkillPlaceholder")} value={profileForm.computerSkill} onChange={(e) => updateProfileField("computerSkill", e.target.value)} className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelForeignLang")}</label>
                                  <input type="text" placeholder={t("jobs.foreignLangPlaceholder")} value={profileForm.foreignLang} onChange={(e) => updateProfileField("foreignLang", e.target.value)} className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center justify-between bg-[#F8F9FA] p-2 pr-4 border-l-4 border-[#1B3A8F]">
                                <h3 className="text-lg font-bold text-[#0F1C47] pl-2">
                                  {t("jobs.sec6Title")}
                                </h3>
                                <button
                                  type="button"
                                  onClick={addReference}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#1B3A8F] text-white px-3 py-1.5 rounded-sm hover:bg-[#0F1C47] transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" /> {t("jobs.addReference")}
                                </button>
                              </div>

                              {references.map((ref, idx) => (
                                <div key={idx} className="p-4 border border-gray-200 rounded-sm bg-gray-50/50 relative grid md:grid-cols-4 gap-4">
                                  {references.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeReference(idx)}
                                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelRefName")}</label>
                                    <input type="text" placeholder={t("jobs.refNamePlaceholder")} value={ref.fullName} onChange={(e) => updateReference(idx, "fullName", e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm p-2 text-xs outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                  </div>
                                  <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelRefCompany")}</label>
                                    <input type="text" placeholder={t("jobs.refCompanyPlaceholder")} value={ref.company} onChange={(e) => updateReference(idx, "company", e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm p-2 text-xs outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                  </div>
                                  <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelRefTitle")}</label>
                                    <input type="text" placeholder={t("jobs.refTitlePlaceholder")} value={ref.position} onChange={(e) => updateReference(idx, "position", e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm p-2 text-xs outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                  </div>
                                  <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelRefPhone")}</label>
                                    <input type="tel" placeholder={t("jobs.refPhonePlaceholder")} value={ref.phone} onChange={(e) => updateReference(idx, "phone", e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm p-2 text-xs outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-between pt-4">
                              <button
                                type="button"
                                onClick={() => goToProfileStep(2)}
                                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-sm text-sm"
                              >
                                {t("jobs.btnBackStep2")}
                              </button>
                              <button
                                type="button"
                                onClick={() => goToProfileStep(4)}
                                className="px-8 py-3.5 bg-[#1B3A8F] text-white font-bold rounded-sm text-sm hover:bg-[#0F1C47] transition-colors flex items-center gap-2"
                              >
                                {t("jobs.btnContinueStep4")} <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        )}

                        {/* BƯỚC 4: TẢI CV & HOÀN TẤT */}
                        {profileStep === 4 && (
                          <motion.div variants={fadeIn} className="space-y-8">
                            <div className="space-y-4">
                              <h3 className="text-lg font-bold text-[#0F1C47] border-l-4 border-[#1B3A8F] pl-3 py-1 bg-[#F8F9FA]">
                                {t("jobs.sec7Title")}
                              </h3>
                              <div className="border-2 border-dashed border-gray-300 rounded-sm p-10 flex flex-col items-center justify-center gap-3 hover:border-[#1B3A8F] bg-[#F8F9FA] transition-colors cursor-pointer relative overflow-hidden">
                                <Upload className="w-10 h-10 text-[#1B3A8F]" />
                                <span className="text-base font-bold text-gray-800">{t("jobs.uploadCta")}</span>
                                <span className="text-xs text-gray-400">{t("jobs.uploadHint")}</span>
                                <input
                                  type="file"
                                  accept=".pdf"
                                  disabled={cvUploading}
                                  onChange={(e) => handleCvFileChange(e.target.files?.[0] || null)}
                                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                />
                                {cvUploading ? (
                                  <span className="text-sm font-bold text-gray-500 bg-white px-4 py-2 rounded-sm border border-gray-200 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tải CV lên...
                                  </span>
                                ) : cvFile && uploadedCvUrl ? (
                                  <span className="text-sm font-bold text-[#1B3A8F] bg-blue-50 px-4 py-2 rounded-sm border border-blue-200 flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-600" /> {cvFile.name}
                                  </span>
                                ) : existingProfileId && uploadedCvUrl ? (
                                  <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-sm border border-emerald-200 flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600" /> Đã có CV từ hồ sơ trước — chọn file mới nếu muốn thay thế
                                  </span>
                                ) : null}
                                {cvUploadError && (
                                  <span className="text-xs font-bold text-red-600">{cvUploadError}</span>
                                )}
                              </div>
                            </div>

                            <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                              <button
                                type="button"
                                onClick={() => goToProfileStep(3)}
                                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-sm text-sm"
                              >
                                {t("jobs.btnBackStep3")}
                              </button>
                              <button
                                type="submit"
                                disabled={cvUploading || !uploadedCvUrl}
                                className="w-full sm:w-auto px-10 py-4 bg-[#C9973C] hover:bg-[#D4AF37] disabled:opacity-60 text-[#0F1C47] font-bold rounded-sm text-base uppercase tracking-wide flex items-center justify-center gap-2"
                              >
                                <Send className="w-5 h-5" /> {existingProfileId ? "Cập Nhật Hồ Sơ" : t("jobs.btnFinalSubmit")}
                              </button>
                            </div>
                          </motion.div>
                        )}

                      </form>
                    )}
                  </motion.div>
                )}

              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: DÀNH CHO NHÀ TUYỂN DỤNG (B2B) */}
            {/* ========================================================================= */}
            {activeTab === "employer" && (
              <motion.div
                key="employer-tab"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={staggerContainer}
                className="space-y-12"
              >
                {/* Tài khoản BUSINESS chưa liên kết công ty vẫn gửi được yêu cầu đăng tin (backend
                    không bắt buộc companyId cho EmployerRequest), nhưng nên nhắc để nhất quán với
                    Cổng Khách Hàng (nơi bắt buộc liên kết mới dùng được) — tránh họ ngạc nhiên. */}
                {authUser?.role === "BUSINESS" && !authUser.companyId && (
                  <motion.div variants={fadeIn} className="bg-amber-50 border border-amber-200 rounded-sm p-4 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      Tài khoản của bạn chưa liên kết công ty. Bạn vẫn có thể gửi yêu cầu đăng tin bên dưới, nhưng để dùng được Cổng Khách Hàng (quản lý chứng từ), hãy liên kết công ty tại{" "}
                      <Link href="/tai-khoan" className="font-bold underline">Tài Khoản Của Tôi</Link>.
                    </p>
                  </motion.div>
                )}

                {/* Introductory B2B Card */}
                <motion.div variants={fadeIn} className="bg-white rounded-sm p-8 lg:p-12 border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <Building2 className="w-7 h-7 text-[#1B3A8F]" />
                    <h2 className="text-2xl md:text-3xl font-bold text-[#0F1C47]">{t("jobs.employerIntroTitle")}</h2>
                  </div>
                  <div className="w-16 h-1 bg-[#C9973C] mb-6"></div>

                  <p className="text-gray-600 text-base leading-relaxed mb-8">
                    {t("jobs.employerIntroDesc")}
                  </p>

                  <div className="grid md:grid-cols-4 gap-6">
                    {[
                      { step: "01", title: t("jobs.employerStep1Title"), desc: t("jobs.employerStep1Desc") },
                      { step: "02", title: t("jobs.employerStep2Title"), desc: t("jobs.employerStep2Desc") },
                      { step: "03", title: t("jobs.employerStep3Title"), desc: t("jobs.employerStep3Desc") },
                      { step: "04", title: t("jobs.employerStep4Title"), desc: t("jobs.employerStep4Desc") }
                    ].map((step, idx) => (
                      <div key={idx} className="bg-[#F8F9FA] p-6 rounded-sm border border-gray-100 relative overflow-hidden">
                        <span className="absolute -top-2 -right-1 text-5xl font-black text-gray-100 select-none leading-none">{step.step}</span>
                        <h4 className="font-bold text-[#0F1C47] text-base mb-2 relative z-10">{step.title}</h4>
                        <p className="text-gray-500 text-sm relative z-10">{step.desc}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {(authUser?.role === "BUSINESS" || authUser?.role === "ADMIN") && (
                  <motion.div variants={fadeIn} className="bg-[#0F1C47] rounded-sm p-8 lg:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Chủ động tìm ứng viên phù hợp</h3>
                      <p className="text-blue-200/70 text-sm">Tìm kiếm trong kho hồ sơ ứng viên của CPA HCM theo vị trí, ngành nghề, khu vực.</p>
                    </div>
                    <Link
                      href="/tuyen-dung/tim-ung-vien"
                      className="shrink-0 flex items-center gap-2 px-6 py-3 bg-[#C9973C] hover:bg-[#D4AF37] text-[#0F1C47] font-bold rounded-sm text-sm uppercase tracking-wide transition-colors"
                    >
                      <Users className="w-4 h-4" /> Tìm Ứng Viên
                    </Link>
                  </motion.div>
                )}

                {/* Employer Submission Form + Contact Sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                  {/* Employer Detailed Form */}
                  <motion.div variants={fadeIn} className="lg:col-span-2 bg-white p-8 lg:p-10 rounded-sm border border-gray-100">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-[#0F1C47]">{t("jobs.employerFormTitle")}</h3>
                        <p className="text-xs text-gray-500 mt-1">{t("jobs.employerFormSubtitle")}</p>
                      </div>
                      <span className="text-xs font-bold text-[#C9973C] bg-[#FDF6E9] border border-amber-200 px-3 py-1 rounded-sm">
                        {t("jobs.employerFormBadge")}
                      </span>
                    </div>

                    {/* Notice box */}
                    <div className="bg-amber-50/70 border border-amber-200 text-amber-900 p-4 rounded-sm text-xs space-y-1 mb-8">
                      <p>• {t("jobs.employerNotice1")}</p>
                      <p>• {t("jobs.employerNotice2")}</p>
                    </div>

                    {employerSubmitted ? (
                      <div className="bg-green-50 border border-green-200 text-green-800 p-8 rounded-sm text-center space-y-3">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                        <h4 className="text-xl font-bold">{t("jobs.employerSuccessTitle")}</h4>
                        <p className="text-base text-gray-700">{t("jobs.employerSuccessDesc")}</p>
                      </div>
                    ) : (!authUser || (authUser.role !== "BUSINESS" && authUser.role !== "ADMIN")) ? (
                      <AuthGateNotice
                        authUser={authUser}
                        requiredRole="BUSINESS"
                        title={t("jobs.gateEmployerTitle")}
                        desc={t("jobs.gateEmployerDesc")}
                        loginLabel={t("jobs.gateLoginBtn")}
                      />
                    ) : (
                      <form onSubmit={handleEmployerSubmit} className="space-y-8">

                        {/* 1. THÔNG TIN CÔNG VIỆC */}
                        <div className="space-y-5">
                          <div className="flex items-center gap-2 bg-[#1B3A8F] text-white px-4 py-2 rounded-sm text-sm font-bold">
                            <span>1.</span> {t("jobs.formSection1")}
                          </div>

                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelPositionTitle")}</label>
                            <input
                              name="empTitle"
                              type="text"
                              required
                              placeholder={t("jobs.positionTitlePlaceholder")}
                              className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-3 text-sm outline-none focus:ring-2 focus:ring-[#1B3A8F]/20"
                            />
                            <span className="text-[11px] text-gray-400 mt-1 block">{t("jobs.positionHint")}</span>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelJobDesc")}</label>
                            <textarea
                              name="empDesc"
                              rows={4}
                              required
                              placeholder={t("jobs.jobDescPlaceholder")}
                              className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-3 text-sm outline-none focus:ring-2 focus:ring-[#1B3A8F]/20"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelRequirements")}</label>
                            <textarea
                              name="empReq"
                              rows={4}
                              required
                              placeholder={t("jobs.requirementsPlaceholder")}
                              className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-3 text-sm outline-none focus:ring-2 focus:ring-[#1B3A8F]/20"
                            />
                          </div>

                          <div className="grid md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelIndustry")}</label>
                              <select name="empIndustry" required className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-3 text-sm outline-none focus:ring-2 focus:ring-[#1B3A8F]/20">
                                <option value="">{t("jobs.industryPlaceholder")}</option>
                                <option value="ke-toan">{t("jobs.industry1")}</option>
                                <option value="tai-chinh">{t("jobs.industry2")}</option>
                                <option value="thue">{t("jobs.industry3")}</option>
                                <option value="ngan-hang">{t("jobs.industry4")}</option>
                                <option value="xaydung">{t("jobs.industry5")}</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelLocationSelect")}</label>
                              <select name="empLocation" required className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-3 text-sm outline-none focus:ring-2 focus:ring-[#1B3A8F]/20">
                                <option value="">{t("jobs.locationPlaceholder")}</option>
                                <option value="hcm">{t("jobs.locHCM")}</option>
                                <option value="hanoi">{t("jobs.locHN")}</option>
                                <option value="binhphuoc">{t("jobs.locBP")}</option>
                                <option value="daknong">{t("jobs.locDN")}</option>
                                <option value="haiphong">{t("jobs.locHP")}</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelWorkType")}</label>
                              <select name="empWorkType" required className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-3 text-sm outline-none focus:ring-2 focus:ring-[#1B3A8F]/20">
                                <option value="Toàn thời gian">{t("jobs.workType1")}</option>
                                <option value="Bán thời gian">{t("jobs.workType2")}</option>
                                <option value="Thực tập">{t("jobs.workType3")}</option>
                                <option value="Remote">{t("jobs.workType4")}</option>
                              </select>
                            </div>
                          </div>

                          {/* Mức lương */}
                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelSalary")}</label>
                            <div className="grid grid-cols-3 gap-3">
                              <select className="bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm font-bold outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20">
                                <option value="VND">VND</option>
                                <option value="USD">USD</option>
                              </select>
                              <input name="empMinSalary" type="text" placeholder={t("jobs.salaryMinPlaceholder")} className="bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                              <input name="empMaxSalary" type="text" placeholder={t("jobs.salaryMaxPlaceholder")} className="bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                            </div>
                            <label className="flex items-center gap-2 mt-2 text-xs text-gray-600 cursor-pointer">
                              <input type="checkbox" defaultChecked className="rounded text-[#1B3A8F]" />
                              <span>{t("jobs.showSalaryLabel")}</span>
                            </label>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelDeadline")}</label>
                            <input name="empDeadline" type="date" required className="w-full bg-[#F8F9FA] border border-gray-200 focus:border-[#1B3A8F] rounded-sm p-3 text-sm outline-none focus:ring-2 focus:ring-[#1B3A8F]/20" />
                          </div>
                        </div>

                        {/* 2. PHÚC LỢI */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2 bg-[#1B3A8F] text-white px-4 py-2 rounded-sm text-sm font-bold">
                            <span>2.</span> {t("jobs.formSection2")}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-gray-700 pt-2">
                            {Array.from({ length: 15 }, (_, i) => t(`jobs.benefitTag${i + 1}`)).map((benefit, i) => (
                              <label key={i} className="flex items-center gap-2 cursor-pointer p-2 bg-[#F8F9FA] rounded-sm hover:bg-gray-100">
                                <input type="checkbox" name="empBenefit" value={benefit} className="rounded text-[#1B3A8F]" />
                                <span>{benefit}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* 3. YÊU CẦU CHUNG */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2 bg-[#1B3A8F] text-white px-4 py-2 rounded-sm text-sm font-bold">
                            <span>3.</span> {t("jobs.formSection3")}
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelGender")}</label>
                              <div className="flex items-center gap-4 text-xs font-medium text-gray-700 pt-2">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input type="radio" name="empGender" value="Không yêu cầu" defaultChecked className="text-[#1B3A8F]" /> {t("jobs.genderNoPref")}
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input type="radio" name="empGender" value="Nam" className="text-[#1B3A8F]" /> {t("jobs.genderMale")}
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input type="radio" name="empGender" value="Nữ" className="text-[#1B3A8F]" /> {t("jobs.genderFemale")}
                                </label>
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelExperience")}</label>
                              <select name="empExperience" required className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20">
                                <option value="">{t("jobs.expPlaceholder")}</option>
                                <option value="Chưa có kinh nghiệm">{t("jobs.exp1")}</option>
                                <option value="Dưới 1 năm">{t("jobs.exp2")}</option>
                                <option value="1 - 3 năm">{t("jobs.exp3")}</option>
                                <option value="3 - 5 năm">{t("jobs.exp4")}</option>
                                <option value="Trên 5 năm">{t("jobs.exp5")}</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelLevel")}</label>
                              <select name="empLevel" required className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20">
                                <option value="">{t("jobs.levelPlaceholder")}</option>
                                <option value="Thực tập sinh">{t("jobs.level1")}</option>
                                <option value="Nhân viên">{t("jobs.level2")}</option>
                                <option value="Trưởng nhóm">{t("jobs.level3")}</option>
                                <option value="Trưởng phòng">{t("jobs.level4")}</option>
                                <option value="Giám đốc">{t("jobs.level5")}</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelDegree")}</label>
                              <select name="empEducation" required className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20">
                                <option value="">{t("jobs.degreePlaceholder")}</option>
                                <option value="Đại học">{t("jobs.degree1")}</option>
                                <option value="Cao đẳng">{t("jobs.degree2")}</option>
                                <option value="Trung cấp">{t("jobs.degree3")}</option>
                                <option value="Sau đại học / Thạc sĩ">{t("jobs.degree4")}</option>
                                <option value="Chứng chỉ CPA/ACCA">{t("jobs.degree5")}</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* 4. TÊN CÔNG TY / TỔ CHỨC */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2 bg-[#1B3A8F] text-white px-4 py-2 rounded-sm text-sm font-bold">
                            <span>4.</span> {t("jobs.formSection4")}
                          </div>

                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelCompanyName")}</label>
                            {/* key thay đổi khi myCompany tải xong (null -> object) ép React mount lại input, vì
                                defaultValue chỉ áp dụng lúc mount đầu — nếu không, GET /companies/me trả về SAU
                                khi input đã mount (race thường gặp vì đây là fetch riêng, chậm hơn phần còn lại
                                của form) thì tên công ty sẽ không bao giờ tự điền được. */}
                            <input key={myCompany ? "loaded" : "loading"} name="empCompanyName" type="text" required defaultValue={myCompany?.name || ""} placeholder={t("jobs.companyNamePlaceholder")} className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelPhone")}</label>
                              <input name="empPhone" type="tel" required defaultValue={authUser?.phone || ""} placeholder={t("jobs.phonePlaceholder")} pattern="^(0|\+84)(3[2-9]|5[25689]|7[0678]|8[1-9]|9[0-9])[0-9]{7}$" title={t("jobs.phoneFormatHint")} className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelEmailReceive")}</label>
                              <input name="empEmail" type="email" required defaultValue={authUser?.email || ""} placeholder={t("jobs.emailReceivePlaceholder")} className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelAddress")}</label>
                            <input key={myCompany ? "loaded" : "loading"} name="empAddress" type="text" required defaultValue={myCompany?.address || ""} placeholder={t("jobs.addressPlaceholder")} className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelCompanyIntro")}</label>
                            <textarea name="empCompanyDesc" rows={3} placeholder={t("jobs.companyIntroPlaceholder")} className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20" />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">{t("jobs.labelCompanySize")}</label>
                            <select name="empCompanySize" className="w-full bg-[#F8F9FA] border border-gray-200 rounded-sm p-3 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20">
                              <option value="Ít hơn 10 nhân viên">{t("jobs.size1")}</option>
                              <option value="10 - 50 nhân viên">{t("jobs.size2")}</option>
                              <option value="50 - 100 nhân viên">{t("jobs.size3")}</option>
                              <option value="100 - 500 nhân viên">{t("jobs.size4")}</option>
                              <option value="Trên 500 nhân viên">{t("jobs.size5")}</option>
                            </select>
                          </div>
                        </div>

                        <button type="submit" className="w-full py-4 bg-[#C9973C] hover:bg-[#D4AF37] text-[#0F1C47] font-bold rounded-sm text-base uppercase tracking-wide flex items-center justify-center gap-2">
                          <Send className="w-5 h-5" /> {t("jobs.submitEmployerBtn")}
                        </button>
                      </form>
                    )}
                  </motion.div>

                  {/* B2B Contact Info Card */}
                  <motion.div variants={fadeIn} className="space-y-6">
                    <div className="bg-[#0F1C47] text-white p-8 rounded-sm relative overflow-hidden">
                      <div className="absolute inset-0 bg-grid-navy opacity-30"></div>
                      <h4 className="text-xl font-bold mb-4 relative z-10">{t("jobs.b2bContactTitle")}</h4>
                      <p className="text-blue-100 text-sm leading-relaxed mb-6 relative z-10">{t("jobs.b2bContactDesc")}</p>

                      <div className="space-y-4 text-sm relative z-10 border-t border-white/10 pt-4">
                        <div className="flex items-center gap-3">
                          <PhoneCall className="w-5 h-5 text-[#C9973C]" />
                          <div>
                            <div className="text-xs text-gray-400">{t("jobs.b2bHotlineLabel")}</div>
                            <div className="font-bold text-base text-[#C9973C]">1900 0380 / 0903 000 000</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-[#C9973C]" />
                          <div>
                            <div className="text-xs text-gray-400">{t("jobs.b2bEmailLabel")}</div>
                            <div className="font-bold text-sm">tuyendung@cpahcm.com.vn</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>

      <Footer />
    </div>
  );
}
