"use client";

import {
  Phone, AlertTriangle, Clock, CheckCircle2, XCircle, Plus, Search, Filter,
  UserCheck, Mail, MapPin, Building2, Eye, Edit, Trash2, X,
} from "lucide-react";
import { StatGrid } from "./shared";

/** Tab "Yêu Cầu Tư Vấn" (leads) + 3 modal (xem chi tiết / thêm mới / sửa trạng thái) — tách khỏi
 * app/admin/page.tsx để next/dynamic chỉ tải code tab này khi Admin thực sự bấm vào (xem giải
 * thích chung ở CompaniesTab.tsx). Modal "Xác Nhận Xóa" dùng chung toàn trang Admin nên VẪN ở
 * page.tsx, không thuộc về tab này. Nút "Tạo Công Ty" từ 1 lead đã ký hợp đồng dùng chung state
 * Companies (setNewCompany...) — VẪN sống ở page.tsx vì tab Companies cũng cần. */
export default function LeadsTab(props: any) {
  const {
    serviceRequests,
    setShowAddLeadModal,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    loading,
    filteredServiceRequests,
    setEditingCompanyId,
    setNewCompany,
    emptyCompanyForm,
    setShowAddCompanyModal,
    setShowViewLeadModal,
    setShowEditLeadModal,
    askConfirm,
    handleDeleteLead,
    showViewLeadModal,
    showAddLeadModal,
    handleCreateLead,
    newLead,
    setNewLead,
    showEditLeadModal,
    handleUpdateLeadStatus,
  } = props;

  return (
    <>
      <div className="space-y-6">
        {/* Stat cards — tổng quan nhanh theo trạng thái */}
        <StatGrid cols={5} stats={[
          { label: "Tổng số", value: serviceRequests.length, icon: Phone, accent: "text-[#0F1C47]", bg: "bg-[#0F1C47]/5" },
          { label: "Mới tiếp nhận", value: serviceRequests.filter((r: any) => r.status === "NEW").length, icon: AlertTriangle, accent: "text-blue-600", bg: "bg-blue-50" },
          { label: "Đã báo giá", value: serviceRequests.filter((r: any) => r.status === "CONTACTED" || r.status === "QUOTED").length, icon: Clock, accent: "text-amber-600", bg: "bg-amber-50" },
          { label: "Đã ký hợp đồng", value: serviceRequests.filter((r: any) => r.status === "SIGNED").length, icon: CheckCircle2, accent: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Từ chối", value: serviceRequests.filter((r: any) => r.status === "REJECTED").length, icon: XCircle, accent: "text-red-600", bg: "bg-red-50" },
        ]} />

        <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(15,28,71,0.03),0_8px_24px_-12px_rgba(15,28,71,0.06)] p-7 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-black text-[#0F1C47] mb-1">Danh Sách Yêu Cầu Báo Giá & Tư Vấn Chi Tiết</h2>
              <p className="text-xs text-gray-500">Quản lý thêm, sửa trạng thái, xem nội dung chi tiết hoặc xóa khỏi PostgreSQL</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddLeadModal(true)}
                className="flex items-center gap-2 bg-[#C9973C] hover:bg-[#b38531] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" /> Thêm Yêu Cầu Mới
              </button>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#F8F9FA] p-4 rounded-xl border border-gray-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên công ty, SĐT, email, dịch vụ..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#1B3A8F]"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="NEW">Mới tiếp nhận</option>
                <option value="CONTACTED">Đã liên hệ báo giá</option>
                <option value="QUOTED">Đã báo giá</option>
                <option value="SIGNED">Đã ký hợp đồng</option>
                <option value="REJECTED">Từ chối</option>
              </select>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <p className="text-xs text-gray-400 italic py-16 text-center">Đang tải...</p>
          ) : filteredServiceRequests.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Phone className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-400">Không tìm thấy dữ liệu yêu cầu tư vấn phù hợp.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredServiceRequests.map((req: any) => (
                <div key={req.id} className="flex flex-col lg:flex-row lg:items-center gap-4 p-5 border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all">
                  <div className="w-11 h-11 rounded-full bg-[#0F1C47] text-white flex items-center justify-center font-black text-sm shrink-0">
                    {req.companyName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black text-[#0F1C47] text-sm">{req.companyName}</span>
                      {req.taxCode && <span className="text-[10px] font-mono text-gray-400">MST: {req.taxCode}</span>}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${req.statusColor}`}>{req.statusLabel}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1"><UserCheck className="w-3 h-3 text-gray-400" /> {req.contactName}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" /> {req.phone}</span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" /> {req.email}</span>
                      {req.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" /> {req.address}</span>}
                    </div>
                    <div className="text-xs text-gray-600 font-semibold mt-1.5">{req.service}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-1">{req.id} · {req.date}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
                    {req.status === "SIGNED" && (
                      <button
                        onClick={() => {
                          setEditingCompanyId(null);
                          setNewCompany({ ...emptyCompanyForm, name: req.companyName || "", taxCode: req.taxCode || "", address: req.address || "", phone: req.phone || "", email: req.email || "" });
                          setShowAddCompanyModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors text-xs font-bold"
                        title="Tạo hồ sơ Công ty từ lead đã ký hợp đồng này — tự điền tên/SĐT/email"
                      >
                        <Building2 className="w-3.5 h-3.5" /> Tạo Công Ty
                      </button>
                    )}
                    <button onClick={() => setShowViewLeadModal(req)} className="p-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors" title="Xem chi tiết">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowEditLeadModal(req)} className="p-2.5 bg-[#0F1C47] text-white hover:bg-[#1B3A8F] rounded-lg transition-colors" title="Sửa trạng thái">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => askConfirm(`Bạn có chắc chắn muốn xóa dữ liệu của "${req.companyName}"? Thao tác này không thể hoàn tác.`, () => handleDeleteLead(req.realId || req.id))} className="p-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg transition-colors" title="Xóa dữ liệu">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODAL XEM CHI TIẾT YÊU CẦU TƯ VẤN ═══ */}
      {showViewLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-gray-100 text-xs">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-[#0F1C47]">Chi Tiết Yêu Cầu Báo Giá {showViewLeadModal.id}</h3>
              <button onClick={() => setShowViewLeadModal(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-[#F8F9FA] p-4 rounded-xl border border-gray-100 space-y-2">
                <div className="text-xs text-gray-400 uppercase font-bold">Doanh Nghiệp</div>
                <div className="text-base font-black text-[#0F1C47]">{showViewLeadModal.companyName}</div>
                {showViewLeadModal.taxCode && <div className="text-xs text-gray-600">MST: <strong className="font-mono text-gray-800">{showViewLeadModal.taxCode}</strong></div>}
                <div className="text-xs text-gray-600">Người đại diện: <strong className="text-gray-800">{showViewLeadModal.contactName}</strong></div>
                <div className="text-xs text-gray-600">SĐT: <strong className="text-[#1B3A8F] font-mono">{showViewLeadModal.phone}</strong></div>
                <div className="text-xs text-gray-600">Email: <strong>{showViewLeadModal.email}</strong></div>
                {showViewLeadModal.address && <div className="text-xs text-gray-600">Địa chỉ: <strong className="text-gray-800">{showViewLeadModal.address}</strong></div>}
              </div>

              <div>
                <div className="text-xs text-gray-400 uppercase font-bold mb-1">Gói Dịch Vụ Đăng Ký</div>
                <div className="p-3 bg-blue-50 text-[#1B3A8F] font-bold rounded-lg border border-blue-200">{showViewLeadModal.service}</div>
              </div>

              <div>
                <div className="text-xs text-gray-400 uppercase font-bold mb-1">Nội Dung Ghi Chú Chi Tiết</div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-gray-700 leading-relaxed font-normal">
                  {showViewLeadModal.message}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button onClick={() => setShowViewLeadModal(null)} className="px-6 py-2.5 bg-[#0F1C47] text-white font-bold rounded-lg">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL THÊM YÊU CẦU TƯ VẤN ═══ */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-gray-100 text-xs">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-[#0F1C47]">Thêm Yêu Cầu Báo Giá & Tư Vấn Mới</h3>
              <button onClick={() => setShowAddLeadModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Tên Doanh Nghiệp *</label>
                <input
                  type="text"
                  required
                  value={newLead.companyName}
                  onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
                  placeholder="Công ty TNHH/CP..."
                  className="w-full border border-gray-200 p-3 rounded-lg outline-none focus:border-[#1B3A8F]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Họ & Tên Người Liên Hệ *</label>
                  <input
                    type="text"
                    required
                    value={newLead.contactName}
                    onChange={(e) => setNewLead({ ...newLead, contactName: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="w-full border border-gray-200 p-3 rounded-lg outline-none focus:border-[#1B3A8F]"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Số Điện Thoại *</label>
                  <input
                    type="tel"
                    required
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="0901234567"
                    className="w-full border border-gray-200 p-3 rounded-lg outline-none focus:border-[#1B3A8F]"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  placeholder="email@company.com"
                  className="w-full border border-gray-200 p-3 rounded-lg outline-none focus:border-[#1B3A8F]"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Dịch Vụ Yêu Cầu *</label>
                <select
                  value={newLead.service}
                  onChange={(e) => setNewLead({ ...newLead, service: e.target.value })}
                  className="w-full border border-gray-200 p-3 rounded-lg outline-none focus:border-[#1B3A8F]"
                >
                  <option value="Kiểm toán Báo cáo tài chính độc lập">Kiểm toán Báo cáo tài chính độc lập</option>
                  <option value="Dịch vụ Kế toán trọn gói">Dịch vụ Kế toán trọn gói & Sổ sách</option>
                  <option value="Tư vấn Thuế & Lập hồ sơ Chuyển giá">Tư vấn Thuế & Lập hồ sơ Chuyển giá</option>
                  <option value="Thành lập Doanh nghiệp & Tái cấu trúc">Thành lập Doanh nghiệp & Tái cấu trúc</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddLeadModal(false)} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg">
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2.5 bg-[#0F1C47] text-white font-bold rounded-lg hover:bg-[#1B3A8F]">
                  Lưu Yêu Cầu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL SỬA TRẠNG THÁI YÊU CẦU TƯ VẤN ═══ */}
      {showEditLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 text-xs">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-[#0F1C47]">Cập Nhật Trạng Thái {showEditLeadModal.id}</h3>
              <button onClick={() => setShowEditLeadModal(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-bold text-[#0F1C47] text-sm">{showEditLeadModal.companyName}</p>
                <p className="text-gray-500">{showEditLeadModal.contactName} • {showEditLeadModal.phone}</p>
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-2">Chọn Trạng Thái Mới *</label>
                <div className="space-y-2">
                  {[
                    { code: "NEW", label: "Mới tiếp nhận" },
                    { code: "CONTACTED", label: "Đã liên hệ báo giá" },
                    { code: "QUOTED", label: "Đã báo giá" },
                    { code: "SIGNED", label: "Đã ký hợp đồng" },
                    { code: "REJECTED", label: "Từ chối / Không tiếp tục" },
                  ].map((st) => (
                    <button
                      key={st.code}
                      onClick={() => handleUpdateLeadStatus(showEditLeadModal.realId || showEditLeadModal.id, st.code)}
                      className={`w-full text-left p-3 rounded-xl border font-bold transition-all ${
                        showEditLeadModal.status === st.code
                          ? "bg-[#0F1C47] text-white border-[#0F1C47]"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
