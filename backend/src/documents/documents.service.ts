import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { deletePrivateFile } from '../common/config/upload.config.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentStatusDto } from './dto/update-document-status.dto.js';

const UPLOADER_SELECT = { id: true, fullName: true, email: true } as const;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // ── Cổng khách hàng (BUSINESS, tự thao tác trên chứng từ của công ty mình) ──
  async createDocument(
    dto: CreateDocumentDto,
    file: {
      originalname: string;
      path: string;
      mimetype: string;
      size: number;
    },
    companyId: string | null,
    uploadedById: string,
  ) {
    if (!companyId) {
      throw new BadRequestException(
        'Tài khoản của bạn chưa được gán vào công ty nào. Vui lòng liên hệ CPA HCM để được hỗ trợ.',
      );
    }

    return this.prisma.document.create({
      data: {
        fileName: file.originalname,
        fileUrl: file.path,
        fileType: file.mimetype,
        fileSize: file.size,
        category: dto.category as any,
        note: dto.note ?? null,
        companyId,
        uploadedById,
      },
    });
  }

  async getCompanyDocuments(companyId: string | null) {
    if (!companyId) return [];
    return this.prisma.document.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: UPLOADER_SELECT } },
    });
  }

  /** Trả về Document nếu tìm thấy VÀ (đúng công ty của user HOẶC là ADMIN) — chống IDOR. */
  async getDocumentForAccess(id: string, companyId: string | null, role: Role) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Chứng từ không tồn tại.');
    if (role !== Role.ADMIN && document.companyId !== companyId) {
      throw new ForbiddenException('Bạn không có quyền truy cập chứng từ này.');
    }
    return document;
  }

  async deleteOwnDocument(
    id: string,
    userId: string,
    companyId: string | null,
    role: Role,
  ) {
    const document = await this.getDocumentForAccess(id, companyId, role);
    if (document.status !== 'PENDING') {
      throw new BadRequestException(
        'Chứng từ đang được xử lý hoặc đã hoàn tất, không thể xóa.',
      );
    }
    if (role !== Role.ADMIN && document.uploadedById !== userId) {
      throw new ForbiddenException(
        'Bạn chỉ có thể xóa chứng từ do chính mình tải lên.',
      );
    }
    deletePrivateFile(document.fileUrl);
    return this.prisma.document.delete({ where: { id } });
  }

  // ── Admin: quản trị toàn bộ chứng từ ──────────────────────────────────────
  async getAllDocuments(companyId?: string, status?: string) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (status) where.status = status;
    return this.prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: UPLOADER_SELECT },
        company: { select: { id: true, name: true, taxCode: true } },
      },
    });
  }

  async updateDocumentStatus(id: string, dto: UpdateDocumentStatusDto) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { uploadedBy: { select: UPLOADER_SELECT } },
    });
    if (!document) throw new NotFoundException('Chứng từ không tồn tại.');

    // Chặn đổi trạng thái NGƯỢC ra khỏi COMPLETED — nếu không, guard "không cho xóa chứng từ đã
    // COMPLETED" ở adminDeleteDocument() sẽ bị vô hiệu hóa dễ dàng bằng cách chuyển COMPLETED →
    // PENDING rồi xóa bình thường. Một khi đã hoàn tất (đã dùng cho nghiệp vụ kế toán thật), hồ
    // sơ phải bất biến — đúng nguyên tắc chứng từ kế toán đã chốt không được sửa/hủy tùy tiện.
    if (document.status === 'COMPLETED' && dto.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Chứng từ đã hoàn tất không thể đổi lại trạng thái khác — hồ sơ kế toán đã chốt phải giữ nguyên.',
      );
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        status: dto.status as any,
        reviewNote: dto.status === 'REJECTED' ? dto.reviewNote : null,
      },
    });

    // Trước đây khách hàng không hề biết chứng từ đã được xử lý hay chưa — phải tự vào lại Cổng
    // Khách Hàng để kiểm tra. Không throw nếu gửi mail lỗi (MailService tự log, không chặn luồng
    // chính) — cập nhật trạng thái vẫn phải thành công dù email thất bại.
    if (document.uploadedBy?.email && dto.status !== 'PENDING') {
      this.mailService.sendDocumentStatusEmail(
        document.uploadedBy.email,
        document.fileName,
        dto.status as 'PROCESSING' | 'COMPLETED' | 'REJECTED',
        dto.status === 'REJECTED' ? dto.reviewNote : null,
      );
    }

    return updated;
  }

  async adminDeleteDocument(id: string) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Chứng từ không tồn tại.');
    // Tuân thủ Luật Kế toán VN (Điều 41) — chứng từ kế toán đã xử lý xong (COMPLETED, tức đã
    // được dùng để kê khai thuế/lập báo cáo tài chính...) BẮT BUỘC phải lưu trữ tối thiểu 5-10
    // năm tùy loại, không được xóa. Trước đây ADMIN có thể xóa cứng bất kỳ document nào ở bất kỳ
    // trạng thái nào — đây là lỗ hổng nghiệp vụ nghiêm trọng nhất hệ thống vì có thể vô tình (hoặc
    // cố ý) xóa bằng chứng đã dùng cho nghĩa vụ pháp lý với cơ quan thuế, không thể khôi phục.
    // Chỉ cho xóa khi PENDING/PROCESSING/REJECTED (chưa từng là hồ sơ kế toán chính thức).
    if (document.status === 'COMPLETED') {
      throw new BadRequestException(
        'Chứng từ đã hoàn tất xử lý phải được lưu trữ theo quy định Luật Kế toán, không thể xóa.',
      );
    }
    deletePrivateFile(document.fileUrl);
    if (document.resultFileUrl) deletePrivateFile(document.resultFileUrl);
    return this.prisma.document.delete({ where: { id } });
  }

  // ── Admin: file kết quả trả lại khách hàng ─────────────────────────────
  // Gắn/thay file kết quả — xóa file cũ trước (nếu có) để không rác file mồ côi trên đĩa. Cho phép
  // gắn/thay ở BẤT KỲ trạng thái nào (kể cả COMPLETED) — quy định bất biến ở updateDocumentStatus
  // chỉ áp dụng cho field `status`, không áp dụng cho việc đính kèm file kết quả bổ sung.
  async attachResultFile(
    id: string,
    file: { path: string; originalname: string },
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { uploadedBy: { select: UPLOADER_SELECT } },
    });
    if (!document) throw new NotFoundException('Chứng từ không tồn tại.');
    if (document.resultFileUrl) deletePrivateFile(document.resultFileUrl);

    const updated = await this.prisma.document.update({
      where: { id },
      data: { resultFileUrl: file.path, resultFileName: file.originalname },
    });

    if (document.uploadedBy?.email) {
      this.mailService.sendDocumentResultEmail(
        document.uploadedBy.email,
        document.fileName,
      );
    }

    return updated;
  }

  async removeResultFile(id: string) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Chứng từ không tồn tại.');
    if (document.resultFileUrl) deletePrivateFile(document.resultFileUrl);
    return this.prisma.document.update({
      where: { id },
      data: { resultFileUrl: null, resultFileName: null },
    });
  }
}
