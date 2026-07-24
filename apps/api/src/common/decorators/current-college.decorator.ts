import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentCollege = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Assuming the user object is attached to the request by the AuthGuard
    return request.user?.collegeId;
  },
);
