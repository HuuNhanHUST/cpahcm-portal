"use client";

import Image from "next/image";
import { Clock, Briefcase, FileCheck, UserCheck, RefreshCw, Plus, Edit, Trash2, X } from "lucide-react";
import { StatGrid } from "./shared";
import { API_ORIGIN } from "../../../lib/config";

/** Tab "Tuyển Dụng" (yêu cầu đăng tin, yêu cầu xem liên hệ ứng viên, tin tuyển dụng, ATS ứng
 * viên) + modal thêm/sửa tin tuyển dụng — tách khỏi app/admin/page.tsx để next/dynamic chỉ tải
 * code tab này khi Admin thực sự bấm vào (xem giải thích chung ở CompaniesTab.tsx). */
export default function RecruitmentTab(props: any) {
  const {
    employerRequestsList,
    jobPostingsList,
    jobApplicants,
    fetchEmployerRequestsList,
    employerRequestsLoading,
    expandedRequestId,
    setExpandedRequestId,
    parseEmployerJobDescription,
    handlePublishFromRequest,
    candidateIntroRequests,
    fetchCandidateIntroRequests,
    candidateIntroLoading,
    handleReviewCandidateIntroRequest,
    setEditingJobId,
    setPublishingFromRequestId,
    setNewJob,
    emptyJobForm,
    setJobImageFile,
    setShowAddJobModal,
    jobsLoading,
    handleEditJobClick,
    askConfirm,
    handleDeleteJob,
    applicantsLoading,
    handleDownloadCv,
    handleUpdateApplicationStatus,
    handleDeleteApplication,
    showAddJobModal,
    editingJobId,
    handleCreateJob,
    newJob,
    jobImageFile,
  } = props;

  return (
    <>
      <div className="space-y-6">
        <StatGrid stats={[
          { label: "Chờ duyệt đăng tin", value: employerRequestsList.filter((r: any) => r.status === "PENDING").length, icon: Clock, accent: "text-amber-600", bg: "bg-amber-50" },
          { label: "Tin đang tuyển", value: jobPostingsList.filter((j: any) => j.isActive !== false).length, icon: Briefcase, accent: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Tổng hồ sơ ATS", value: jobApplicants.length, icon: FileCheck, accent: "text-blue-600", bg: "bg-blue-50" },
          { label: "Đã tuyển (HIRED)", value: jobApplicants.filter((c: any) => c.status === "HIRED").length, icon: UserCheck, accent: "text-[#0F1C47]", bg: "bg-[#0F1C47]/5" },
        ]} />
      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(15,28,71,0.03),0_8px_24px_-12px_rgba(15,28,71,0.06)] p-7 lg:p-8 space-y-8">
        {/* Hàng đợi yêu cầu đăng tin từ Doanh nghiệp (role BUSINESS) — chờ Admin duyệt */}
        <div>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-black text-[#0F1C47] mb-1">Yêu Cầu Đăng Tin Chờ Duyệt ({employerRequestsList.filter((r: any) => r.status === "PENDING").length})</h2>
              <p className="text-xs text-gray-500">Doanh nghiệp gửi lên — xem xét rồi bấm "Xuất bản" để biên tập & tạo tin tuyển dụng thật (có ảnh)</p>
            </div>
            <button onClick={fetchEmployerRequestsList} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg" title="Tải lại">
              <RefreshCw className={`w-4 h-4 text-[#1B3A8F] ${employerRequestsLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {employerRequestsList.filter((r: any) => r.status === "PENDING").length === 0 ? (
            <p className="text-xs text-gray-400 italic">Không có yêu cầu nào đang chờ.</p>
          ) : (
            <div className="space-y-3">
              {employerRequestsList.filter((r: any) => r.status === "PENDING").map((req: any) => {
                const parsed = parseEmployerJobDescription(req.jobDescription || "");
                const isExpanded = expandedRequestId === req.id;
                return (
                  <div key={req.id} className="p-4 border border-amber-200 bg-amber-50/40 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-[#0F1C47] text-sm">{req.position}</h4>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">{req.status}</span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-3">
                          <span>Công ty: <strong>{req.companyName}</strong></span>
                          <span>•</span>
                          <span>Liên hệ: {req.phone} / {req.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                          className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 text-xs font-bold rounded-lg transition-colors"
                        >
                          {isExpanded ? "Ẩn Chi Tiết" : "Xem Chi Tiết"}
                        </button>
                        <button
                          onClick={() => handlePublishFromRequest(req)}
                          className="px-4 py-2 bg-[#C9973C] hover:bg-[#b3862f] text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          Xuất Bản Tin
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-amber-200 grid sm:grid-cols-2 gap-3 text-xs text-gray-700">
                        <div><span className="text-gray-400">Mô tả:</span> {parsed.description || "—"}</div>
                        <div><span className="text-gray-400">Yêu cầu:</span> {parsed.requirements || "—"}</div>
                        <div><span className="text-gray-400">Ngành nghề:</span> {parsed.industry || "—"}</div>
                        <div><span className="text-gray-400">Địa điểm:</span> {parsed.location || "—"}</div>
                        <div><span className="text-gray-400">Hình thức:</span> {parsed.workType || "—"}</div>
                        <div><span className="text-gray-400">Kinh nghiệm:</span> {parsed.experience || "—"}</div>
                        <div><span className="text-gray-400">Cấp bậc:</span> {parsed.level || "—"}</div>
                        <div><span className="text-gray-400">Bằng cấp:</span> {parsed.education || "—"}</div>
                        <div><span className="text-gray-400">Phúc lợi:</span> {parsed.benefits || "—"}</div>
                        <div><span className="text-gray-400">Mức lương:</span> {req.expectedSalary || "—"}</div>
                        <div><span className="text-gray-400">Địa chỉ trụ sở:</span> {parsed.address || "—"}</div>
                        <div><span className="text-gray-400">Quy mô công ty:</span> {parsed.companySize || "—"}</div>
                        <div className="sm:col-span-2"><span className="text-gray-400">Giới thiệu công ty:</span> {parsed.companyDesc || "—"}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Yêu cầu xem liên hệ ứng viên (BUSINESS gửi từ /tuyen-dung/tim-ung-vien) — duyệt mới lộ SĐT/email */}
        <div className="pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-black text-[#0F1C47] mb-1">
                Yêu Cầu Xem Liên Hệ Ứng Viên ({candidateIntroRequests.filter((r: any) => r.status === "PENDING").length} chờ duyệt)
              </h2>
              <p className="text-xs text-gray-500">Doanh nghiệp tìm thấy hồ sơ phù hợp và muốn liên hệ trực tiếp — duyệt để lộ SĐT/email cho đúng công ty đó.</p>
            </div>
            <button onClick={fetchCandidateIntroRequests} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg" title="Tải lại">
              <RefreshCw className={`w-4 h-4 text-[#1B3A8F] ${candidateIntroLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {candidateIntroRequests.filter((r: any) => r.status === "PENDING").length === 0 ? (
            <p className="text-xs text-gray-400 italic">Không có yêu cầu nào đang chờ.</p>
          ) : (
            <div className="space-y-3">
              {candidateIntroRequests.filter((r: any) => r.status === "PENDING").map((req: any) => (
                <div key={req.id} className="p-4 border border-amber-200 bg-amber-50/40 rounded-xl flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h4 className="font-bold text-[#0F1C47] text-sm">{req.candidateProfile?.fullName}</h4>
                      <span className="text-xs text-gray-500">→ {req.candidateProfile?.desiredPosition}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-3 flex-wrap">
                      <span>Công ty yêu cầu: <strong>{req.company?.name}</strong> (MST: {req.company?.taxCode})</span>
                      <span>•</span>
                      <span>Người gửi: {req.requestedBy?.fullName} ({req.requestedBy?.email})</span>
                    </div>
                    {req.note && <p className="text-xs text-gray-600 mt-1.5 italic">"{req.note}"</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleReviewCandidateIntroRequest(req.id, "APPROVED")}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Duyệt
                    </button>
                    <button
                      onClick={() => handleReviewCandidateIntroRequest(req.id, "REJECTED")}
                      className="px-4 py-2 bg-white hover:bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-lg transition-colors"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Job Postings Admin */}
        <div className="pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-black text-[#0F1C47] mb-1">Quản Lý Vị Trí Tuyển Dụng ({jobPostingsList.length})</h2>
              <p className="text-xs text-gray-500">Tin tuyển dụng thật đang hiển thị công khai tại /tuyen-dung</p>
            </div>
            <button
              onClick={() => { setEditingJobId(null); setPublishingFromRequestId(null); setNewJob(emptyJobForm); setJobImageFile(null); setShowAddJobModal(true); }}
              className="flex items-center gap-2 bg-[#0F1C47] hover:bg-[#1B3A8F] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#C9973C]" /> Đăng Tin Tuyển Dụng Mới
            </button>
          </div>

          {jobsLoading ? (
            <p className="text-xs text-gray-400">Đang tải...</p>
          ) : jobPostingsList.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Chưa có tin tuyển dụng nào được xuất bản.</p>
          ) : (
            <div className="space-y-3">
              {jobPostingsList.map((job: any) => (
                <div key={job.id} className="p-4 border border-gray-200 rounded-xl flex items-center gap-4 bg-white hover:border-[#1B3A8F]/30 transition-all">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#F4F6F9] border border-gray-100 shrink-0 flex items-center justify-center">
                    {job.imageUrl ? (
                      <Image src={`${API_ORIGIN}${job.imageUrl}`} alt={job.title} fill sizes="64px" className="object-cover" />
                    ) : (
                      <Briefcase className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-[#0F1C47] text-sm truncate">{job.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${job.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                        {job.isActive ? "Đang tuyển" : "Đã ẩn"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-4">
                      <span>Phòng: <strong>{job.department}</strong></span>
                      <span>•</span>
                      <span>Mức lương: <strong className="text-[#1B3A8F]">{job.salary || "—"}</strong></span>
                      <span>•</span>
                      <span>Địa điểm: {job.location || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleEditJobClick(job)} className="p-2 text-[#1B3A8F] hover:bg-blue-50 rounded-lg" title="Sửa">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => askConfirm(`Bạn có chắc chắn muốn xóa tin tuyển dụng "${job.title}"? Thao tác này không thể hoàn tác.`, () => handleDeleteJob(job.id))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Xóa">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Applicants ATS List */}
        <div className="pt-6 border-t border-gray-200">
          <h2 className="text-xl font-black text-[#0F1C47] mb-4">Danh Sách Ứng Viên Nộp CV ATS ({jobApplicants.length})</h2>
          {applicantsLoading ? (
            <p className="text-xs text-gray-400">Đang tải...</p>
          ) : jobApplicants.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Chưa có hồ sơ ứng tuyển nào.</p>
          ) : (
            <div className="space-y-4">
              {jobApplicants.map((cand: any) => (
                <div key={cand.id} className="p-5 border border-gray-200 rounded-xl flex items-center justify-between hover:border-[#1B3A8F]/30 transition-all bg-[#F8F9FA]">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-[#0F1C47] text-base">{cand.fullName || "—"}</h3>
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">
                        {cand.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#C9973C] font-bold mb-2">{cand.job?.title || "—"}</p>
                    <div className="text-xs text-gray-500 flex items-center gap-3">
                      <span>SĐT: {cand.phone}</span>
                      <span>•</span>
                      <span>Email: <strong className="text-gray-700">{cand.email}</strong></span>
                      <span>•</span>
                      <span>Ngày nộp: {cand.createdAt ? new Date(cand.createdAt).toLocaleDateString("vi-VN") : "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDownloadCv(cand.id, cand.fullName)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold"
                      title="Tải CV"
                    >
                      <FileCheck className="w-4 h-4" /> Tải CV
                    </button>
                    <select
                      value={cand.status}
                      onChange={(e) => handleUpdateApplicationStatus(cand.id, e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none"
                    >
                      <option value="NEW">Mới nộp</option>
                      <option value="REVIEWING">Đang duyệt CV</option>
                      <option value="INTERVIEW">Hẹn phỏng vấn</option>
                      <option value="HIRED">Đã trúng tuyển</option>
                      <option value="REJECTED">Từ chối</option>
                    </select>
                    <button
                      onClick={() => askConfirm(`Bạn có chắc chắn muốn xóa hồ sơ ứng tuyển của "${cand.fullName}"? Thao tác này không thể hoàn tác.`, () => handleDeleteApplication(cand.id))}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Xóa hồ sơ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* ═══ MODAL THÊM TIN TUYỂN DỤNG ═══ */}
      {showAddJobModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-auto shadow-2xl border border-gray-100 text-xs my-8">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-[#0F1C47]">{editingJobId ? "Sửa Tin Tuyển Dụng" : "Đăng Tin Tuyển Dụng Mới"}</h3>
              <button onClick={() => { setShowAddJobModal(false); setEditingJobId(null); }} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Vị Trí Tuyển Dụng *</label>
                <input
                  type="text"
                  required
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  placeholder="Ví dụ: Kiểm toán viên Senior..."
                  className="w-full border border-gray-200 p-3 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Ảnh Vị Trí Tuyển Dụng</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => setJobImageFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-200 p-2.5 rounded-lg outline-none bg-[#F8F9FA]"
                />
                {jobImageFile && <span className="text-[11px] text-[#1B3A8F] font-bold mt-1 block">{jobImageFile.name}</span>}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Phòng Ban *</label>
                  <select
                    value={newJob.department}
                    onChange={(e) => setNewJob({ ...newJob, department: e.target.value })}
                    className="w-full border border-gray-200 p-3 rounded-lg outline-none"
                  >
                    <option value="Kiểm toán">Khối Kiểm toán</option>
                    <option value="Thuế">Khối Tư vấn Thuế</option>
                    <option value="Kiểm toán XDCB">Kiểm toán XDCB</option>
                    <option value="Kế toán">Khối Kế toán</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Địa Điểm *</label>
                  <select
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    className="w-full border border-gray-200 p-3 rounded-lg outline-none"
                  >
                    <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="Bình Phước">Bình Phước</option>
                    <option value="Đắk Nông">Đắk Nông</option>
                    <option value="Hải Phòng">Hải Phòng</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Hình Thức *</label>
                  <select
                    value={newJob.type}
                    onChange={(e) => setNewJob({ ...newJob, type: e.target.value })}
                    className="w-full border border-gray-200 p-3 rounded-lg outline-none"
                  >
                    <option value="Toàn thời gian">Toàn thời gian</option>
                    <option value="Bán thời gian">Bán thời gian</option>
                    <option value="Thực tập">Thực tập</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Mức Lương</label>
                  <input
                    type="text"
                    value={newJob.salary}
                    onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })}
                    placeholder="15 - 25 triệu"
                    className="w-full border border-gray-200 p-3 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Hạn Nộp Hồ Sơ</label>
                  <input
                    type="date"
                    value={newJob.deadline}
                    onChange={(e) => setNewJob({ ...newJob, deadline: e.target.value })}
                    className="w-full border border-gray-200 p-3 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Mô Tả Công Việc *</label>
                <textarea
                  required
                  rows={3}
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  placeholder="Mô tả chi tiết công việc..."
                  className="w-full border border-gray-200 p-3 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Yêu Cầu Ứng Viên (mỗi dòng 1 gạch đầu dòng)</label>
                <textarea
                  rows={3}
                  value={newJob.requirements}
                  onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                  placeholder={"- Tốt nghiệp Đại học...\n- 2 năm kinh nghiệm..."}
                  className="w-full border border-gray-200 p-3 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Quyền Lợi (mỗi dòng 1 gạch đầu dòng)</label>
                <textarea
                  rows={3}
                  value={newJob.benefits}
                  onChange={(e) => setNewJob({ ...newJob, benefits: e.target.value })}
                  placeholder={"- Lương tháng 13...\n- Bảo hiểm đầy đủ..."}
                  className="w-full border border-gray-200 p-3 rounded-lg outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newJob.isActive}
                  onChange={(e) => setNewJob({ ...newJob, isActive: e.target.checked })}
                  className="rounded text-[#1B3A8F]"
                />
                <span className="font-bold text-gray-700">Hiển thị công khai ngay (Đang tuyển)</span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setShowAddJobModal(false); setEditingJobId(null); }} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg">
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2.5 bg-[#0F1C47] text-white font-bold rounded-lg">
                  {editingJobId ? "Lưu Thay Đổi" : "Xuất Bản Tin Tuyển Dụng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
