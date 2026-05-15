import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthIdentityError } from '../common/errors';
import { AUTH_PUBLIC_METADATA } from '../decorators/auth-metadata.constants';
import { AuthService } from '../auth/auth.service';
import { extractBearerToken } from './request-context';
import type { AuthenticatedHttpRequest } from './request-context';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(AUTH_PUBLIC_METADATA, [context.getHandler(), context.getClass()]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedHttpRequest>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new AuthIdentityError('AUTH_TOKEN_INVALID', 'Bearer token is required.');
    }

    const authContext = await this.authService.validateAccessToken(token);
    request.authContext = authContext;
    const user = await this.authService.getCurrentUser(authContext);
    if (user) {
      request.user = user;
    }

    return true;
  }
}
