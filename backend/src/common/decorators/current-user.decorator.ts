import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator để extract user hiện tại từ request.
 * Sử dụng: @CurrentUser() user hoặc @CurrentUser('email') email
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
