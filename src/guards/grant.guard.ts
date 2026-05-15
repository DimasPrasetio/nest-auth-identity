import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthIdentityError } from '../common/errors';
import { AuthorizationService } from '../authorization/authorization.service';
import { AUTH_GRANTS_METADATA } from '../decorators/auth-metadata.constants';
import type { AuthenticatedHttpRequest } from './request-context';

@Injectable()
export class GrantGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const grants = this.reflector.getAllAndOverride<string[]>(AUTH_GRANTS_METADATA, [context.getHandler(), context.getClass()]) ?? [];
    if (grants.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedHttpRequest>();
    const principal = request.authContext?.principal;
    if (!principal) {
      throw new AuthIdentityError('AUTH_FORBIDDEN_GRANT');
    }

    const subjectType = principal.type === 'service' ? 'serviceCredential' : 'user';
    await this.authorizationService.assertSubjectHasGrants(subjectType, principal.id, grants, true);
    return true;
  }
}
