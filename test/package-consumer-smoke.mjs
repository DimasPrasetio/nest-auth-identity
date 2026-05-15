import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tempRoot = await mkdtemp(join(tmpdir(), 'nest-auth-identity-consumer-'));
const packDir = join(tempRoot, 'pack');
const consumerDir = join(tempRoot, 'consumer');

try {
  await ensureDirectory(packDir);
  await ensureDirectory(consumerDir);
  await exec('npm', ['run', 'build'], repoRoot);
  await exec('npm', ['pack', '--pack-destination', packDir], repoRoot);

  const tarballName = (await readdir(packDir)).find((file) => file.endsWith('.tgz'));
  if (!tarballName) {
    throw new Error('Package tarball was not created.');
  }
  const tarballPath = join(packDir, tarballName);

  await exec('npm', ['init', '-y'], consumerDir);
  await exec('npm', ['install', tarballPath, '@nestjs/common@^11.1.1', '@nestjs/core@^11.1.1', '@nestjs/platform-express@^11.1.1', 'reflect-metadata@^0.2.2', 'rxjs@^7.8.2'], consumerDir);

  await writeFile(
    join(consumerDir, 'smoke.mjs'),
    `
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AuthIdentityModule, InMemoryAuthIdentityAdapter } from '@elcodelabs/nest-auth-identity';

class AppModule {}
Module({
  imports: [
    AuthIdentityModule.forRoot({
      preset: 'basic',
      jwt: {
        secret: 'consumer-smoke-secret-that-is-long-enough',
        accessTokenExpiresIn: '15m',
        refreshTokenExpiresIn: '30d',
        issuer: 'consumer-smoke',
        audience: 'consumer-client',
      },
      storage: {
        adapter: new InMemoryAuthIdentityAdapter(),
      },
      password: {
        pbkdf2Iterations: 1000,
        policy: {
          minLength: 8,
        },
      },
      session: {
        validateOnRequest: true,
        refreshTokenRotation: true,
      },
      controllers: {
        auth: true,
        identity: false,
        authorization: false,
      },
    }),
  ],
})(AppModule);

const app = await NestFactory.create(AppModule, { logger: false });
await app.listen(0, '127.0.0.1');
const baseUrl = await app.getUrl();

async function json(method, path, body, token) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: 'Bearer ' + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : undefined };
}

const register = await json('POST', '/auth/register', {
  name: 'Consumer User',
  email: 'CONSUMER@example.com',
  password: 'password123',
});
assert(register.status === 201, 'register should return 201');
assert(register.body.email === 'consumer@example.com', 'register should normalize email');
assert(!('passwordHash' in register.body), 'register response must not expose passwordHash');

const login = await json('POST', '/auth/login', {
  identifier: 'consumer@example.com',
  password: 'password123',
});
assert(login.status === 201, 'login should return 201');
assert(typeof login.body.accessToken === 'string', 'login should return access token');
assert(typeof login.body.refreshToken === 'string', 'login should return refresh token');

const me = await json('GET', '/auth/me', undefined, login.body.accessToken);
assert(me.status === 200, 'me should return 200');
assert(me.body.email === 'consumer@example.com', 'me should return current user');

const refresh = await json('POST', '/auth/refresh', {
  refreshToken: login.body.refreshToken,
});
assert(refresh.status === 201, 'refresh should return 201');
assert(refresh.body.refreshToken !== login.body.refreshToken, 'refresh should rotate token');

const replay = await json('POST', '/auth/refresh', {
  refreshToken: login.body.refreshToken,
});
assert(replay.status === 401, 'old refresh token should be rejected');
assert(replay.body.code === 'AUTH_REFRESH_TOKEN_INVALID', 'old refresh token should return auth error');

const logout = await json('POST', '/auth/logout', {}, refresh.body.accessToken);
assert(logout.status === 201, 'logout should return 201');

const revoked = await json('GET', '/auth/me', undefined, refresh.body.accessToken);
assert(revoked.status === 401, 'revoked session should reject access token');
assert(revoked.body.code === 'AUTH_SESSION_REVOKED', 'revoked session should return auth error');

await app.close();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
`,
  );

  await exec('node', ['smoke.mjs'], consumerDir);
  console.log('Package consumer smoke test passed.');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

async function exec(command, args, cwd) {
  await ensureDirectory(cwd);
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd,
    shell: process.platform === 'win32',
    maxBuffer: 1024 * 1024 * 10,
  });
  if (stderr) {
    process.stderr.write(stderr);
  }
  return stdout;
}

async function ensureDirectory(path) {
  await import('node:fs/promises').then(({ mkdir }) => mkdir(path, { recursive: true }));
}
