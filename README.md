# @elcodelabs/nest-auth-identity

Reusable authentication and identity foundation for NestJS applications.

`@elcodelabs/nest-auth-identity` provides a configurable NestJS module for user identity, authentication, JWT token handling, refresh-token sessions, profile metadata, role/permission/grant authorization, application access, service credentials, identity documents, audit logs, guards, decorators, and storage adapter contracts.

This package is designed as an internal reusable module, not as a standalone identity server. Applications import the module, provide configuration and a storage adapter, then use the built-in services, controllers, guards, and decorators.

## Status

Current status: MVP foundation.

Implemented:

- Dynamic NestJS module with `forRoot()` and `forRootAsync()`.
- Feature toggle configuration.
- Standard auth error codes.
- Storage adapter contract.
- In-memory storage adapter for development and testing.
- Register, login, logout, refresh token, token validation, password reset, and password change.
- User identity and profile metadata.
- JWT access token and hashed refresh token sessions.
- Role, permission, and grant services.
- Application access service.
- Service credential service.
- Identity document service with masking and encryption hook.
- Audit log service with metadata redaction.
- Built-in auth, identity, and authorization controllers.
- Guards and decorators for NestJS endpoints.

Not yet included:

- Production database adapter such as Prisma, TypeORM, or Mongoose.
- Example NestJS application.
- Full e2e HTTP test project.
- OAuth, SSO, MFA, multi-tenant isolation, policy engine, or admin UI.

## Requirements

Runtime requirements:

- Node.js `20` or newer is recommended.
- NestJS `10` or `11`.
- TypeScript project with decorator metadata enabled.

Peer dependencies:

```json
{
  "@nestjs/common": "^10.0.0 || ^11.0.0",
  "@nestjs/core": "^10.0.0 || ^11.0.0",
  "reflect-metadata": "^0.1.13 || ^0.2.0",
  "rxjs": "^7.8.0"
}
```

Application prerequisites:

- A strong `JWT_SECRET` provided by environment/configuration.
- A storage adapter implementation.
- A password policy suitable for the consuming application.
- A decision on ID strategy: auto-increment style or UUID.
- A decision on ID source: module-generated IDs or storage-generated IDs.
- A decision on session strategy: stateless JWT validation or session-backed validation.

## Installation

During MVP, install this package directly from the public GitHub repository.

```bash
npm install github:DimasPrasetio/nest-auth-identity
```

For a pinned version, install from a Git tag.

```bash
npm install github:DimasPrasetio/nest-auth-identity#v0.1.0
```

SSH installation is also supported when the consuming machine has GitHub SSH access.

```bash
npm install git+ssh://git@github.com/DimasPrasetio/nest-auth-identity.git
```

For local package validation:

```bash
npm pack
npm install ./elcodelabs-nest-auth-identity-0.1.0.tgz
```

## Quick Start

```ts
import { Module } from '@nestjs/common';
import {
  AuthIdentityModule,
  InMemoryAuthIdentityAdapter,
} from '@elcodelabs/nest-auth-identity';

@Module({
  imports: [
    AuthIdentityModule.forRoot({
      jwt: {
        secret: process.env.JWT_SECRET!,
        accessTokenExpiresIn: '15m',
        refreshTokenExpiresIn: '30d',
        issuer: 'identity',
        audience: 'internal-app',
      },
      storage: {
        adapter: new InMemoryAuthIdentityAdapter(),
      },
    }),
  ],
})
export class AppModule {}
```

`InMemoryAuthIdentityAdapter` is suitable for development, tests, and local examples. Do not use it as production storage because data is kept only in process memory.

## Configuration

### Usage Profiles

The module is intended to scale from learning projects to production systems.

For college assignments, exercises, and prototypes:

```ts
AuthIdentityModule.forRoot({
  preset: 'basic',
  jwt: {
    secret: 'local-development-secret',
  },
  storage: {
    adapter: new InMemoryAuthIdentityAdapter(),
  },
});
```

For small dashboards and internal tools:

```ts
AuthIdentityModule.forRoot({
  preset: 'standard',
  jwt: {
    secret: process.env.JWT_SECRET!,
  },
  storage: {
    adapter: new InMemoryAuthIdentityAdapter(),
  },
  controllers: {
    auth: true,
    identity: true,
    authorization: true,
  },
});
```

For production applications:

```ts
AuthIdentityModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService, PrismaService],
  controllers: {
    auth: true,
    identity: false,
    authorization: false,
  },
  useFactory: (config: ConfigService, prisma: PrismaService) => ({
    preset: 'production',
    jwt: {
      secret: config.getOrThrow('JWT_SECRET'),
      accessTokenExpiresIn: config.get('JWT_ACCESS_TTL', '15m'),
      refreshTokenExpiresIn: config.get('JWT_REFRESH_TTL', '30d'),
    },
    storage: {
      adapter: new PrismaAuthIdentityAdapter(prisma),
    },
    id: {
      strategy: 'increment',
      source: 'storage',
    },
    session: {
      validateOnRequest: true,
      refreshTokenRotation: true,
    },
  }),
});
```

`controllers` in `forRootAsync()` is intentionally static because NestJS registers controllers during module construction. Runtime secrets and storage should still be supplied from `useFactory()`.

Full configuration example:

```ts
AuthIdentityModule.forRoot({
  jwt: {
    secret: process.env.JWT_SECRET!,
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '30d',
    issuer: 'identity',
    audience: 'internal-app',
  },
  storage: {
    adapter: new InMemoryAuthIdentityAdapter(),
  },
  id: {
    strategy: 'increment',
    source: 'module',
    startAt: 1,
    prefix: false,
  },
  password: {
    algorithm: 'pbkdf2_sha256',
    pbkdf2Iterations: 210_000,
    policy: {
      minLength: 8,
      requireUppercase: false,
      requireLowercase: false,
      requireNumber: false,
      requireSymbol: false,
    },
  },
  session: {
    validateOnRequest: true,
    refreshTokenRotation: true,
  },
  metadata: {
    sensitiveKeys: ['nationalId', 'taxId'],
  },
  identityDocument: {
    fullReadPermission: 'identity_documents.read_full',
  },
  features: {
    register: true,
    login: true,
    refreshToken: true,
    session: true,
    resetPassword: true,
    role: true,
    permission: true,
    grant: true,
    applicationAccess: true,
    serviceCredential: true,
    auditLog: true,
    identityDocument: true,
    profileMetadata: true,
  },
  controllers: {
    enabled: true,
    auth: true,
    identity: false,
    authorization: false,
  },
});
```

Async configuration:

```ts
AuthIdentityModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    jwt: {
      secret: config.getOrThrow('JWT_SECRET'),
      accessTokenExpiresIn: config.get('JWT_ACCESS_TTL', '15m'),
      refreshTokenExpiresIn: config.get('JWT_REFRESH_TTL', '30d'),
    },
    storage: {
      adapter: config.getOrThrow('AUTH_IDENTITY_STORAGE_ADAPTER'),
    },
  }),
});
```

## ID Strategy

By default, IDs are generated using auto-increment style values per entity scope.

```ts
id: {
  strategy: 'increment',
  source: 'module',
  startAt: 1,
}
```

Example behavior:

```ts
idGenerator.generate('usr'); // "1"
idGenerator.generate('usr'); // "2"
idGenerator.generate('ses'); // "1"
```

Use UUID when the consuming project needs globally unique primary keys:

```ts
id: {
  strategy: 'uuid',
}
```

Enable prefixes if the project wants visible scoped IDs:

```ts
id: {
  strategy: 'increment',
  prefix: true,
}
```

This produces values such as `usr_1`, `ses_1`, or `usr_<uuid>`.

Internally, IDs are exposed as strings so HTTP APIs and custom adapters can handle integer auto-increment IDs, UUIDs, or database-specific key formats through one consistent public contract.

For production adapters that rely on database-generated IDs, use:

```ts
id: {
  strategy: 'increment',
  source: 'storage',
}
```

With `source: 'storage'`, create inputs may receive `id: undefined`. The storage adapter must return the final persisted entity with a concrete `id`.

Session IDs and JWT IDs are still generated by the module when they are needed before persistence, for example when a session ID must be embedded in an access token.

## Controller Registration

Built-in controllers can be enabled or disabled per application.

```ts
controllers: {
  enabled: true,
  auth: true,
  identity: false,
  authorization: false,
}
```

Recommended defaults by use case:

| Use case | Controllers |
| --- | --- |
| Student exercise | `auth: true` |
| Small dashboard | `auth: true`, optionally `identity: true` |
| Internal tool | `auth: true`, `identity: true`, `authorization: true` |
| Production API | Often `auth: true` only, with custom admin controllers in the host app |

## Built-In Endpoints

Auth endpoints:

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Register a user |
| `POST` | `/auth/login` | Login with identifier and password |
| `POST` | `/auth/logout` | Revoke current session |
| `POST` | `/auth/refresh` | Rotate refresh token and issue new access token |
| `GET` | `/auth/me` | Return current authenticated user |
| `POST` | `/auth/validate` | Validate an access token |
| `POST` | `/auth/password/forgot` | Request password reset token |
| `POST` | `/auth/password/reset` | Reset password with reset token |
| `POST` | `/auth/password/change` | Change password for authenticated user |

Identity endpoints:

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/identity/users` | List users |
| `GET` | `/identity/users/:id` | Get user detail |
| `PATCH` | `/identity/users/:id` | Update user |
| `PATCH` | `/identity/users/:id/status` | Update user status |
| `GET` | `/identity/users/:id/profile` | Get profile metadata |
| `PATCH` | `/identity/users/:id/profile` | Update profile metadata |
| `GET` | `/identity/users/:id/documents` | List identity documents |
| `POST` | `/identity/users/:id/documents` | Create identity document |
| `GET` | `/identity/documents/:id` | Get masked identity document |

Authorization endpoints:

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/identity/roles` | List roles |
| `POST` | `/identity/roles` | Create role |
| `PATCH` | `/identity/roles/:id` | Update role |
| `DELETE` | `/identity/roles/:id` | Delete role |
| `GET` | `/identity/permissions` | List permissions |
| `POST` | `/identity/permissions` | Create permission |
| `PATCH` | `/identity/permissions/:id` | Update permission |
| `POST` | `/identity/users/:id/roles` | Assign role to user |
| `DELETE` | `/identity/users/:id/roles/:roleId` | Remove role from user |
| `POST` | `/identity/roles/:id/permissions` | Assign permission to role |
| `DELETE` | `/identity/roles/:id/permissions/:permissionId` | Remove permission from role |
| `POST` | `/identity/grants` | Create grant |
| `GET` | `/identity/audit-logs` | List audit logs |

## Services

The module exports service classes for applications that prefer to build their own controllers:

- `AuthService`
- `UserService`
- `ProfileMetadataService`
- `TokenService`
- `SessionService`
- `AuthorizationService`
- `ApplicationAccessService`
- `ServiceCredentialService`
- `IdentityDocumentService`
- `AuditService`

Example:

```ts
@Injectable()
export class AccountUseCase {
  constructor(private readonly authService: AuthService) {}

  login(identifier: string, password: string) {
    return this.authService.login({ identifier, password });
  }
}
```

## Guards and Decorators

Available guards:

- `JwtAuthGuard`
- `SessionGuard`
- `RoleGuard`
- `PermissionGuard`
- `GrantGuard`

Available decorators:

- `@Public()`
- `@CurrentUser()`
- `@CurrentUserId()`
- `@AuthContext()`
- `@Roles()`
- `@Permissions()`
- `@Grants()`

Example:

```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  PermissionGuard,
  Permissions,
} from '@elcodelabs/nest-auth-identity';

@Controller('account')
export class AccountController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: unknown) {
    return user;
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('users.read')
  @Get('users')
  users() {
    return [];
  }
}
```

## Storage Adapter

Core module persistence is database agnostic. All storage operations go through `AuthIdentityStorageAdapter`.

The package currently includes:

- `InMemoryAuthIdentityAdapter`

Production projects should implement a database adapter for their ORM/database, such as Prisma, TypeORM, Mongoose, or a custom repository layer.

Conceptual adapter shape:

```ts
import { AuthIdentityStorageAdapter } from '@elcodelabs/nest-auth-identity';

export class PrismaAuthIdentityAdapter implements AuthIdentityStorageAdapter {
  capabilities = [
    'users',
    'profiles',
    'sessions',
    'tokens',
    'roles',
    'permissions',
    'grants',
    'applications',
    'serviceCredentials',
    'identityDocuments',
    'auditLogs',
  ] as const;

  users = {
    createUser: async (input) => {
      // map contract input to ORM model
    },
    // implement the remaining UserStorageAdapter methods
  };
}
```

## Data Model Guidance

Store frequently queried and constrained user fields as main columns:

- `id`
- `name`
- `username`
- `email`
- `phoneNumber`
- `passwordHash`
- `status`
- `loginMethod`
- `emailVerifiedAt`
- `phoneVerifiedAt`
- `lastLoginAt`

Use profile metadata only for optional application-specific attributes:

- gender
- address
- avatar
- birthdate
- Telegram ID
- external profile reference
- custom attributes

Do not store sensitive legal identity data in profile metadata. Use identity documents for:

- NIK
- NPWP
- passport number
- KTP reference
- business registration document
- legal verification data

## Security Defaults

Current security behavior:

- Passwords are stored as PBKDF2 hashes.
- Refresh tokens are stored as SHA-256 hashes.
- Client secrets are stored as password hashes.
- Access tokens are signed as JWT HS256 using the configured `jwt.secret`.
- Expired, malformed, invalid, or revoked tokens are rejected.
- Session-backed validation can reject tokens from revoked sessions.
- Metadata rejects sensitive keys such as password, token, client secret, NIK, NPWP, and passport.
- Identity document values are masked by default.
- Audit metadata is redacted before storage.

Production recommendations:

- Use a strong secret from a secret manager or environment variable.
- Do not hardcode JWT secrets.
- Use HTTPS for all auth endpoints.
- Use a persistent adapter for production.
- Store document files outside the database and save only references, hashes, and metadata.
- Review password hashing settings based on target infrastructure.
- Consider using a dedicated encryption provider for identity documents.

## Error Codes

The package standardizes auth and identity failures through error codes such as:

- `AUTH_FEATURE_DISABLED`
- `AUTH_INVALID_CREDENTIAL`
- `AUTH_USER_INACTIVE`
- `AUTH_TOKEN_EXPIRED`
- `AUTH_TOKEN_INVALID`
- `AUTH_SESSION_REVOKED`
- `AUTH_REFRESH_TOKEN_INVALID`
- `AUTH_FORBIDDEN_ROLE`
- `AUTH_FORBIDDEN_PERMISSION`
- `AUTH_FORBIDDEN_GRANT`
- `AUTH_DUPLICATE_IDENTITY`
- `AUTH_INVALID_PASSWORD_POLICY`
- `AUTH_METADATA_INVALID`
- `AUTH_SENSITIVE_DATA_NOT_ALLOWED_IN_METADATA`
- `AUTH_IDENTITY_DOCUMENT_FORBIDDEN`
- `AUTH_IDENTITY_DOCUMENT_INVALID`
- `AUTH_ENCRYPTION_FAILED`
- `AUTH_PACKAGE_CONFIG_INVALID`
- `AUTH_ADAPTER_NOT_CONFIGURED`

These errors are represented by `AuthIdentityError`.

## Development

Install dependencies:

```bash
npm install
```

Run checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:package
npm run build
npm run pack:check
```

`npm run test:package` creates a temporary consumer project, packs this library into a `.tgz`, installs it into that consumer project, boots a real NestJS application, and executes the auth HTTP flow against the installed package.

Clean generated output:

```bash
npm run clean
```

## Package Output

Build output is generated in `dist/`:

- CommonJS: `dist/index.js`
- ESM: `dist/index.mjs`
- Types: `dist/index.d.ts`

## Project Documents

- Product requirements: [`PRD.md`](./PRD.md)
- Development plan: [`Plan.md`](./Plan.md)

## License

UNLICENSED. Internal Elcode Labs package.
