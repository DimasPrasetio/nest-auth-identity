import { ModuleMetadata, Provider, Type } from '@nestjs/common';
import type { AuthFeatureName } from '../common/types';
import type { AuthIdentityIdGeneratorOptions } from '../common/id-generator';
import type { AuthIdentityStorageAdapter } from '../contracts/storage-adapter';

export type AuthFeatureConfig = Partial<Record<AuthFeatureName, boolean>>;

export interface JwtAuthIdentityOptions {
  secret: string;
  accessTokenExpiresIn?: string | number;
  refreshTokenExpiresIn?: string | number;
  issuer?: string;
  audience?: string | string[];
}

export interface PasswordPolicyOptions {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSymbol?: boolean;
}

export interface PasswordAuthIdentityOptions {
  algorithm?: 'pbkdf2_sha256';
  pbkdf2Iterations?: number;
  policy?: PasswordPolicyOptions;
}

export interface SessionAuthIdentityOptions {
  validateOnRequest?: boolean;
  refreshTokenRotation?: boolean;
}

export interface MetadataAuthIdentityOptions {
  sensitiveKeys?: string[];
  schema?: (metadata: Record<string, unknown>) => boolean | string;
}

export interface IdentityDocumentAuthIdentityOptions {
  fullReadPermission?: string;
}

export interface AuditAuthIdentityOptions {
  async?: boolean;
}

export interface ControllerAuthIdentityOptions {
  enabled?: boolean;
  auth?: boolean;
  identity?: boolean;
  authorization?: boolean;
  routePrefix?: string;
}

export type AuthIdentityFeaturePreset = 'basic' | 'standard' | 'secure' | 'production';

export interface AuthIdentityOptions {
  jwt: JwtAuthIdentityOptions;
  features?: AuthFeatureConfig;
  preset?: AuthIdentityFeaturePreset;
  storage: {
    adapter: AuthIdentityStorageAdapter;
  };
  password?: PasswordAuthIdentityOptions;
  session?: SessionAuthIdentityOptions;
  metadata?: MetadataAuthIdentityOptions;
  identityDocument?: IdentityDocumentAuthIdentityOptions;
  audit?: AuditAuthIdentityOptions;
  id?: AuthIdentityIdGeneratorOptions;
  controllers?: ControllerAuthIdentityOptions;
  defaultUserStatus?: string;
  defaultRole?: string;
}

export interface NormalizedAuthIdentityOptions extends Omit<AuthIdentityOptions, 'features' | 'password' | 'session' | 'id' | 'controllers'> {
  features: Required<AuthFeatureConfig>;
  password: Required<Omit<PasswordAuthIdentityOptions, 'policy'>> & {
    policy: Required<PasswordPolicyOptions>;
  };
  session: Required<SessionAuthIdentityOptions>;
  id: Required<AuthIdentityIdGeneratorOptions>;
  controllers: Required<ControllerAuthIdentityOptions>;
}

export interface AuthIdentityOptionsFactory {
  createAuthIdentityOptions(): Promise<AuthIdentityOptions> | AuthIdentityOptions;
}

export interface AuthIdentityAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  controllers?: ControllerAuthIdentityOptions;
  useExisting?: Type<AuthIdentityOptionsFactory>;
  useClass?: Type<AuthIdentityOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<AuthIdentityOptions> | AuthIdentityOptions;
  inject?: any[];
  extraProviders?: Provider[];
}

export const DEFAULT_FEATURES: Required<AuthFeatureConfig> = {
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
};

export function createAuthIdentityFeaturePreset(preset: AuthIdentityFeaturePreset): AuthFeatureConfig {
  if (preset === 'basic') {
    return {
      register: true,
      login: true,
      refreshToken: true,
      session: true,
      resetPassword: true,
      role: false,
      permission: false,
      grant: false,
      applicationAccess: false,
      serviceCredential: false,
      auditLog: false,
      identityDocument: false,
      profileMetadata: true,
    };
  }

  if (preset === 'standard') {
    return {
      register: true,
      login: true,
      refreshToken: true,
      session: true,
      resetPassword: true,
      role: true,
      permission: true,
      grant: false,
      applicationAccess: false,
      serviceCredential: false,
      auditLog: true,
      identityDocument: false,
      profileMetadata: true,
    };
  }

  return { ...DEFAULT_FEATURES };
}

export function normalizeAuthIdentityOptions(options: AuthIdentityOptions): NormalizedAuthIdentityOptions {
  if (!options.storage?.adapter) {
    throw new Error('AUTH_ADAPTER_NOT_CONFIGURED');
  }

  if (!options.jwt?.secret || options.jwt.secret.length < 16) {
    throw new Error('AUTH_PACKAGE_CONFIG_INVALID: jwt.secret must be at least 16 characters.');
  }

  return {
    ...options,
    defaultUserStatus: options.defaultUserStatus ?? 'active',
    features: {
      ...DEFAULT_FEATURES,
      ...createAuthIdentityFeaturePreset(options.preset ?? 'secure'),
      ...(options.features ?? {}),
    },
    password: {
      algorithm: options.password?.algorithm ?? 'pbkdf2_sha256',
      pbkdf2Iterations: options.password?.pbkdf2Iterations ?? 210_000,
      policy: {
        minLength: options.password?.policy?.minLength ?? 8,
        requireUppercase: options.password?.policy?.requireUppercase ?? false,
        requireLowercase: options.password?.policy?.requireLowercase ?? false,
        requireNumber: options.password?.policy?.requireNumber ?? false,
        requireSymbol: options.password?.policy?.requireSymbol ?? false,
      },
    },
    session: {
      validateOnRequest: options.session?.validateOnRequest ?? true,
      refreshTokenRotation: options.session?.refreshTokenRotation ?? true,
    },
    id: {
      strategy: options.id?.strategy ?? 'increment',
      source: options.id?.source ?? 'module',
      prefix: options.id?.prefix ?? false,
      startAt: options.id?.startAt ?? 1,
    },
    controllers: {
      enabled: options.controllers?.enabled ?? true,
      auth: options.controllers?.auth ?? true,
      identity: options.controllers?.identity ?? false,
      authorization: options.controllers?.authorization ?? false,
      routePrefix: options.controllers?.routePrefix ?? '',
    },
  };
}

export function isFeatureEnabled(options: NormalizedAuthIdentityOptions, feature: AuthFeatureName): boolean {
  return options.features[feature] === true;
}
