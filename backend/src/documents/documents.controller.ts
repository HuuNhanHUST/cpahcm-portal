import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Res,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express, Response } from 'express';
import * as fs from 'node:fs';
import { Role } from '@prisma/client';
import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { documentUploadOptions } from '../common/config/upload.config.js';

/**
 * Mọi route trong controller này đều yêu cầu đăng nhập (KHÔNG có @Public() nào) — chứng từ
 * kế toán là dữ liệu tài chính riêng tư của khách hàng, khác các module trước (Services/Courses/
 * Posts/Forum) vốn có phần nội dung công khai cho khách vãng lai.
 */
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // Upload chứng từ — chỉ BUSINESS (ADMIN bypass qua RolesGuard).
  @Roles(Role.BUSINESS)
  @Post()
  @UseInterceptors(FileInterceptor('file', documentUploadOptions()))
  async createDocument(
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string | null,
  ) {
    if (!file)
      throw new BadRequestException('Vui lòng chọn file chứng từ để tải lên.');
    try {
      const data = await this.documentsService.createDocument(
        dto,
        file,
        companyId,
        userId,
      );
      return { success: true, message: 'Tải lên chứng từ thành công', data };
    } catch (err) {
      // Multer đã lưu file vào đĩa TRƯỚC KHI handler chạy — nếu service từ chối (VD: chưa liên
      // kết công ty) mà không dọn, file mồ côi vĩnh viễn trên đĩa vì không có bản ghi DB trỏ tới.
      fs.unlink(file.path, () => {});
      throw err;
    }
  }

  // Danh sách chứng từ của công ty mình — mọi user cùng company thấy chung. @Roles khai báo tường
  // minh (dù RolesGuard hiện tại đã mặc định chặn theo companyId=null cho MEMBER) làm lớp phòng thủ
  // thứ 2 — nếu sau này có bug/đổi logic khiến 1 MEMBER bị gán nhầm companyId, route vẫn chặn ở đây.
  @Roles(Role.BUSINESS, Role.ADMIN)
  @Get()
  async getMyCompanyDocuments(
    @CurrentUser('companyId') companyId: string | null,
  ) {
    return this.documentsService.getCompanyDocuments(companyId);
  }

  // Tải xuống — kiểm tra đúng companyId (hoặc ADMIN) trước khi stream file. Đây là điểm bảo
  // mật quan trọng nhất của cả tính năng (chống IDOR — không tin tưởng chỉ riêng document id).
  @Roles(Role.BUSINESS, Role.ADMIN)
  @Get(':id/download')
  async downloadDocument(
    @Param('id') id: string,
    @Res() res: Response,
    @CurrentUser('companyId') companyId: string | null,
    @CurrentUser('role') role: Role,
  ) {
    const document = await this.documentsService.getDocumentForAccess(
      id,
      companyId,
      role,
    );
    if (!fs.existsSync(document.fileUrl)) {
      throw new NotFoundException(
        'File chứng từ không còn tồn tại trên máy chủ.',
      );
    }
    res.download(document.fileUrl, document.fileName);
  }

  // Tải file KẾT QUẢ Admin đã trả lại (nếu có) — cùng kiểm tra IDOR như downloadDocument.
  @Roles(Role.BUSINESS, Role.ADMIN)
  @Get(':id/result-file')
  async downloadResultFile(
    @Param('id') id: string,
    @Res() res: Response,
    @CurrentUser('companyId') companyId: string | null,
    @CurrentUser('role') role: Role,
  ) {
    const document = await this.documentsService.getDocumentForAccess(
      id,
      companyId,
      role,
    );
    if (!document.resultFileUrl) {
      throw new NotFoundException('Chứng từ này chưa có file kết quả.');
    }
    if (!fs.existsSync(document.resultFileUrl)) {
      throw new NotFoundException(
        'File kết quả không còn tồn tại trên máy chủ.',
      );
    }
    res.download(
      document.resultFileUrl,
      document.resultFileName || 'ket-qua.pdf',
    );
  }

  // Xóa chứng từ của chính mình — chỉ khi còn PENDING (chưa được xử lý).
  @Roles(Role.BUSINESS, Role.ADMIN)
  @Delete(':id')
  async deleteDocument(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string | null,
    @CurrentUser('role') role: Role,
  ) {
    const data = await this.documentsService.deleteOwnDocument(
      id,
      userId,
      companyId,
      role,
    );
    return { success: true, message: 'Đã xóa chứng từ', data };
  }
}
