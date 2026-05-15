import { HttpException } from '@nestjs/common';
import { AuthFeatureName } from './types';
import { AuthErrorCode } from './error-codes';

const DEFAULT_MESSAGES: Record<AuthErrorCode, string> = {
  AUTH_FEATURE_DISABLED: 'Feature is disabled.',
  AUTH_INVALID_CREDENTIAL: 'Credential is invalid.',
  AUTH_USER_INACTIVE: 'User is inactive.',
  AUTH_TOKEN_EXPIRED: 'Token is expired.',
  AUTH_TOKEN_INVALID: 'Token is invalid.',
  AUTH_SESSION_REVOKED: 'Session is revoked.',
  AUTH_REFRESH_TOKEN_INVALID: 'Refresh token is invalid.',
  AUTH_FORBIDDEN_ROLE: 'Required role is missing.',
  AUTH_FORBIDDEN_PERMISSION: 'Required permission is missing.',
  AUTH_FORBIDDEN_GRANT: 'Required grant is missing.',
  AUTH_STORAGE_ERROR: 'Storage operation failed.',
  AUTH_DUPLICATE_IDENTITY: 'Email, username, or phone number is already used.',
  AUTH_INVALID_PASSWORD_POLICY: 'Password does not satisfy the configured policy.',
  AUTH_METADATA_INVALID: 'Profile metadata is invalid.',
  AUTH_SENSITIVE_DATA_NOT_ALLOWED_IN_METADATA: 'Metadata contains sensitive data that must use identity documents.',
  AUTH_IDENTITY_DOCUMENT_FORBIDDEN: 'Identity document access is forbidden.',
  AUTH_IDENTITY_DOCUMENT_INVALID: 'Identity document is invalid.',
  AUTH_ENCRYPTION_FAILED: 'Sensitive data encryption failed.',
  AUTH_PACKAGE_CONFIG_INVALID: 'Package configuration is invalid.',
  AUTH_ADAPTER_NOT_CONFIGURED: 'Storage adapter is not configured.',
  AUTH_VALIDATION_ERROR: 'Input validation failed.',
};

const DEFAULT_STATUS: Record<AuthErrorCode, number> = {
  AUTH_FEATURE_DISABLED: 403,
  AUTH_INVALID_CREDENTIAL: 401,
  AUTH_USER_INACTIVE: 403,
  AUTH_TOKEN_EXPIRED: 401,
  AUTH_TOKEN_INVALID: 401,
  AUTH_SESSION_REVOKED: 401,
  AUTH_REFRESH_TOKEN_INVALID: 401,
  AUTH_FORBIDDEN_ROLE: 403,
  AUTH_FORBIDDEN_PERMISSION: 403,
  AUTH_FORBIDDEN_GRANT: 403,
  AUTH_STORAGE_ERROR: 500,
  AUTH_DUPLICATE_IDENTITY: 409,
  AUTH_INVALID_PASSWORD_POLICY: 400,
  AUTH_METADATA_INVALID: 400,
  AUTH_SENSITIVE_DATA_NOT_ALLOWED_IN_METADATA: 400,
  AUTH_IDENTITY_DOCUMENT_FORBIDDEN: 403,
  AUTH_IDENTITY_DOCUMENT_INVALID: 400,
  AUTH_ENCRYPTION_FAILED: 500,
  AUTH_PACKAGE_CONFIG_INVALID: 500,
  AUTH_ADAPTER_NOT_CONFIGURED: 500,
  AUTH_VALIDATION_ERROR: 400,
};

export interface AuthIdentityErrorResponse {
  code: AuthErrorCode;
  message: string;
  details?: unknown;
}

export class AuthIdentityError extends HttpException {
  readonly code: AuthErrorCode;
  readonly details?: unknown;

  constructor(code: AuthErrorCode, message = DEFAULT_MESSAGES[code], details?: unknown, statusCode = DEFAULT_STATUS[code]) {
    super({ code, message, details } satisfies AuthIdentityErrorResponse, statusCode);
    this.name = 'AuthIdentityError';
    this.code = code;
    this.details = details;
  }
}

export function featureDisabled(feature: AuthFeatureName): AuthIdentityError {
  return new AuthIdentityError('AUTH_FEATURE_DISABLED', `Feature "${feature}" is disabled.`, { feature });
}

export function storageError(message: string, cause?: unknown): AuthIdentityError {
  return new AuthIdentityError('AUTH_STORAGE_ERROR', message, { cause });
}
