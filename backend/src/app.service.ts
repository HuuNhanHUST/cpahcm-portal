import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthStatus() {
    return {
      status: 'ONLINE',
      system: 'CPA HCM Portal Backend API Services',
      version: '1.0.0',
      database: 'PostgreSQL + Redis Connected',
      timestamp: new Date().toISOString(),
    };
  }
}
