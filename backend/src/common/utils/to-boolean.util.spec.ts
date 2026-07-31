import 'reflect-metadata';
import { plainToInstance, Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { toBoolean } from './to-boolean.util';

/**
 * Regression test cho bug thật đã tìm thấy khi build tính năng Dịch Vụ/Đào Tạo: ValidationPipe
 * toàn cục bật `enableImplicitConversion: true` (main.ts) — nếu field DTO khai kiểu `boolean`,
 * class-transformer tự ý ép "false" (string, từ multipart/form-data) thành `true` (vì mọi chuỗi
 * không rỗng đều truthy), ghi đè âm thầm lên kết quả đúng của @Transform(toBoolean). Field PHẢI
 * khai kiểu `any` để tránh bug này — test dưới đây tái hiện đúng chuỗi enableImplicitConversion
 * mà main.ts dùng thật, xác nhận khai `any` cho kết quả đúng còn khai `boolean` cho kết quả sai.
 */
describe('toBoolean transform + enableImplicitConversion interaction', () => {
  class DtoWithBooleanType {
    @IsOptional()
    @Transform(toBoolean)
    @IsBoolean()
    isActive?: boolean;
  }

  class DtoWithAnyType {
    @IsOptional()
    @Transform(toBoolean)
    @IsBoolean()
    isActive?: any;
  }

  it('BUG TÁI HIỆN: khai kiểu `boolean` khiến "false" bị ép nhầm thành `true`', () => {
    const instance = plainToInstance(
      DtoWithBooleanType,
      { isActive: 'false' },
      { enableImplicitConversion: true },
    );
    // Đây là hành vi SAI đã gây bug thật — giữ test này để không ai vô tình đổi lại kiểu `boolean`.
    expect(instance.isActive).toBe(true);
  });

  it('FIX ĐÚNG: khai kiểu `any` giữ nguyên kết quả "false" → false', () => {
    const instance = plainToInstance(
      DtoWithAnyType,
      { isActive: 'false' },
      { enableImplicitConversion: true },
    );
    expect(instance.isActive).toBe(false);
  });

  it('FIX ĐÚNG: khai kiểu `any` với "true" vẫn cho true', () => {
    const instance = plainToInstance(
      DtoWithAnyType,
      { isActive: 'true' },
      { enableImplicitConversion: true },
    );
    expect(instance.isActive).toBe(true);
  });
});
