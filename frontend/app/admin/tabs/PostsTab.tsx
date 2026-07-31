"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { Newspaper, CheckCircle2, EyeOff, Eye, Plus, Search, Edit, Trash2, ImageOff, X } from "lucide-react";
import { StatGrid, Pagination } from "./shared";
import { POST_CATEGORIES } from "../../tin-tuc/shared";
import { API_ORIGIN } from "../../../lib/config";

/** Tab "Quản Lý Bài Viết" + modal thêm/sửa bài viết (Markdown + preview) — tách khỏi
 * app/admin/page.tsx để next/dynamic chỉ tải code tab này (gồm cả react-markdown) khi Admin thực
 * sự bấm vào (xem giải thích chung ở CompaniesTab.tsx). State/handler vẫn sống ở page.tsx. */
export default function PostsTab(props: any) {
  const {
    postsList,
    setEditingPostId,
    setNewPost,
    emptyPostForm,
    setPostImageFile,
    setPostPreviewMode,
    setShowAddPostModal,
    postsSearch,
    setPostsSearch,
    setPostsPage,
    postsLoading,
    filteredPostsList,
    pagedPostsList,
    handleEditPostClick,
    askConfirm,
    handleDeletePost,
    postsPage,
    showAddPostModal,
    editingPostId,
    handleCreatePost,
    newPost,
    postImageFile,
    postPreviewMode,
  } = props;

  return (
    <>
      <div className="space-y-6">
        <StatGrid stats={[
          { label: "Tổng bài viết", value: postsList.length, icon: Newspaper, accent: "text-[#0F1C47]", bg: "bg-[#0F1C47]/5" },
          { label: "Đã xuất bản", value: postsList.filter((p: any) => p.isPublished).length, icon: CheckCircle2, accent: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Bản nháp", value: postsList.filter((p: any) => !p.isPublished).length, icon: EyeOff, accent: "text-gray-500", bg: "bg-gray-100" },
          { label: "Tổng lượt xem", value: postsList.reduce((sum: number, p: any) => sum + (p.viewCount || 0), 0), icon: Eye, accent: "text-blue-600", bg: "bg-blue-50" },
        ]} />
      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(15,28,71,0.03),0_8px_24px_-12px_rgba(15,28,71,0.06)] p-7 lg:p-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-[#0F1C47] mb-1">Quản Lý Bài Viết ({postsList.length})</h2>
            <p className="text-xs text-gray-500">Bài viết đang hiển thị công khai tại /tin-tuc (chỉ bài đã xuất bản)</p>
          </div>
          <button
            onClick={() => { setEditingPostId(null); setNewPost(emptyPostForm); setPostImageFile(null); setPostPreviewMode(false); setShowAddPostModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0F1C47] hover:bg-[#1B3A8F] text-white text-xs font-bold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Đăng Bài Viết Mới
          </button>
        </div>

        <div className="relative mb-5">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={postsSearch}
            onChange={(e) => { setPostsSearch(e.target.value); setPostsPage(1); }}
            placeholder="Tìm theo tiêu đề bài viết..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1B3A8F]"
          />
        </div>

        {postsLoading ? (
          <p className="text-xs text-gray-400 italic">Đang tải...</p>
        ) : filteredPostsList.length === 0 ? (
          <p className="text-xs text-gray-400 italic">{postsSearch ? "Không tìm thấy bài viết phù hợp." : "Chưa có bài viết nào."}</p>
        ) : (
          <>
          <div className="space-y-3">
            {pagedPostsList.map((post: any) => (
              <div key={post.id} className="p-4 border border-gray-200 rounded-xl flex items-center justify-between gap-4">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  {post.imageUrl ? (
                    <Image src={`${API_ORIGIN}${post.imageUrl}`} alt={post.title} fill sizes="64px" className="object-cover" />
                  ) : (
                    <ImageOff className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-[#0F1C47] text-sm truncate">{post.title}</h4>
                    {post.isPublished ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold shrink-0">Đã xuất bản</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1"><EyeOff className="w-3 h-3" /> Ẩn</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-3">
                    <span>{post.category}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.viewCount} lượt xem</span>
                    <span>•</span>
                    <span>/tin-tuc/{post.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleEditPostClick(post)} className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="Sửa">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => askConfirm(`Bạn có chắc chắn muốn xóa bài viết "${post.title}"? Thao tác này không thể hoàn tác.`, () => handleDeletePost(post.id))} className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Xóa">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={postsPage} totalItems={filteredPostsList.length} onChange={setPostsPage} />
          </>
        )}
      </div>
      </div>

      {/* ═══ MODAL THÊM/SỬA BÀI VIẾT (Markdown + preview) ═══ */}
      {showAddPostModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-3xl w-full mx-auto shadow-2xl border border-gray-100 text-xs my-8">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-[#0F1C47]">{editingPostId ? "Sửa Bài Viết" : "Đăng Bài Viết Mới"}</h3>
              <button onClick={() => { setShowAddPostModal(false); setEditingPostId(null); }} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Tiêu Đề Bài Viết *</label>
                <input
                  type="text"
                  required
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="Ví dụ: Điểm mới Nghị định quyết toán thuế TNDN năm 2026"
                  className="w-full border border-gray-200 p-3 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Slug URL (để trống sẽ tự tạo)</label>
                  <input
                    type="text"
                    value={newPost.slug}
                    onChange={(e) => setNewPost({ ...newPost, slug: e.target.value })}
                    placeholder="diem-moi-nghi-dinh-thue-2026"
                    className="w-full border border-gray-200 p-3 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Chuyên Mục *</label>
                  <select
                    value={newPost.category}
                    onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                    className="w-full border border-gray-200 p-3 rounded-lg outline-none"
                  >
                    {POST_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Ảnh Cover</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => setPostImageFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-200 p-2.5 rounded-lg outline-none bg-[#F8F9FA]"
                />
                {postImageFile && <span className="text-[11px] text-[#1B3A8F] font-bold mt-1 block">{postImageFile.name}</span>}
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Tóm Tắt Ngắn (hiện ở card danh sách)</label>
                <textarea
                  rows={2}
                  value={newPost.excerpt}
                  onChange={(e) => setNewPost({ ...newPost, excerpt: e.target.value })}
                  placeholder="Tóm tắt 1-2 câu nội dung chính của bài viết..."
                  className="w-full border border-gray-200 p-3 rounded-lg outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700 block">Nội Dung Bài Viết (Markdown) *</label>
                  <button
                    type="button"
                    onClick={() => setPostPreviewMode(!postPreviewMode)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded text-[11px]"
                  >
                    {postPreviewMode ? "Chỉnh sửa" : "Xem trước"}
                  </button>
                </div>
                {postPreviewMode ? (
                  <div className="w-full border border-gray-200 p-4 rounded-lg min-h-[220px] max-h-[400px] overflow-y-auto bg-[#F8F9FA]">
                    <div className="prose-cpa">
                      <ReactMarkdown>{newPost.content || "*(Chưa có nội dung)*"}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <textarea
                    required
                    rows={10}
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    placeholder={"## Tiêu đề phụ\n\nNội dung **quan trọng** với [link](https://...)\n\n- Ý 1\n- Ý 2"}
                    className="w-full border border-gray-200 p-3 rounded-lg outline-none font-mono text-[11px] leading-relaxed"
                  />
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPost.isPublished}
                  onChange={(e) => setNewPost({ ...newPost, isPublished: e.target.checked })}
                  className="rounded text-[#1B3A8F]"
                />
                <span className="font-bold text-gray-700">Xuất bản công khai ngay</span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setShowAddPostModal(false); setEditingPostId(null); }} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg">
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2.5 bg-[#0F1C47] text-white font-bold rounded-lg">
                  {editingPostId ? "Lưu Thay Đổi" : "Đăng Bài Viết"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
