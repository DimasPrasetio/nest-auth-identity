import type { AuthContext } from '../common/types';
import type { PublicUserIdentity } from '../contracts/entities';

export interface AuthenticatedHttpRequest {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
  get?(name: string): string | undefined;
  authContext?: AuthContext;
  user?: PublicUserIdentity;
}

export function extractBearerToken(request: AuthenticatedHttpRequest): string | undefined {
  const header = request.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) {
    return undefined;
  }

  const [scheme, token] = value.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return undefined;
  }

  return token;
}
