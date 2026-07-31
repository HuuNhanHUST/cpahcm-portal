"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE } from "../../lib/config";
import {
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  Building2,
  UserCheck,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Loader2,
  KeyRound,
  Send,
  Hash,
  type LucideIcon,
} from "lucide-react";

// ======================================================================
// TYPES & CONSTANTS
// ======================================================================
type Mode = "login" | "register" | "forgot";

// Password strength levels
type StrengthLevel = "none" | "weak" | "fair" | "good" | "strong";

function getPasswordStrength(password: string): StrengthLevel {
  if (!password) return "none";
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return "weak";
  if (score === 2) return "fair";
  if (score === 3) return "good";
  return "strong";
}

const strengthConfig: Record<StrengthLevel, { label: string; colorClass: string; widthPct: string }> = {
  none:   { label: "",            colorClass: "bg-gray-200",   widthPct: "0%" },
  weak:   { label: "Yếu",        colorClass: "bg-red-500",    widthPct: "25%" },
  fair:   { label: "Trung bình", colorClass: "bg-yellow-500", widthPct: "50%" },
  good:   { label: "Khá",        colorClass: "bg-blue-500",   widthPct: "75%" },
  strong: { label: "Mạnh",       colorClass: "bg-green-500",  widthPct: "100%" },
};

// ======================================================================
// VALIDATION HELPERS
// ======================================================================
const validators = {
  email: (v: string) => {
    if (!v) return "Email không được để trống";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Email không đúng định dạng";
    return null;
  },
  // Phải khớp đúng STRONG_PASSWORD_REGEX phía backend (strong-password.validator.ts):
  // ít nhất 1 hoa, 1 thường, 1 số, 1 ký tự đặc biệt (@$!%*?&), không khoảng trắng/ký tự lạ.
  // Trước đây chỉ check length >= 8 nên mật khẩu "hợp lệ" ở FE vẫn bị BE từ chối với lỗi
  // chung "Dữ liệu không hợp lệ!" — không rõ nguyên nhân cho người dùng.
  password: (v: string) => {
    if (!v) return "Mật khẩu không được để trống";
    if (v.length < 8) return "Mật khẩu phải ít nhất 8 ký tự";
    if (v.length > 50) return "Mật khẩu không được vượt quá 50 ký tự";
    if (!/^[A-Za-z\d@$!%*?&]+$/.test(v)) return "Mật khẩu chỉ được chứa chữ, số và ký tự đặc biệt @$!%*?&";
    if (!/[a-z]/.test(v)) return "Mật khẩu phải có ít nhất 1 chữ thường";
    if (!/[A-Z]/.test(v)) return "Mật khẩu phải có ít nhất 1 chữ hoa";
    if (!/\d/.test(v)) return "Mật khẩu phải có ít nhất 1 chữ số";
    if (!/[@$!%*?&]/.test(v)) return "Mật khẩu phải có ít nhất 1 ký tự đặc biệt (@$!%*?&)";
    return null;
  },
  fullName: (v: string) => {
    if (!v.trim()) return "Họ và tên không được để trống";
    if (v.trim().length < 2) return "Họ và tên phải ít nhất 2 ký tự";
    return null;
  },
  phone: (v: string) => {
    if (!v) return "Số điện thoại không được để trống";
    if (!/^(0|\+84)[3-9][0-9]{8}$/.test(v.replace(/\s/g, "")))
      return "Số điện thoại không hợp lệ (VD: 0901234567)";
    return null;
  },
};

// ======================================================================
// SUB-COMPONENTS
// ======================================================================
function InputField({
  label,
  type = "text",
  icon: Icon,
  value,
  onChange,
  placeholder,
  error,
  rightElement,
  required,
}: {
  label: string;
  type?: string;
  icon: LucideIcon;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string | null;
  rightElement?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <Icon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full pl-10 ${rightElement ? "pr-11" : "pr-4"} py-3 bg-[#F8F9FA] border rounded-xl text-sm transition-all outline-none focus:ring-2 ${
            error
              ? "border-red-400 focus:border-red-400 focus:ring-red-100"
              : "border-gray-200 focus:border-[#1B3A8F] focus:ring-[#1B3A8F]/20"
          }`}
        />
        {rightElement && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
          <AlertCircle className="w-3 h-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  const cfg = strengthConfig[strength];
  if (!password) return null;

  const textColor =
    strength === "weak" ? "text-red-500"
    : strength === "fair" ? "text-yellow-600"
    : strength === "good" ? "text-blue-500"
    : strength === "strong" ? "text-green-500"
    : "text-gray-400";

  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${cfg.colorClass}`}
          initial={{ width: 0 }}
          animate={{ width: cfg.widthPct }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className={`text-xs font-medium ${textColor}`}>
        {cfg.label && `Độ mạnh: ${cfg.label}`}
        {strength === "weak" && " — Thêm chữ hoa, số, ký tự đặc biệt"}
        {strength === "fair" && " — Cần thêm ký tự đặc biệt hoặc chữ hoa"}
        {strength === "good" && " — Tốt! Thêm ký tự đặc biệt để mạnh hơn"}
        {strength === "strong" && " — Tuyệt vời!"}
      </p>
    </div>
  );
}

function MessageBanner({ message }: { message: { type: "success" | "error"; text: string } | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key="msg"
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          className={`rounded-xl text-sm font-medium mb-5 flex items-start gap-3 p-4 overflow-hidden ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ======================================================================
// MAIN PAGE
// ======================================================================
export default function LoginPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // — Login state —
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});
  const [rememberMe, setRememberMe] = useState(true);

  // — Register state —
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regRole, setRegRole] = useState<"MEMBER" | "BUSINESS">("MEMBER");
  const [regTaxCode, setRegTaxCode] = useState("");
  const [regCompanyName, setRegCompanyName] = useState("");
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [agreedTerms, setAgreedTerms] = useState(false);

  // — Forgot state —
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotErrors, setForgotErrors] = useState<{ email?: string }>({});
  const [forgotSent, setForgotSent] = useState(false);

  // Đã đăng nhập rồi thì không có lý do gì để thấy lại form login/register — đưa về trang chủ.
  // Không dùng middleware vì token nằm trong localStorage (client-only), không có ở cookie/SSR.
  useEffect(() => {
    const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
    if (token) {
      router.replace("/");
      return;
    }
    setCheckingSession(false);
  }, [router]);

  // ── Switch mode — reset all state cleanly ──
  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setMessage(null);
    setLoginErrors({});
    setRegErrors({});
    setForgotErrors({});
    setForgotSent(false);
    setShowPassword(false);
    setShowConfirm(false);
  }, []);

  // ────────────────────────────────────────────────────────────────────
  // HANDLE LOGIN
  // ────────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: typeof loginErrors = {};
    const emailErr = validators.email(loginEmail);
    const pwErr = validators.password(loginPassword);
    if (emailErr) errors.email = emailErr;
    if (pwErr) errors.password = pwErr;
    if (Object.keys(errors).length > 0) { setLoginErrors(errors); return; }
    setLoginErrors({});

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim().toLowerCase(), password: loginPassword }),
      });

      const body = await res.json();

      if (!res.ok) {
        const msg: Record<number, string> = {
          401: "Email hoặc mật khẩu không chính xác. Vui lòng thử lại!",
          403: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.",
          429: "Đăng nhập quá nhiều lần. Vui lòng chờ vài phút rồi thử lại.",
        };
        throw new Error(msg[res.status] || body.message || "Đăng nhập thất bại.");
      }

      // Toàn bộ response của backend được bọc qua TransformInterceptor thành
      // {success, data, message, timestamp} — dữ liệu thật nằm ở body.data, không phải body
      // trực tiếp. Thiếu ".data" ở đây khiến accessToken/user luôn là undefined, nên trước đây
      // đăng nhập "thành công" trên UI nhưng Header không bao giờ nhận ra người dùng đã login.
      const data = body.data;

      // MFA required
      if (data?.mfaRequired) {
        sessionStorage.setItem("mfa_temp_token", data.tempToken || "");
        setMessage({ type: "success", text: "Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư!" });
        return;
      }

      // Store tokens
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("accessToken", data.accessToken);
      if (data.refreshToken) storage.setItem("refreshToken", data.refreshToken);
      if (data.user) storage.setItem("user", JSON.stringify(data.user));

      setMessage({ type: "success", text: "Đăng nhập thành công! Đang chuyển hướng..." });
      setTimeout(() => {
        if (data.user?.role === "ADMIN") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/";
        }
      }, 1000);
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setMessage({ type: "error", text: "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau." });
      } else {
        setMessage({ type: "error", text: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────
  // HANDLE REGISTER
  // ────────────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    const nameErr = validators.fullName(regFullName);
    const emailErr = validators.email(regEmail);
    const phoneErr = validators.phone(regPhone);
    const pwErr = validators.password(regPassword);

    if (nameErr) errors.fullName = nameErr;
    if (emailErr) errors.email = emailErr;
    if (phoneErr) errors.phone = phoneErr;
    if (pwErr) errors.password = pwErr;
    if (!regConfirm) { errors.confirm = "Vui lòng xác nhận mật khẩu"; }
    else if (regPassword !== regConfirm) { errors.confirm = "Mật khẩu xác nhận không trùng khớp"; }
    if (!agreedTerms) errors.terms = "Bạn phải đồng ý với điều khoản sử dụng";
    if (regRole === "BUSINESS") {
      const taxCodeFilled = regTaxCode.trim().length > 0;
      const companyNameFilled = regCompanyName.trim().length > 0;
      if (taxCodeFilled !== companyNameFilled) {
        errors.company = "Vui lòng điền đủ cả Mã số thuế và Tên công ty, hoặc để trống cả hai.";
      } else if (taxCodeFilled && !/^\d{10}(\d{3})?$/.test(regTaxCode.trim())) {
        errors.company = "Mã số thuế phải gồm 10 hoặc 13 chữ số.";
      }
    }

    if (Object.keys(errors).length > 0) { setRegErrors(errors); return; }
    setRegErrors({});

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: regFullName.trim(),
          email: regEmail.trim().toLowerCase(),
          phone: regPhone.trim(),
          password: regPassword,
          role: regRole,
          ...(regRole === "BUSINESS" && regTaxCode.trim() && regCompanyName.trim()
            ? { taxCode: regTaxCode.trim(), companyName: regCompanyName.trim() }
            : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // `data.message` ở lỗi 400 thường chỉ là thông báo chung ("Dữ liệu không hợp lệ!") —
        // chi tiết thật nằm ở `data.errors` (GlobalHttpExceptionFilter), ưu tiên hiển thị nó.
        const detail = Array.isArray(data.errors) && data.errors.length > 0 ? data.errors[0] : null;
        const msg: Record<number, string> = {
          400: detail || data.message || "Thông tin đăng ký không hợp lệ.",
          409: `Email "${regEmail}" đã được đăng ký. Vui lòng đăng nhập!`,
        };
        throw new Error(msg[res.status] || detail || data.message || "Đăng ký thất bại.");
      }

      setMessage({
        type: "success",
        text: data?.message || "Đăng ký thành công! Chúng tôi đã gửi email xác thực. Vui lòng kiểm tra hộp thư (kể cả mục Spam).",
      });
      setTimeout(() => {
        setLoginEmail(regEmail.trim().toLowerCase());
        switchMode("login");
      }, 3000);
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setMessage({ type: "error", text: "Không thể kết nối tới máy chủ. Vui lòng thử lại sau." });
      } else {
        setMessage({ type: "error", text: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────
  // HANDLE FORGOT PASSWORD
  // ────────────────────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailErr = validators.email(forgotEmail);
    if (emailErr) { setForgotErrors({ email: emailErr }); return; }
    setForgotErrors({});

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });

      if (res.ok || res.status === 404) {
        setForgotSent(true); // Always show success (security: don't reveal whether email exists)
      } else {
        const data = await res.json();
        throw new Error(data.message || "Không thể gửi yêu cầu khôi phục.");
      }
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setMessage({ type: "error", text: "Không thể kết nối tới máy chủ. Vui lòng thử lại sau." });
      } else {
        setMessage({ type: "error", text: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const formVariants: any = {
    hidden:  { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0,  transition: { duration: 0.3, ease: "easeOut" } },
    exit:    { opacity: 0, x: -20, transition: { duration: 0.2, ease: "easeIn" } },
  };

  // ────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────
  // Đang kiểm tra session (hoặc đã có token, chuẩn bị redirect) — không render form login để
  // tránh nháy hình (flash of login form) trước khi router.replace("/") điều hướng đi.
  if (checkingSession) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F4FF] to-[#F4F6F9] flex flex-col font-sans selection:bg-[#1B3A8F] selection:text-white">
      <Header />

      <main className="flex-grow flex items-center justify-center pt-28 pb-16 px-4">
        <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">

          {/* ====== LEFT BANNER ====== */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#0F1C47] via-[#152763] to-[#0F1C47] text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#C9973C_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#C9973C]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-[#1B3A8F]/30 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-[#C9973C]/20 border border-[#C9973C]/40 text-[#C9973C] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8">
                <Sparkles className="w-3.5 h-3.5" /> CPA HCM PORTAL
              </div>

              <AnimatePresence mode="wait">
                {mode === "login" && (
                  <motion.div key="l" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
                    <h2 className="text-3xl font-extrabold mb-4 leading-tight">Chào Mừng Trở Lại!</h2>
                    <p className="text-blue-100 text-sm leading-relaxed font-light">Đăng nhập để quản lý hồ sơ chứng từ kế toán, theo dõi tiến độ đào tạo và nộp CV ứng tuyển trực tuyến.</p>
                  </motion.div>
                )}
                {mode === "register" && (
                  <motion.div key="r" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
                    <h2 className="text-3xl font-extrabold mb-4 leading-tight">Gia Nhập Cộng Đồng CPA HCM!</h2>
                    <p className="text-blue-100 text-sm leading-relaxed font-light">Tạo tài khoản miễn phí để tiếp cận mạng lưới hơn 1.000+ doanh nghiệp và dịch vụ kế toán hàng đầu Việt Nam.</p>
                  </motion.div>
                )}
                {mode === "forgot" && (
                  <motion.div key="f" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
                    <h2 className="text-3xl font-extrabold mb-4 leading-tight">Khôi Phục Mật Khẩu</h2>
                    <p className="text-blue-100 text-sm leading-relaxed font-light">Nhập email đã đăng ký. Chúng tôi sẽ gửi liên kết đặt lại mật khẩu an toàn trong vài giây.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative z-10 space-y-5 pt-6 border-t border-white/10">
              <div className="space-y-3">
                {[
                  { icon: ShieldCheck, text: "Bảo mật thông tin chuẩn ISO 27001" },
                  { icon: UserCheck,  text: "Kết nối hơn 1.000+ doanh nghiệp uy tín" },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-blue-100">
                    <f.icon className="w-4 h-4 text-[#C9973C] shrink-0" />
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
              {mode === "login" ? (
                <button onClick={() => switchMode("register")} className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold text-white transition-all">
                  Chưa có tài khoản? <span className="text-[#C9973C]">Đăng Ký Ngay →</span>
                </button>
              ) : (
                <button onClick={() => switchMode("login")} className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold text-white transition-all">
                  Đã có tài khoản? <span className="text-[#C9973C]">← Đăng Nhập Ngay</span>
                </button>
              )}
            </div>
          </div>

          {/* ====== RIGHT FORMS ====== */}
          <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center bg-white">

            {/* Segmented Switcher */}
            {mode !== "forgot" && (
              <div className="bg-[#F4F6F9] p-1.5 rounded-2xl flex mb-8 border border-gray-200/80">
                {(["login", "register"] as const).map((m) => (
                  <button key={m} onClick={() => switchMode(m)}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 relative ${mode === m ? "text-white" : "text-gray-500 hover:text-gray-800"}`}
                  >
                    {mode === m && (
                      <motion.div layoutId="pill" className="absolute inset-0 bg-[#1B3A8F] rounded-xl shadow-md -z-10" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                    )}
                    {m === "login" ? <Lock className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    {m === "login" ? "Đăng Nhập" : "Đăng Ký Tài Khoản"}
                  </button>
                ))}
              </div>
            )}

            <MessageBanner message={message} />

            <AnimatePresence mode="wait">

              {/* ===== LOGIN FORM ===== */}
              {mode === "login" && (
                <motion.form key="login" variants={formVariants} initial="hidden" animate="visible" exit="exit" onSubmit={handleLogin} className="space-y-5">
                  <InputField label="Địa chỉ Email" type="email" icon={Mail}
                    value={loginEmail} onChange={(v) => { setLoginEmail(v); setLoginErrors(p => ({ ...p, email: undefined })); }}
                    placeholder="name@company.com" error={loginErrors.email} required
                  />

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Mật Khẩu <span className="text-red-500">*</span></label>
                      <button type="button" onClick={() => switchMode("forgot")} className="text-xs font-bold text-[#1B3A8F] hover:underline">Quên mật khẩu?</button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input type={showPassword ? "text" : "password"} required value={loginPassword}
                        onChange={(e) => { setLoginPassword(e.target.value); setLoginErrors(p => ({ ...p, password: undefined })); }}
                        placeholder="••••••••"
                        className={`w-full pl-10 pr-11 py-3 bg-[#F8F9FA] border rounded-xl text-sm outline-none transition-all focus:ring-2 ${loginErrors.password ? "border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#1B3A8F] focus:ring-[#1B3A8F]/20"}`}
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" aria-label="Toggle password">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginErrors.password && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {loginErrors.password}</p>}
                  </div>

                  <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer select-none">
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[#1B3A8F] focus:ring-[#1B3A8F]" />
                    <span>Ghi nhớ đăng nhập trên thiết bị này</span>
                  </label>

                  <button type="submit" id="btn-login" disabled={loading}
                    className="w-full py-3.5 bg-[#1B3A8F] hover:bg-[#0F1C47] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-base shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xác thực...</> : <>Đăng Nhập Hệ Thống <KeyRound className="w-4 h-4" /></>}
                  </button>

                  <div className="relative text-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                    <span className="relative bg-white px-4 text-xs text-gray-400 font-semibold uppercase tracking-wider">Hoặc đăng nhập bằng</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <a href={`${API_BASE}/auth/google`} id="btn-google-login"
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-[#F8F9FA] border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-xs font-bold text-gray-700 shadow-sm"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      Google
                    </a>
                    <a href={`${API_BASE}/auth/facebook`} id="btn-facebook-login"
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-[#F8F9FA] border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-xs font-bold text-gray-700 shadow-sm"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="#1877F2">
                        <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5.01 3.66 9.15 8.44 9.9v-7.03H7.9v-2.87h2.54V9.8c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.87h-2.33v7.03C18.34 21.2 22 17.06 22 12.06c0-5.53-4.5-10.02-10-10.02z" />
                      </svg>
                      Facebook
                    </a>
                  </div>
                </motion.form>
              )}

              {/* ===== REGISTER FORM ===== */}
              {mode === "register" && (
                <motion.form key="register" variants={formVariants} initial="hidden" animate="visible" exit="exit" onSubmit={handleRegister} className="space-y-4">
                  {/* Role Selector */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Loại tài khoản <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { value: "MEMBER",   icon: User,      title: "Cá Nhân / Ứng Viên", sub: "Tìm việc, học tập" },
                        { value: "BUSINESS", icon: Building2, title: "Doanh Nghiệp / HR",   sub: "Đăng tuyển, dịch vụ" },
                      ] as const).map(({ value, icon: Icon, title, sub }) => (
                        <button key={value} type="button" onClick={() => setRegRole(value)}
                          className={`p-3.5 rounded-2xl border text-left transition-all ${regRole === value ? "bg-[#1B3A8F]/5 border-[#1B3A8F] ring-2 ring-[#1B3A8F]/20" : "bg-[#F8F9FA] border-gray-200 hover:border-gray-300"}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Icon className={`w-4 h-4 ${regRole === value ? "text-[#1B3A8F]" : "text-gray-400"}`} />
                            {regRole === value && <CheckCircle className="w-4 h-4 text-[#1B3A8F]" />}
                          </div>
                          <div className={`font-bold text-xs ${regRole === value ? "text-[#0F1C47]" : "text-gray-700"}`}>{title}</div>
                          <div className="text-gray-400 text-xs mt-0.5">{sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Thông tin công ty — chỉ hiện với BUSINESS, điền sẵn tại đây thay vì phải vào
                      /tai-khoan gửi yêu cầu liên kết riêng sau khi đăng nhập. Không bắt buộc —
                      vẫn có thể bỏ qua và tự liên kết công ty sau. */}
                  {regRole === "BUSINESS" && (
                    <div className="p-3.5 bg-[#F8F9FA] border border-gray-200 rounded-2xl space-y-3">
                      <p className="text-xs text-gray-500">
                        Điền công ty ngay để được cấp quyền Cổng Khách Hàng nhanh hơn (không bắt buộc, có thể bổ sung sau).
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="Mã số thuế" icon={Hash} value={regTaxCode}
                          onChange={v => { setRegTaxCode(v); setRegErrors(p => ({ ...p, company: "" })); }}
                          placeholder="0312345678" error={regErrors.company}
                        />
                        <InputField label="Tên công ty" icon={Building2} value={regCompanyName}
                          onChange={v => { setRegCompanyName(v); setRegErrors(p => ({ ...p, company: "" })); }}
                          placeholder="Công ty TNHH ABC"
                        />
                      </div>
                    </div>
                  )}

                  {/* Full Name */}
                  <InputField label="Họ và tên" icon={User} value={regFullName}
                    onChange={v => { setRegFullName(v); setRegErrors(p => ({ ...p, fullName: "" })); }}
                    placeholder="Nguyễn Văn A" error={regErrors.fullName} required
                  />

                  {/* Email & Phone */}
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="Email" type="email" icon={Mail} value={regEmail}
                      onChange={v => { setRegEmail(v); setRegErrors(p => ({ ...p, email: "" })); }}
                      placeholder="email@example.com" error={regErrors.email} required
                    />
                    <InputField label="Số điện thoại" type="tel" icon={Phone} value={regPhone}
                      onChange={v => { setRegPhone(v); setRegErrors(p => ({ ...p, phone: "" })); }}
                      placeholder="0901234567" error={regErrors.phone} required
                    />
                  </div>

                  {/* Password with strength */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Mật khẩu <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input type={showPassword ? "text" : "password"} required value={regPassword}
                        onChange={e => { setRegPassword(e.target.value); setRegErrors(p => ({ ...p, password: "" })); }}
                        placeholder="••••••••  (ít nhất 8 ký tự)"
                        className={`w-full pl-10 pr-11 py-3 bg-[#F8F9FA] border rounded-xl text-sm outline-none transition-all focus:ring-2 ${regErrors.password ? "border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#1B3A8F] focus:ring-[#1B3A8F]/20"}`}
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {regErrors.password && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {regErrors.password}</p>}
                    <PasswordStrengthBar password={regPassword} />
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Xác nhận mật khẩu <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input type={showConfirm ? "text" : "password"} required value={regConfirm}
                        onChange={e => { setRegConfirm(e.target.value); setRegErrors(p => ({ ...p, confirm: "" })); }}
                        placeholder="••••••••"
                        className={`w-full pl-10 pr-11 py-3 bg-[#F8F9FA] border rounded-xl text-sm outline-none transition-all focus:ring-2 ${
                          regErrors.confirm ? "border-red-400 focus:ring-red-100"
                          : regConfirm && regConfirm === regPassword ? "border-green-400 focus:ring-green-100"
                          : "border-gray-200 focus:border-[#1B3A8F] focus:ring-[#1B3A8F]/20"
                        }`}
                      />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {regErrors.confirm && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {regErrors.confirm}</p>}
                    {regConfirm && regConfirm === regPassword && !regErrors.confirm && (
                      <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Mật khẩu trùng khớp</p>
                    )}
                  </div>

                  {/* Terms */}
                  <div>
                    <label className="flex items-start gap-2.5 text-sm text-gray-600 cursor-pointer select-none">
                      <input type="checkbox" checked={agreedTerms} onChange={e => { setAgreedTerms(e.target.checked); setRegErrors(p => ({ ...p, terms: "" })); }}
                        className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#1B3A8F] focus:ring-[#1B3A8F] shrink-0"
                      />
                      <span>Tôi đồng ý với <a href="/dich-vu" className="text-[#1B3A8F] font-semibold hover:underline">Điều khoản dịch vụ</a> và <a href="/dich-vu" className="text-[#1B3A8F] font-semibold hover:underline">Chính sách bảo mật</a> của CPA HCM</span>
                    </label>
                    {regErrors.terms && <p className="text-xs text-red-600 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" /> {regErrors.terms}</p>}
                  </div>

                  <button type="submit" id="btn-register" disabled={loading}
                    className="w-full py-3.5 bg-[#1B3A8F] hover:bg-[#0F1C47] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-base shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</> : <>Tạo Tài Khoản Mới <Sparkles className="w-4 h-4" /></>}
                  </button>
                </motion.form>
              )}

              {/* ===== FORGOT PASSWORD ===== */}
              {mode === "forgot" && (
                <motion.div key="forgot" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                  {forgotSent ? (
                    <div className="text-center py-8 space-y-4">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <Send className="w-9 h-9 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-[#0F1C47]">Email đã được gửi!</h3>
                      <p className="text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
                        Nếu địa chỉ <span className="font-semibold text-[#1B3A8F]">{forgotEmail}</span> tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn trong vài phút.
                      </p>
                      <p className="text-xs text-gray-400">Không thấy email? Hãy kiểm tra mục Spam / Thư rác.</p>
                      <button onClick={() => switchMode("login")} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#1B3A8F] hover:underline">
                        <ArrowLeft className="w-4 h-4" /> Quay lại Đăng nhập
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-5">
                      <div className="text-center mb-2">
                        <div className="w-14 h-14 bg-[#1B3A8F]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <KeyRound className="w-7 h-7 text-[#1B3A8F]" />
                        </div>
                        <h3 className="text-2xl font-bold text-[#0F1C47]">Quên Mật Khẩu?</h3>
                        <p className="text-xs text-gray-500 mt-1">Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.</p>
                      </div>

                      <MessageBanner message={message} />

                      <InputField label="Địa chỉ Email đã đăng ký" type="email" icon={Mail}
                        value={forgotEmail} onChange={v => { setForgotEmail(v); setForgotErrors({}); }}
                        placeholder="name@company.com" error={forgotErrors.email} required
                      />

                      <button type="submit" id="btn-forgot-password" disabled={loading}
                        className="w-full py-3.5 bg-[#1B3A8F] hover:bg-[#0F1C47] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-base shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...</> : <>Gửi Hướng Dẫn Qua Email <Send className="w-4 h-4" /></>}
                      </button>

                      <div className="text-center">
                        <button type="button" onClick={() => switchMode("login")} className="text-sm font-bold text-[#1B3A8F] hover:underline inline-flex items-center gap-1.5">
                          <ArrowLeft className="w-3.5 h-3.5" /> Quay lại Đăng nhập
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
