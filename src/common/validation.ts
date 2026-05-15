import { AuthIdentityError } from './errors';

export function assertPlainObject(value: unknown, field: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw validationError(field, 'Must be an object.');
  }
}

export function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw validationError(field, 'Must be a non-empty string.');
  }
}

export function assertOptionalString(value: unknown, field: string): asserts value is string | undefined {
  if (value !== undefined && typeof value !== 'string') {
    throw validationError(field, 'Must be a string.');
  }
}

export function assertOptionalDate(value: unknown, field: string): asserts value is Date | undefined {
  if (value !== undefined && !(value instanceof Date)) {
    throw validationError(field, 'Must be a Date.');
  }
}

export function assertEmail(value: string | undefined, field = 'email'): void {
  if (value !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw validationError(field, 'Must be a valid email address.');
  }
}

export function assertAtLeastOneIdentifier(input: { email?: string; username?: string; phoneNumber?: string }): void {
  if (!input.email && !input.username && !input.phoneNumber) {
    throw validationError('identifier', 'At least one of email, username, or phoneNumber is required.');
  }
}

export function validationError(field: string, message: string): AuthIdentityError {
  return new AuthIdentityError('AUTH_VALIDATION_ERROR', 'Input validation failed.', { field, message });
}

