"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { API_BASE } from "../lib/config";
import { authFetch } from "../lib/authFetch";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Chatbot chỉ dành cho user/doanh nghiệp đã đăng nhập — cùng cách kiểm tra trạng thái đăng nhập
// với Header.tsx (localStorage khi "Ghi nhớ đăng nhập", sessionStorage khi không tick).
function hasSession(): boolean {
  if (typeof window === "undefined") return false;
  return !!(localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken"));
}

export default function ChatWidget() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loggedIn = hasSession();
    setIsLoggedIn(loggedIn);
    if (!loggedIn) return;

    // Khôi phục hội thoại cũ nếu người dùng đã từng chat trước đó (F5 lại trang, đăng nhập lại
    // trên thiết bị khác) — hội thoại gắn với tài khoản nên liên tục xuyên suốt phiên/thiết bị.
    authFetch(`${API_BASE}/chat`)
      .then((res) => res.json())
      .then((json) => {
        const history = json?.data?.messages;
        if (Array.isArray(history) && history.length > 0) {
          setMessages(history.map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })));
        }
      })
      .catch(() => { /* im lặng — không có lịch sử cũ thì hiện lời chào mặc định như bình thường */ });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsSending(true);
    setError(false);

    try {
      const res = await authFetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // authFetch đã tự thử refresh token 1 lần — nếu vẫn 401 sau đó, phiên đăng nhập thật sự
        // đã hết hạn (refresh token cũng hết hạn, hoặc bị revoke do phát hiện đánh cắp token) và
        // storage đã bị clearSession() dọn sạch. isLoggedIn được set 1 lần lúc mount nên không tự
        // biết điều này — không cập nhật lại thì widget cứ hiện mãi, cho gõ tin nhắn nhưng mọi lần
        // gửi đều âm thầm lỗi 401 không rõ lý do. Kiểm tra lại session ngay khi thấy 401 để ẩn
        // widget đi (đồng bộ với hành vi "chưa đăng nhập thì không hiện" ở dòng return null bên dưới).
        if (res.status === 401 && !hasSession()) {
          setIsLoggedIn(false);
        }
        // Backend luôn trả message tiếng Việt rõ ràng cho từng loại lỗi (vd. "Tính năng chat hiện
        // chưa khả dụng" khi thiếu ANTHROPIC_API_KEY) — hiển thị đúng message đó thay vì che đi
        // bằng 1 câu lỗi chung chung khiến không ai biết lý do thật để khắc phục.
        throw new Error(data?.message || "chat request failed");
      }

      const reply: string = data?.data?.reply ?? data?.reply ?? "";
      setMessages((prev) => [...prev, { role: "assistant", content: reply || t("chat.error") }]);
    } catch (err) {
      setError(true);
      const message = err instanceof Error && err.message !== "chat request failed" ? err.message : t("chat.error");
      setMessages((prev) => [...prev, { role: "assistant", content: message }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Khách chưa đăng nhập không thấy widget — tránh hiện 1 nút bấm vào là báo lỗi 401 khó hiểu.
  if (!isLoggedIn) return null;

  return (
    <div className="fixed bottom-8 right-28 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="mb-3 w-[340px] sm:w-[380px] h-[520px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#0F1C47] text-white px-4 py-3 flex items-center justify-between shrink-0">
              <div>
                <p className="font-bold text-sm leading-tight">{t("chat.title")}</p>
                <p className="text-[11px] text-white/70 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9973C] inline-block" />
                  {t("chat.subtitle")}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Đóng chat"
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#F8F9FA]">
              {messages.length === 0 && (
                <div className="flex items-end gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#0F1C47] flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-[#C9973C]" />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl rounded-bl-sm px-3 py-2 text-[13px] text-gray-700 max-w-[85%]">
                    {t("chat.greeting")}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex items-end gap-1.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-[#0F1C47] flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 text-[#C9973C]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 break-words ${
                      m.role === "user"
                        ? "bg-[#0F1C47] text-white text-[13px] whitespace-pre-wrap rounded-br-sm"
                        : "bg-white border border-gray-100 text-gray-700 rounded-bl-sm"
                    }`}
                  >
                    {/* Bot trả lời bằng Markdown (in đậm, danh sách...) — trước đây hiển thị thô
                        nên khách thấy nguyên ký tự ** và số thứ tự thay vì định dạng thật. Tin
                        nhắn của user giữ nguyên text thường vì họ không gõ markdown. */}
                    {m.role === "assistant" ? (
                      <div className="prose-chat">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex items-end gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#0F1C47] flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-[#C9973C]" />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl rounded-bl-sm px-3 py-2 text-[13px] text-gray-400 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t("chat.thinking")}
                  </div>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <p className="px-4 text-[10px] text-gray-400 pt-2 shrink-0">{t("chat.disclaimer")}</p>

            {/* Input */}
            <div className="p-3 flex items-end gap-2 shrink-0 border-t border-gray-100">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("chat.placeholder")}
                rows={1}
                maxLength={2000}
                className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0F1C47]/20 max-h-24"
              />
              <button
                onClick={handleSend}
                disabled={isSending || !input.trim()}
                aria-label={t("chat.send")}
                className="w-9 h-9 rounded-lg bg-[#0F1C47] text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-[#0F1C47]/90 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={t("chat.title")}
        className="w-14 h-14 bg-[#C9973C] text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform relative"
      >
        {error && !isOpen && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        )}
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </motion.div>
      </button>
    </div>
  );
}
