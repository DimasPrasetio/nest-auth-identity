import { DynamicModule, InjectionToken, Module, OptionalFactoryDependency, Provider } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApplicationAccessService } from './application-access/application-access.service';
import { AuditService } from './audit/audit.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { Pbkdf2PasswordHasher } from './auth/password-hasher';
import { AuthorizationController } from './authorization/authorization.controller';
import { AuthorizationService } from './authorization/authorization.service';
import { SystemClock } from './common/clock';
import { NoopEncryptionProvider } from './common/encryption';
import { AuthIdentityError } from './common/errors';
import { createAuthIdentityIdGenerator } from './common/id-generator';
import {
  AUTH_IDENTITY_CLOCK,
  AUTH_IDENTITY_ENCRYPTION,
  AUTH_IDENTITY_ID_GENERATOR,
  AUTH_IDENTITY_OPTIONS,
  AUTH_IDENTITY_PASSWORD_HASHER,
  AUTH_IDENTITY_STORAGE_ADAPTER,
} from './common/tokens';
import {
  normalizeAuthIdentityOptions,
} from './config/auth-identity-options';
import type { PasswordHasher } from './auth/password-hasher';
import type { AuthIdentityClock } from './common/clock';
import type { EncryptionProvider } from './common/encryption';
import type { AuthIdentityIdGenerator } from './common/id-generator';
import type {
  AuthIdentityAsyncOptions,
  AuthIdentityOptions,
  AuthIdentityOptionsFactory,
  ControllerAuthIdentityOptions,
  NormalizedAuthIdentityOptions,
} from './config/auth-identity-options';
import type { AuthIdentityStorageAdapter } from './contracts/storage-adapter';
import { IdentityDocumentService } from './identity-document/identity-document.service';
import { IdentityController } from './identity/identity.controller';
import { UserService } from './identity/user.service';
import { ProfileMetadataService } from './profile/profile-metadata.service';
import { ServiceCredentialService } from './service-credential/service-credential.service';
import { SessionService } from './session/session.service';
import { TokenService } from './token/token.service';
import { GrantGuard, JwtAuthGuard, PermissionGuard, RoleGuard, SessionGuard } from './guards';

const CORE_PROVIDERS: Provider[] = [
  Reflector,
  {
    provide: AUTH_IDENTITY_STORAGE_ADAPTER,
    inject: [AUTH_IDENTITY_OPTIONS],
    useFactory: (options: ReturnType<typeof normalizeAuthIdentityOptions>): AuthIdentityStorageAdapter => options.storage.adapter,
  },
  {
    provide: AUTH_IDENTITY_PASSWORD_HASHER,
    useClass: Pbkdf2PasswordHasher,
  },
  {
    provide: AUTH_IDENTITY_CLOCK,
    useClass: SystemClock,
  },
  {
    provide: AUTH_IDENTITY_ID_GENERATOR,
    inject: [AUTH_IDENTITY_OPTIONS],
    useFactory: (options: ReturnType<typeof normalizeAuthIdentityOptions>) => createAuthIdentityIdGenerator(options.id),
  },
  {
    provide: AUTH_IDENTITY_ENCRYPTION,
    useClass: NoopEncryptionProvider,
  },
  Pbkdf2PasswordHasher,
  TokenService,
  SessionService,
  AuditService,
  UserService,
  ProfileMetadataService,
  AuthService,
  AuthorizationService,
  ApplicationAccessService,
  ServiceCredentialService,
  IdentityDocumentService,
  JwtAuthGuard,
  SessionGuard,
  RoleGuard,
  PermissionGuard,
  GrantGuard,
];

const PUBLIC_EXPORTS = [
  AUTH_IDENTITY_OPTIONS,
  AUTH_IDENTITY_STORAGE_ADAPTER,
  AUTH_IDENTITY_PASSWORD_HASHER,
  AUTH_IDENTITY_CLOCK,
  AUTH_IDENTITY_ID_GENERATOR,
  AUTH_IDENTITY_ENCRYPTION,
  TokenService,
  SessionService,
  AuditService,
  UserService,
  ProfileMetadataService,
  AuthService,
  AuthorizationService,
  ApplicationAccessService,
  ServiceCredentialService,
  IdentityDocumentService,
  JwtAuthGuard,
  SessionGuard,
  RoleGuard,
  PermissionGuard,
  GrantGuard,
];

@Module({})
export class AuthIdentityModule {
  static forRoot(options: AuthIdentityOptions): DynamicModule {
    const normalizedOptions = normalizeOptionsOrThrow(options);
    return {
      module: AuthIdentityModule,
      providers: [
        {
          provide: AUTH_IDENTITY_OPTIONS,
          useValue: normalizedOptions,
        },
        ...CORE_PROVIDERS,
      ],
      controllers: resolveControllers(normalizedOptions.controllers),
      exports: PUBLIC_EXPORTS,
    };
  }

  static forRootAsync(options: AuthIdentityAsyncOptions): DynamicModule {
    return {
      module: AuthIdentityModule,
      imports: options.imports ?? [],
      providers: [...createAsyncProviders(options), ...(options.extraProviders ?? []), ...CORE_PROVIDERS],
      controllers: resolveControllers(normalizeControllerOptions(options.controllers)),
      exports: PUBLIC_EXPORTS,
    };
  }
}

function resolveControllers(options: Required<ControllerAuthIdentityOptions>): NonNullable<DynamicModule['controllers']> {
  if (!options.enabled) {
    return [];
  }

  return [
    ...(options.auth ? [AuthController] : []),
    ...(options.identity ? [IdentityController] : []),
    ...(options.authorization ? [AuthorizationController] : []),
  ];
}

function normalizeControllerOptions(options?: ControllerAuthIdentityOptions): NormalizedAuthIdentityOptions['controllers'] {
  return {
    enabled: options?.enabled ?? true,
    auth: options?.auth ?? true,
    identity: options?.identity ?? false,
    authorization: options?.authorization ?? false,
    routePrefix: options?.routePrefix ?? '',
  };
}

function createAsyncProviders(options: AuthIdentityAsyncOptions): Provider[] {
  if (options.useFactory) {
    return [
      {
        provide: AUTH_IDENTITY_OPTIONS,
        inject: options.inject ?? [],
        useFactory: async (...args: unknown[]) => normalizeOptionsOrThrow(await options.useFactory!(...args)),
      },
    ];
  }

  const factoryInjectionToken = options.useExisting ?? options.useClass;
  const inject: Array<InjectionToken | OptionalFactoryDependency> = factoryInjectionToken ? [factoryInjectionToken] : [];
  const providers: Provider[] = [
    {
      provide: AUTH_IDENTITY_OPTIONS,
      inject,
      useFactory: async (factory: AuthIdentityOptionsFactory) => normalizeOptionsOrThrow(await factory.createAuthIdentityOptions()),
    },
  ];

  if (options.useClass) {
    providers.push({
      provide: options.useClass,
      useClass: options.useClass,
    });
  }

  return providers;
}

function normalizeOptionsOrThrow(options: AuthIdentityOptions) {
  try {
    return normalizeAuthIdentityOptions(options);
  } catch (cause) {
    if (cause instanceof AuthIdentityError) {
      throw cause;
    }
    const message = cause instanceof Error ? cause.message : undefined;
    if (message === 'AUTH_ADAPTER_NOT_CONFIGURED') {
      throw new AuthIdentityError('AUTH_ADAPTER_NOT_CONFIGURED');
    }
    throw new AuthIdentityError('AUTH_PACKAGE_CONFIG_INVALID', message, { cause });
  }
}

export type {
  AuthIdentityClock,
  AuthIdentityIdGenerator,
  EncryptionProvider,
  PasswordHasher,
};
