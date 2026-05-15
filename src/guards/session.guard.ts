import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AuthIdentityError } from '../common/errors';
import { SessionService } from '../session/session.service';
import type { AuthenticatedHttpRequest } from './request-context';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(SessionService) private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedHttpRequest>();
    const sessionId = request.authContext?.sessionId;
    if (!sessionId) {
      throw new AuthIdentityError('AUTH_SESSION_REVOKED', 'Session context is required.');
    }

    await this.sessionService.validateSession(sessionId);
    return true;
  }
}
