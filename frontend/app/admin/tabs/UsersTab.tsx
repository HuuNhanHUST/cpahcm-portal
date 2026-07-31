"use client";

import { Users, ShieldCheck, Building2, UserX, RefreshCw, Search, Trash2, X } from "lucide-react";
import { StatGrid, Pagination } from "./shared";

/** Tab "Người Dùng & Phân Quyền" + modal gán công ty cho user BUSINESS — tách khỏi
 * app/admin/page.tsx để next/dynamic chỉ tải code tab này khi Admin thực sự bấm vào (xem giải
 * thích chung ở CompaniesTab.tsx). Modal gán công ty dùng chung state Companies (companiesList,
 * newCompany...) — VẪN sống ở page.tsx vì tab Companies cũng cần, chỉ truyền qua props ở đây. */
export default function UsersTab(props: any) {
  const {
    usersList,
    fetchUsers,
    usersLoading,
    usersSearch,
    setUsersSearch,
    setUsersPage,
    filteredUsersList,
    pagedUsersList,
    openAssignCompanyModal,
    handleUpdateUserRole,
    handleToggleUserStatus,
    askConfirm,
    handleDeleteUser,
    usersPage,
    assigningCompanyUser,
    setAssigningCompanyUser,
    assignCompanyCreating,
    setAssignCompanyCreating,
    assignCompanySelection,
    setAssignCompanySelection,
    companiesList,
    handleAssignCompany,
    handleCreateAndAssignCompany,
    newCompany,
    setNewCompany,
  } = props;

  return (
    <>
      <div className="space-y-6">
        <StatGrid stats={[
          { label: "Tổng tài khoản", value: usersList.length, icon: Users, accent: "text-[#0F1C47]", bg: "bg-[#0F1C47]/5" },
          { label: "Admin", value: usersList.filter((u: any) => u.role === "ADMIN").length, icon: ShieldCheck, accent: "text-amber-600", bg: "bg-amber-50" },
          { label: "Doanh nghiệp", value: usersList.filter((u: any) => u.role === "BUSINESS").length, icon: Building2, accent: "text-blue-600", bg: "bg-blue-50" },
          { label: "Đã khóa", value: usersList.filter((u: any) => !u.isActive).length, icon: UserX, accent: "text-red-600", bg: "bg-red-50" },
        ]} />
      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(15,28,71,0.03),0_8px_24px_-12px_rgba(15,28,71,0.06)] p-7 lg:p-8">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-[#0F1C47] mb-1">Quản Lý Người Dùng & Phân Quyền RBAC ({usersList.length})</h2>
            <p className="text-xs text-gray-500">Chuyển đổi Role, khóa tài khoản hoặc xóa khỏi PostgreSQL Database — tài khoản được tạo qua trang Đăng ký, Admin không tạo trực tiếp</p>
          </div>
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 bg-[#0F1C47] hover:bg-[#1B3A8F] text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#C9973C] ${usersLoading ? "animate-spin" : ""}`} /> Làm mới
          </button>
        </div>

        <div className="relative mb-5">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={usersSearch}
            onChange={(e) => { setUsersSearch(e.target.value); setUsersPage(1); }}
            placeholder="Tìm theo tên hoặc email..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1B3A8F]"
          />
        </div>

        {usersLoading ? (
          <p className="text-xs text-gray-400 italic">Đang tải...</p>
        ) : filteredUsersList.length === 0 ? (
          <p className="text-xs text-gray-400 italic">{usersSearch ? "Không tìm thấy người dùng phù hợp." : "Chưa có người dùng nào."}</p>
        ) : (
        <>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#F8F9FA] text-[#0F1C47] uppercase text-[10px] tracking-wider font-bold border-b border-gray-200">
              <tr>
                <th className="py-4 px-4">Tài Khoản Email</th>
                <th className="py-4 px-4">Họ & Tên</th>
                <th className="py-4 px-4">Số Điện Thoại</th>
                <th className="py-4 px-4">Công Ty</th>
                <th className="py-4 px-4">Quyền Hạn (Role)</th>
                <th className="py-4 px-4">Trạng Thái</th>
                <th className="py-4 px-4 text-right">Thao Tác Users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedUsersList.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-4 px-4 font-bold text-[#0F1C47]">{u.email}</td>
                  <td className="py-4 px-4 font-medium text-gray-800">{u.fullName}</td>
                  <td className="py-4 px-4 font-mono text-gray-500">{u.phone || "—"}</td>
                  <td className="py-4 px-4">
                    {u.role === "BUSINESS" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">{u.company?.name || "—"}</span>
                        <button
                          onClick={() => openAssignCompanyModal(u)}
                          className="text-[10px] font-bold text-[#1B3A8F] hover:underline shrink-0"
                        >
                          {u.company ? "Đổi" : "Gán công ty"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border outline-none ${u.role === "ADMIN" ? "bg-amber-50 text-[#0F1C47] border-amber-300" : "bg-gray-100 text-gray-700 border-gray-300"}`}
                    >
                      <option value="MEMBER">MEMBER</option>
                      <option value="BUSINESS">BUSINESS</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${u.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {u.isActive ? "Hoạt động" : "Đã khóa"}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleUserStatus(u.id)}
                        className={`p-2 rounded-lg text-[11px] font-bold border ${u.isActive ? "bg-red-50 text-red-600 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`}
                      >
                        {u.isActive ? "Khóa" : "Mở khóa"}
                      </button>
                      <button
                        onClick={() => askConfirm(`Bạn có chắc chắn muốn xóa tài khoản "${u.fullName || u.email}"? Thao tác này không thể hoàn tác.`, () => handleDeleteUser(u.id))}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        title="Xóa tài khoản"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={usersPage} totalItems={filteredUsersList.length} onChange={setUsersPage} />
        </>
        )}
      </div>
      </div>

      {/* ═══ MODAL GÁN CÔNG TY CHO USER (tab Users) ═══ */}
      {assigningCompanyUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 text-xs">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-[#0F1C47]">Gán Công Ty — {assigningCompanyUser.email}</h3>
              <button onClick={() => setAssigningCompanyUser(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!assignCompanyCreating ? (
              <div className="space-y-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1.5">Chọn công ty có sẵn</label>
                  <select
                    value={assignCompanySelection}
                    onChange={(e) => setAssignCompanySelection(e.target.value)}
                    className="w-full border border-gray-200 p-2.5 rounded-lg outline-none"
                  >
                    <option value="">— Chưa gán —</option>
                    {companiesList.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.taxCode})</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setAssignCompanyCreating(true)}
                  className="text-[#1B3A8F] font-bold hover:underline"
                >
                  + Tạo công ty mới
                </button>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setAssigningCompanyUser(null)} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg">Hủy</button>
                  <button
                    type="button"
                    onClick={() => handleAssignCompany(assignCompanySelection || null)}
                    className="px-6 py-2.5 bg-[#0F1C47] text-white font-bold rounded-lg"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateAndAssignCompany} className="space-y-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1.5">Mã Số Thuế *</label>
                  <input required value={newCompany.taxCode} onChange={(e) => setNewCompany({ ...newCompany, taxCode: e.target.value })} placeholder="0312345678" className="w-full border border-gray-200 p-2.5 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1.5">Tên Công Ty *</label>
                  <input required value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} className="w-full border border-gray-200 p-2.5 rounded-lg outline-none" />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setAssignCompanyCreating(false)} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg">Quay lại</button>
                  <button type="submit" className="px-6 py-2.5 bg-[#0F1C47] text-white font-bold rounded-lg">Tạo & Gán</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
