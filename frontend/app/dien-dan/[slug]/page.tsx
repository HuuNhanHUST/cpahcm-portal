"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import {
  ChevronRight,
  Pin,
  Lock,
  Eye,
  MessagesSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";
import { API_BASE, useAuthUser, AuthGateNotice, canModify, formatDate } from "../shared";
import { authFetch } from "../../../lib/authFetch";

export default function TopicDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const slug = params?.slug as string;
  const { authUser, authMounted } = useAuthUser();

  const [topic, setTopic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState("");

  const [editingTopic, setEditingTopic] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState("");

  const loadTopic = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    fetch(`${API_BASE}/forum/topics/${slug}`)
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); return null; }
        return res.json();
      })
      .then((json) => { if (json) setTopic(json.data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  // Backend tăng viewCount trên MỖI lần GET (xem forum.service.ts getTopicBySlug) — effect này
  // KHÔNG được gọi 2 lần cho cùng 1 slug, nếu không lượt xem tăng gấp đôi. React StrictMode (dev)
  // cố ý gọi effect 2 lần khi mount để phát hiện side-effect không idempotent — dùng ref chặn
  // lần gọi trùng thay vì dựa vào cleanup (không thể "hủy" 1 tăng viewCount đã xảy ra ở server).
  const loadedSlugRef = useRef<string | null>(null);
  useEffect(() => {
    if (loadedSlugRef.current === slug) return;
    loadedSlugRef.current = slug;
    loadTopic();
  }, [loadTopic, slug]);

  const submitReply = async () => {
    setReplyError("");
    if (replyContent.trim().length < 2) {
      setReplyError("Nội dung trả lời quá ngắn.");
      return;
    }
    setSubmittingReply(true);
    try {
      const res = await authFetch(`${API_BASE}/forum/topics/${topic.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent }),
      });
      const json = await res.json();
      if (!res.ok) {
        setReplyError(json?.message || "Có lỗi xảy ra, vui lòng thử lại.");
        return;
      }
      setReplyContent("");
      loadTopic();
    } catch {
      setReplyError("Không thể kết nối tới máy chủ.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const startEditTopic = () => {
    setEditTitle(topic.title);
    setEditContent(topic.content);
    setEditingTopic(true);
  };

  // Trước đây các thao tác sửa/xóa dưới đây chỉ check `if (res.ok)` — khi lỗi (mất mạng, hết
  // phiên, không có quyền...) giao diện im lặng không đổi gì, không có bất kỳ dấu hiệu nào cho
  // người dùng biết thao tác đã thất bại. Giờ luôn hiện rõ lỗi qua actionError.
  const [actionError, setActionError] = useState("");

  // Khối nội dung chủ đề/danh sách trả lời trước đây hiện tĩnh ngay khi tải, không có hiệu ứng
  // xuất hiện khi cuộn tới như các trang chi tiết khác (khóa học, tuyển dụng, tin tức) đã có.
  const revealUp: any = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };
  const stagger: any = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
  };

  const reportActionFailure = async (res: Response, fallback: string) => {
    const json = await res.json().catch(() => null);
    setActionError(json?.message || fallback);
  };

  const saveTopicEdit = async () => {
    const res = await authFetch(`${API_BASE}/forum/topics/${topic.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    });
    if (res.ok) {
      setEditingTopic(false);
      loadTopic();
    } else {
      await reportActionFailure(res, "Không thể lưu thay đổi chủ đề.");
    }
  };

  const deleteTopic = async () => {
    if (!window.confirm(t("forum.deleteConfirm"))) return;
    const res = await authFetch(`${API_BASE}/forum/topics/${topic.id}`, {
      method: "DELETE",
    });
    if (res.ok) window.location.href = "/dien-dan";
    else await reportActionFailure(res, "Không thể xóa chủ đề.");
  };

  const startEditReply = (reply: any) => {
    setEditingReplyId(reply.id);
    setEditReplyContent(reply.content);
  };

  const saveReplyEdit = async (replyId: string) => {
    const res = await authFetch(`${API_BASE}/forum/replies/${replyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editReplyContent }),
    });
    if (res.ok) {
      setEditingReplyId(null);
      loadTopic();
    } else {
      await reportActionFailure(res, "Không thể lưu trả lời đã sửa.");
    }
  };

  const deleteReply = async (replyId: string) => {
    if (!window.confirm(t("forum.deleteConfirm"))) return;
    const res = await authFetch(`${API_BASE}/forum/replies/${replyId}`, {
      method: "DELETE",
    });
    if (res.ok) loadTopic();
    else await reportActionFailure(res, "Không thể xóa trả lời.");
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F6F9] font-sans">
      <Header />

      {actionError && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-5 py-3 rounded-sm shadow-xl text-sm font-semibold flex items-center gap-3 max-w-lg">
          <span>{actionError}</span>
          <button onClick={() => setActionError("")} className="text-white/80 hover:text-white shrink-0">✕</button>
        </div>
      )}

      <main className="flex-grow">
        <section className="relative bg-[#0F1C47] pt-28 pb-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-grid-navy opacity-40" />
          <div className="relative max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-blue-300 mb-4">
              <Link href="/dien-dan" className="hover:text-white transition-colors">{t("forum.title")}</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-white truncate">{topic?.title || "..."}</span>
            </div>
            {topic && (
              <>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {topic.isPinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#C9973C]/20 text-[#C9973C] font-bold text-[10px] rounded-sm uppercase">
                      <Pin className="w-3 h-3" /> {t("forum.pinnedLabel")}
                    </span>
                  )}
                  {topic.isLocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 text-white font-bold text-[10px] rounded-sm uppercase">
                      <Lock className="w-3 h-3" /> {t("forum.lockedLabel")}
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-white/10 text-blue-200 font-bold text-[10px] rounded-sm uppercase tracking-wider">
                    {topic.category?.name}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-3">{topic.title}</h1>
                <div className="flex items-center gap-4 text-xs text-blue-200/80">
                  <span>{topic.author?.fullName || "—"} · {formatDate(topic.createdAt)}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {topic.viewCount}</span>
                  <span className="flex items-center gap-1"><MessagesSquare className="w-3.5 h-3.5" /> {topic.replies?.length ?? 0}</span>
                </div>
              </>
            )}
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          {loading ? (
            <div className="bg-white p-12 rounded-sm border border-gray-100 text-center text-sm text-gray-400">...</div>
          ) : notFound || !topic ? (
            <div className="bg-white p-12 rounded-sm border border-gray-100 text-center space-y-3">
              <h4 className="text-lg font-bold text-[#0F1C47]">{t("forum.detailNotFoundTitle")}</h4>
              <p className="text-sm text-gray-500">{t("forum.detailNotFoundDesc")}</p>
              <Link href="/dien-dan" className="inline-block text-[#C9973C] font-bold text-sm">{t("forum.detailBackToList")}</Link>
            </div>
          ) : (
            <>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={revealUp}
                className="bg-white p-6 lg:p-8 rounded-sm border border-gray-100"
              >
                {editingTopic ? (
                  <div className="space-y-3">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full border border-gray-200 rounded-sm p-2.5 text-sm font-bold outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={6}
                      className="w-full border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20"
                    />
                    <div className="flex gap-2">
                      <button onClick={saveTopicEdit} className="px-4 py-2 bg-[#1B3A8F] text-white font-bold text-xs rounded-sm">{t("forum.saveLabel")}</button>
                      <button onClick={() => setEditingTopic(false)} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-sm">{t("forum.cancelLabel")}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="prose-cpa" dangerouslySetInnerHTML={{ __html: topic.content }} />
                    {canModify(authUser, topic.authorId) && (
                      <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
                        <button onClick={startEditTopic} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#1B3A8F]">
                          <Pencil className="w-3.5 h-3.5" /> {t("forum.editLabel")}
                        </button>
                        <button onClick={deleteTopic} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" /> {t("forum.deleteLabel")}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="space-y-3">
                {(topic.replies || []).map((reply: any) => (
                  <motion.div key={reply.id} variants={revealUp} className="bg-white p-5 rounded-sm border border-gray-100">
                    {editingReplyId === reply.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editReplyContent}
                          onChange={(e) => setEditReplyContent(e.target.value)}
                          rows={3}
                          className="w-full border border-gray-200 rounded-sm p-2.5 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => saveReplyEdit(reply.id)} className="px-4 py-2 bg-[#1B3A8F] text-white font-bold text-xs rounded-sm">{t("forum.saveLabel")}</button>
                          <button onClick={() => setEditingReplyId(null)} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-sm">{t("forum.cancelLabel")}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-[#0F1C47]">{reply.author?.fullName || "—"}</span>
                          <span className="text-[11px] text-gray-400">{formatDate(reply.createdAt)}</span>
                        </div>
                        <div className="prose-cpa text-sm" dangerouslySetInnerHTML={{ __html: reply.content }} />
                        {canModify(authUser, reply.authorId) && (
                          <div className="flex gap-3 mt-3 pt-3 border-t border-gray-50">
                            <button onClick={() => startEditReply(reply)} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-[#1B3A8F]">
                              <Pencil className="w-3 h-3" /> {t("forum.editLabel")}
                            </button>
                            <button onClick={() => deleteReply(reply.id)} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-red-600">
                              <Trash2 className="w-3 h-3" /> {t("forum.deleteLabel")}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                ))}
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={revealUp}
                className="bg-white p-6 rounded-sm border border-gray-100"
              >
                <h3 className="font-bold text-[#0F1C47] mb-4">{t("forum.replyFormLabel")}</h3>
                {topic.isLocked ? (
                  <p className="text-sm text-gray-500">{t("forum.replyLockedNotice")}</p>
                ) : authMounted && !authUser ? (
                  <AuthGateNotice
                    authUser={authUser}
                    title={t("forum.authGateTitle")}
                    desc={t("forum.authGateDesc")}
                    loginLabel={t("forum.loginLabel")}
                  />
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={t("forum.replyFormPlaceholder")}
                      rows={4}
                      className="w-full border border-gray-200 rounded-sm p-3 text-sm outline-none focus:border-[#1B3A8F] focus:ring-2 focus:ring-[#1B3A8F]/20"
                    />
                    {replyError && <p className="text-sm text-red-600">{replyError}</p>}
                    <button
                      onClick={submitReply}
                      disabled={submittingReply}
                      className="px-6 py-2.5 bg-[#C9973C] hover:bg-[#D4AF37] text-[#0F1C47] font-bold rounded-sm text-sm uppercase tracking-wide disabled:opacity-50"
                    >
                      {submittingReply ? t("forum.replySubmitting") : t("forum.replySubmit")}
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
