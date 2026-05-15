export * from './auth-identity.module';

export * from './adapters/in-memory';
export * from './application-access/application-access.service';
export * from './audit/audit.service';
export * from './auth/auth.controller';
export * from './auth/auth.service';
export * from './auth/dto';
export * from './auth/password-hasher';
export * from './auth/password-policy';
export * from './authorization/authorization.service';
export * from './authorization/authorization.controller';
export * from './authorization/authorization.dto';
export * from './common/adapter-utils';
export * from './common/clock';
export * from './common/encryption';
export * from './common/error-codes';
export * from './common/errors';
export * from './common/id-generator';
export * from './common/metadata';
export * from './common/normalizers';
export * from './common/security';
export * from './common/tokens';
export * from './common/validation';
export type {
  AuthContext as AuthIdentityContext,
  AuthenticatedPrincipal,
  AuthFeatureName,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  MaybePromise,
  PrincipalType,
  RequestMetadata,
} from './common/types';
export * from './config/auth-identity-options';
export * from './contracts/entities';
export type {
  ApplicationAccessStorageAdapter,
  AuditLogStorageAdapter,
  AuthIdentityStorageAdapter,
  CreateApplicationRecordInput,
  CreateApplicationUserRecordInput,
  CreateAuditLogRecordInput,
  CreateGrantRecordInput,
  CreateIdentityDocumentRecordInput,
  CreatePermissionRecordInput,
  CreateRolePermissionRecordInput,
  CreateRoleRecordInput,
  CreateServiceCredentialRecordInput,
  CreateSessionRecordInput,
  CreateTokenRecordInput,
  CreateUserInput as StorageCreateUserInput,
  CreateUserPermissionRecordInput,
  CreateUserRoleRecordInput,
  GrantStorageAdapter,
  IdentityDocumentStorageAdapter,
  PermissionStorageAdapter,
  RoleStorageAdapter,
  ServiceCredentialStorageAdapter,
  SessionStorageAdapter,
  StorageCapability,
  TokenStorageAdapter,
  UpdateUserInput as StorageUpdateUserInput,
  UserProfileStorageAdapter,
  UserStorageAdapter,
} from './contracts/storage-adapter';
export { hasCapability } from './contracts/storage-adapter';
export * from './decorators';
export * from './guards';
export * from './identity-document/identity-document.service';
export * from './identity/identity.controller';
export * from './identity/identity.dto';
export * from './identity/user.mapper';
export * from './identity/user.service';
export * from './profile/profile-metadata.service';
export * from './service-credential/service-credential.service';
export * from './session/session.service';
export * from './token/token.service';
