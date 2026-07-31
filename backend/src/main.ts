import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { join } from 'node:path';
import { AppModule } from './app.module.js';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { UPLOADS_ROOT } from './common/config/upload.config.js';

/**
 * Các biến môi trường bắt buộc — KHÔNG có giá trị mặc định trong code.
 * Thiếu bất kỳ biến nào → server dừng khởi động ngay, tránh chạy production
 * với secret hard-code có sẵn trong source code (đã public trên repo).
 */
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_MFA_SECRET',
] as const;

function assertRequiredEnvVars(logger: Logger): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.error(
      `❌ Thiếu biến môi trường bắt buộc: ${missing.join(', ')}. ` +
        'Xem backend/.env.example để biết danh sách đầy đủ. Server dừng khởi động.',
    );
    process.exit(1);
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  assertRequiredEnvVars(logger);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ============================================================
  // SECURITY HEADERS
  // Ảnh upload (job posting) được phục vụ qua thẻ <img> từ origin khác (frontend:3000),
  // nên cần tắt CORP mặc định của helmet cho riêng route tĩnh — xem useStaticAssets bên dưới.
  // ============================================================
  app.use(helmet());

  // Nén response (gzip) — giảm băng thông/độ trễ đáng kể cho response JSON danh sách
  // (services/courses/posts/forum) khi lượng truy cập lớn, rẻ và an toàn để bật mặc định.
  app.use(compression());

  // Đảm bảo Prisma ngắt kết nối sạch khi process nhận SIGTERM/SIGINT (vd. restart qua PM2/
  // container orchestrator) — tránh rò rỉ connection pool khi triển khai nhiều lần liên tục.
  app.enableShutdownHooks();

  // ============================================================
  // STATIC FILES — ảnh upload (vd. job posting) phục vụ tại /uploads/*,
  // KHÔNG nằm dưới prefix /api/v1 để giữ URL ảnh gọn (setGlobalPrefix không áp dụng
  // cho static middleware, chỉ áp dụng cho route do Nest controller xử lý).
  // ============================================================
  app.useStaticAssets(UPLOADS_ROOT, {
    prefix: '/uploads/',
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  // ============================================================
  // GLOBAL PREFIX
  // ============================================================
  app.setGlobalPrefix('api/v1');

  // ============================================================
  // CORS
  // ============================================================
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ============================================================
  // GLOBAL PIPES — Validation
  // ============================================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Loại bỏ fields không có trong DTO
      forbidNonWhitelisted: true, // Throw error nếu có field lạ
      transform: true, // Tự động transform types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ============================================================
  // GLOBAL FILTERS & INTERCEPTORS
  // ============================================================
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // ============================================================
  // SWAGGER API DOCUMENTATION
  // Chỉ bật ngoài production — lộ toàn bộ danh sách endpoint (kể cả route admin) công khai
  // giúp kẻ tấn công trinh sát bề mặt tấn công dễ dàng hơn, không cần thiết ở production.
  // ============================================================
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('CPA HCM Portal API')
      .setDescription(
        'API Documentation cho hệ thống CPA HCM Portal — ' +
          'Nền tảng SaaS cổng thông tin dịch vụ kế toán, đào tạo và tuyển dụng.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Nhập JWT Access Token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Auth', 'Xác thực & Phân quyền')
      .addTag('Users', 'Quản lý người dùng')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // ============================================================
  // START SERVER
  // ============================================================
  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  logger.log(`🚀 CPA HCM Portal API đang chạy tại: http://localhost:${port}`);
  logger.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
  logger.log(`🔗 API Base URL: http://localhost:${port}/api/v1`);
}
bootstrap();
