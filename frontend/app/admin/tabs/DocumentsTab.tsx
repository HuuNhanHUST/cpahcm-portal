"use client";

import { Clock, RefreshCw, CheckCircle2, XCircle, Search, Download, Trash2, X } from "lucide-react";
import { StatGrid, Pagination } from "./shared";

/** Tab "Chứng Từ Khách Hàng" + modal nhập lý do từ chối — tách khỏi app/admin/page.tsx để
 * next/dynamic chỉ tải code tab này khi Admin thực sự bấm vào (xem giải thích chung ở
 * CompaniesTab.tsx). State/handler vẫn sống ở page.tsx, chỉ JSX hiển thị được tách ra. */
export default function DocumentsTab(props: any) {
  const {
    documentsList,
    documentStatusFilter,
    setDocumentStatusFilter,
    fetchDocuments,
    documentsSearch,
    setDocumentsSearch,
    setDocumentsPage,
    documentsLoading,
    filteredDocumentsList,
    pagedDocumentsList,
    uploadingResultFileId,
    handleRemoveDocumentResultFile,
    handleAttachDocumentResultFile,
    setRejectingDocument,
    setRejectReasonInput,
    handleUpdateDocumentStatus,
    handleDownloadDocument,
    askConfirm,
    handleDeleteDocument,
    documentsPage,
    rejectingDocument,
    rejectReasonInput,
    handleConfirmReject,
  } = props;

  return (
    <>
      <div className="space-y-6">
        <StatGrid stats={[
          { label: "Chờ xử lý", value: documentsList.filter((d: any) => d.status === "PENDING").length, icon: Clock, accent: "text-amber-600", bg: "bg-amber-50" },
          { label: "Đang xử lý", value: documentsList.filter((d: any) => d.status === "PROCESSING").length, icon: RefreshCw, accent: "text-blue-600", bg: "bg-blue-50" },
          { label: "Hoàn tất", value: documentsList.filter((d: any) => d.status === "COMPLETED").length, icon: CheckCircle2, accent: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Từ chối", value: documentsList.filter((d: any) => d.status === "REJECTED").length, icon: XCircle, accent: "text-red-600", bg: "bg-red-50" },
        ]} />
      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(15,28,71,0.03),0_8px_24px_-12px_rgba(15,28,71,0.06)] p-7 lg:p-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-black text-[#0F1C47] mb-1">Chứng Từ Khách Hàng ({documentsList.length})</h2>
            <p className="text-xs text-gray-500">Chứng từ khách hàng doanh nghiệp tải lên từ Cổng Khách Hàng</p>
          </div>
          <select
            value={documentStatusFilter}
            onChange={(e) => { setDocumentStatusFilter(e.target.value); fetchDocuments(e.target.value); }}
            className="bg-[#F8F9FA] border border-gray-200 rounded-lg p-2.5 text-xs font-bold text-gray-700"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="PROCESSING">Đang xử lý</option>
            <option value="COMPLETED">Hoàn tất</option>
            <option value="REJECTED">Từ chối</option>
          </select>
        </div>

        <div className="relative mb-5">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={documentsSearch}
            onChange={(e) => { setDocumentsSearch(e.target.value); setDocumentsPage(1); }}
            placeholder="Tìm theo tên file hoặc tên công ty..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1B3A8F]"
          />
        </div>

        {documentsLoading ? (
          <p className="text-xs text-gray-400 italic">Đang tải...</p>
        ) : filteredDocumentsList.length === 0 ? (
          <p className="text-xs text-gray-400 italic">{documentsSearch ? "Không tìm thấy chứng từ phù hợp." : "Chưa có chứng từ nào."}</p>
        ) : (
          <>
          <div className="space-y-3">
            {pagedDocumentsList.map((doc: any) => (
              <div key={doc.id} className="p-4 border border-gray-200 rounded-xl flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-[#0F1C47] text-sm truncate">{doc.fileName}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      doc.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      doc.status === "REJECTED" ? "bg-red-50 text-red-700 border-red-200" :
                      doc.status === "PROCESSING" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {doc.status === "COMPLETED" ? "Hoàn tất" : doc.status === "REJECTED" ? "Từ chối" : doc.status === "PROCESSING" ? "Đang xử lý" : "Chờ xử lý"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {doc.company?.name} ({doc.company?.taxCode}) · {doc.uploadedBy?.fullName} · {new Date(doc.createdAt).toLocaleDateString("vi-VN")}
                  </div>
                  {doc.reviewNote && <div className="text-xs text-red-600 mt-1">Lý do từ chối: {doc.reviewNote}</div>}
                  <div className="mt-2">
                    {doc.resultFileUrl ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-700 font-semibold truncate">📄 Kết quả: {doc.resultFileName}</span>
                        <button type="button" onClick={() => handleRemoveDocumentResultFile(doc.id)} className="text-red-500 font-bold hover:underline shrink-0">
                          Gỡ
                        </button>
                      </div>
                    ) : (
                      <label className="text-xs text-[#1B3A8F] font-bold cursor-pointer hover:underline">
                        {uploadingResultFileId === doc.id ? "Đang tải lên..." : "+ Đính kèm file kết quả"}
                        <input
                          type="file"
                          accept=".pdf,.xls,.xlsx,.doc,.docx,.jpg,.jpeg,.png"
                          className="hidden"
                          disabled={uploadingResultFileId === doc.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAttachDocumentResultFile(doc.id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={doc.status}
                    disabled={doc.status === "COMPLETED"}
                    title={doc.status === "COMPLETED" ? "Chứng từ đã chốt, không thể đổi trạng thái (Luật Kế toán)" : undefined}
                    onChange={(e) => {
                      if (e.target.value === "REJECTED") {
                        setRejectingDocument(doc);
                        setRejectReasonInput("");
                      } else {
                        handleUpdateDocumentStatus(doc.id, e.target.value);
                      }
                    }}
                    className="bg-[#F8F9FA] border border-gray-200 rounded-lg p-2 text-[11px] font-bold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="PENDING">Chờ xử lý</option>
                    <option value="PROCESSING">Đang xử lý</option>
                    <option value="COMPLETED">Hoàn tất</option>
                    <option value="REJECTED">Từ chối</option>
                  </select>
                  <button onClick={() => handleDownloadDocument(doc)} className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg" title="Tải xuống">
                    <Download className="w-4 h-4" />
                  </button>
                  {doc.status !== "COMPLETED" ? (
                    <button onClick={() => askConfirm(`Bạn có chắc chắn muốn xóa chứng từ "${doc.fileName}"? Thao tác này không thể hoàn tác.`, () => handleDeleteDocument(doc.id))} className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg" title="Xóa">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span
                      className="p-2.5 text-gray-300 cursor-not-allowed"
                      title="Chứng từ đã hoàn tất phải lưu trữ theo Luật Kế toán, không thể xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={documentsPage} totalItems={filteredDocumentsList.length} onChange={setDocumentsPage} />
          </>
        )}
      </div>
      </div>

      {/* ═══ MODAL NHẬP LÝ DO TỪ CHỐI CHỨNG TỪ ═══ */}
      {rejectingDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 text-xs">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-[#0F1C47]">Từ Chối Chứng Từ</h3>
              <button onClick={() => setRejectingDocument(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-3">{rejectingDocument.fileName}</p>
            <label className="font-bold text-gray-700 block mb-1.5">Lý do từ chối *</label>
            <textarea
              required
              rows={3}
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              placeholder="VD: File mờ, không đọc được số liệu..."
              className="w-full border border-gray-200 p-2.5 rounded-lg outline-none"
            />
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-100">
              <button type="button" onClick={() => setRejectingDocument(null)} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg">Hủy</button>
              <button
                type="button"
                disabled={!rejectReasonInput.trim()}
                onClick={handleConfirmReject}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50"
              >
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
