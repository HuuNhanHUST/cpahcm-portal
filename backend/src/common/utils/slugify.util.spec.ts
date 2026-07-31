import { slugify } from './slugify.util';

describe('slugify', () => {
  it('bỏ dấu tiếng Việt và chuyển thành kebab-case', () => {
    expect(slugify('Điểm mới Nghị định quyết toán thuế 2026')).toBe(
      'diem-moi-nghi-dinh-quyet-toan-thue-2026',
    );
  });

  it('xử lý đúng ký tự "đ"/"Đ"', () => {
    expect(slugify('Đào tạo Đại học')).toBe('dao-tao-dai-hoc');
  });

  it('gộp nhiều khoảng trắng liên tiếp thành 1 dấu gạch ngang', () => {
    expect(slugify('Kế   toán    trọn gói')).toBe('ke-toan-tron-goi');
  });

  it('bỏ ký tự đặc biệt không hợp lệ', () => {
    expect(slugify('Dịch vụ #1 (ưu đãi 50%)')).toBe('dich-vu-1-uu-dai-50');
  });

  it('không để dấu gạch ngang ở đầu/cuối chuỗi', () => {
    expect(slugify('  -Kế toán-  ')).toBe('ke-toan');
  });
});
