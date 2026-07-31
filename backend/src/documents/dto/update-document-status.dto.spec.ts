import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateDocumentStatusDto } from './update-document-status.dto';

describe('UpdateDocumentStatusDto', () => {
  it('pass khi status=REJECTED có reviewNote', async () => {
    const dto = plainToInstance(UpdateDocumentStatusDto, {
      status: 'REJECTED',
      reviewNote: 'File mờ',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fail khi status=REJECTED thiếu reviewNote', async () => {
    const dto = plainToInstance(UpdateDocumentStatusDto, {
      status: 'REJECTED',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'reviewNote')).toBe(true);
  });

  it('pass khi status=COMPLETED không cần reviewNote', async () => {
    const dto = plainToInstance(UpdateDocumentStatusDto, {
      status: 'COMPLETED',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fail khi status không nằm trong danh sách hợp lệ', async () => {
    const dto = plainToInstance(UpdateDocumentStatusDto, { status: 'DELETED' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });
});
