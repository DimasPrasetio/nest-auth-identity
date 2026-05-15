import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthContext } from '../common/types';

export const CurrentUserId = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<{ authContext?: AuthContext }>();
  return request.authContext?.userId;
});
