import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateServiceDto } from './create-service.dto';

function makeValidPayload() {
  return {
    title: 'Dịch vụ Kế toán Trọn gói',
    category: 'Kế toán',
    shortDesc: 'Giải pháp kế toán toàn diện cho doanh nghiệp vừa và nhỏ.',
    features: ['Thiết lập sổ sách', 'Báo cáo thuế hàng tháng'],
    deliverables: ['Báo cáo tài chính cuối năm'],
  };
}

describe('CreateServiceDto', () => {
  it('pass với payload hợp lệ', async () => {
    const dto = plainToInstance(CreateServiceDto, makeValidPayload());
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fail khi category không nằm trong danh sách cố định', async () => {
    const dto = plainToInstance(CreateServiceDto, {
      ...makeValidPayload(),
      category: 'Kế Toán XYZ',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'category')).toBe(true);
  });

  it('fail khi features là mảng rỗng', async () => {
    const dto = plainToInstance(CreateServiceDto, {
      ...makeValidPayload(),
      features: [],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'features')).toBe(true);
  });

  it('fail khi features có item quá ngắn (< 3 ký tự)', async () => {
    const dto = plainToInstance(CreateServiceDto, {
      ...makeValidPayload(),
      features: ['ok', 'Hợp lệ'],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'features')).toBe(true);
  });

  it('fail khi shortDesc quá ngắn (< 20 ký tự)', async () => {
    const dto = plainToInstance(CreateServiceDto, {
      ...makeValidPayload(),
      shortDesc: 'Quá ngắn',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'shortDesc')).toBe(true);
  });

  it('fail khi title rỗng', async () => {
    const dto = plainToInstance(CreateServiceDto, {
      ...makeValidPayload(),
      title: '',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('parse đúng features gửi dưới dạng JSON string (multipart/form-data)', async () => {
    const payload = {
      ...makeValidPayload(),
      features: JSON.stringify(['A đủ dài', 'B đủ dài']),
    };
    const dto = plainToInstance(CreateServiceDto, payload);
    expect(Array.isArray(dto.features)).toBe(true);
    expect(dto.features).toEqual(['A đủ dài', 'B đủ dài']);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fail khi slug sai định dạng (có khoảng trắng/hoa)', async () => {
    const dto = plainToInstance(CreateServiceDto, {
      ...makeValidPayload(),
      slug: 'Ke Toan Tron Goi',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'slug')).toBe(true);
  });
});
