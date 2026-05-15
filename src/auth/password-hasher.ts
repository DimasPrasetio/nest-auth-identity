import { Inject, Injectable } from '@nestjs/common';
import { pbkdf2, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { AUTH_IDENTITY_OPTIONS } from '../common/tokens';
import { timingSafeStringEqual } from '../common/security';
import type { NormalizedAuthIdentityOptions } from '../config/auth-identity-options';

const pbkdf2Async = promisify(pbkdf2);

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

@Injectable()
export class Pbkdf2PasswordHasher implements PasswordHasher {
  constructor(@Inject(AUTH_IDENTITY_OPTIONS) private readonly options: NormalizedAuthIdentityOptions) {}

  async hash(password: string): Promise<string> {
    const iterations = this.options.password.pbkdf2Iterations;
    const salt = randomBytes(16).toString('base64url');
    const derived = await pbkdf2Async(password, salt, iterations, 32, 'sha256');
    return `pbkdf2_sha256$${iterations}$${salt}$${derived.toString('base64url')}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const [algorithm, iterationsRaw, salt, digest] = hash.split('$');
    if (algorithm !== 'pbkdf2_sha256' || !iterationsRaw || !salt || !digest) {
      return false;
    }

    const iterations = Number(iterationsRaw);
    if (!Number.isInteger(iterations) || iterations <= 0) {
      return false;
    }

    const derived = await pbkdf2Async(password, salt, iterations, 32, 'sha256');
    return timingSafeStringEqual(derived.toString('base64url'), digest);
  }
}
