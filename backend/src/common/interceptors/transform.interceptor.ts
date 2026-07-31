import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

/**
 * Global Response Transform Interceptor.
 * Wrap tất cả response thành format chuẩn:
 * { success: true, data: ..., message: '...', timestamp: '...' }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Nếu response đã có message field, sử dụng nó
        const message = data?.message || 'Thành công';
        const responseData = data?.message
          ? data.data !== undefined
            ? data.data
            : (() => {
                const { message: _, ...rest } = data;
                return rest;
              })()
          : data;

        return {
          success: true,
          data: responseData,
          message,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
