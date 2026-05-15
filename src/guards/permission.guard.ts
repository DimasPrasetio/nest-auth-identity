import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthIdentityError } from '../common/errors';
import { AuthorizationService } from '../authorization/authorization.service';
import { AUTH_PERMISSIONS_METADATA } from '../decorators/auth-metadata.constants';
import type { AuthenticatedHttpRequest } from './request-context';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.reflector.getAllAndOverride<string[]>(AUTH_PERMISSIONS_METADATA, [context.getHandler(), context.getClass()]) ?? [];
    if (permissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedHttpRequest>();
    const userId = request.authContext?.userId;
    if (!userId) {
      throw new AuthIdentityError('AUTH_FORBIDDEN_PERMISSION');
    }

    await this.authorizationService.assertUserHasPermissions(userId, permissions, true);
    return true;
  }
}
