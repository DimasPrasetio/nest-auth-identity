import { AuthIdentityError } from '../common/errors';
import type { PasswordPolicyOptions } from '../config/auth-identity-options';

export function assertPasswordPolicy(password: string, policy: Required<PasswordPolicyOptions>): void {
  const failures: string[] = [];

  if (password.length < policy.minLength) {
    failures.push(`Password must be at least ${policy.minLength} characters.`);
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    failures.push('Password must contain an uppercase letter.');
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    failures.push('Password must contain a lowercase letter.');
  }
  if (policy.requireNumber && !/\d/.test(password)) {
    failures.push('Password must contain a number.');
  }
  if (policy.requireSymbol && !/[^A-Za-z0-9]/.test(password)) {
    failures.push('Password must contain a symbol.');
  }

  if (failures.length > 0) {
    throw new AuthIdentityError('AUTH_INVALID_PASSWORD_POLICY', 'Password does not satisfy the configured policy.', { failures });
  }
}
