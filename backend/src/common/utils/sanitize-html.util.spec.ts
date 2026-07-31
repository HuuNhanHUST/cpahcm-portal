import { sanitizeRichText } from './sanitize-html.util';

describe('sanitizeRichText', () => {
  it('trả về null nếu input rỗng/null/undefined', () => {
    expect(sanitizeRichText(null)).toBeNull();
    expect(sanitizeRichText(undefined)).toBeNull();
    expect(sanitizeRichText('')).toBeNull();
  });

  it('loại bỏ tag <script> — chặn XSS cơ bản', () => {
    const result = sanitizeRichText('<p>Nội dung</p><script>alert(1)</script>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert(1)');
    expect(result).toContain('<p>Nội dung</p>');
  });

  it('loại bỏ thuộc tính onXXX (onerror, onclick...) trên tag được phép', () => {
    const result = sanitizeRichText('<p onclick="alert(1)">Click</p>');
    expect(result).not.toContain('onclick');
  });

  it('loại bỏ tag <iframe>/<style> không nằm trong allow-list', () => {
    const result = sanitizeRichText(
      '<p>OK</p><iframe src="evil.com"></iframe><style>body{}</style>',
    );
    expect(result).not.toContain('<iframe');
    expect(result).not.toContain('<style');
  });

  it('giữ nguyên các tag định dạng cơ bản trong allow-list', () => {
    const result = sanitizeRichText(
      '<h2>Tiêu đề</h2><p><strong>Đậm</strong> và <em>nghiêng</em></p><ul><li>Ý 1</li></ul>',
    );
    expect(result).toContain('<h2>Tiêu đề</h2>');
    expect(result).toContain('<strong>Đậm</strong>');
    expect(result).toContain('<li>Ý 1</li>');
  });

  it('chặn scheme javascript: trong href của <a>', () => {
    const result = sanitizeRichText('<a href="javascript:alert(1)">Click</a>');
    expect(result).not.toContain('javascript:');
  });
});
