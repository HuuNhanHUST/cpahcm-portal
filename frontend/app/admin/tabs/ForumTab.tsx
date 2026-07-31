"use client";

import {
  MessageSquare, Pin, Lock, Filter, Plus, Edit, Trash2, RefreshCw,
  ChevronUp, ChevronDown, MessagesSquare, Unlock, X,
} from "lucide-react";
import { StatGrid } from "./shared";

/** Tab "Diễn Đàn" (danh mục + kiểm duyệt chủ đề) + modal thêm/sửa danh mục — tách khỏi
 * app/admin/page.tsx để next/dynamic chỉ tải code tab này khi Admin thực sự bấm vào (xem giải
 * thích chung ở CompaniesTab.tsx). State/handler vẫn sống ở page.tsx, chỉ JSX được tách ra. */
export default function ForumTab(props: any) {
  const {
    forumTopics,
    forumCategories,
    setEditingForumCategoryId,
    setNewForumCategory,
    emptyForumCategoryForm,
    setShowAddForumCategoryModal,
    forumCategoriesLoading,
    handleEditForumCategoryClick,
    askConfirm,
    handleDeleteForumCategory,
    fetchForumTopics,
    forumTopicsLoading,
    expandedForumTopicId,
    toggleForumTopicReplies,
    handleToggleForumTopicPinned,
    handleToggleForumTopicLocked,
    handleDeleteForumTopic,
    expandedForumRepliesLoading,
    expandedForumReplies,
    handleDeleteForumReply,
    showAddForumCategoryModal,
    editingForumCategoryId,
    handleSaveForumCategory,
    newForumCategory,
  } = props;

  return (
    <>
      <div className="space-y-8">
        <StatGrid stats={[
          { label: "Tổng chủ đề", value: forumTopics.length, icon: MessageSquare, accent: "text-[#0F1C47]", bg: "bg-[#0F1C47]/5" },
          { label: "Đã ghim", value: forumTopics.filter((t: any) => t.isPinned).length, icon: Pin, accent: "text-amber-600", bg: "bg-amber-50" },
          { label: "Đã khóa", value: forumTopics.filter((t: any) => t.isLocked).length, icon: Lock, accent: "text-gray-500", bg: "bg-gray-100" },
          { label: "Danh mục", value: forumCategories.length, icon: Filter, accent: "text-blue-600", bg: "bg-blue-50" },
        ]} />
        {/* Danh mục diễn đàn */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(15,28,71,0.03),0_8px_24px_-12px_rgba(15,28,71,0.06)] p-7 lg:p-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-black text-[#0F1C47] mb-1">Danh Mục Diễn Đàn ({forumCategories.length})</h2>
              <p className="text-xs text-gray-500">Danh mục hiển thị công khai tại /dien-dan — ẩn thay vì xóa nếu đã có chủ đề</p>
            </div>
            <button
              onClick={() => { setEditingForumCategoryId(null); setNewForumCategory(emptyForumCategoryForm); setShowAddForumCategoryModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0F1C47] hover:bg-[#1B3A8F] text-white text-xs font-bold rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Thêm Danh Mục
            </button>
          </div>

          {forumCategoriesLoading ? (
            <p className="text-xs text-gray-400 italic">Đang tải...</p>
          ) : forumCategories.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Chưa có danh mục nào.</p>
          ) : (
            <div className="space-y-2">
              {forumCategories.map((cat: any) => (
                <div key={cat.id} className="p-4 border border-gray-200 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-[#0F1C47] text-sm truncate">{cat.name}</h4>
                      {!cat.isActive && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-full text-[10px] font-bold shrink-0">Đã ẩn</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{cat._count?.topics ?? 0} chủ đề · /dien-dan?category={cat.slug}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleEditForumCategoryClick(cat)} className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="Sửa">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => askConfirm(`Bạn có chắc chắn muốn xóa chuyên mục "${cat.name}"? Thao tác này không thể hoàn tác.`, () => handleDeleteForumCategory(cat.id))} className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Xóa">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kiểm duyệt chủ đề */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(15,28,71,0.03),0_8px_24px_-12px_rgba(15,28,71,0.06)] p-7 lg:p-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-black text-[#0F1C47] mb-1">Kiểm Duyệt Chủ Đề ({forumTopics.length})</h2>
              <p className="text-xs text-gray-500">Ghim, khóa hoặc xóa chủ đề/trả lời vi phạm</p>
            </div>
            <button
              onClick={fetchForumTopics}
              className="flex items-center gap-2 bg-[#0F1C47] hover:bg-[#1B3A8F] text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#C9973C] ${forumTopicsLoading ? "animate-spin" : ""}`} /> Làm mới
            </button>
          </div>

          {forumTopicsLoading ? (
            <p className="text-xs text-gray-400 italic">Đang tải...</p>
          ) : forumTopics.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Chưa có chủ đề nào.</p>
          ) : (
            <div className="space-y-2">
              {forumTopics.map((topic: any) => (
                <div key={topic.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="p-4 flex items-center justify-between gap-4">
                    <button onClick={() => toggleForumTopicReplies(topic)} className="flex-1 min-w-0 text-left flex items-center gap-2">
                      {expandedForumTopicId === topic.id ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-[#0F1C47] text-sm truncate">{topic.title}</h4>
                          {topic.isPinned && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold shrink-0">Đã ghim</span>}
                          {topic.isLocked && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-full text-[10px] font-bold shrink-0">Đã khóa</span>}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-3">
                          <span>{topic.category?.name}</span>
                          <span>•</span>
                          <span>{topic.author?.fullName || "—"}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><MessagesSquare className="w-3 h-3" /> {topic._count?.replies ?? 0} trả lời</span>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleForumTopicPinned(topic.id, topic.isPinned)}
                        className={`p-2.5 rounded-lg transition-colors ${topic.isPinned ? "bg-amber-100 text-amber-700" : "bg-gray-50 hover:bg-gray-100 text-gray-500"}`}
                        title={topic.isPinned ? "Bỏ ghim" : "Ghim chủ đề"}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleForumTopicLocked(topic.id, topic.isLocked)}
                        className={`p-2.5 rounded-lg transition-colors ${topic.isLocked ? "bg-gray-200 text-gray-700" : "bg-gray-50 hover:bg-gray-100 text-gray-500"}`}
                        title={topic.isLocked ? "Mở khóa" : "Khóa chủ đề"}
                      >
                        {topic.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                      <button onClick={() => askConfirm(`Bạn có chắc chắn muốn xóa chủ đề "${topic.title}"? Thao tác này không thể hoàn tác.`, () => handleDeleteForumTopic(topic.id))} className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {expandedForumTopicId === topic.id && (
                    <div className="border-t border-gray-100 bg-[#F8F9FA] p-4 space-y-2">
                      {expandedForumRepliesLoading ? (
                        <p className="text-xs text-gray-400 italic">Đang tải trả lời...</p>
                      ) : expandedForumReplies.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Chưa có trả lời nào.</p>
                      ) : (
                        expandedForumReplies.map((reply: any) => (
                          <div key={reply.id} className="bg-white p-3 rounded-lg border border-gray-100 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#0F1C47] mb-1">{reply.author?.fullName || "—"}</div>
                              <div className="text-xs text-gray-600 line-clamp-2">{reply.content?.replace(/<[^>]*>/g, "")}</div>
                            </div>
                            <button
                              onClick={() => askConfirm("Bạn có chắc chắn muốn xóa trả lời này? Thao tác này không thể hoàn tác.", () => handleDeleteForumReply(reply.id, topic))}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                              title="Xóa trả lời"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODAL THÊM / SỬA DANH MỤC DIỄN ĐÀN ═══ */}
      {showAddForumCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-[#0F1C47]">
                {editingForumCategoryId ? "Sửa Danh Mục Diễn Đàn" : "Thêm Danh Mục Diễn Đàn"}
              </h3>
              <button
                onClick={() => { setShowAddForumCategoryModal(false); setEditingForumCategoryId(null); }}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveForumCategory} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1.5">Tên danh mục</label>
                <input
                  required
                  minLength={2}
                  maxLength={60}
                  value={newForumCategory.name}
                  onChange={(e) => setNewForumCategory({ ...newForumCategory, name: e.target.value })}
                  placeholder="VD: Chuẩn mực Kế toán, Thuế TNDN..."
                  className="w-full border border-gray-200 p-2.5 rounded-lg outline-none focus:border-[#1B3A8F]"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1.5">Mô tả (tùy chọn)</label>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={newForumCategory.description}
                  onChange={(e) => setNewForumCategory({ ...newForumCategory, description: e.target.value })}
                  className="w-full border border-gray-200 p-2.5 rounded-lg outline-none focus:border-[#1B3A8F]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setShowAddForumCategoryModal(false); setEditingForumCategoryId(null); }}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg"
                >
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2.5 bg-[#0F1C47] text-white font-bold rounded-lg">
                  {editingForumCategoryId ? "Lưu Thay Đổi" : "Tạo Danh Mục"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
