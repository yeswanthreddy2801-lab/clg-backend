import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true; // Let AuthGuard handle unauthenticated users
    }

    if (user.role === 'super_admin') {
      return true; // Super admins can bypass tenant scoping
    }

    const requestedCollegeId =
      request.params?.collegeId ||
      request.query?.collegeId ||
      request.body?.collegeId;

    if (requestedCollegeId && requestedCollegeId !== user.collegeId) {
      throw new ForbiddenException('You cannot access resources from a different college');
    }

    return true;
  }
}
