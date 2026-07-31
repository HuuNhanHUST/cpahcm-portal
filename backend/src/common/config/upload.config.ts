import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';

/** Thư mục gốc lưu file upload trên đĩa — phục vụ tĩnh tại /uploads/* (xem main.ts). */
export const UPLOADS_ROOT = join(process.cwd(), 'uploads');

/**
 * Đuôi file được LẤY TỪ mimetype đã kiểm tra hợp lệ, KHÔNG BAO GIỜ lấy từ `file.originalname`
 * của client. `file.mimetype` cũng do client tự khai trong header multipart nên vẫn có thể giả
 * mạo, nhưng một khi đã qua được whitelist thì đuôi file lưu trên đĩa PHẢI khớp đúng loại đã
 * validate — nếu lấy đuôi theo tên gốc (vd. "payload.html" khai Content-Type: image/jpeg), file
 * sẽ được lưu thành "<uuid>.html" và Express static server trả về Content-Type: text/html khi
 * truy cập qua /uploads/*, khiến nội dung HTML/JS trong file thực thi được trên chính origin của
 * app (stored XSS) dù đã "qua" bộ lọc mimetype. Ép đuôi file theo mimetype đã whitelist chặn
 * đứt toàn bộ lớp tấn công này vì đuôi lưu trên đĩa không bao giờ là .html/.js/.svg...
 */
const IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Cấu hình Multer dùng chung cho các endpoint upload ảnh (vd. ảnh vị trí tuyển dụng).
 * `subfolder` quyết định ảnh được lưu vào uploads/<subfolder>/ — ví dụ "jobs".
 */
export function imageUploadOptions(subfolder: string) {
  const destination = join(UPLOADS_ROOT, subfolder);
  fs.mkdirSync(destination, { recursive: true });

  return {
    storage: diskStorage({
      destination,
      filename: (_req, file, callback) => {
        const ext = IMAGE_MIME_TO_EXT[file.mimetype] || '.bin';
        callback(null, `${randomUUID()}${ext}`);
      },
    }),
    fileFilter: (
      _req: unknown,
      file: { mimetype: string },
      callback: (error: Error | null, accept: boolean) => void,
    ) => {
      if (!IMAGE_MIME_TO_EXT[file.mimetype]) {
        callback(
          new BadRequestException(
            'Chỉ chấp nhận file ảnh JPEG, PNG, WEBP hoặc GIF.',
          ),
          false,
        );
        return;
      }
      callback(null, true);
    },
    limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  };
}

/** Trả về đường dẫn public (vd. /uploads/jobs/xxx.jpg) để lưu vào DB, từ tên file đã upload. */
export function toPublicUploadPath(
  subfolder: string,
  filename: string,
): string {
  return `/uploads/${subfolder}/${filename}`;
}

/**
 * Thư mục gốc lưu chứng từ khách hàng (Document) — CỐ Ý tách biệt khỏi UPLOADS_ROOT và
 * KHÔNG được mount qua `useStaticAssets` trong main.ts. Chứng từ kế toán/hóa đơn/hợp đồng
 * là dữ liệu tài chính nhạy cảm của khách hàng — khác ảnh minh họa Service/Course/Post vốn
 * là nội dung marketing công khai. Chỉ được đọc qua endpoint có xác thực JWT + kiểm tra
 * đúng companyId (xem DocumentsController) — không bao giờ lộ qua URL tĩnh đoán được.
 */
export const PRIVATE_UPLOADS_ROOT = join(process.cwd(), 'uploads-private');

// Cùng lý do với IMAGE_MIME_TO_EXT ở trên — đuôi lưu trên đĩa lấy từ mimetype đã validate,
// không lấy từ originalname (chống giả mạo đuôi file .html/.js dưới mimetype hợp lệ).
const DOCUMENT_MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};
export const MAX_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15MB — chứng từ scan/PDF thường lớn hơn ảnh

/** Cấu hình Multer cho upload chứng từ khách hàng — lưu vào PRIVATE_UPLOADS_ROOT/documents. */
export function documentUploadOptions() {
  const destination = join(PRIVATE_UPLOADS_ROOT, 'documents');
  fs.mkdirSync(destination, { recursive: true });

  return {
    storage: diskStorage({
      destination,
      filename: (_req, file, callback) => {
        const ext = DOCUMENT_MIME_TO_EXT[file.mimetype] || '.bin';
        callback(null, `${randomUUID()}${ext}`);
      },
    }),
    fileFilter: (
      _req: unknown,
      file: { mimetype: string },
      callback: (error: Error | null, accept: boolean) => void,
    ) => {
      if (!DOCUMENT_MIME_TO_EXT[file.mimetype]) {
        callback(
          new BadRequestException(
            'Chỉ chấp nhận file PDF, Excel, Word hoặc ảnh (JPEG/PNG).',
          ),
          false,
        );
        return;
      }
      callback(null, true);
    },
    limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
  };
}

/** Cấu hình Multer cho Admin upload file KẾT QUẢ trả lại khách hàng (báo cáo, chứng từ đã xử lý
 * xong...) — lưu riêng ở PRIVATE_UPLOADS_ROOT/document-results, tách khỏi file gốc khách hàng tải
 * lên (documents/) để không lẫn lộn 2 chiều tài liệu (khách gửi lên vs. CPA HCM trả về). */
export function documentResultUploadOptions() {
  const destination = join(PRIVATE_UPLOADS_ROOT, 'document-results');
  fs.mkdirSync(destination, { recursive: true });

  return {
    storage: diskStorage({
      destination,
      filename: (_req, file, callback) => {
        const ext = DOCUMENT_MIME_TO_EXT[file.mimetype] || '.bin';
        callback(null, `${randomUUID()}${ext}`);
      },
    }),
    fileFilter: (
      _req: unknown,
      file: { mimetype: string },
      callback: (error: Error | null, accept: boolean) => void,
    ) => {
      if (!DOCUMENT_MIME_TO_EXT[file.mimetype]) {
        callback(
          new BadRequestException(
            'Chỉ chấp nhận file PDF, Excel, Word hoặc ảnh (JPEG/PNG).',
          ),
          false,
        );
        return;
      }
      callback(null, true);
    },
    limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
  };
}

/** Xóa file vật lý chứng từ khỏi đĩa theo đường dẫn nội bộ lưu trong Document.fileUrl. */
export function deletePrivateFile(internalPath: string): void {
  fs.unlink(internalPath, () => {
    // Bỏ qua lỗi (file có thể đã bị xóa thủ công) — không chặn luồng chính vì việc này.
  });
}

// CV ứng viên chứa PII (họ tên, SĐT, địa chỉ, quá trình làm việc...) — lưu ở PRIVATE_UPLOADS_ROOT
// giống Document, KHÔNG public qua /uploads/*. Trước đây route apply() chỉ nhận 1 chuỗi tên file
// từ client (không có file thật nào được tải lên máy chủ) — toàn bộ hồ sơ ATS vì vậy chưa từng có
// CV thật đính kèm. Chỉ chấp nhận PDF, khớp đúng "accept=.pdf" đã có sẵn ở form phía FE.
const CV_MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
};
export const MAX_CV_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function cvUploadOptions() {
  const destination = join(PRIVATE_UPLOADS_ROOT, 'cvs');
  fs.mkdirSync(destination, { recursive: true });

  return {
    storage: diskStorage({
      destination,
      filename: (_req, file, callback) => {
        const ext = CV_MIME_TO_EXT[file.mimetype] || '.bin';
        callback(null, `${randomUUID()}${ext}`);
      },
    }),
    fileFilter: (
      _req: unknown,
      file: { mimetype: string },
      callback: (error: Error | null, accept: boolean) => void,
    ) => {
      if (!CV_MIME_TO_EXT[file.mimetype]) {
        callback(
          new BadRequestException('Chỉ chấp nhận file CV định dạng PDF.'),
          false,
        );
        return;
      }
      callback(null, true);
    },
    limits: { fileSize: MAX_CV_SIZE_BYTES },
  };
}

// Tài liệu ôn tập (PDF) của khóa học đào tạo offline — công khai cho ai cũng tải được (không yêu
// cầu đăng nhập/đóng học phí, xem CoursesController.downloadLessonFile), nhưng vẫn lưu ở
// PRIVATE_UPLOADS_ROOT (không mount static qua /uploads/*) để chỉ lộ ra qua đúng 1 endpoint tải
// file có kiểm soát (validate lessonId tồn tại...), không đoán URL trực tiếp trên đĩa được.
const LESSON_FILE_MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
};
export const MAX_LESSON_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB — tài liệu ôn tập có thể nhiều trang/ảnh scan

export function lessonFileUploadOptions() {
  const destination = join(PRIVATE_UPLOADS_ROOT, 'course-lessons');
  fs.mkdirSync(destination, { recursive: true });

  return {
    storage: diskStorage({
      destination,
      filename: (_req, file, callback) => {
        const ext = LESSON_FILE_MIME_TO_EXT[file.mimetype] || '.bin';
        callback(null, `${randomUUID()}${ext}`);
      },
    }),
    fileFilter: (
      _req: unknown,
      file: { mimetype: string },
      callback: (error: Error | null, accept: boolean) => void,
    ) => {
      if (!LESSON_FILE_MIME_TO_EXT[file.mimetype]) {
        callback(
          new BadRequestException('Chỉ chấp nhận file tài liệu định dạng PDF.'),
          false,
        );
        return;
      }
      callback(null, true);
    },
    limits: { fileSize: MAX_LESSON_FILE_SIZE_BYTES },
  };
}
