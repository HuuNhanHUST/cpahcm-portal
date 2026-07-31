import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Global HTTP Exception Filter.
 * Trả về response format thống nhất cho tất cả lỗi HTTP.
 */
@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Đã xảy ra lỗi hệ thống!';
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        errors = responseObj.errors || null;

        // Xử lý validation errors từ class-validator
        if (Array.isArray(message)) {
          errors = message;
          message = 'Dữ liệu không hợp lệ!';
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Race condition ở tầng ứng dụng (2 request gần như đồng thời cùng vượt qua 1 check
      // "chưa tồn tại" rồi cùng insert/update) trước đây rơi vào nhánh Error bên dưới → 500 kèm
      // message driver Postgres thô ("Unique constraint failed on the fields: (tax_code)") lộ
      // ra ngoài. Map về đúng mã lỗi HTTP + thông báo tiếng Việt dễ hiểu, không lộ chi tiết DB.
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[] | undefined)?.join(
          ', ',
        );
        message = target
          ? `Dữ liệu bị trùng ở trường: ${target}. Vui lòng kiểm tra lại.`
          : 'Dữ liệu bị trùng, vui lòng kiểm tra lại.';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Dữ liệu không tồn tại hoặc đã bị xóa.';
      } else if (exception.code === 'P2034') {
        status = HttpStatus.CONFLICT;
        message = 'Hệ thống đang xử lý yêu cầu tương tự, vui lòng thử lại.';
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Đã xảy ra lỗi hệ thống!';
        this.logger.error(
          `Unhandled Prisma error [${exception.code}]: ${exception.message}`,
          exception.stack,
        );
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
