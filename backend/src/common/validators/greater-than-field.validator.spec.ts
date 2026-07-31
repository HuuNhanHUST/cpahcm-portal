import { validate } from 'class-validator';
import { IsGreaterThanField } from './greater-than-field.validator';

class PriceTestDto {
  price!: number;

  @IsGreaterThanField('price', { message: 'originalPrice phải lớn hơn price!' })
  originalPrice?: number;
}

describe('IsGreaterThanField', () => {
  it('pass khi originalPrice > price', async () => {
    const dto = new PriceTestDto();
    dto.price = 100;
    dto.originalPrice = 200;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fail khi originalPrice <= price', async () => {
    const dto = new PriceTestDto();
    dto.price = 200;
    dto.originalPrice = 100;
    const errors = await validate(dto);
    expect(errors.length).toBe(1);
    expect(errors[0].property).toBe('originalPrice');
  });

  it('fail khi originalPrice === price (không được bằng)', async () => {
    const dto = new PriceTestDto();
    dto.price = 100;
    dto.originalPrice = 100;
    const errors = await validate(dto);
    expect(errors.length).toBe(1);
  });

  it('pass khi originalPrice không được set (field tùy chọn)', async () => {
    const dto = new PriceTestDto();
    dto.price = 100;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
