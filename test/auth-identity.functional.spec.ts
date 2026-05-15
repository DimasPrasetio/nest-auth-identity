import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthIdentityModule } from '../src/auth-identity.module';
import { InMemoryAuthIdentityAdapter } from '../src/adapters/in-memory';

describe('AuthIdentityModule functional HTTP flow', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('boots a NestJS host app and executes register/login/me/refresh/logout over HTTP', async () => {
    app = await createHttpApp({
      controllers: {
        auth: true,
        identity: false,
        authorization: false,
      },
    });
    const baseUrl = await listen(app);

    const register = await postJson(`${baseUrl}/auth/register`, {
      name: 'Functional User',
      email: 'FUNCTIONAL@example.com',
      username: 'Functional',
      password: 'password123',
      metadata: {
        avatar: 'https://example.test/avatar.png',
      },
    });

    expect(register.status).toBe(201);
    expect(register.body).toMatchObject({
      id: '1',
      name: 'Functional User',
      email: 'functional@example.com',
      username: 'functional',
    });
    expect(register.body.passwordHash).toBeUndefined();

    const invalidLogin = await postJson(`${baseUrl}/auth/login`, {
      identifier: 'functional@example.com',
      password: 'wrong-password',
    });

    expect(invalidLogin.status).toBe(401);
    expect(invalidLogin.body.code).toBe('AUTH_INVALID_CREDENTIAL');

    const login = await postJson(`${baseUrl}/auth/login`, {
      identifier: 'functional@example.com',
      password: 'password123',
    });

    expect(login.status).toBe(201);
    expect(login.body.accessToken).toEqual(expect.any(String));
    expect(login.body.refreshToken).toEqual(expect.any(String));
    expect(login.body.session.id).toEqual(expect.any(String));
    expect(login.body.user.passwordHash).toBeUndefined();

    const me = await getJson(`${baseUrl}/auth/me`, login.body.accessToken);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      id: '1',
      email: 'functional@example.com',
    });

    const refresh = await postJson(`${baseUrl}/auth/refresh`, {
      refreshToken: login.body.refreshToken,
    });

    expect(refresh.status).toBe(201);
    expect(refresh.body.accessToken).toEqual(expect.any(String));
    expect(refresh.body.refreshToken).toEqual(expect.any(String));
    expect(refresh.body.refreshToken).not.toBe(login.body.refreshToken);

    const replayRefresh = await postJson(`${baseUrl}/auth/refresh`, {
      refreshToken: login.body.refreshToken,
    });
    expect(replayRefresh.status).toBe(401);
    expect(replayRefresh.body.code).toBe('AUTH_REFRESH_TOKEN_INVALID');

    const logout = await postJson(
      `${baseUrl}/auth/logout`,
      {},
      {
        authorization: `Bearer ${refresh.body.accessToken}`,
      },
    );
    expect(logout.status).toBe(201);
    expect(logout.body).toEqual({ success: true });

    const revokedMe = await getJson(`${baseUrl}/auth/me`, refresh.body.accessToken);
    expect(revokedMe.status).toBe(401);
    expect(revokedMe.body.code).toBe('AUTH_SESSION_REVOKED');
  });

  it('validates requests at runtime through HTTP controllers', async () => {
    app = await createHttpApp();
    const baseUrl = await listen(app);

    const response = await postJson(`${baseUrl}/auth/register`, {
      name: 'Invalid Email',
      email: 'not-an-email',
      password: 'password123',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('AUTH_VALIDATION_ERROR');
  });

  it('can disable built-in controllers for service-only host applications', async () => {
    app = await createHttpApp({
      controllers: {
        enabled: false,
      },
    });
    const baseUrl = await listen(app);

    const response = await postJson(`${baseUrl}/auth/login`, {
      identifier: 'nobody@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(404);
  });
});

async function createHttpApp(overrides: Partial<Parameters<typeof AuthIdentityModule.forRoot>[0]> = {}) {
  const moduleRef = await Test.createTestingModule({
    imports: [
      AuthIdentityModule.forRoot({
        preset: 'basic',
        jwt: {
          secret: 'functional-test-secret-that-is-long-enough',
          accessTokenExpiresIn: '15m',
          refreshTokenExpiresIn: '30d',
          issuer: 'functional-test',
          audience: 'functional-client',
        },
        password: {
          pbkdf2Iterations: 1_000,
          policy: {
            minLength: 8,
          },
        },
        storage: {
          adapter: new InMemoryAuthIdentityAdapter(),
        },
        session: {
          validateOnRequest: true,
          refreshTokenRotation: true,
        },
        ...overrides,
      }),
    ],
  }).compile();

  const nestApp = moduleRef.createNestApplication();
  await nestApp.init();
  return nestApp;
}

async function listen(app: INestApplication): Promise<string> {
  await app.listen(0, '127.0.0.1');
  return app.getUrl();
}

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return parseResponse(response);
}

async function getJson(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  return parseResponse(response);
}

async function parseResponse(response: Response) {
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : undefined,
  };
}

