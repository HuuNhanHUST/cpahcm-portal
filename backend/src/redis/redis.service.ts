import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis Service wrapper.
 * Sử dụng cho: OTP storage, Refresh token management, Cache.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      retryStrategy: (times: number) => {
        if (times > 3) {
          this.logger.error('Redis: Không thể kết nối sau 3 lần thử');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Redis: Đã kết nối thành công');
    });

    this.client.on('error', (err: Error) => {
      this.logger.error(`Redis Error: ${err.message}`);
    });
  }

  /**
   * Lưu giá trị với TTL (time to live) tính bằng giây.
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Lấy giá trị theo key.
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Xóa key.
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Đặt key CHỈ KHI chưa tồn tại (SET NX) — dùng làm lock ngắn hạn cho các thao tác cần đảm bảo
   * chỉ 1 request thực thi tại 1 thời điểm (VD: seed dữ liệu mẫu khi bảng rỗng). Trả về true nếu
   * request này giành được lock, false nếu đã có request khác giữ lock.
   */
  async setNX(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /**
   * Kiểm tra key có tồn tại không.
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Đặt TTL cho key đã tồn tại (giây).
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  /**
   * Cache-aside cho các endpoint đọc công khai, không có side-effect (danh sách khóa học/tin
   * tức/tuyển dụng/diễn đàn...). TTL ngắn (mặc định 60s) để dữ liệu Admin vừa sửa/xóa tự hết hạn
   * nhanh mà không cần cơ chế invalidate riêng — đơn giản và đủ an toàn cho dữ liệu ít thay đổi.
   * Lỗi Redis (mất kết nối...) không được làm sập request — fallback thẳng về `fn()` khi cache
   * đọc/ghi thất bại.
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      const cached = await this.get(key);
      if (cached !== null) return JSON.parse(cached) as T;
    } catch {
      // Redis lỗi hoặc JSON hỏng — bỏ qua cache, tính lại như bình thường.
    }

    const fresh = await fn();

    try {
      await this.set(key, JSON.stringify(fresh), ttlSeconds);
    } catch {
      // Ghi cache thất bại không ảnh hưởng tới response đã tính được.
    }

    return fresh;
  }

  /**
   * Xóa toàn bộ key khớp với prefix (dùng SCAN để tránh block Redis với KEYS trên dataset lớn).
   * Dùng cho revoke tất cả refresh-token session của 1 user (đổi mật khẩu, logout-all...).
   */
  async delByPrefix(prefix: string): Promise<number> {
    let cursor = '0';
    let deleted = 0;
    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        `${prefix}*`,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        deleted += await this.client.del(...keys);
      }
    } while (cursor !== '0');
    return deleted;
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis: Đã ngắt kết nối');
  }
}
