import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

/**
 * Guard kiểm tra role của user hiện tại có nằm trong danh sách role cho phép.
 * Sử dụng kết hợp với @Roles() decorator.
 * ADMIN luôn được phép truy cập mọi route có @Roles() (superuser bypass).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lấy danh sách role được phép từ @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu không có @Roles(), cho phép truy cập (chỉ cần JWT)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Không có quyền truy cập!');
    }

    // ADMIN luôn bypass
    if (user.role === Role.ADMIN) {
      return true;
    }

    // Kiểm tra role user có nằm trong danh sách cho phép
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Bạn cần quyền ${requiredRoles.join(' hoặc ')} để truy cập tài nguyên này.`,
      );
    }

    return true;
  }
}
