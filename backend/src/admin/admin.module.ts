import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ServicesModule } from '../services/services.module.js';
import { CoursesModule } from '../courses/courses.module.js';
import { PostsModule } from '../posts/posts.module.js';
import { RecruitmentModule } from '../recruitment/recruitment.module.js';
import { ForumModule } from '../forum/forum.module.js';
import { CompaniesModule } from '../companies/companies.module.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { ChatModule } from '../chat/chat.module.js';

@Module({
  imports: [
    PrismaModule,
    ServicesModule,
    CoursesModule,
    PostsModule,
    RecruitmentModule,
    ForumModule,
    CompaniesModule,
    DocumentsModule,
    ChatModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
