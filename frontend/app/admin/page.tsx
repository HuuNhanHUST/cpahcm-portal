"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import Logo from "../../components/Logo";
import AdminGuard from "../../components/AdminGuard";
import { useLanguage } from "../../context/LanguageContext";
import { refreshAccessToken } from "../../lib/authFetch";
import {
  Users,
  Briefcase,
  FileCheck,
  TrendingUp,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Filter,
  Download,
  Eye,
  Mail,
  Phone,
  Building,
  ShieldCheck,
  BookOpen,
  Settings,
  Edit,
  Trash2,
  RefreshCw,
  X,
  Save,
  UserCheck,
  UserX,
  AlertTriangle,
  GraduationCap,
  FileText,
  Building2,
  Check,
  Newspaper,
  ImageOff,
  EyeOff,
  MessageSquare,
  Pin,
  Lock,
  Unlock,
  MessagesSquare,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Home,
  LogOut,
  Menu,
  MapPin,
  Bot,
} from "lucide-react";
import { API_BASE as ADMIN_API_BASE, API_ORIGIN } from "../../lib/config";
import { PAGE_SIZE, Pagination, StatGrid } from "./tabs/shared";
// Mỗi tab quản trị (9 tab) tải động — chỉ tab Admin đang xem mới được tải xuống trình duyệt,
// thay vì gộp cứng cả 9 tab (kể cả TipTap, react-markdown...) vào 1 bundle ~4000 dòng như trước.
const tabLoading = () => <div className="py-24 text-center text-xs text-gray-400 italic">Đang tải...</div>;
const CompaniesTab = dynamic(() => import("./tabs/CompaniesTab"), { loading: tabLoading });
const DocumentsTab = dynamic(() => import("./tabs/DocumentsTab"), { loading: tabLoading });
const ForumTab = dynamic(() => import("./tabs/ForumTab"), { loading: tabLoading });
const UsersTab = dynamic(() => import("./tabs/UsersTab"), { loading: tabLoading });
const PostsTab = dynamic(() => import("./tabs/PostsTab"), { loading: tabLoading });
const ServicesTab = dynamic(() => import("./tabs/ServicesTab"), { loading: tabLoading });
const RecruitmentTab = dynamic(() => import("./tabs/RecruitmentTab"), { loading: tabLoading });
const CoursesTab = dynamic(() => import("./tabs/CoursesTab"), { loading: tabLoading });
const LeadsTab = dynamic(() => import("./tabs/LeadsTab"), { loading: tabLoading });
const ChatLogsTab = dynamic(() => import("./tabs/ChatLogsTab"), { loading: tabLoading });

export default function AdminManagementPage() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("leads");
  const [loading, setLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");
  // Admin shell — sidebar dọc (thay Header public + pill-tab ngang cũ). Đóng mặc định trên
  // mobile/tablet (< lg), luôn mở trên desktop (CSS lg:translate-x-0 tự xử lý phần desktop).
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals state
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showEditLeadModal, setShowEditLeadModal] = useState<any>(null);
  const [showViewLeadModal, setShowViewLeadModal] = useState<any>(null);
  // Modal xác nhận xóa DÙNG CHUNG cho mọi thao tác xóa trong toàn trang Admin — trước đây chỉ
  // tab Leads có xác nhận, 11 handler xóa còn lại (khóa học, dịch vụ, tin tuyển dụng, bài viết,
  // chủ đề diễn đàn, công ty, chứng từ, hồ sơ ứng tuyển, user...) bấm là xóa ngay, 1 cú click
  // nhầm trên hàng nút dày đặc là mất dữ liệu vĩnh viễn, không có undo.
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const askConfirm = (message: string, onConfirm: () => void) => setConfirmModal({ message, onConfirm });

  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showAddJobModal, setShowAddJobModal] = useState(false);

  // Form states
  const [newLead, setNewLead] = useState({
    companyName: "",
    contactName: "",
    phone: "",
    email: "",
    service: "Kiểm toán Báo cáo tài chính độc lập",
    message: "",
  });

  const COURSE_CATEGORIES = ["CPA", "Kế toán trưởng", "Kế toán tổng hợp", "Thuế"];
  const emptyCourseForm = {
    title: "",
    slug: "",
    category: "CPA",
    tag: "",
    instructor: "",
    description: "",
    longDescription: "",
    price: 0,
    originalPrice: "",
    lessons: 0,
    hours: 0,
    level: "",
    schedule: "",
    isHot: false,
    isActive: true,
  };
  const [newCourse, setNewCourse] = useState(emptyCourseForm);
  const [courseModules, setCourseModules] = useState<
    { id?: string; title: string; lessons: { id?: string; title: string; videoUrl?: string; fileUrl?: string; fileName?: string }[] }[]
  >([]);
  const [uploadingLessonFileId, setUploadingLessonFileId] = useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseImageFile, setCourseImageFile] = useState<File | null>(null);

  const SERVICE_CATEGORIES = ["Kế toán", "Kiểm toán", "Thuế", "Doanh nghiệp"];
  const emptyServiceForm = {
    title: "",
    slug: "",
    category: "Kế toán",
    tag: "",
    shortDesc: "",
    longDescription: "",
    isActive: true,
  };
  const [newService, setNewService] = useState(emptyServiceForm);
  const [serviceFeatures, setServiceFeatures] = useState<string[]>([""]);
  const [serviceDeliverables, setServiceDeliverables] = useState<string[]>([""]);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceImageFile, setServiceImageFile] = useState<File | null>(null);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesSearch, setServicesSearch] = useState("");
  const [servicesPage, setServicesPage] = useState(1);

  const [enrollmentsList, setEnrollmentsList] = useState<any[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);

  const emptyJobForm = {
    title: "",
    department: "Kiểm toán",
    salary: "20 - 30 triệu",
    location: "TP. Hồ Chí Minh",
    type: "Toàn thời gian",
    description: "",
    requirements: "",
    benefits: "",
    deadline: "",
    isActive: true,
  };
  const [newJob, setNewJob] = useState(emptyJobForm);

  // Real backend service requests state
  // Yêu cầu tư vấn & báo giá — dữ liệu thật từ GET /admin/service-requests.
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);

  // Courses List State — dữ liệu thật từ GET /admin/courses (không còn dữ liệu mẫu cố định).
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesSearch, setCoursesSearch] = useState("");
  const [coursesPage, setCoursesPage] = useState(1);

  // Jobs ATS List State — dữ liệu thật từ GET /admin/jobs (không còn dữ liệu mẫu cố định).
  const [jobPostingsList, setJobPostingsList] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [jobImageFile, setJobImageFile] = useState<File | null>(null);
  // Theo dõi EmployerRequest gốc khi mở form "Xuất Bản Tin" từ 1 yêu cầu — gửi kèm khi submit
  // để backend liên kết ngược lại (xem EmployerRequest.publishedJobId).
  const [publishingFromRequestId, setPublishingFromRequestId] = useState<string | null>(null);

  // Applicants ATS State — dữ liệu thật từ GET /admin/applications.
  const [jobApplicants, setJobApplicants] = useState<any[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);

  // Hàng đợi yêu cầu đăng tin từ Doanh nghiệp (role BUSINESS) — chờ Admin duyệt & xuất bản.
  const [employerRequestsList, setEmployerRequestsList] = useState<any[]>([]);
  const [employerRequestsLoading, setEmployerRequestsLoading] = useState(false);

  // Yêu cầu xem liên hệ ứng viên (BUSINESS gửi qua trang Tìm Ứng Viên) — chờ Admin duyệt mới lộ SĐT/email.
  const [candidateIntroRequests, setCandidateIntroRequests] = useState<any[]>([]);
  const [candidateIntroLoading, setCandidateIntroLoading] = useState(false);

  // Posts (Tin Tức) List State — dữ liệu thật từ GET /admin/posts.
  const emptyPostForm = {
    title: "",
    slug: "",
    category: "Pháp luật & Thuế",
    excerpt: "",
    content: "",
    isPublished: true,
  };
  const [newPost, setNewPost] = useState(emptyPostForm);
  const [postsList, setPostsList] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsSearch, setPostsSearch] = useState("");
  const [postsPage, setPostsPage] = useState(1);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [postPreviewMode, setPostPreviewMode] = useState(false);

  // Forum (Diễn Đàn) State — danh mục + kiểm duyệt chủ đề/trả lời, dữ liệu thật từ /admin/forum/*.
  const emptyForumCategoryForm = { name: "", description: "" };
  const [newForumCategory, setNewForumCategory] = useState(emptyForumCategoryForm);
  const [forumCategories, setForumCategories] = useState<any[]>([]);
  const [forumCategoriesLoading, setForumCategoriesLoading] = useState(false);
  const [editingForumCategoryId, setEditingForumCategoryId] = useState<string | null>(null);
  const [showAddForumCategoryModal, setShowAddForumCategoryModal] = useState(false);
  const [forumTopics, setForumTopics] = useState<any[]>([]);
  const [forumTopicsLoading, setForumTopicsLoading] = useState(false);
  const [expandedForumTopicId, setExpandedForumTopicId] = useState<string | null>(null);
  const [expandedForumReplies, setExpandedForumReplies] = useState<any[]>([]);
  const [expandedForumRepliesLoading, setExpandedForumRepliesLoading] = useState(false);

  // Companies (Công Ty Khách Hàng) State — dữ liệu thật từ /admin/companies.
  const emptyCompanyForm = { taxCode: "", name: "", address: "", phone: "", email: "" };
  const [newCompany, setNewCompany] = useState(emptyCompanyForm);
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesSearch, setCompaniesSearch] = useState("");
  const [companiesPage, setCompaniesPage] = useState(1);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);

  // Gán Công ty cho user BUSINESS (dùng trong tab Users) — mở modal chọn company có sẵn
  // hoặc tạo mới ngay trong modal.
  const [assigningCompanyUser, setAssigningCompanyUser] = useState<any>(null);
  const [assignCompanySelection, setAssignCompanySelection] = useState("");
  const [assignCompanyCreating, setAssignCompanyCreating] = useState(false);

  // Yêu cầu liên kết công ty do tài khoản BUSINESS tự gửi (chưa có companyId) — chờ Admin duyệt.
  const [linkRequestsList, setLinkRequestsList] = useState<any[]>([]);
  const [linkRequestsLoading, setLinkRequestsLoading] = useState(false);

  // Documents (Chứng Từ Khách Hàng) State — dữ liệu thật từ /admin/documents.
  const [documentsList, setDocumentsList] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentStatusFilter, setDocumentStatusFilter] = useState("ALL");
  const [rejectingDocument, setRejectingDocument] = useState<any>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState("");
  const [documentsSearch, setDocumentsSearch] = useState("");
  const [documentsPage, setDocumentsPage] = useState(1);

  // Users List State — dữ liệu thật từ GET /admin/users.
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersPage, setUsersPage] = useState(1);

  // Trước đây toast lỗi và toast thành công dùng CHUNG 1 kiểu hiển thị (cùng icon check xanh
  // lá, cùng nền navy) — 1 thao tác xóa/sửa thất bại (VD: FK constraint khi xóa công ty còn user
  // liên kết) trông y hệt như đã thành công, Admin dễ tưởng đã xong việc dù thực ra chưa. Toast
  // lỗi giờ đổi hẳn màu đỏ + icon cảnh báo + hiện lâu hơn (5s thay vì 3s, để kịp đọc thông báo lỗi
  // thường dài hơn "Đã xóa X!").
  const [actionIsError, setActionIsError] = useState(false);
  const showToast = (msg: string, isError = false) => {
    setActionSuccessMsg(msg);
    setActionIsError(isError);
    setTimeout(() => setActionSuccessMsg(""), isError ? 5000 : 3000);
  };

  // 5 trạng thái thật theo SERVICE_REQUEST_STATUSES ở backend (update-service-request-status.dto.ts).
  const leadStatusMeta = (status: string) => {
    switch (status) {
      case "NEW": return { label: "Mới tiếp nhận", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "CONTACTED": return { label: "Đã liên hệ báo giá", color: "bg-amber-50 text-amber-700 border-amber-200" };
      case "QUOTED": return { label: "Đã báo giá", color: "bg-purple-50 text-purple-700 border-purple-200" };
      case "SIGNED": return { label: "Đã ký hợp đồng", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "REJECTED": return { label: "Từ chối / Không tiếp tục", color: "bg-red-50 text-red-700 border-red-200" };
      default: return { label: status, color: "bg-gray-50 text-gray-700 border-gray-200" };
    }
  };

  const fetchServiceRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || localStorage.getItem("token");
      const res = await fetch(`${ADMIN_API_BASE}/admin/service-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không tải được danh sách yêu cầu tư vấn.");
      // Luôn thay thế state bằng dữ liệu thật, kể cả mảng rỗng — mảng rỗng nghĩa là chưa có yêu
      // cầu nào, không phải lý do để giữ lại data giả (bug cũ: chỉ replace khi length > 0).
      setServiceRequests(
        (Array.isArray(json.data) ? json.data : []).map((item: any) => {
          const meta = leadStatusMeta(item.status);
          return {
            realId: item.id,
            id: item.id.substring(0, 8).toUpperCase(),
            companyName: item.companyName,
            taxCode: item.taxCode,
            contactName: item.contactName,
            phone: item.phone,
            email: item.email,
            address: item.address,
            service: item.service,
            message: item.message || "Không có ghi chú thêm.",
            date: new Date(item.createdAt).toLocaleString("vi-VN"),
            status: item.status,
            statusLabel: meta.label,
            statusColor: meta.color,
          };
        })
      );
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải danh sách yêu cầu tư vấn — kiểm tra kết nối backend.", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);

    const loadAllTabs = () => {
      fetchServiceRequests();
      fetchJobPostings();
      fetchJobApplications();
      fetchEmployerRequestsList();
      fetchCandidateIntroRequests();
      fetchPostsList();
      fetchCourses();
      fetchServices();
      fetchEnrollments();
      fetchForumCategories();
      fetchForumTopics();
      fetchUsers();
      fetchCompanies();
      fetchLinkRequests();
      fetchDocuments();
    };

    // Chủ động làm mới access token TRƯỚC khi tải dữ liệu lần đầu — access token chỉ sống 15
    // phút (JWT_ACCESS_EXPIRES_IN). Nếu phiên đăng nhập đã có từ trước và token gần/đã hết hạn,
    // 14 lệnh fetch phía trên sẽ đồng loạt 401 và hiển thị "0" ở mọi tab — đúng sự cố "mất dữ
    // liệu" đã xảy ra thật trước đó (dữ liệu vẫn còn nguyên trong DB, chỉ là fetch âm thầm lỗi).
    // Tiếp tục làm mới định kỳ mỗi 10 phút trong lúc trang còn mở để phòng phiên làm việc dài.
    refreshAccessToken().finally(loadAllTabs);
    const intervalId = setInterval(() => { refreshAccessToken(); }, 10 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Filtered Lists
  const filteredServiceRequests = serviceRequests.filter((req) => {
    const matchesSearch =
      req.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.phone.includes(searchTerm) ||
      req.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.service.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ─── CRUD HANDLERS ───
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${ADMIN_API_BASE}/admin/service-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLead),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể thêm yêu cầu tư vấn.");
      showToast("Thêm yêu cầu tư vấn thành công!");
      fetchServiceRequests();
      setShowAddLeadModal(false);
      setNewLead({ companyName: "", contactName: "", phone: "", email: "", service: "Kiểm toán Báo cáo tài chính độc lập", message: "" });
    } catch (err: any) {
      showToast(err?.message || "Lỗi thêm yêu cầu tư vấn.", true);
    }
  };

  const handleUpdateLeadStatus = async (realId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || localStorage.getItem("token");
      const res = await fetch(`${ADMIN_API_BASE}/admin/service-requests/${realId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể cập nhật trạng thái.");
      showToast("Cập nhật trạng thái thành công!");
      fetchServiceRequests();
      setShowEditLeadModal(null);
    } catch (err: any) {
      showToast(err?.message || "Lỗi cập nhật trạng thái yêu cầu tư vấn.", true);
    }
  };

  const handleDeleteLead = async (realId: string) => {
    try {
      const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || localStorage.getItem("token");
      const res = await fetch(`${ADMIN_API_BASE}/admin/service-requests/${realId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể xóa yêu cầu tư vấn.");
      showToast("Đã xóa yêu cầu tư vấn!");
      fetchServiceRequests();
    } catch (err: any) {
      showToast(err?.message || "Lỗi xóa yêu cầu tư vấn.", true);
    }
  };

  // Job Posting CRUD Handlers
  // BUG THẬT đã tìm và sửa: trước đây chỉ đọc localStorage — nếu admin đăng nhập KHÔNG tick
  // "Ghi nhớ đăng nhập" (login/page.tsx lưu vào sessionStorage trong trường hợp đó), AdminGuard
  // vẫn cho vào (nó đọc cả 2 nơi) nhưng MỌI request trong trang admin gửi "Bearer null" → toàn
  // bộ tab lỗi 401 âm thầm (chỉ hiện toast lỗi, không có gì gợi ý nguyên nhân là do token).
  const getAuthToken = () =>
    localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || localStorage.getItem("token");

  const handleAdminLogout = async () => {
    const token = getAuthToken();
    if (token) {
      try {
        await fetch(`${ADMIN_API_BASE}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      } catch {}
    }
    for (const store of [localStorage, sessionStorage]) {
      store.removeItem("accessToken");
      store.removeItem("refreshToken");
      store.removeItem("user");
      store.removeItem("token");
    }
    window.location.href = "/login";
  };

  // ── Courses CRUD — multipart/form-data (ảnh cover + modules gửi dưới dạng JSON string) ──
  const fetchCourses = async () => {
    setCoursesLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không tải được danh sách khóa học.");
      setCoursesList(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải danh sách khóa học — kiểm tra kết nối backend.", true);
    } finally {
      setCoursesLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append("title", newCourse.title);
      if (newCourse.slug) formData.append("slug", newCourse.slug);
      formData.append("category", newCourse.category);
      if (newCourse.tag) formData.append("tag", newCourse.tag);
      if (newCourse.instructor) formData.append("instructor", newCourse.instructor);
      formData.append("description", newCourse.description);
      formData.append("longDescription", newCourse.longDescription);
      formData.append("price", String(newCourse.price));
      if (newCourse.originalPrice) formData.append("originalPrice", String(newCourse.originalPrice));
      formData.append("lessons", String(newCourse.lessons));
      formData.append("hours", String(newCourse.hours));
      if (newCourse.level) formData.append("level", newCourse.level);
      if (newCourse.schedule) formData.append("schedule", newCourse.schedule);
      formData.append("isHot", String(newCourse.isHot));
      formData.append("isActive", String(newCourse.isActive));
      // Chỉ gửi id/title/videoUrl — fileUrl/fileName KHÔNG nằm trong CourseLessonDto (chỉ gắn qua
      // endpoint upload riêng POST .../lessons/:lessonId/file), gửi thừa sẽ bị class-validator bỏ qua
      // nhưng lược bỏ trước cho gọn payload.
      const validModules = courseModules
        .filter((m) => m.title.trim() !== "")
        .map((m) => ({
          id: m.id,
          title: m.title,
          lessons: m.lessons
            .filter((l) => l.title.trim() !== "")
            .map((l) => ({ id: l.id, title: l.title, videoUrl: l.videoUrl || undefined })),
        }));
      if (validModules.length > 0) formData.append("modules", JSON.stringify(validModules));
      if (courseImageFile) formData.append("image", courseImageFile);

      const url = editingCourseId
        ? `${ADMIN_API_BASE}/admin/courses/${editingCourseId}`
        : `${ADMIN_API_BASE}/admin/courses`;
      const res = await fetch(url, {
        method: editingCourseId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể lưu khóa học.");

      showToast(editingCourseId ? "Cập nhật khóa học thành công!" : "Tạo khóa học mới thành công!");
      setShowAddCourseModal(false);
      setEditingCourseId(null);
      setCourseImageFile(null);
      setNewCourse(emptyCourseForm);
      setCourseModules([]);
      fetchCourses();
    } catch (err: any) {
      showToast(err?.message || "Lỗi lưu khóa học.", true);
    }
  };

  // Gắn/gỡ/tải file PDF bài học — chỉ dùng được khi bài học đã có id thật (đã lưu khóa học ít nhất
  // 1 lần), vì endpoint cần lessonId. Cập nhật lại state cục bộ sau khi gọi API để UI phản ánh ngay.
  const handleAttachLessonFile = async (moduleIdx: number, lessonIdx: number, lessonId: string, file: File) => {
    setUploadingLessonFileId(lessonId);
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${ADMIN_API_BASE}/admin/courses/lessons/${lessonId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể tải lên tài liệu.");
      setCourseModules((prev) =>
        prev.map((m, mi) =>
          mi !== moduleIdx
            ? m
            : { ...m, lessons: m.lessons.map((l, li) => (li !== lessonIdx ? l : { ...l, fileUrl: json.data.fileUrl, fileName: json.data.fileName })) },
        ),
      );
      showToast("Đã gắn tài liệu cho bài học!");
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải lên tài liệu.", true);
    } finally {
      setUploadingLessonFileId(null);
    }
  };

  const handleRemoveLessonFile = async (moduleIdx: number, lessonIdx: number, lessonId: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/courses/lessons/${lessonId}/file`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể gỡ tài liệu.");
      setCourseModules((prev) =>
        prev.map((m, mi) =>
          mi !== moduleIdx ? m : { ...m, lessons: m.lessons.map((l, li) => (li !== lessonIdx ? l : { ...l, fileUrl: "", fileName: "" })) },
        ),
      );
      showToast("Đã gỡ tài liệu khỏi bài học!");
    } catch (err: any) {
      showToast(err?.message || "Lỗi gỡ tài liệu.", true);
    }
  };

  const handleDownloadLessonFile = async (lessonId: string, fileName: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/courses/lessons/${lessonId}/file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể tải tài liệu.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "tai-lieu.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải tài liệu.", true);
    }
  };

  const handleEditCourseClick = (course: any) => {
    setEditingCourseId(course.id);
    setNewCourse({
      title: course.title || "",
      slug: course.slug || "",
      category: course.category || "CPA",
      tag: course.tag || "",
      instructor: course.instructor || "",
      description: course.description || "",
      longDescription: course.longDescription || "",
      price: Number(course.price) || 0,
      originalPrice: course.originalPrice ? String(Number(course.originalPrice)) : "",
      lessons: course.lessons || 0,
      hours: course.hours || 0,
      level: course.level || "",
      schedule: course.schedule || "",
      isHot: course.isHot ?? false,
      isActive: course.isActive !== false,
    });
    setCourseModules(
      (course.modules || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        lessons: (m.lessons || []).map((l: any) => ({
          id: l.id,
          title: l.title,
          videoUrl: l.videoUrl || "",
          fileUrl: l.fileUrl || "",
          fileName: l.fileName || "",
        })),
      })),
    );
    setCourseImageFile(null);
    setShowAddCourseModal(true);
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/courses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Không thể xóa khóa học.");
      }
      showToast("Đã xóa khóa học!");
      fetchCourses();
    } catch (err: any) {
      showToast(err?.message || "Lỗi xóa khóa học.", true);
    }
  };

  // ── Services CRUD — multipart/form-data (ảnh cover + features/deliverables JSON string) ──
  const fetchServices = async () => {
    setServicesLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/services`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không tải được danh sách dịch vụ.");
      setServicesList(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải danh sách dịch vụ — kiểm tra kết nối backend.", true);
    } finally {
      setServicesLoading(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append("title", newService.title);
      if (newService.slug) formData.append("slug", newService.slug);
      formData.append("category", newService.category);
      if (newService.tag) formData.append("tag", newService.tag);
      formData.append("shortDesc", newService.shortDesc);
      formData.append("longDescription", newService.longDescription);
      formData.append("features", JSON.stringify(serviceFeatures.filter((f) => f.trim() !== "")));
      formData.append("deliverables", JSON.stringify(serviceDeliverables.filter((d) => d.trim() !== "")));
      formData.append("isActive", String(newService.isActive));
      if (serviceImageFile) formData.append("image", serviceImageFile);

      const url = editingServiceId
        ? `${ADMIN_API_BASE}/admin/services/${editingServiceId}`
        : `${ADMIN_API_BASE}/admin/services`;
      const res = await fetch(url, {
        method: editingServiceId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể lưu dịch vụ.");

      showToast(editingServiceId ? "Cập nhật dịch vụ thành công!" : "Tạo dịch vụ mới thành công!");
      setShowAddServiceModal(false);
      setEditingServiceId(null);
      setServiceImageFile(null);
      setNewService(emptyServiceForm);
      setServiceFeatures([""]);
      setServiceDeliverables([""]);
      fetchServices();
    } catch (err: any) {
      showToast(err?.message || "Lỗi lưu dịch vụ.", true);
    }
  };

  const handleEditServiceClick = (service: any) => {
    setEditingServiceId(service.id);
    setNewService({
      title: service.title || "",
      slug: service.slug || "",
      category: service.category || "Kế toán",
      tag: service.tag || "",
      shortDesc: service.shortDesc || "",
      longDescription: service.longDescription || "",
      isActive: service.isActive !== false,
    });
    setServiceFeatures(service.features?.length ? service.features : [""]);
    setServiceDeliverables(service.deliverables?.length ? service.deliverables : [""]);
    setServiceImageFile(null);
    setShowAddServiceModal(true);
  };

  const handleDeleteService = async (id: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/services/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Không thể xóa dịch vụ.");
      }
      showToast("Đã xóa dịch vụ!");
      fetchServices();
    } catch (err: any) {
      showToast(err?.message || "Lỗi xóa dịch vụ.", true);
    }
  };

  // ── Enrollments management ──
  const fetchEnrollments = async () => {
    setEnrollmentsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/enrollments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không tải được danh sách đăng ký khóa học.");
      setEnrollmentsList(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải danh sách đăng ký — kiểm tra kết nối backend.", true);
    } finally {
      setEnrollmentsLoading(false);
    }
  };

  const handleUpdateEnrollmentStatus = async (id: string, status: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/enrollments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Không thể cập nhật trạng thái đăng ký.");
      }
      showToast("Cập nhật trạng thái đăng ký thành công!");
      fetchEnrollments();
    } catch (err: any) {
      showToast(err?.message || "Lỗi cập nhật trạng thái đăng ký.", true);
    }
  };

  const fetchJobPostings = async () => {
    setJobsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không tải được danh sách tin tuyển dụng.");
      setJobPostingsList(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải danh sách tin tuyển dụng — kiểm tra kết nối backend.", true);
    } finally {
      setJobsLoading(false);
    }
  };

  const fetchJobApplications = async () => {
    setApplicantsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không tải được danh sách hồ sơ ứng tuyển.");
      setJobApplicants(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải danh sách ứng viên — kiểm tra kết nối backend.", true);
    } finally {
      setApplicantsLoading(false);
    }
  };

  const fetchEmployerRequestsList = async () => {
    setEmployerRequestsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/recruitment/employer-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không tải được hàng đợi yêu cầu đăng tin.");
      setEmployerRequestsList(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải hàng đợi yêu cầu đăng tin — kiểm tra kết nối backend.", true);
    } finally {
      setEmployerRequestsLoading(false);
    }
  };

  const fetchCandidateIntroRequests = async () => {
    setCandidateIntroLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/candidate-introduction-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không tải được danh sách yêu cầu xem liên hệ ứng viên.");
      setCandidateIntroRequests(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải yêu cầu xem liên hệ ứng viên — kiểm tra kết nối backend.", true);
    } finally {
      setCandidateIntroLoading(false);
    }
  };

  const handleReviewCandidateIntroRequest = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/candidate-introduction-requests/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể xử lý yêu cầu.");
      showToast(status === "APPROVED" ? "Đã duyệt — doanh nghiệp có thể xem SĐT/email." : "Đã từ chối yêu cầu.");
      fetchCandidateIntroRequests();
    } catch (err: any) {
      showToast(err?.message || "Lỗi xử lý yêu cầu.", true);
    }
  };

  // Job Posting CRUD — multipart/form-data vì có ảnh đính kèm. KHÔNG fallback giả lập khi lỗi
  // (khác các tab demo khác) vì đây là dữ liệu Admin cần chắc chắn đã lưu thật vào DB.
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append("title", newJob.title);
      formData.append("department", newJob.department);
      formData.append("description", newJob.description);
      formData.append("requirements", newJob.requirements);
      formData.append("benefits", newJob.benefits);
      formData.append("salary", newJob.salary);
      formData.append("location", newJob.location);
      formData.append("type", newJob.type);
      if (newJob.deadline) formData.append("deadline", new Date(newJob.deadline).toISOString());
      formData.append("isActive", String(newJob.isActive));
      if (jobImageFile) formData.append("image", jobImageFile);
      if (!editingJobId && publishingFromRequestId) formData.append("employerRequestId", publishingFromRequestId);

      const url = editingJobId
        ? `${ADMIN_API_BASE}/admin/jobs/${editingJobId}`
        : `${ADMIN_API_BASE}/admin/jobs`;
      const res = await fetch(url, {
        method: editingJobId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể lưu tin tuyển dụng.");

      showToast(editingJobId ? "Cập nhật tin tuyển dụng thành công!" : "Xuất bản tin tuyển dụng mới thành công!");
      setShowAddJobModal(false);
      setEditingJobId(null);
      setJobImageFile(null);
      setNewJob(emptyJobForm);
      if (publishingFromRequestId) {
        setPublishingFromRequestId(null);
        fetchEmployerRequestsList();
      }
      fetchJobPostings();
    } catch (err: any) {
      showToast(err?.message || "Lỗi lưu tin tuyển dụng.", true);
    }
  };

  const handleEditJobClick = (job: any) => {
    setEditingJobId(job.id);
    setPublishingFromRequestId(null);
    setNewJob({
      title: job.title || "",
      department: job.department || "Kiểm toán",
      salary: job.salary || "",
      location: job.location || "TP. Hồ Chí Minh",
      type: job.type || "Toàn thời gian",
      description: job.description || "",
      requirements: job.requirements || "",
      benefits: job.benefits || "",
      deadline: job.deadline ? job.deadline.substring(0, 10) : "",
      isActive: job.isActive !== false,
    });
    setJobImageFile(null);
    setShowAddJobModal(true);
  };

  /**
   * `createEmployerPosting` (backend) ghép toàn bộ chi tiết yêu cầu của Doanh nghiệp thành 1
   * đoạn text theo mẫu cố định "Nhãn: giá trị" nối bằng "\n" (xem recruitment.service.ts).
   * Tách lại theo đúng nhãn đó (tìm mốc nhãn TIẾP THEO trong text, không tách theo từng dòng)
   * để giữ đúng các dòng xuống hàng thật sự nằm bên trong description/requirements.
   */
  const EMPLOYER_DESC_LABELS: [string, string][] = [
    ["description", "Mô tả: "],
    ["requirements", "Yêu cầu: "],
    ["industry", "Ngành nghề: "],
    ["location", "Địa điểm: "],
    ["workType", "Hình thức: "],
    ["gender", "Giới tính: "],
    ["experience", "Kinh nghiệm: "],
    ["level", "Cấp bậc: "],
    ["education", "Bằng cấp: "],
    ["benefits", "Phúc lợi: "],
    ["address", "Địa chỉ trụ sở: "],
    ["companySize", "Quy mô công ty: "],
    ["companyDesc", "Giới thiệu công ty: "],
  ];

  const parseEmployerJobDescription = (text: string): Record<string, string> => {
    const result: Record<string, string> = {};
    if (!text) return result;
    for (let i = 0; i < EMPLOYER_DESC_LABELS.length; i++) {
      const [key, label] = EMPLOYER_DESC_LABELS[i];
      const start = i === 0
        ? (text.startsWith(label) ? label.length : -1)
        : (() => { const idx = text.indexOf(`\n${label}`); return idx >= 0 ? idx + 1 + label.length : -1; })();
      if (start === -1) continue;

      let end = text.length;
      for (let j = i + 1; j < EMPLOYER_DESC_LABELS.length; j++) {
        const idx = text.indexOf(`\n${EMPLOYER_DESC_LABELS[j][1]}`, start);
        if (idx >= 0) { end = idx; break; }
      }
      result[key] = text.slice(start, end).trim();
    }
    return result;
  };

  /**
   * Điền sẵn form Đăng Tin từ 1 yêu cầu Doanh nghiệp đang chờ duyệt — Admin biên tập lại rồi xuất bản.
   * `department` là danh mục nội bộ cố định (Kiểm toán/Thuế/...), KHÔNG phải tên công ty — để mặc
   * định "Kiểm toán" và bắt Admin tự chọn đúng danh mục, tránh lưu nhầm tên doanh nghiệp vào đó.
   * Mô tả/Yêu cầu/Phúc lợi được tách riêng vào đúng field của form thay vì dán nguyên cả đoạn
   * text đã ghép (địa chỉ, quy mô công ty...) vào ô Mô tả công khai — tránh lộ nội dung soạn thô.
   */
  const handlePublishFromRequest = (req: any) => {
    const parsed = parseEmployerJobDescription(req.jobDescription || "");
    setEditingJobId(null);
    setPublishingFromRequestId(req.id);
    setNewJob({
      ...emptyJobForm,
      title: req.position || "",
      department: "Kiểm toán",
      description: parsed.description || req.jobDescription || "",
      requirements: parsed.requirements || "",
      benefits: parsed.benefits && parsed.benefits !== "Theo quy định" ? parsed.benefits : "",
      salary: req.expectedSalary && req.expectedSalary.trim() !== "-" ? req.expectedSalary : "",
    });
    setJobImageFile(null);
    setShowAddJobModal(true);
  };

  const handleDeleteJob = async (id: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/jobs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Không thể xóa tin tuyển dụng.");
      }
      showToast("Đã gỡ tin tuyển dụng!");
      fetchJobPostings();
    } catch (err: any) {
      showToast(err?.message || "Lỗi xóa tin tuyển dụng.", true);
    }
  };

  const fetchPostsList = async () => {
    setPostsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không tải được danh sách bài viết.");
      setPostsList(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải danh sách bài viết — kiểm tra kết nối backend.", true);
    } finally {
      setPostsLoading(false);
    }
  };

  // Post CRUD — multipart/form-data vì có ảnh cover đính kèm.
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append("title", newPost.title);
      if (newPost.slug) formData.append("slug", newPost.slug);
      formData.append("category", newPost.category);
      formData.append("excerpt", newPost.excerpt);
      formData.append("content", newPost.content);
      formData.append("isPublished", String(newPost.isPublished));
      if (postImageFile) formData.append("image", postImageFile);

      const url = editingPostId
        ? `${ADMIN_API_BASE}/admin/posts/${editingPostId}`
        : `${ADMIN_API_BASE}/admin/posts`;
      const res = await fetch(url, {
        method: editingPostId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể lưu bài viết.");

      showToast(editingPostId ? "Cập nhật bài viết thành công!" : "Đăng bài viết mới thành công!");
      setShowAddPostModal(false);
      setEditingPostId(null);
      setPostImageFile(null);
      setPostPreviewMode(false);
      setNewPost(emptyPostForm);
      fetchPostsList();
    } catch (err: any) {
      showToast(err?.message || "Lỗi lưu bài viết.", true);
    }
  };

  const handleEditPostClick = (post: any) => {
    setEditingPostId(post.id);
    setNewPost({
      title: post.title || "",
      slug: post.slug || "",
      category: post.category || "Pháp luật & Thuế",
      excerpt: post.excerpt || "",
      content: post.content || "",
      isPublished: post.isPublished !== false,
    });
    setPostImageFile(null);
    setPostPreviewMode(false);
    setShowAddPostModal(true);
  };

  const handleDeletePost = async (id: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/posts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Không thể xóa bài viết.");
      }
      showToast("Đã xóa bài viết!");
      fetchPostsList();
    } catch (err: any) {
      showToast(err?.message || "Lỗi xóa bài viết.", true);
    }
  };

  // ── Forum CRUD — JSON body thường (không có ảnh), khác Posts/Courses/Services ──
  const fetchForumCategories = async () => {
    setForumCategoriesLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/forum/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không tải được danh mục diễn đàn.");
      setForumCategories(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải danh mục diễn đàn.", true);
    } finally {
      setForumCategoriesLoading(false);
    }
  };

  const fetchForumTopics = async () => {
    setForumTopicsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/forum/topics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không tải được danh sách chủ đề.");
      setForumTopics(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải danh sách chủ đề diễn đàn.", true);
    } finally {
      setForumTopicsLoading(false);
    }
  };

  const handleSaveForumCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const url = editingForumCategoryId
        ? `${ADMIN_API_BASE}/admin/forum/categories/${editingForumCategoryId}`
        : `${ADMIN_API_BASE}/admin/forum/categories`;
      const res = await fetch(url, {
        method: editingForumCategoryId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newForumCategory),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể lưu danh mục.");

      showToast(editingForumCategoryId ? "Cập nhật danh mục thành công!" : "Tạo danh mục thành công!");
      setShowAddForumCategoryModal(false);
      setEditingForumCategoryId(null);
      setNewForumCategory(emptyForumCategoryForm);
      fetchForumCategories();
    } catch (err: any) {
      showToast(err?.message || "Lỗi lưu danh mục diễn đàn.", true);
    }
  };

  const handleEditForumCategoryClick = (category: any) => {
    setEditingForumCategoryId(category.id);
    setNewForumCategory({ name: category.name || "", description: category.description || "" });
    setShowAddForumCategoryModal(true);
  };

  const handleDeleteForumCategory = async (id: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/forum/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể xóa danh mục.");
      showToast("Đã xóa danh mục diễn đàn!");
      fetchForumCategories();
    } catch (err: any) {
      showToast(err?.message || "Lỗi xóa danh mục diễn đàn.", true);
    }
  };

  const handleToggleForumTopicPinned = async (id: string, current: boolean) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/forum/topics/${id}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value: !current }),
      });
      if (!res.ok) throw new Error("Không thể cập nhật trạng thái ghim.");
      fetchForumTopics();
    } catch (err: any) {
      showToast(err?.message || "Lỗi cập nhật trạng thái ghim.", true);
    }
  };

  const handleToggleForumTopicLocked = async (id: string, current: boolean) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/forum/topics/${id}/lock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value: !current }),
      });
      if (!res.ok) throw new Error("Không thể cập nhật trạng thái khóa.");
      fetchForumTopics();
    } catch (err: any) {
      showToast(err?.message || "Lỗi cập nhật trạng thái khóa.", true);
    }
  };

  const handleDeleteForumTopic = async (id: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/forum/topics/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể xóa chủ đề.");
      showToast("Đã xóa chủ đề diễn đàn!");
      if (expandedForumTopicId === id) setExpandedForumTopicId(null);
      fetchForumTopics();
    } catch (err: any) {
      showToast(err?.message || "Lỗi xóa chủ đề diễn đàn.", true);
    }
  };

  // Xem trả lời của 1 chủ đề — dùng endpoint admin riêng (GET /admin/forum/topics/:id), KHÔNG
  // dùng endpoint public GET /forum/topics/:slug nữa vì endpoint đó tăng viewCount ở mọi lệnh gọi,
  // khiến mỗi lần Admin mở panel duyệt bài lại cộng nhầm "lượt xem" ảo vào số liệu công khai.
  const toggleForumTopicReplies = async (topic: any) => {
    if (expandedForumTopicId === topic.id) {
      setExpandedForumTopicId(null);
      return;
    }
    setExpandedForumTopicId(topic.id);
    setExpandedForumRepliesLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/forum/topics/${topic.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      setExpandedForumReplies(Array.isArray(json?.data?.replies) ? json.data.replies : []);
    } catch {
      setExpandedForumReplies([]);
    } finally {
      setExpandedForumRepliesLoading(false);
    }
  };

  const handleDeleteForumReply = async (replyId: string, topic: any) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/forum/replies/${replyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể xóa trả lời.");
      showToast("Đã xóa trả lời!");
      fetchForumTopics();
      // Tải lại danh sách reply đang mở để phản ánh ngay việc vừa xóa (endpoint admin, không tăng viewCount).
      const detailRes = await fetch(`${ADMIN_API_BASE}/admin/forum/topics/${topic.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const detailJson = await detailRes.json().catch(() => null);
      setExpandedForumReplies(Array.isArray(detailJson?.data?.replies) ? detailJson.data.replies : []);
    } catch (err: any) {
      showToast(err?.message || "Lỗi xóa trả lời diễn đàn.", true);
    }
  };

  // ── Companies CRUD — JSON body thường (không có ảnh) ──
  const fetchCompanies = async () => {
    setCompaniesLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không tải được danh sách công ty.");
      setCompaniesList(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải danh sách công ty.", true);
    } finally {
      setCompaniesLoading(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const url = editingCompanyId
        ? `${ADMIN_API_BASE}/admin/companies/${editingCompanyId}`
        : `${ADMIN_API_BASE}/admin/companies`;
      const res = await fetch(url, {
        method: editingCompanyId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newCompany),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể lưu công ty.");

      showToast(editingCompanyId ? "Cập nhật công ty thành công!" : "Tạo công ty thành công!");
      setShowAddCompanyModal(false);
      setEditingCompanyId(null);
      setNewCompany(emptyCompanyForm);
      fetchCompanies();
    } catch (err: any) {
      showToast(err?.message || "Lỗi lưu công ty.", true);
    }
  };

  const handleEditCompanyClick = (company: any) => {
    setEditingCompanyId(company.id);
    setNewCompany({
      taxCode: company.taxCode || "",
      name: company.name || "",
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
    });
    setShowAddCompanyModal(true);
  };

  const handleDeleteCompany = async (id: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/companies/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể xóa công ty.");
      showToast("Đã xóa công ty!");
      fetchCompanies();
    } catch (err: any) {
      showToast(err?.message || "Lỗi xóa công ty.", true);
    }
  };

  // ── Gán Công ty cho user BUSINESS (mở từ tab Users) ──
  const openAssignCompanyModal = (user: any) => {
    setAssigningCompanyUser(user);
    setAssignCompanySelection(user.companyId || "");
    setAssignCompanyCreating(false);
    setNewCompany(emptyCompanyForm);
    if (companiesList.length === 0) fetchCompanies();
  };

  const handleAssignCompany = async (companyId: string | null) => {
    if (!assigningCompanyUser) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/users/${assigningCompanyUser.id}/company`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể gán công ty.");
      showToast("Cập nhật công ty cho tài khoản thành công!");
      setAssigningCompanyUser(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err?.message || "Lỗi gán công ty.", true);
    }
  };

  const handleCreateAndAssignCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newCompany),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể tạo công ty.");
      await handleAssignCompany(json.data.id);
      fetchCompanies();
    } catch (err: any) {
      showToast(err?.message || "Lỗi tạo công ty.", true);
    }
  };

  // ── Yêu cầu liên kết công ty (BUSINESS tự gửi qua /tai-khoan) ──
  const fetchLinkRequests = async () => {
    setLinkRequestsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/company-link-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không tải được yêu cầu liên kết công ty.");
      setLinkRequestsList(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải yêu cầu liên kết công ty.", true);
    } finally {
      setLinkRequestsLoading(false);
    }
  };

  const handleReviewLinkRequest = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/company-link-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể xử lý yêu cầu.");
      showToast(status === "APPROVED" ? "Đã duyệt liên kết công ty!" : "Đã từ chối yêu cầu!");
      fetchLinkRequests();
      fetchCompanies();
    } catch (err: any) {
      showToast(err?.message || "Lỗi xử lý yêu cầu liên kết công ty.", true);
    }
  };

  // ── Documents (Chứng Từ Khách Hàng) — kiểm duyệt ──
  const fetchDocuments = async (status?: string) => {
    setDocumentsLoading(true);
    try {
      const token = getAuthToken();
      const params = status && status !== "ALL" ? `?status=${status}` : "";
      const res = await fetch(`${ADMIN_API_BASE}/admin/documents${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không tải được danh sách chứng từ.");
      setDocumentsList(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải danh sách chứng từ.", true);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleUpdateDocumentStatus = async (id: string, status: string, reviewNote?: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/documents/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(reviewNote ? { status, reviewNote } : { status }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể cập nhật trạng thái chứng từ.");
      showToast("Cập nhật trạng thái chứng từ thành công!");
      fetchDocuments(documentStatusFilter);
    } catch (err: any) {
      showToast(err?.message || "Lỗi cập nhật trạng thái chứng từ.", true);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingDocument || !rejectReasonInput.trim()) return;
    await handleUpdateDocumentStatus(rejectingDocument.id, "REJECTED", rejectReasonInput.trim());
    setRejectingDocument(null);
    setRejectReasonInput("");
  };

  const handleDownloadDocument = async (doc: any) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể tải xuống chứng từ.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải xuống chứng từ.", true);
    }
  };

  const [uploadingResultFileId, setUploadingResultFileId] = useState<string | null>(null);

  const handleAttachDocumentResultFile = async (docId: string, file: File) => {
    setUploadingResultFileId(docId);
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${ADMIN_API_BASE}/admin/documents/${docId}/result-file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể tải lên file kết quả.");
      showToast("Đã gắn file kết quả — email thông báo đã gửi tới khách hàng!");
      fetchDocuments(documentStatusFilter);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải lên file kết quả.", true);
    } finally {
      setUploadingResultFileId(null);
    }
  };

  const handleRemoveDocumentResultFile = async (docId: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/documents/${docId}/result-file`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể gỡ file kết quả.");
      showToast("Đã gỡ file kết quả!");
      fetchDocuments(documentStatusFilter);
    } catch (err: any) {
      showToast(err?.message || "Lỗi gỡ file kết quả.", true);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/documents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể xóa chứng từ.");
      showToast("Đã xóa chứng từ!");
      fetchDocuments(documentStatusFilter);
    } catch (err: any) {
      showToast(err?.message || "Lỗi xóa chứng từ.", true);
    }
  };

  // Job Application (ATS) status/delete — dùng endpoint admin thật đã có sẵn.
  const handleUpdateApplicationStatus = async (id: string, status: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/applications/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Không thể cập nhật trạng thái hồ sơ.");
      }
      showToast("Cập nhật trạng thái hồ sơ thành công!");
      fetchJobApplications();
    } catch (err: any) {
      showToast(err?.message || "Lỗi cập nhật trạng thái hồ sơ.", true);
    }
  };

  const handleDeleteApplication = async (id: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/applications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Không thể xóa hồ sơ ứng tuyển.");
      }
      showToast("Đã xóa hồ sơ ứng tuyển!");
      fetchJobApplications();
    } catch (err: any) {
      showToast(err?.message || "Lỗi xóa hồ sơ ứng tuyển.", true);
    }
  };

  // Tải CV — endpoint yêu cầu JWT nên không thể dùng <a href> tĩnh, phải fetch → blob → trigger
  // download thủ công (giống pattern downloadDocumentFile ở Cổng Khách Hàng).
  const handleDownloadCv = async (applicationId: string, applicantName: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/recruitment/applications/${applicationId}/cv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể tải CV. File có thể không còn tồn tại.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CV-${applicantName || "ung-vien"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải CV.", true);
    }
  };

  // User RBAC Handlers — dữ liệu thật, không còn mock local-state.
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không tải được danh sách người dùng.");
      setUsersList(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      showToast(err?.message || "Lỗi tải danh sách người dùng.", true);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUpdateUserRole = async (id: string, role: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể cập nhật phân quyền.");
      showToast("Cập nhật phân quyền tài khoản thành công!");
      fetchUsers();
    } catch (err: any) {
      showToast(err?.message || "Lỗi cập nhật phân quyền.", true);
    }
  };

  const handleToggleUserStatus = async (id: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/users/${id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể đổi trạng thái tài khoản.");
      showToast("Thay đổi trạng thái tài khoản thành công!");
      fetchUsers();
    } catch (err: any) {
      showToast(err?.message || "Lỗi đổi trạng thái tài khoản.", true);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${ADMIN_API_BASE}/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Không thể xóa tài khoản.");
      showToast("Đã xóa tài khoản người dùng!");
      fetchUsers();
    } catch (err: any) {
      showToast(err?.message || "Lỗi xóa tài khoản người dùng.", true);
    }
  };

  if (!mounted) return null;

  // Tìm kiếm + phân trang client-side cho các tab dễ phình to (users/documents/companies/
  // posts/courses/services) — trước đây render toàn bộ mảng không giới hạn, không có cách nào
  // tìm 1 bản ghi cụ thể ngoài cuộn tay qua toàn bộ danh sách.
  const q = (s: string) => s.toLowerCase();
  const filteredCoursesList = coursesList.filter((c: any) => !coursesSearch || q(c.title || "").includes(q(coursesSearch)));
  const pagedCoursesList = filteredCoursesList.slice((coursesPage - 1) * PAGE_SIZE, coursesPage * PAGE_SIZE);

  const filteredServicesList = servicesList.filter((s: any) => !servicesSearch || q(s.title || "").includes(q(servicesSearch)));
  const pagedServicesList = filteredServicesList.slice((servicesPage - 1) * PAGE_SIZE, servicesPage * PAGE_SIZE);

  const filteredPostsList = postsList.filter((p: any) => !postsSearch || q(p.title || "").includes(q(postsSearch)));
  const pagedPostsList = filteredPostsList.slice((postsPage - 1) * PAGE_SIZE, postsPage * PAGE_SIZE);

  const filteredUsersList = usersList.filter((u: any) =>
    !usersSearch || q(u.fullName || "").includes(q(usersSearch)) || q(u.email || "").includes(q(usersSearch)),
  );
  const pagedUsersList = filteredUsersList.slice((usersPage - 1) * PAGE_SIZE, usersPage * PAGE_SIZE);

  const filteredDocumentsList = documentsList.filter((d: any) =>
    !documentsSearch || q(d.fileName || "").includes(q(documentsSearch)) || q(d.company?.name || "").includes(q(documentsSearch)),
  );
  const pagedDocumentsList = filteredDocumentsList.slice((documentsPage - 1) * PAGE_SIZE, documentsPage * PAGE_SIZE);

  const filteredCompaniesList = companiesList.filter((c: any) =>
    !companiesSearch || q(c.name || "").includes(q(companiesSearch)) || q(c.taxCode || "").includes(q(companiesSearch)),
  );
  const pagedCompaniesList = filteredCompaniesList.slice((companiesPage - 1) * PAGE_SIZE, companiesPage * PAGE_SIZE);

  // group: gom nhóm điều hướng theo nghiệp vụ thay vì 1 danh sách phẳng 9 mục — dễ định vị hơn
  // khi số lượng tab tăng lên, đúng pattern admin console chuyên nghiệp (Stripe/Vercel-style).
  const adminTabs = [
    { id: "leads", label: "Yêu cầu tư vấn & báo giá", group: "Khách hàng", icon: Phone, count: `${serviceRequests.length} mục`, pending: serviceRequests.filter((r: any) => r.status === "NEW").length, refresh: fetchServiceRequests },
    { id: "companies", label: "Quản Lý Công Ty", group: "Khách hàng", icon: Building2, count: `${companiesList.length} công ty`, pending: linkRequestsList.filter((r: any) => r.status === "PENDING").length, refresh: fetchCompanies },
    { id: "documents", label: "Chứng Từ Khách Hàng", group: "Khách hàng", icon: ClipboardCheck, count: `${documentsList.length} chứng từ`, pending: documentsList.filter((d: any) => d.status === "PENDING").length, refresh: () => fetchDocuments(documentStatusFilter) },
    { id: "courses", label: "Quản lý Đào tạo CPA Academy", group: "Nội dung", icon: BookOpen, count: `${coursesList.length} khóa`, pending: 0, refresh: fetchCourses },
    { id: "services", label: "Quản lý Dịch vụ", group: "Nội dung", icon: Settings, count: `${servicesList.length} dịch vụ`, pending: 0, refresh: fetchServices },
    { id: "posts", label: "Quản lý Tin Tức", group: "Nội dung", icon: Newspaper, count: `${postsList.length} bài viết`, pending: 0, refresh: fetchPostsList },
    { id: "forum", label: "Quản lý Diễn Đàn", group: "Nội dung", icon: MessageSquare, count: `${forumTopics.length} chủ đề`, pending: 0, refresh: () => { fetchForumCategories(); fetchForumTopics(); } },
    { id: "recruitment", label: "Quản lý Tuyển dụng & ATS", group: "Vận hành", icon: Briefcase, count: `${jobApplicants.length} hồ sơ`, pending: employerRequestsList.filter((r: any) => r.status === "PENDING").length + candidateIntroRequests.filter((r: any) => r.status === "PENDING").length, refresh: fetchJobApplications },
    { id: "users", label: "Quản lý Users & Phân quyền", group: "Vận hành", icon: Users, count: `${usersList.length} tài khoản`, pending: 0, refresh: fetchUsers },
    { id: "chat", label: "Chatbot - Hội thoại", group: "Vận hành", icon: Bot, count: "", pending: 0, refresh: () => {} },
  ];
  const tabGroups = Array.from(new Set(adminTabs.map((t) => t.group)));
  const currentAdminTab = adminTabs.find((tab) => tab.id === activeTab);
  const totalPendingActions = adminTabs.reduce((sum, t) => sum + t.pending, 0);

  return (
    <AdminGuard>
    <div className="flex h-screen bg-[#F7F8FA] font-sans overflow-hidden selection:bg-[#1B3A8F] selection:text-white">
      {/* Overlay khi sidebar mở dạng drawer trên mobile/tablet */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — khung điều hướng riêng cho Admin, KHÔNG dùng lại Header trang công khai */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 shrink-0 bg-[#0B1638] flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="px-5 pt-6 pb-5 flex items-center justify-between">
          <div>
            <div className="bg-white rounded-xl p-2.5 inline-block shadow-lg shadow-black/20">
              <Logo width={122} height={40} />
            </div>
            <p className="text-[10px] text-blue-300/70 uppercase tracking-[0.18em] font-bold mt-3 pl-0.5">Admin Console</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-blue-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
          {tabGroups.map((group) => (
            <div key={group}>
              <p className="px-3 mb-1.5 text-[10px] font-bold text-blue-300/40 uppercase tracking-[0.14em]">{group}</p>
              <div className="space-y-0.5">
                {adminTabs.filter((tab) => tab.group === group).map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 ${
                        active
                          ? "bg-white text-[#0F1C47] shadow-sm"
                          : "text-blue-100/60 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <tab.icon className={`w-[15px] h-[15px] shrink-0 ${active ? "text-[#C9973C]" : "text-blue-300/50"}`} />
                      <span className="flex-1 text-left truncate">{tab.label}</span>
                      {tab.pending > 0 ? (
                        <span className={`w-4 h-4 rounded-full text-[9px] font-black shrink-0 flex items-center justify-center ${active ? "bg-[#C9973C] text-white" : "bg-amber-400 text-[#0F1C47]"}`}>
                          {tab.pending > 9 ? "9+" : tab.pending}
                        </span>
                      ) : tab.count ? (
                        <span className={`text-[10px] font-bold shrink-0 ${active ? "text-gray-400" : "text-blue-300/40"}`}>
                          {tab.count.split(" ")[0]}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/[0.06] space-y-0.5">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9973C] to-[#a87a28] text-[#0F1C47] flex items-center justify-center font-black text-xs shrink-0">A</div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Quản trị viên</p>
              <p className="text-[9.5px] text-amber-400/90 font-bold uppercase tracking-wide">Super Admin</p>
            </div>
          </div>
          <a href="/" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-200/50 hover:bg-white/[0.06] hover:text-white transition-colors">
            <Home className="w-3.5 h-3.5" /> Về Trang Chủ
          </a>
          <button onClick={handleAdminLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-300/70 hover:bg-red-500/10 hover:text-red-200 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Đăng Xuất
          </button>
        </div>
      </aside>

      {/* Cột nội dung chính */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white/90 backdrop-blur border-b border-gray-100 px-5 lg:px-8 py-3.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-500 shrink-0">
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] truncate">{currentAdminTab?.group}</p>
              <h1 className="text-[15px] lg:text-base font-black text-[#0F1C47] truncate leading-tight">{currentAdminTab?.label}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {totalPendingActions > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {totalPendingActions} việc cần xử lý
              </span>
            )}
            <button
              onClick={() => currentAdminTab?.refresh?.()}
              className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[#0F1C47] px-3.5 py-2 rounded-lg text-xs font-bold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#1B3A8F] ${loading ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>
        </header>

        {/* Toast Notification — đỏ + icon cảnh báo khi lỗi, navy/gold + icon check khi thành công */}
        {actionSuccessMsg && (
          <div
            className={`fixed top-6 right-8 z-[60] px-6 py-3.5 rounded-xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 max-w-md ${
              actionIsError ? "bg-red-600 border-red-400 text-white" : "bg-[#0F1C47] border-[#C9973C] text-white"
            }`}
          >
            {actionIsError ? (
              <XCircle className="w-5 h-5 text-white shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span className="text-xs font-bold">{actionSuccessMsg}</span>
          </div>
        )}

        <main className="flex-1 overflow-y-auto px-5 lg:px-10 py-8">
        <div className="max-w-[1400px] mx-auto">

          {/* Tab 1: Service Consultation Requests (Leads CRUD & Search/Filter) */}
          {activeTab === "leads" && (
            <LeadsTab
              serviceRequests={serviceRequests}
              setShowAddLeadModal={setShowAddLeadModal}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              loading={loading}
              filteredServiceRequests={filteredServiceRequests}
              setEditingCompanyId={setEditingCompanyId}
              setNewCompany={setNewCompany}
              emptyCompanyForm={emptyCompanyForm}
              setShowAddCompanyModal={setShowAddCompanyModal}
              setShowViewLeadModal={setShowViewLeadModal}
              setShowEditLeadModal={setShowEditLeadModal}
              askConfirm={askConfirm}
              handleDeleteLead={handleDeleteLead}
              showViewLeadModal={showViewLeadModal}
              showAddLeadModal={showAddLeadModal}
              handleCreateLead={handleCreateLead}
              newLead={newLead}
              setNewLead={setNewLead}
              showEditLeadModal={showEditLeadModal}
              handleUpdateLeadStatus={handleUpdateLeadStatus}
            />
          )}

          {/* Tab 2: Courses Management CRUD */}
          {activeTab === "courses" && (
            <CoursesTab
              coursesList={coursesList}
              setEditingCourseId={setEditingCourseId}
              setNewCourse={setNewCourse}
              emptyCourseForm={emptyCourseForm}
              setCourseModules={setCourseModules}
              setCourseImageFile={setCourseImageFile}
              setShowAddCourseModal={setShowAddCourseModal}
              coursesSearch={coursesSearch}
              setCoursesSearch={setCoursesSearch}
              setCoursesPage={setCoursesPage}
              coursesLoading={coursesLoading}
              filteredCoursesList={filteredCoursesList}
              pagedCoursesList={pagedCoursesList}
              handleEditCourseClick={handleEditCourseClick}
              askConfirm={askConfirm}
              handleDeleteCourse={handleDeleteCourse}
              coursesPage={coursesPage}
              enrollmentsList={enrollmentsList}
              enrollmentsLoading={enrollmentsLoading}
              handleUpdateEnrollmentStatus={handleUpdateEnrollmentStatus}
              showAddCourseModal={showAddCourseModal}
              editingCourseId={editingCourseId}
              handleCreateCourse={handleCreateCourse}
              newCourse={newCourse}
              courseImageFile={courseImageFile}
              courseModules={courseModules}
              handleDownloadLessonFile={handleDownloadLessonFile}
              handleRemoveLessonFile={handleRemoveLessonFile}
              uploadingLessonFileId={uploadingLessonFileId}
              handleAttachLessonFile={handleAttachLessonFile}
            />
          )}

          {/* Tab: Services Management CRUD */}
          {activeTab === "services" && (
            <ServicesTab
              servicesList={servicesList}
              setEditingServiceId={setEditingServiceId}
              setNewService={setNewService}
              emptyServiceForm={emptyServiceForm}
              setServiceFeatures={setServiceFeatures}
              setServiceDeliverables={setServiceDeliverables}
              setServiceImageFile={setServiceImageFile}
              setShowAddServiceModal={setShowAddServiceModal}
              servicesSearch={servicesSearch}
              setServicesSearch={setServicesSearch}
              setServicesPage={setServicesPage}
              servicesLoading={servicesLoading}
              filteredServicesList={filteredServicesList}
              pagedServicesList={pagedServicesList}
              handleEditServiceClick={handleEditServiceClick}
              askConfirm={askConfirm}
              handleDeleteService={handleDeleteService}
              servicesPage={servicesPage}
              showAddServiceModal={showAddServiceModal}
              editingServiceId={editingServiceId}
              handleCreateService={handleCreateService}
              newService={newService}
              serviceImageFile={serviceImageFile}
              serviceFeatures={serviceFeatures}
              serviceDeliverables={serviceDeliverables}
            />
          )}

          {/* Tab 3: Recruitment ATS CRUD */}
          {activeTab === "recruitment" && (
            <RecruitmentTab
              employerRequestsList={employerRequestsList}
              jobPostingsList={jobPostingsList}
              jobApplicants={jobApplicants}
              fetchEmployerRequestsList={fetchEmployerRequestsList}
              employerRequestsLoading={employerRequestsLoading}
              expandedRequestId={expandedRequestId}
              setExpandedRequestId={setExpandedRequestId}
              parseEmployerJobDescription={parseEmployerJobDescription}
              handlePublishFromRequest={handlePublishFromRequest}
              candidateIntroRequests={candidateIntroRequests}
              fetchCandidateIntroRequests={fetchCandidateIntroRequests}
              candidateIntroLoading={candidateIntroLoading}
              handleReviewCandidateIntroRequest={handleReviewCandidateIntroRequest}
              setEditingJobId={setEditingJobId}
              setPublishingFromRequestId={setPublishingFromRequestId}
              setNewJob={setNewJob}
              emptyJobForm={emptyJobForm}
              setJobImageFile={setJobImageFile}
              setShowAddJobModal={setShowAddJobModal}
              jobsLoading={jobsLoading}
              handleEditJobClick={handleEditJobClick}
              askConfirm={askConfirm}
              handleDeleteJob={handleDeleteJob}
              applicantsLoading={applicantsLoading}
              handleDownloadCv={handleDownloadCv}
              handleUpdateApplicationStatus={handleUpdateApplicationStatus}
              handleDeleteApplication={handleDeleteApplication}
              showAddJobModal={showAddJobModal}
              editingJobId={editingJobId}
              handleCreateJob={handleCreateJob}
              newJob={newJob}
              jobImageFile={jobImageFile}
            />
          )}

          {/* Tab: Quản Lý Tin Tức (Posts CRUD, có ảnh cover + Markdown) */}
          {activeTab === "posts" && (
            <PostsTab
              postsList={postsList}
              setEditingPostId={setEditingPostId}
              setNewPost={setNewPost}
              emptyPostForm={emptyPostForm}
              setPostImageFile={setPostImageFile}
              setPostPreviewMode={setPostPreviewMode}
              setShowAddPostModal={setShowAddPostModal}
              postsSearch={postsSearch}
              setPostsSearch={setPostsSearch}
              setPostsPage={setPostsPage}
              postsLoading={postsLoading}
              filteredPostsList={filteredPostsList}
              pagedPostsList={pagedPostsList}
              handleEditPostClick={handleEditPostClick}
              askConfirm={askConfirm}
              handleDeletePost={handleDeletePost}
              postsPage={postsPage}
              showAddPostModal={showAddPostModal}
              editingPostId={editingPostId}
              handleCreatePost={handleCreatePost}
              newPost={newPost}
              postImageFile={postImageFile}
              postPreviewMode={postPreviewMode}
            />
          )}

          {/* Tab 4: User Management & RBAC CRUD */}
          {activeTab === "users" && (
            <UsersTab
              usersList={usersList}
              fetchUsers={fetchUsers}
              usersLoading={usersLoading}
              usersSearch={usersSearch}
              setUsersSearch={setUsersSearch}
              setUsersPage={setUsersPage}
              filteredUsersList={filteredUsersList}
              pagedUsersList={pagedUsersList}
              openAssignCompanyModal={openAssignCompanyModal}
              handleUpdateUserRole={handleUpdateUserRole}
              handleToggleUserStatus={handleToggleUserStatus}
              askConfirm={askConfirm}
              handleDeleteUser={handleDeleteUser}
              usersPage={usersPage}
              assigningCompanyUser={assigningCompanyUser}
              setAssigningCompanyUser={setAssigningCompanyUser}
              assignCompanyCreating={assignCompanyCreating}
              setAssignCompanyCreating={setAssignCompanyCreating}
              assignCompanySelection={assignCompanySelection}
              setAssignCompanySelection={setAssignCompanySelection}
              companiesList={companiesList}
              handleAssignCompany={handleAssignCompany}
              handleCreateAndAssignCompany={handleCreateAndAssignCompany}
              newCompany={newCompany}
              setNewCompany={setNewCompany}
            />
          )}

          {activeTab === "chat" && <ChatLogsTab />}

          {activeTab === "forum" && (
            <ForumTab
              forumTopics={forumTopics}
              forumCategories={forumCategories}
              setEditingForumCategoryId={setEditingForumCategoryId}
              setNewForumCategory={setNewForumCategory}
              emptyForumCategoryForm={emptyForumCategoryForm}
              setShowAddForumCategoryModal={setShowAddForumCategoryModal}
              forumCategoriesLoading={forumCategoriesLoading}
              handleEditForumCategoryClick={handleEditForumCategoryClick}
              askConfirm={askConfirm}
              handleDeleteForumCategory={handleDeleteForumCategory}
              fetchForumTopics={fetchForumTopics}
              forumTopicsLoading={forumTopicsLoading}
              expandedForumTopicId={expandedForumTopicId}
              toggleForumTopicReplies={toggleForumTopicReplies}
              handleToggleForumTopicPinned={handleToggleForumTopicPinned}
              handleToggleForumTopicLocked={handleToggleForumTopicLocked}
              handleDeleteForumTopic={handleDeleteForumTopic}
              expandedForumRepliesLoading={expandedForumRepliesLoading}
              expandedForumReplies={expandedForumReplies}
              handleDeleteForumReply={handleDeleteForumReply}
              showAddForumCategoryModal={showAddForumCategoryModal}
              editingForumCategoryId={editingForumCategoryId}
              handleSaveForumCategory={handleSaveForumCategory}
              newForumCategory={newForumCategory}
            />
          )}

          {activeTab === "companies" && (
            <CompaniesTab
              companiesList={companiesList}
              linkRequestsList={linkRequestsList}
              handleReviewLinkRequest={handleReviewLinkRequest}
              setEditingCompanyId={setEditingCompanyId}
              setNewCompany={setNewCompany}
              emptyCompanyForm={emptyCompanyForm}
              setShowAddCompanyModal={setShowAddCompanyModal}
              companiesSearch={companiesSearch}
              setCompaniesSearch={setCompaniesSearch}
              setCompaniesPage={setCompaniesPage}
              companiesLoading={companiesLoading}
              filteredCompaniesList={filteredCompaniesList}
              pagedCompaniesList={pagedCompaniesList}
              handleEditCompanyClick={handleEditCompanyClick}
              askConfirm={askConfirm}
              handleDeleteCompany={handleDeleteCompany}
              companiesPage={companiesPage}
              showAddCompanyModal={showAddCompanyModal}
              editingCompanyId={editingCompanyId}
              handleSaveCompany={handleSaveCompany}
              newCompany={newCompany}
            />
          )}

          {activeTab === "documents" && (
            <DocumentsTab
              documentsList={documentsList}
              documentStatusFilter={documentStatusFilter}
              setDocumentStatusFilter={setDocumentStatusFilter}
              fetchDocuments={fetchDocuments}
              documentsSearch={documentsSearch}
              setDocumentsSearch={setDocumentsSearch}
              setDocumentsPage={setDocumentsPage}
              documentsLoading={documentsLoading}
              filteredDocumentsList={filteredDocumentsList}
              pagedDocumentsList={pagedDocumentsList}
              uploadingResultFileId={uploadingResultFileId}
              handleRemoveDocumentResultFile={handleRemoveDocumentResultFile}
              handleAttachDocumentResultFile={handleAttachDocumentResultFile}
              setRejectingDocument={setRejectingDocument}
              setRejectReasonInput={setRejectReasonInput}
              handleUpdateDocumentStatus={handleUpdateDocumentStatus}
              handleDownloadDocument={handleDownloadDocument}
              askConfirm={askConfirm}
              handleDeleteDocument={handleDeleteDocument}
              documentsPage={documentsPage}
              rejectingDocument={rejectingDocument}
              rejectReasonInput={rejectReasonInput}
              handleConfirmReject={handleConfirmReject}
            />
          )}
        </div>
        </main>
      </div>


      {/* ═══ MODAL XÁC NHẬN XÓA (dùng chung toàn trang Admin) ═══ */}
      {confirmModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-black text-gray-900">Xác Nhận Xóa Dữ Liệu?</h3>
            <p className="text-xs text-gray-500">{confirmModal.message}</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={() => setConfirmModal(null)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs">
                Hủy bỏ
              </button>
              <button
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Xóa Vĩnh Viễn
              </button>
            </div>
          </div>
        </div>
      )}






    </div>
    </AdminGuard>
  );
}
