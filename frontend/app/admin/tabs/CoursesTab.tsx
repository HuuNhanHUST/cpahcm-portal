"use client";

import dynamic from "next/dynamic";
import { BookOpen, CheckCircle2, TrendingUp, Users, Plus, Search, Edit, Trash2, X } from "lucide-react";
import { StatGrid, Pagination } from "./shared";

const RichTextEditor = dynamic(() => import("../../../components/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="w-full h-40 bg-[#F8F9FA] border border-gray-200 rounded-sm animate-pulse" />,
});

const COURSE_CATEGORIES = ["CPA", "Kế toán trưởng", "Kế toán tổng hợp", "Thuế"];

/** Tab "Quản Lý Khóa Học" (+ đăng ký khóa học) + modal thêm/sửa khóa học (curriculum builder) —
 * tách khỏi app/admin/page.tsx để next/dynamic chỉ tải code tab này (gồm cả TipTap
 * RichTextEditor) khi Admin thực sự bấm vào (xem giải thích chung ở CompaniesTab.tsx). */
export default function CoursesTab(props: any) {
  const {
    coursesList,
    setEditingCourseId,
    setNewCourse,
    emptyCourseForm,
    setCourseModules,
    setCourseImageFile,
    setShowAddCourseModal,
    coursesSearch,
    setCoursesSearch,
    setCoursesPage,
    coursesLoading,
    filteredCoursesList,
    pagedCoursesList,
    handleEditCourseClick,
    askConfirm,
    handleDeleteCourse,
    coursesPage,
    enrollmentsList,
    enrollmentsLoading,
    handleUpdateEnrollmentStatus,
    showAddCourseModal,
    editingCourseId,
    handleCreateCourse,
    newCourse,
    courseImageFile,
    courseModules,
    handleDownloadLessonFile,
    handleRemoveLessonFile,
    uploadingLessonFileId,
    handleAttachLessonFile,
  } = props;

  return (
    <>
      <div className="space-y-6">
        <StatGrid stats={[
          { label: "Tổng khóa học", value: coursesList.length, icon: BookOpen, accent: "text-[#0F1C47]", bg: "bg-[#0F1C47]/5" },
          { label: "Đang mở", value: coursesList.filter((c: any) => c.isActive !== false).length, icon: CheckCircle2, accent: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Nổi bật (HOT)", value: coursesList.filter((c: any) => c.isHot).length, icon: TrendingUp, accent: "text-amber-600", bg: "bg-amber-50" },
          { label: "Tổng học viên", value: coursesList.reduce((sum: number, c: any) => sum + (c._count?.enrollments || 0), 0), icon: Users, accent: "text-blue-600", bg: "bg-blue-50" },
        ]} />
        <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(15,28,71,0.03),0_8px_24px_-12px_rgba(15,28,71,0.06)] p-7 lg:p-8">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-black text-[#0F1C47] mb-1">Quản Lý Chương Trình Đào Tạo CPA Academy ({coursesList.length})</h2>
              <p className="text-xs text-gray-500">Tin khóa học đang hiển thị công khai tại /dao-tao (chỉ khóa isActive=true)</p>
            </div>
            <button
              onClick={() => { setEditingCourseId(null); setNewCourse(emptyCourseForm); setCourseModules([]); setCourseImageFile(null); setShowAddCourseModal(true); }}
              className="flex items-center gap-2 bg-[#C9973C] hover:bg-[#b38531] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Thêm Khóa Học Mới
            </button>
          </div>

          <div className="relative mb-5">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={coursesSearch}
              onChange={(e) => { setCoursesSearch(e.target.value); setCoursesPage(1); }}
              placeholder="Tìm theo tên khóa học..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1B3A8F]"
            />
          </div>

          {coursesLoading ? (
            <p className="text-xs text-gray-400 italic">Đang tải...</p>
          ) : filteredCoursesList.length === 0 ? (
            <p className="text-xs text-gray-400 italic">{coursesSearch ? "Không tìm thấy khóa học phù hợp." : "Chưa có khóa học nào."}</p>
          ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pagedCoursesList.map((c: any) => (
                <div key={c.id} className="p-6 border border-gray-200 rounded-2xl bg-white shadow-sm flex flex-col justify-between hover:border-[#1B3A8F]/40 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono font-bold text-[#C9973C] bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                        {c.category}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${c.isActive !== false ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                        {c.isActive !== false ? "Đang mở lớp" : "Đã ẩn"}
                      </span>
                    </div>
                    <h3 className="font-bold text-[#0F1C47] text-base mb-2">{c.title}</h3>
                    {c.instructor && <p className="text-xs text-gray-500 mb-4">Giảng viên phụ trách: <strong className="text-gray-800">{c.instructor}</strong></p>}

                    <div className="grid grid-cols-2 gap-2 text-xs bg-[#F8F9FA] p-3 rounded-xl border border-gray-100 mb-4">
                      <div>
                        <span className="text-gray-400 block text-[10px]">HỌC PHÍ</span>
                        <span className="font-black text-[#1B3A8F]">{Number(c.price).toLocaleString("vi-VN")} VNĐ</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">HỌC VIÊN ĐÃ ĐĂNG KÝ</span>
                        <span className="font-bold text-gray-800">{c._count?.enrollments ?? 0} Học viên</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleEditCourseClick(c)}
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                      title="Sửa"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => askConfirm(`Bạn có chắc chắn muốn xóa khóa học "${c.title}"? Thao tác này không thể hoàn tác.`, () => handleDeleteCourse(c.id))}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={coursesPage} totalItems={filteredCoursesList.length} onChange={setCoursesPage} />
            </>
          )}
        </div>

        {/* Enrollment Management */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(15,28,71,0.03),0_8px_24px_-12px_rgba(15,28,71,0.06)] p-7 lg:p-8">
          <h2 className="text-xl font-black text-[#0F1C47] mb-1">Đăng Ký Khóa Học ({enrollmentsList.length})</h2>
          <p className="text-xs text-gray-500 mb-6">Danh sách học viên đã đăng ký, cập nhật trạng thái thanh toán/học tập</p>

          {enrollmentsLoading ? (
            <p className="text-xs text-gray-400 italic">Đang tải...</p>
          ) : enrollmentsList.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Chưa có đăng ký nào.</p>
          ) : (
            <div className="space-y-3">
              {enrollmentsList.map((en: any) => (
                <div key={en.id} className="p-4 border border-gray-200 rounded-xl flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h4 className="font-bold text-[#0F1C47] text-sm">{en.user?.fullName || en.user?.email}</h4>
                    <p className="text-xs text-gray-500">{en.course?.title} • {en.user?.phone} • {en.user?.email}</p>
                  </div>
                  <select
                    value={en.status}
                    onChange={(e) => handleUpdateEnrollmentStatus(en.id, e.target.value)}
                    className="border border-gray-200 rounded-lg p-2 text-xs font-bold outline-none"
                  >
                    <option value="PENDING">Chờ xử lý</option>
                    <option value="PAID">Đã thanh toán</option>
                    <option value="STUDYING">Đang học</option>
                    <option value="COMPLETED">Đã hoàn thành</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODAL THÊM KHÓA HỌC ═══ */}
      {/* overflow-y-auto ĐẶT Ở ĐÂY (không kèm flex items-center) — flexbox căn giữa + overflow
          trên cùng 1 container là 1 cạm bẫy CSS kinh điển: khi nội dung cao hơn viewport, phần
          overflow phía TRÊN vị trí căn giữa không thể cuộn tới được (chỉ cuộn được xuống dưới),
          nên các trường đầu form vĩnh viễn nằm ngoài tầm với. Bỏ flex-center ở ngoài, chuyển sang
          mx-auto ở card bên trong để vẫn căn giữa ngang mà không dính bẫy cuộn dọc. */}
      {showAddCourseModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-3xl w-full mx-auto shadow-2xl border border-gray-100 text-xs my-8">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-[#0F1C47]">{editingCourseId ? "Sửa Khóa Học" : "Thêm Khóa Học Mới CPA Academy"}</h3>
              <button onClick={() => { setShowAddCourseModal(false); setEditingCourseId(null); }} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Tên Khóa Học *</label>
                <input
                  type="text"
                  required
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  placeholder="Luyện thi chứng chỉ CPA..."
                  className="w-full border border-gray-200 p-3 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Slug URL (để trống sẽ tự tạo)</label>
                  <input type="text" value={newCourse.slug} onChange={(e) => setNewCourse({ ...newCourse, slug: e.target.value })} placeholder="luyen-thi-cpa" className="w-full border border-gray-200 p-3 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Chuyên Mục *</label>
                  <select value={newCourse.category} onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })} className="w-full border border-gray-200 p-3 rounded-lg outline-none">
                    {COURSE_CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Tag (HOT, Mới khai giảng...)</label>
                  <input type="text" value={newCourse.tag} onChange={(e) => setNewCourse({ ...newCourse, tag: e.target.value })} className="w-full border border-gray-200 p-3 rounded-lg outline-none" />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Ảnh Cover</label>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setCourseImageFile(e.target.files?.[0] || null)} className="w-full border border-gray-200 p-2.5 rounded-lg outline-none bg-[#F8F9FA]" />
                {courseImageFile && <span className="text-[11px] text-[#1B3A8F] font-bold mt-1 block">{courseImageFile.name}</span>}
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Giảng Viên Phụ Trách</label>
                <input type="text" value={newCourse.instructor} onChange={(e) => setNewCourse({ ...newCourse, instructor: e.target.value })} placeholder="CPA. Đoàn Thế Vinh" className="w-full border border-gray-200 p-3 rounded-lg outline-none" />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Học Phí (VNĐ) *</label>
                  <input type="number" required min={0} value={newCourse.price} onChange={(e) => setNewCourse({ ...newCourse, price: Number(e.target.value) })} className="w-full border border-gray-200 p-3 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Giá Gốc (nếu giảm giá)</label>
                  <input type="number" min={0} value={newCourse.originalPrice} onChange={(e) => setNewCourse({ ...newCourse, originalPrice: e.target.value })} className="w-full border border-gray-200 p-3 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Số Bài Học</label>
                  <input type="number" min={0} value={newCourse.lessons} onChange={(e) => setNewCourse({ ...newCourse, lessons: Number(e.target.value) })} className="w-full border border-gray-200 p-3 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Số Giờ Học</label>
                  <input type="number" min={0} value={newCourse.hours} onChange={(e) => setNewCourse({ ...newCourse, hours: Number(e.target.value) })} className="w-full border border-gray-200 p-3 rounded-lg outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Cấp độ</label>
                  <input type="text" value={newCourse.level} onChange={(e) => setNewCourse({ ...newCourse, level: e.target.value })} placeholder="Cơ bản / Nâng cao" className="w-full border border-gray-200 p-3 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Lịch học</label>
                  <input type="text" value={newCourse.schedule} onChange={(e) => setNewCourse({ ...newCourse, schedule: e.target.value })} placeholder="Sáng, Chiều, Tối" className="w-full border border-gray-200 p-3 rounded-lg outline-none" />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Mô Tả Ngắn</label>
                <textarea rows={2} value={newCourse.description} onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })} className="w-full border border-gray-200 p-3 rounded-lg outline-none" />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Nội Dung Chi Tiết (Rich Text)</label>
                <RichTextEditor value={newCourse.longDescription} onChange={(html: string) => setNewCourse({ ...newCourse, longDescription: html })} />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-2">Giáo Trình (Curriculum Builder)</label>
                <div className="space-y-3">
                  {courseModules.map((mod: any, mIdx: number) => (
                    <div key={mIdx} className="border border-gray-200 rounded-lg p-3 bg-[#F8F9FA]">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={mod.title}
                          onChange={(e) => setCourseModules(courseModules.map((m: any, i: number) => (i === mIdx ? { ...m, title: e.target.value } : m)))}
                          placeholder={`Module ${mIdx + 1}: Tên module...`}
                          className="flex-1 border border-gray-200 p-2.5 rounded-lg outline-none font-bold"
                        />
                        <button type="button" onClick={() => setCourseModules(courseModules.filter((_: any, i: number) => i !== mIdx))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0" title="Xóa module">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-2 pl-2">
                        {mod.lessons.map((lesson: any, lIdx: number) => (
                          <div key={lesson.id || lIdx} className="border border-gray-100 rounded-lg p-2 bg-white space-y-1.5">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={lesson.title}
                                onChange={(e) =>
                                  setCourseModules(
                                    courseModules.map((m: any, mi: number) =>
                                      mi !== mIdx ? m : { ...m, lessons: m.lessons.map((l: any, li: number) => (li === lIdx ? { ...l, title: e.target.value } : l)) },
                                    ),
                                  )
                                }
                                placeholder="Tên bài học..."
                                className="flex-1 border border-gray-200 p-2 rounded-lg outline-none text-sm"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setCourseModules(courseModules.map((m: any, mi: number) => (mi !== mIdx ? m : { ...m, lessons: m.lessons.filter((_: any, li: number) => li !== lIdx) })))
                                }
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                                title="Xóa bài học"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <input
                              type="url"
                              value={lesson.videoUrl || ""}
                              onChange={(e) =>
                                setCourseModules(
                                  courseModules.map((m: any, mi: number) =>
                                    mi !== mIdx ? m : { ...m, lessons: m.lessons.map((l: any, li: number) => (li === lIdx ? { ...l, videoUrl: e.target.value } : l)) },
                                  ),
                                )
                              }
                              placeholder="Link video (YouTube/Vimeo...) — không bắt buộc"
                              className="w-full border border-gray-200 p-2 rounded-lg outline-none text-xs"
                            />
                            {lesson.id ? (
                              lesson.fileUrl ? (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-emerald-700 font-semibold truncate flex-1">📄 {lesson.fileName || "Tài liệu.pdf"}</span>
                                  <button type="button" onClick={() => handleDownloadLessonFile(lesson.id!, lesson.fileName || "")} className="text-[#1B3A8F] font-bold hover:underline">
                                    Tải
                                  </button>
                                  <button type="button" onClick={() => handleRemoveLessonFile(mIdx, lIdx, lesson.id!)} className="text-red-500 font-bold hover:underline">
                                    Gỡ
                                  </button>
                                </div>
                              ) : (
                                <label className="text-xs text-[#1B3A8F] font-bold cursor-pointer hover:underline">
                                  {uploadingLessonFileId === lesson.id ? "Đang tải lên..." : "+ Đính kèm PDF"}
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    disabled={uploadingLessonFileId === lesson.id}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleAttachLessonFile(mIdx, lIdx, lesson.id!, file);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              )
                            ) : (
                              <p className="text-xs text-gray-400 italic">Lưu khóa học trước để đính kèm file PDF</p>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setCourseModules(courseModules.map((m: any, mi: number) => (mi !== mIdx ? m : { ...m, lessons: [...m.lessons, { title: "" }] })))
                          }
                          className="text-xs font-bold text-[#1B3A8F] hover:text-[#C9973C]"
                        >
                          + Thêm bài học
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCourseModules([...courseModules, { title: "", lessons: [] }])}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#1B3A8F] hover:text-[#C9973C]"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Thêm Module
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newCourse.isHot} onChange={(e) => setNewCourse({ ...newCourse, isHot: e.target.checked })} className="rounded text-[#1B3A8F]" />
                  <span className="font-bold text-gray-700">Đánh dấu HOT</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newCourse.isActive} onChange={(e) => setNewCourse({ ...newCourse, isActive: e.target.checked })} className="rounded text-[#1B3A8F]" />
                  <span className="font-bold text-gray-700">Hiển thị công khai ngay</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setShowAddCourseModal(false); setEditingCourseId(null); }} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg">
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2.5 bg-[#C9973C] text-white font-bold rounded-lg hover:bg-[#b38531]">
                  {editingCourseId ? "Lưu Thay Đổi" : "Thêm Khóa Học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
