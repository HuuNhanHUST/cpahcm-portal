import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCourseDto } from './create-course.dto';

function makeValidPayload() {
  return {
    title: 'Luyện thi Chứng chỉ Kiểm toán viên CPA',
    category: 'CPA',
    price: 12500000,
  };
}

describe('CreateCourseDto', () => {
  it('pass với payload hợp lệ tối thiểu', async () => {
    const dto = plainToInstance(CreateCourseDto, makeValidPayload());
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fail khi category không nằm trong danh sách cố định', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      ...makeValidPayload(),
      category: 'Ngoại ngữ',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'category')).toBe(true);
  });

  it('fail khi price âm', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      ...makeValidPayload(),
      price: -100,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'price')).toBe(true);
  });

  it('fail khi originalPrice <= price (giá gốc phải lớn hơn giá bán)', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      ...makeValidPayload(),
      price: 1000000,
      originalPrice: 900000,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'originalPrice')).toBe(true);
  });

  it('pass khi originalPrice > price', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      ...makeValidPayload(),
      price: 1000000,
      originalPrice: 1500000,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fail khi lessons/hours vượt giới hạn hợp lý (> 500)', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      ...makeValidPayload(),
      lessons: 5000,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'lessons')).toBe(true);
  });

  it('parse và validate đúng modules gửi dưới dạng JSON string (multipart/form-data)', async () => {
    const modules = [
      {
        title: 'Module 1: Nhập môn',
        lessons: [
          { title: 'Bài 1' },
          { title: 'Bài 2', videoUrl: 'https://youtube.com/watch?v=abc' },
        ],
      },
      { title: 'Module 2: Thực hành', lessons: [{ title: 'Bài 3' }] },
    ];
    const dto = plainToInstance(CreateCourseDto, {
      ...makeValidPayload(),
      modules: JSON.stringify(modules),
    });
    expect(Array.isArray(dto.modules)).toBe(true);
    expect(dto.modules?.length).toBe(2);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fail khi 1 module trong modules thiếu title', async () => {
    const modules = [{ title: '', lessons: [{ title: 'Bài 1' }] }];
    const dto = plainToInstance(CreateCourseDto, {
      ...makeValidPayload(),
      modules: JSON.stringify(modules),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'modules')).toBe(true);
  });

  it('fail khi 1 lesson trong module có videoUrl không hợp lệ', async () => {
    const modules = [
      {
        title: 'Module 1',
        lessons: [{ title: 'Bài 1', videoUrl: 'not-a-url' }],
      },
    ];
    const dto = plainToInstance(CreateCourseDto, {
      ...makeValidPayload(),
      modules: JSON.stringify(modules),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'modules')).toBe(true);
  });
});
