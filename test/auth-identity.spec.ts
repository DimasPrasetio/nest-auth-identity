import { describe, expect, it } from 'vitest';
import { InMemoryAuthIdentityAdapter } from '../src/adapters/in-memory';
import { AuthIdentityModule } from '../src/auth-identity.module';
import { AuditService } from '../src/audit/audit.service';
import { AuthService } from '../src/auth/auth.service';
import { Pbkdf2PasswordHasher } from '../src/auth/password-hasher';
import { createAuthIdentityIdGenerator, RandomUuidGenerator } from '../src/common/id-generator';
import { SystemClock } from '../src/common/clock';
import { normalizeAuthIdentityOptions } from '../src/config/auth-identity-options';
import { UserService } from '../src/identity/user.service';
import { ProfileMetadataService } from '../src/profile/profile-metadata.service';
import { SessionService } from '../src/session/session.service';
import { TokenService } from '../src/token/token.service';

describe('Auth identity vertical slice', () => {
  it('registers, logs in, refreshes with rotation, and rejects revoked sessions', async () => {
    const { authService } = createFixture();

    const registered = await authService.register({
      name: 'Dimas',
      email: 'DIMAS@example.com',
      username: 'Dimas',
      password: 'password123',
      metadata: { gender: 'male' },
    });

    expect(registered.email).toBe('dimas@example.com');
    expect(registered.id).toBe('1');
    expect('passwordHash' in registered).toBe(false);

    const login = await authService.login({
      identifier: 'dimas@example.com',
      password: 'password123',
    });

    expect(login.accessToken).toBeTruthy();
    expect(login.refreshToken).toBeTruthy();
    expect(login.session?.id).toBeTruthy();

    const context = await authService.validateAccessToken(login.accessToken);
    expect(context.userId).toBe(registered.id);
    expect(context.sessionId).toBe(login.session?.id);

    const refresh = await authService.refreshToken(login.refreshToken!);
    expect(refresh.accessToken).toBeTruthy();
    expect(refresh.refreshToken).toBeTruthy();

    await expect(authService.refreshToken(login.refreshToken!)).rejects.toMatchObject({
      code: 'AUTH_REFRESH_TOKEN_INVALID',
    });

    await authService.logout(refresh.session.id);
    await expect(authService.validateAccessToken(refresh.accessToken)).rejects.toMatchObject({
      code: 'AUTH_SESSION_REVOKED',
    });
  });

  it('rejects sensitive profile metadata', async () => {
    const { authService } = createFixture();

    await expect(
      authService.register({
        name: 'Sensitive User',
        email: 'sensitive@example.com',
        password: 'password123',
        metadata: { nik: '1234567890' },
      }),
    ).rejects.toMatchObject({
      code: 'AUTH_SENSITIVE_DATA_NOT_ALLOWED_IN_METADATA',
    });
  });

  it('validates runtime input for direct service usage', async () => {
    const { authService } = createFixture();

    await expect(
      authService.register({
        name: 'Invalid Email',
        email: 'not-an-email',
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      code: 'AUTH_VALIDATION_ERROR',
    });
  });

  it('uses password reset tokens once and revokes old sessions', async () => {
    const { authService } = createFixture();

    await authService.register({
      name: 'Reset User',
      email: 'reset@example.com',
      password: 'oldpassword',
    });

    const login = await authService.login({
      identifier: 'reset@example.com',
      password: 'oldpassword',
    });

    const resetRequest = await authService.requestPasswordReset({ identifier: 'reset@example.com' });
    expect(resetRequest.resetToken).toBeTruthy();

    await authService.resetPassword({
      token: resetRequest.resetToken!,
      newPassword: 'newpassword',
    });

    await expect(
      authService.login({
        identifier: 'reset@example.com',
        password: 'oldpassword',
      }),
    ).rejects.toMatchObject({
      code: 'AUTH_INVALID_CREDENTIAL',
    });

    const nextLogin = await authService.login({
      identifier: 'reset@example.com',
      password: 'newpassword',
    });
    expect(nextLogin.accessToken).toBeTruthy();

    await expect(authService.validateAccessToken(login.accessToken)).rejects.toMatchObject({
      code: 'AUTH_SESSION_REVOKED',
    });

    await expect(
      authService.resetPassword({
        token: resetRequest.resetToken!,
        newPassword: 'anotherpassword',
      }),
    ).rejects.toMatchObject({
      code: 'AUTH_TOKEN_INVALID',
    });
  });

  it('can switch ID generation from default increment to UUID', () => {
    const increment = createAuthIdentityIdGenerator({ strategy: 'increment' });
    expect(increment.generate('usr')).toBe('1');
    expect(increment.generate('usr')).toBe('2');
    expect(increment.generate('ses')).toBe('1');

    const uuid = new RandomUuidGenerator({ prefix: false });
    expect(uuid.generate('usr')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('supports storage-generated IDs and controller toggles for different app sizes', async () => {
    const { authService } = createFixture({
      id: {
        strategy: 'increment',
        source: 'storage',
      },
    });

    const user = await authService.register({
      name: 'Storage Generated',
      email: 'storage@example.com',
      password: 'password123',
    });
    expect(user.id).toBe('1');

    const disabledControllers = AuthIdentityModule.forRoot({
      jwt: {
        secret: 'test-secret-that-is-long-enough',
      },
      storage: {
        adapter: new InMemoryAuthIdentityAdapter(),
      },
      controllers: {
        enabled: false,
      },
    });
    expect(disabledControllers.controllers).toEqual([]);

    const authOnly = AuthIdentityModule.forRoot({
      jwt: {
        secret: 'test-secret-that-is-long-enough',
      },
      storage: {
        adapter: new InMemoryAuthIdentityAdapter(),
      },
      controllers: {
        auth: true,
        identity: false,
        authorization: false,
      },
    });
    expect(authOnly.controllers?.map((controller) => controller.name)).toEqual(['AuthController']);
  });
});

function createFixture(overrides: Partial<Parameters<typeof normalizeAuthIdentityOptions>[0]> = {}) {
  const adapter = new InMemoryAuthIdentityAdapter();
  const options = normalizeAuthIdentityOptions({
    jwt: {
      secret: 'test-secret-that-is-long-enough',
      accessTokenExpiresIn: '15m',
      refreshTokenExpiresIn: '30d',
      issuer: 'test',
      audience: 'test-app',
    },
    password: {
      pbkdf2Iterations: 1_000,
      policy: {
        minLength: 8,
      },
    },
    storage: {
      adapter,
    },
    ...overrides,
  });

  const clock = new SystemClock();
  const idGenerator = createAuthIdentityIdGenerator(options.id);
  const passwordHasher = new Pbkdf2PasswordHasher(options);
  const tokenService = new TokenService(options, clock, idGenerator);
  const auditService = new AuditService(options, adapter, clock, idGenerator);
  const userService = new UserService(options, adapter, clock, idGenerator);
  const profileMetadataService = new ProfileMetadataService(options, adapter, clock);
  const sessionService = new SessionService(options, adapter, clock, idGenerator, tokenService);
  const authService = new AuthService(
    options,
    adapter,
    passwordHasher,
    clock,
    idGenerator,
    userService,
    profileMetadataService,
    tokenService,
    sessionService,
    auditService,
  );

  return {
    adapter,
    authService,
  };
}
