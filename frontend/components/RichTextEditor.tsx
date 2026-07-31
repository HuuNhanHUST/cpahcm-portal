"use client";

import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Bold, Italic, List, ListOrdered, Heading2, Link2 } from "lucide-react";

/**
 * WYSIWYG editor dùng cho các field longDescription (Service/Course) ở Admin — output là HTML
 * thật, được sanitize lại ở backend (sanitize-html.util.ts) trước khi lưu DB, không tin tưởng
 * HTML thô từ client dù chính Admin nhập (đề phòng session bị chiếm / lỗi editor).
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose-cpa min-h-[160px] max-h-[320px] overflow-y-auto outline-none px-4 py-3",
      },
    },
  });

  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `p-2 rounded-sm transition-colors ${active ? "bg-[#1B3A8F] text-white" : "text-gray-500 hover:bg-gray-100"}`;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="flex items-center gap-1 border-b border-gray-100 p-2 bg-[#F8F9FA]">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive("bold"))} title="Đậm">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive("italic"))} title="Nghiêng">
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive("heading", { level: 2 }))} title="Tiêu đề phụ">
          <Heading2 className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive("bulletList"))} title="Danh sách">
          <List className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive("orderedList"))} title="Danh sách số">
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("Nhập URL:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className={btnClass(editor.isActive("link"))}
          title="Chèn link"
        >
          <Link2 className="w-4 h-4" />
        </button>
      </div>
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}
