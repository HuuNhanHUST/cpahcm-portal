import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator để chỉ định các role được phép truy cập route.
 * Sử dụng: @Roles(Role.SUPER_ADMIN, Role.EMPLOYER)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
