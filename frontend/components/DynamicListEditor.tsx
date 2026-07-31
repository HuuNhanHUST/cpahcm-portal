"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";

/**
 * Danh sách dòng text thêm/xóa được — dùng cho Service.features/deliverables và
 * CourseModule.lessons. Giữ dữ liệu có cấu trúc (mảng thật) thay vì nhồi vào 1 textarea tự do,
 * để hiển thị đúng dạng checklist/list ở phía client.
 */
export default function DynamicListEditor({
  items,
  onChange,
  placeholder,
  addLabel = "+ Thêm dòng",
  maxItems = 12,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  maxItems?: number;
}) {
  const updateItem = (index: number, value: string) => {
    onChange(items.map((it, i) => (i === index ? value : it)));
  };
  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };
  const addItem = () => {
    if (items.length >= maxItems) return;
    onChange([...items, ""]);
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 border border-gray-200 p-2.5 rounded-lg outline-none text-xs"
          />
          <button type="button" onClick={() => removeItem(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {items.length < maxItems && (
        <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-xs font-bold text-[#1B3A8F] hover:text-[#C9973C]">
          <Plus className="w-3.5 h-3.5" /> {addLabel}
        </button>
      )}
    </div>
  );
}
