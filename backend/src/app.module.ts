import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// Config
import {
  appConfig,
  jwtConfig,
  redisConfig,
  mailConfig,
  googleConfig,
  facebookConfig,
  throttleConfig,
} from './common/config/app.config.js';

// Guards
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';

// Modules
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { MailModule } from './mail/mail.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { RecruitmentModule } from './recruitment/recruitment.module.js';
import { PostsModule } from './posts/posts.module.js';
import { ServicesModule } from './services/services.module.js';
import { CoursesModule } from './courses/courses.module.js';
import { ForumModule } from './forum/forum.module.js';
import { CompaniesModule } from './companies/companies.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { AdminModule } from './admin/admin.module.js';
import { ChatModule } from './chat/chat.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    // Config Module — load env variables
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        jwtConfig,
        redisConfig,
        mailConfig,
        googleConfig,
        facebookConfig,
        throttleConfig,
      ],
      envFilePath: '.env',
    }),

    // Throttler — Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT || '10', 10),
      },
    ]),

    // Core Modules
    PrismaModule,
    RedisModule,
    MailModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    RecruitmentModule,
    PostsModule,
    ServicesModule,
    CoursesModule,
    ForumModule,
    CompaniesModule,
    DocumentsModule,
    AdminModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Global Guards (theo thứ tự: Throttle → JWT Auth → Roles)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
