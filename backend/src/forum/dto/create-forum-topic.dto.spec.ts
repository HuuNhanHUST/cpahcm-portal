import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateForumTopicDto } from './create-forum-topic.dto';

function makeValidPayload() {
  return {
    categoryId: '9d3f6a2e-1b4c-4a7e-8f2d-6c1a2b3d4e5f',
    title: 'Câu hỏi về hạch toán chi phí lãi vay',
    content: 'Nội dung chi tiết câu hỏi đủ dài để pass validate.',
  };
}

describe('CreateForumTopicDto', () => {
  it('pass với payload hợp lệ', async () => {
    const dto = plainToInstance(CreateForumTopicDto, makeValidPayload());
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fail khi categoryId không phải UUID', async () => {
    const dto = plainToInstance(CreateForumTopicDto, {
      ...makeValidPayload(),
      categoryId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'categoryId')).toBe(true);
  });

  it('fail khi title quá ngắn (< 10 ký tự)', async () => {
    const dto = plainToInstance(CreateForumTopicDto, {
      ...makeValidPayload(),
      title: 'Ngắn quá',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('fail khi content rỗng', async () => {
    const dto = plainToInstance(CreateForumTopicDto, {
      ...makeValidPayload(),
      content: '',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'content')).toBe(true);
  });

  it('fail khi content vượt quá 10000 ký tự', async () => {
    const dto = plainToInstance(CreateForumTopicDto, {
      ...makeValidPayload(),
      content: 'a'.repeat(10001),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'content')).toBe(true);
  });
});
