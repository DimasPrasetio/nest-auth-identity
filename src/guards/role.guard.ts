import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthIdentityError } from '../common/errors';
import { AuthorizationService } from '../authorization/authorization.service';
import { AUTH_ROLES_METADATA } from '../decorators/auth-metadata.constants';
import type { AuthenticatedHttpRequest } from './request-context';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<string[]>(AUTH_ROLES_METADATA, [context.getHandler(), context.getClass()]) ?? [];
    if (roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedHttpRequest>();
    const userId = request.authContext?.userId;
    if (!userId) {
      throw new AuthIdentityError('AUTH_FORBIDDEN_ROLE');
    }

    await this.authorizationService.assertUserHasAnyRole(userId, roles);
    return true;
  }
}
