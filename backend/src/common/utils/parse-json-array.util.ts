/**
 * multipart/form-data chỉ gửi được string — field kiểu mảng (features, deliverables, modules...)
 * phải được client JSON.stringify() trước khi append vào FormData. Transform này parse lại
 * thành mảng thật trước khi class-validator kiểm tra @IsArray(). Nếu parse lỗi hoặc không phải
 * mảng, trả về giá trị gốc để @IsArray() tự báo lỗi rõ ràng cho client.
 */
export function parseJsonArray({ value }: { value: unknown }): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : value;
  } catch {
    return value;
  }
}
