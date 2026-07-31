"use client";

import { useEffect, useState } from "react";
import { Bot, User, MessageSquare, X, RefreshCw } from "lucide-react";
import { StatGrid, Pagination } from "./shared";
import { API_BASE } from "../../../lib/config";

// Phải khớp CHÍNH XÁC với pageSize backend dùng ở AdminController.listChatConversations
// (this.chatService.listConversationsForAdmin(pageNum, 20)) — lệch số này khiến Pagination tính
// sai tổng số trang so với thực tế backend trả về.
const CHAT_LOGS_PAGE_SIZE = 20;

/** Tab "Chatbot - Hội thoại" — hoàn thiện phần "conversation logging for Admin review" trong đề
 * xuất tính năng chatbot ban đầu. Khác với các tab khác (state sống ở page.tsx), tab này tự quản
 * lý toàn bộ state/fetch của riêng nó vì không có state nào dùng chung với tab khác — đơn giản
 * hơn và không cần prop-drilling qua page.tsx. */

type ConversationUser = { id: string; fullName: string; email: string; companyId: string | null };

type ConversationSummary = {
  id: string;
  user: ConversationUser;
  messageCount: number;
  lastMessage: { role: string; content: string; createdAt: string } | null;
  createdAt: string;
  updatedAt: string;
};

type ConversationDetail = {
  id: string;
  user: ConversationUser;
  messages: { id: string; role: string; content: string; createdAt: string }[];
};

function getAuthToken() {
  return localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || localStorage.getItem("token");
}

export default function ChatLogsTab() {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchConversations = (p: number) => {
    setLoading(true);
    const token = getAuthToken();
    fetch(`${API_BASE}/admin/chat/conversations?page=${p}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        setItems(Array.isArray(json?.data?.items) ? json.data.items : []);
        setTotal(json?.data?.total || 0);
      })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchConversations(page); }, [page]);

  const openConversation = (id: string) => {
    setDetailLoading(true);
    setSelected(null);
    const token = getAuthToken();
    fetch(`${API_BASE}/admin/chat/conversations/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => { if (json?.data) setSelected(json.data); })
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  };

  const totalMessages = items.reduce((sum, c) => sum + c.messageCount, 0);

  return (
    <div className="space-y-6">
      <StatGrid stats={[
        { label: "Tổng hội thoại", value: total, icon: MessageSquare, accent: "text-[#1B3A8F]", bg: "bg-blue-50" },
        { label: "Tin nhắn (trang này)", value: totalMessages, icon: Bot, accent: "text-emerald-600", bg: "bg-emerald-50" },
      ]} cols={3} />

      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(15,28,71,0.03),0_8px_24px_-12px_rgba(15,28,71,0.06)] p-7 lg:p-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-black text-[#0F1C47] mb-1">Hội thoại Chatbot ({total})</h2>
            <p className="text-xs text-gray-500">Xem lại nội dung khách hỏi và câu trả lời của trợ lý ảo trên website</p>
          </div>
          <button
            onClick={() => fetchConversations(page)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#1B3A8F] px-3 py-2 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Làm mới
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-gray-400 italic">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Chưa có hội thoại nào từ chatbot.</p>
        ) : (
          <>
            <div className="space-y-2">
              {items.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-[#1B3A8F]/40 hover:bg-[#F8F9FA] transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[#0F1C47] text-xs truncate">{c.user?.fullName || "—"}</span>
                      <span className="text-[11px] text-gray-400 truncate">{c.user?.email}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 shrink-0">
                        {c.messageCount} tin nhắn
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">
                      {c.lastMessage ? `${c.lastMessage.role === "user" ? "Khách" : "Bot"}: ${c.lastMessage.content}` : "—"}
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">{new Date(c.updatedAt).toLocaleString("vi-VN")}</span>
                </button>
              ))}
            </div>
            <Pagination page={page} totalItems={total} onChange={setPage} pageSize={CHAT_LOGS_PAGE_SIZE} />
          </>
        )}
      </div>

      {/* ═══ MODAL CHI TIẾT HỘI THOẠI ═══ */}
      {(selected || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-black text-[#0F1C47]">Chi Tiết Hội Thoại</h3>
                {selected?.user && (
                  <p className="text-xs text-gray-500 mt-0.5">{selected.user.fullName} · {selected.user.email}</p>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3 text-xs">
              {detailLoading ? (
                <p className="text-gray-400 italic">Đang tải...</p>
              ) : (
                selected?.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 whitespace-pre-wrap break-words flex items-start gap-2 ${
                        m.role === "user" ? "bg-[#0F1C47] text-white rounded-br-sm" : "bg-[#F8F9FA] border border-gray-100 text-gray-700 rounded-bl-sm"
                      }`}
                    >
                      {m.role !== "user" && <Bot className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#C9973C]" />}
                      <span>{m.content}</span>
                      {m.role === "user" && <User className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/70" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
