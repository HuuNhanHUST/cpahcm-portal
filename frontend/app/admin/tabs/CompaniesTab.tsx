"use client";

import { Building2, Users, ClipboardCheck, CheckCircle2, XCircle, Plus, Search, Edit, Trash2, X } from "lucide-react";
import { StatGrid, Pagination } from "./shared";

/** Tab "Quản Lý Công Ty" + modal thêm/sửa công ty — tách khỏi app/admin/page.tsx (vốn dài hơn
 * 4000 dòng, gộp cả 9 tab quản trị vào 1 file) để next/dynamic chỉ tải code của tab này khi Admin
 * thực sự bấm vào, thay vì gộp cứng vào bundle chính của trang Admin.
 *
 * State/handler (companiesList, fetchCompanies, newCompany...) VẪN sống ở page.tsx vì cùng được
 * dùng chung bởi tab Users (gán công ty cho tài khoản BUSINESS) và tab Leads (tạo công ty từ yêu
 * cầu tư vấn đã duyệt) — chỉ phần JSX hiển thị của tab này được tách ra, nhận toàn bộ qua props. */
export default function CompaniesTab(props: any) {
  const {
    companiesList,
    linkRequestsList,
    handleReviewLinkRequest,
    setEditingCompanyId,
    setNewCompany,
    emptyCompanyForm,
    setShowAddCompanyModal,
    companiesSearch,
    setCompaniesSearch,
    setCompaniesPage,
    companiesLoading,
    filteredCompaniesList,
    pagedCompaniesList,
    handleEditCompanyClick,
    askConfirm,
    handleDeleteCompany,
    companiesPage,
    showAddCompanyModal,
    editingCompanyId,
    handleSaveCompany,
    newCompany,
  } = props;

  return (
    <>
      <div className="space-y-6">
        <StatGrid cols={3} stats={[
          { label: "Tổng công ty", value: companiesList.length, icon: Building2, accent: "text-[#0F1C47]", bg: "bg-[#0F1C47]/5" },
          { label: "Tổng users liên kết", value: companiesList.reduce((sum: number, c: any) => sum + (c._count?.users || 0), 0), icon: Users, accent: "text-blue-600", bg: "bg-blue-50" },
          { label: "Tổng chứng từ", value: companiesList.reduce((sum: number, c: any) => sum + (c._count?.documents || 0), 0), icon: ClipboardCheck, accent: "text-emerald-600", bg: "bg-emerald-50" },
        ]} />
      {linkRequestsList.some((r: any) => r.status === "PENDING") && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(15,28,71,0.03),0_8px_24px_-12px_rgba(15,28,71,0.06)] p-7 lg:p-8">
          <div className="mb-5 pb-4 border-b border-gray-100">
            <h2 className="text-xl font-black text-[#0F1C47] mb-1">
              Yêu Cầu Liên Kết Công Ty ({linkRequestsList.filter((r: any) => r.status === "PENDING").length})
            </h2>
            <p className="text-xs text-gray-500">Tài khoản BUSINESS tự gửi qua trang "Tài Khoản Của Tôi" — duyệt để tự động tạo/gán Công ty theo mã số thuế.</p>
          </div>
          <div className="space-y-3">
            {linkRequestsList.filter((r: any) => r.status === "PENDING").map((r: any) => (
              <div key={r.id} className="flex items-center justify-between gap-4 p-4 bg-[#F8F9FA] rounded-xl">
                <div className="min-w-0">
                  <div className="font-bold text-[#0F1C47] text-sm">{r.companyName} <span className="font-mono text-gray-400 text-xs">· MST: {r.taxCode}</span></div>
                  <div className="text-xs text-gray-500 mt-0.5">Tài khoản: {r.user?.fullName || r.user?.email} {r.note && `· Ghi chú: ${r.note}`}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReviewLinkRequest(r.id, "APPROVED")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Duyệt
                  </button>
                  <button
                    onClick={() => handleReviewLinkRequest(r.id, "REJECTED")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg"
                  >
                    <XCircle className="w-4 h-4" /> Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(15,28,71,0.03),0_8px_24px_-12px_rgba(15,28,71,0.06)] p-7 lg:p-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-[#0F1C47] mb-1">Quản Lý Công Ty Khách Hàng ({companiesList.length})</h2>
            <p className="text-xs text-gray-500">Công ty được gán cho tài khoản BUSINESS ở tab Users để dùng Cổng Khách Hàng</p>
          </div>
          <button
            onClick={() => { setEditingCompanyId(null); setNewCompany(emptyCompanyForm); setShowAddCompanyModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0F1C47] hover:bg-[#1B3A8F] text-white text-xs font-bold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm Công Ty
          </button>
        </div>

        <div className="relative mb-5">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={companiesSearch}
            onChange={(e) => { setCompaniesSearch(e.target.value); setCompaniesPage(1); }}
            placeholder="Tìm theo tên công ty hoặc mã số thuế..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1B3A8F]"
          />
        </div>

        {companiesLoading ? (
          <p className="text-xs text-gray-400 italic">Đang tải...</p>
        ) : filteredCompaniesList.length === 0 ? (
          <p className="text-xs text-gray-400 italic">{companiesSearch ? "Không tìm thấy công ty phù hợp." : "Chưa có công ty nào."}</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#F8F9FA] text-[#0F1C47] uppercase text-[10px] tracking-wider font-bold border-b border-gray-200">
                <tr>
                  <th className="py-4 px-4">Mã Số Thuế</th>
                  <th className="py-4 px-4">Tên Công Ty</th>
                  <th className="py-4 px-4">Liên Hệ</th>
                  <th className="py-4 px-4">Users</th>
                  <th className="py-4 px-4">Chứng Từ</th>
                  <th className="py-4 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedCompaniesList.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-4 font-mono text-gray-500">{c.taxCode}</td>
                    <td className="py-4 px-4 font-bold text-[#0F1C47]">{c.name}</td>
                    <td className="py-4 px-4 text-gray-600">{c.phone || c.email || "—"}</td>
                    <td className="py-4 px-4">{c._count?.users ?? 0}</td>
                    <td className="py-4 px-4">{c._count?.documents ?? 0}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEditCompanyClick(c)} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg" title="Sửa">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => askConfirm(`Bạn có chắc chắn muốn xóa công ty "${c.name}"? Thao tác này không thể hoàn tác.`, () => handleDeleteCompany(c.id))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={companiesPage} totalItems={filteredCompaniesList.length} onChange={setCompaniesPage} />
          </>
        )}
      </div>
      </div>

      {/* ═══ MODAL THÊM / SỬA CÔNG TY ═══ */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-[#0F1C47]">{editingCompanyId ? "Sửa Công Ty" : "Thêm Công Ty"}</h3>
              <button onClick={() => { setShowAddCompanyModal(false); setEditingCompanyId(null); }} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCompany} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1.5">Mã Số Thuế *</label>
                <input required value={newCompany.taxCode} onChange={(e) => setNewCompany({ ...newCompany, taxCode: e.target.value })} placeholder="0312345678" className="w-full border border-gray-200 p-2.5 rounded-lg outline-none focus:border-[#1B3A8F]" />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1.5">Tên Công Ty *</label>
                <input required value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} className="w-full border border-gray-200 p-2.5 rounded-lg outline-none focus:border-[#1B3A8F]" />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1.5">Địa Chỉ</label>
                <input value={newCompany.address} onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })} className="w-full border border-gray-200 p-2.5 rounded-lg outline-none focus:border-[#1B3A8F]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1.5">Điện Thoại</label>
                  <input value={newCompany.phone} onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })} placeholder="0912345678" className="w-full border border-gray-200 p-2.5 rounded-lg outline-none focus:border-[#1B3A8F]" />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1.5">Email</label>
                  <input type="email" value={newCompany.email} onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })} className="w-full border border-gray-200 p-2.5 rounded-lg outline-none focus:border-[#1B3A8F]" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setShowAddCompanyModal(false); setEditingCompanyId(null); }} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg">Hủy</button>
                <button type="submit" className="px-6 py-2.5 bg-[#0F1C47] text-white font-bold rounded-lg">{editingCompanyId ? "Lưu Thay Đổi" : "Tạo Công Ty"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
