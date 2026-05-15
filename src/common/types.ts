export type MaybePromise<T> = T | Promise<T>;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type AuthFeatureName =
  | 'register'
  | 'login'
  | 'refreshToken'
  | 'session'
  | 'resetPassword'
  | 'role'
  | 'permission'
  | 'grant'
  | 'applicationAccess'
  | 'serviceCredential'
  | 'auditLog'
  | 'identityDocument'
  | 'profileMetadata';

export type PrincipalType = 'user' | 'service';

export interface AuthenticatedPrincipal {
  id: string;
  type: PrincipalType;
  roles?: string[];
  permissions?: string[];
  grants?: string[];
  applicationId?: string;
}

export interface AuthContext {
  principal: AuthenticatedPrincipal;
  userId?: string;
  sessionId?: string;
  tokenId: string;
  tokenType: PrincipalType;
  roles: string[];
  permissions: string[];
  grants: string[];
  applicationId?: string;
}

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  requestId?: string;
}

