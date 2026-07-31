import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Đánh dấu đây là Module toàn cục
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Xuất PrismaService ra để các module khác dùng
})
export class PrismaModule {}
