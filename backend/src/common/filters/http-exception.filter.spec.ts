import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GlobalHttpExceptionFilter } from './http-exception.filter';

function makeHost() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const response = { status };
  const request = { url: '/api/v1/test' };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('GlobalHttpExceptionFilter', () => {
  const filter = new GlobalHttpExceptionFilter();

  it('P2002 (unique constraint) → 409, message không lộ raw Prisma text', () => {
    const { host, status, json } = makeHost();
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (tax_code)',
      {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['tax_code'] },
      },
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    const body = json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.message).not.toContain('Unique constraint failed');
    expect(body.message).toContain('tax_code');
  });

  it('P2025 (record not found) → 404', () => {
    const { host, status, json } = makeHost();
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Record to update not found.',
      {
        code: 'P2025',
        clientVersion: 'test',
      },
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json.mock.calls[0][0].success).toBe(false);
  });

  it('P2034 (transaction/serialization conflict) → 409', () => {
    const { host, status, json } = makeHost();
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Transaction failed due to a write conflict',
      {
        code: 'P2034',
        clientVersion: 'test',
      },
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json.mock.calls[0][0].message).not.toContain('write conflict');
  });

  it('Prisma error code lạ khác → 500, không leak message driver', () => {
    const { host, status, json } = makeHost();
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Some internal driver detail',
      {
        code: 'P9999',
        clientVersion: 'test',
      },
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json.mock.calls[0][0].message).not.toContain(
      'Some internal driver detail',
    );
  });

  it('HttpException thường (không phải Prisma) vẫn hoạt động như cũ', () => {
    const { host, status, json } = makeHost();
    const exception = new HttpException('Không tìm thấy', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json.mock.calls[0][0].message).toBe('Không tìm thấy');
  });
});
