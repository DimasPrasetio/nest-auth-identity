import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthContext as AuthIdentityContext } from '../common/types';

export const AuthContext = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<{ authContext?: AuthIdentityContext }>();
  return request.authContext;
});
