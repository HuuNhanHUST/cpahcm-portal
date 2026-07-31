"use client";

import dynamic from "next/dynamic";
import { Settings, CheckCircle2, EyeOff, Filter, Plus, Search, Edit, Trash2, X } from "lucide-react";
import { StatGrid, Pagination } from "./shared";
import DynamicListEditor from "../../../components/DynamicListEditor";

const RichTextEditor = dynamic(() => import("../../../components/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="w-full h-40 bg-[#F8F9FA] border border-gray-200 rounded-sm animate-pulse" />,
});

const SERVICE_CATEGORIES = ["Kế toán", "Kiểm toán", "Thuế", "Doanh nghiệp"];

/** Tab "Quản Lý Dịch Vụ" + modal thêm/sửa dịch vụ — tách khỏi app/admin/page.tsx để next/dynamic
 * chỉ tải code tab này (gồm cả TipTap RichTextEditor) khi Admin thực sự bấm vào (xem giải thích
 * chung ở CompaniesTab.tsx). State/handler vẫn sống ở page.tsx. */
export default function ServicesTab(props: any) {
  const {
    servicesList,
    setEditingServiceId,
    setNewService,
    emptyServiceForm,
    setServiceFeatures,
    setServiceDeliverables,
    setServiceImageFile,
    setShowAddServiceModal,
    servicesSearch,
    setServicesSearch,
    setServicesPage,
    servicesLoading,
    filteredServicesList,
    pagedServicesList,
    handleEditServiceClick,
    askConfirm,
    handleDeleteService,
    servicesPage,
    showAddServiceModal,
    editingServiceId,
    handleCreateService,
    newService,
    serviceImageFile,
    serviceFeatures,
    serviceDeliverables,
  } = props;

  return (
    <>
      <div className="space-y-6">
        <StatGrid stats={[
          { label: "Tổng dịch vụ", value: servicesList.length, icon: Settings, accent: "text-[#0F1C47]", bg: "bg-[#0F1C47]/5" },
          { label: "Đang hiển thị", value: servicesList.filter((s: any) => s.isActive !== false).length, icon: CheckCircle2, accent: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Đã ẩn", value: servicesList.filter((s: any) => s.isActive === false).length, icon: EyeOff, accent: "text-gray-500", bg: "bg-gray-100" },
          { label: "Danh mục", value: new Set(servicesList.map((s: any) => s.category)).size, icon: Filter, accent: "text-blue-600", bg: "bg-blue-50" },
        ]} />
      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(15,28,71,0.03),0_8px_24px_-12px_rgba(15,28,71,0.06)] p-7 lg:p-8">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-[#0F1C47] mb-1">Quản Lý Dịch Vụ ({servicesList.length})</h2>
            <p className="text-xs text-gray-500">Nội dung đang hiển thị công khai tại /dich-vu (chỉ dịch vụ isActive=true)</p>
          </div>
          <button
            onClick={() => { setEditingServiceId(null); setNewService(emptyServiceForm); setServiceFeatures([""]); setServiceDeliverables([""]); setServiceImageFile(null); setShowAddServiceModal(true); }}
            className="flex items-center gap-2 bg-[#C9973C] hover:bg-[#b38531] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Thêm Dịch Vụ Mới
          </button>
        </div>

        <div className="relative mb-5">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={servicesSearch}
            onChange={(e) => { setServicesSearch(e.target.value); setServicesPage(1); }}
            placeholder="Tìm theo tên dịch vụ..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1B3A8F]"
          />
        </div>

        {servicesLoading ? (
          <p className="text-xs text-gray-400 italic">Đang tải...</p>
        ) : filteredServicesList.length === 0 ? (
          <p className="text-xs text-gray-400 italic">{servicesSearch ? "Không tìm thấy dịch vụ phù hợp." : "Chưa có dịch vụ nào."}</p>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pagedServicesList.map((s: any) => (
              <div key={s.id} className="p-6 border border-gray-200 rounded-2xl bg-white shadow-sm flex flex-col justify-between hover:border-[#1B3A8F]/40 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold text-[#C9973C] bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">{s.category}</span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${s.isActive !== false ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                      {s.isActive !== false ? "Đang hiển thị" : "Đã ẩn"}
                    </span>
                  </div>
                  <h3 className="font-bold text-[#0F1C47] text-base mb-2">{s.title}</h3>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">{s.shortDesc}</p>
                  <p className="text-[11px] text-gray-400 mb-4">{s.features?.length || 0} features • {s.deliverables?.length || 0} deliverables</p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                  <button onClick={() => handleEditServiceClick(s)} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="Sửa">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => askConfirm(`Bạn có chắc chắn muốn xóa dịch vụ "${s.title}"? Thao tác này không thể hoàn tác.`, () => handleDeleteService(s.id))} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Xóa">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={servicesPage} totalItems={filteredServicesList.length} onChange={setServicesPage} />
          </>
        )}
      </div>
      </div>

      {/* ═══ MODAL THÊM/SỬA DỊCH VỤ ═══ */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-3xl w-full mx-auto shadow-2xl border border-gray-100 text-xs my-8">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-[#0F1C47]">{editingServiceId ? "Sửa Dịch Vụ" : "Thêm Dịch Vụ Mới"}</h3>
              <button onClick={() => { setShowAddServiceModal(false); setEditingServiceId(null); }} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateService} className="space-y-4">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Tiêu Đề Dịch Vụ *</label>
                <input type="text" required value={newService.title} onChange={(e) => setNewService({ ...newService, title: e.target.value })} placeholder="Dịch vụ Kế toán Trọn gói" className="w-full border border-gray-200 p-3 rounded-lg outline-none" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Slug URL (để trống sẽ tự tạo)</label>
                  <input type="text" value={newService.slug} onChange={(e) => setNewService({ ...newService, slug: e.target.value })} className="w-full border border-gray-200 p-3 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Chuyên Mục *</label>
                  <select value={newService.category} onChange={(e) => setNewService({ ...newService, category: e.target.value })} className="w-full border border-gray-200 p-3 rounded-lg outline-none">
                    {SERVICE_CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Tag (Phổ biến nhất...)</label>
                  <input type="text" value={newService.tag} onChange={(e) => setNewService({ ...newService, tag: e.target.value })} className="w-full border border-gray-200 p-3 rounded-lg outline-none" />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Ảnh Cover</label>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setServiceImageFile(e.target.files?.[0] || null)} className="w-full border border-gray-200 p-2.5 rounded-lg outline-none bg-[#F8F9FA]" />
                {serviceImageFile && <span className="text-[11px] text-[#1B3A8F] font-bold mt-1 block">{serviceImageFile.name}</span>}
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Mô Tả Ngắn (card danh sách) *</label>
                <textarea required rows={2} value={newService.shortDesc} onChange={(e) => setNewService({ ...newService, shortDesc: e.target.value })} className="w-full border border-gray-200 p-3 rounded-lg outline-none" />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Nội Dung Chi Tiết (Rich Text)</label>
                <RichTextEditor value={newService.longDescription} onChange={(html: string) => setNewService({ ...newService, longDescription: html })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-2">Gói Dịch Vụ Bao Gồm *</label>
                  <DynamicListEditor items={serviceFeatures} onChange={setServiceFeatures} placeholder="VD: Thiết lập sổ sách kế toán" />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-2">Kết Quả Nhận Được *</label>
                  <DynamicListEditor items={serviceDeliverables} onChange={setServiceDeliverables} placeholder="VD: Báo cáo tài chính cuối năm" />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newService.isActive} onChange={(e) => setNewService({ ...newService, isActive: e.target.checked })} className="rounded text-[#1B3A8F]" />
                <span className="font-bold text-gray-700">Hiển thị công khai ngay</span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setShowAddServiceModal(false); setEditingServiceId(null); }} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg">
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2.5 bg-[#C9973C] text-white font-bold rounded-lg hover:bg-[#b38531]">
                  {editingServiceId ? "Lưu Thay Đổi" : "Thêm Dịch Vụ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
