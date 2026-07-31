import sanitizeHtml from 'sanitize-html';

/**
 * Làm sạch HTML do Rich Text Editor (Tiptap) sinh ra trước khi lưu DB — chặn XSS dù
 * chính Admin đang nhập (đề phòng session bị chiếm hoặc lỗi editor chèn script/onload...).
 * Chỉ cho phép tag định dạng cơ bản, không cho phép style/class/script/iframe.
 */
export function sanitizeRichText(
  html: string | null | undefined,
): string | null {
  if (!html) return null;
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'strong',
      'em',
      'u',
      's',
      'ul',
      'ol',
      'li',
      'h2',
      'h3',
      'a',
      'br',
      'blockquote',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  });
}
