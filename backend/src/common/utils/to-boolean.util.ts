/**
 * multipart/form-data gửi boolean dưới dạng string "true"/"false" — chuyển lại thành boolean
 * thật trước @IsBoolean().
 *
 * QUAN TRỌNG: field dùng transform này PHẢI khai kiểu `any` (KHÔNG phải `boolean`) trong DTO.
 * ValidationPipe toàn cục bật `enableImplicitConversion: true` (main.ts) — nếu field khai kiểu
 * `boolean`, class-transformer sẽ tự ý ép kiểu implicit bằng `Boolean(value)` dựa trên
 * design:type reflection, và vì "false" là chuỗi khác rỗng nên `Boolean("false") === true`,
 * ghi đè âm thầm lên kết quả đúng của transform này (input "false" → output `true`, sai hoàn
 * toàn). Khai `any` khiến class-transformer không có design:type Boolean để tự ý ép kiểu, giữ
 * nguyên kết quả từ transform này. Đã xác minh bằng test cô lập — xem to-boolean.util.spec.ts.
 */
export const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;
