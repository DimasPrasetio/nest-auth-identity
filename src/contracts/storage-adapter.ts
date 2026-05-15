import type { MaybePromise, JsonObject } from '../common/types';
import type {
  ApplicationEntity,
  ApplicationUserEntity,
  AuditLogEntity,
  GrantEntity,
  IdentityDocumentEntity,
  PermissionEntity,
  RoleEntity,
  RolePermissionEntity,
  ServiceCredentialEntity,
  SessionEntity,
  TokenRecordEntity,
  UserIdentityEntity,
  UserPermissionEntity,
  UserProfileEntity,
  UserRoleEntity,
  UserStatus,
} from './entities';

export type StorageCapability =
  | 'users'
  | 'profiles'
  | 'identityDocuments'
  | 'roles'
  | 'permissions'
  | 'sessions'
  | 'tokens'
  | 'grants'
  | 'applications'
  | 'serviceCredentials'
  | 'auditLogs';

export interface CreateUserInput {
  id?: string;
  name: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  passwordHash?: string;
  status: UserStatus | string;
  loginMethod: string;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateSessionRecordInput = Omit<SessionEntity, 'id'> & { id?: string };
export type CreateTokenRecordInput = Omit<TokenRecordEntity, 'id'> & { id?: string };
export type CreateRoleRecordInput = Omit<RoleEntity, 'id'> & { id?: string };
export type CreatePermissionRecordInput = Omit<PermissionEntity, 'id'> & { id?: string };
export type CreateUserRoleRecordInput = Omit<UserRoleEntity, 'id'> & { id?: string };
export type CreateRolePermissionRecordInput = Omit<RolePermissionEntity, 'id'> & { id?: string };
export type CreateUserPermissionRecordInput = Omit<UserPermissionEntity, 'id'> & { id?: string };
export type CreateGrantRecordInput = Omit<GrantEntity, 'id'> & { id?: string };
export type CreateApplicationRecordInput = Omit<ApplicationEntity, 'id'> & { id?: string };
export type CreateApplicationUserRecordInput = Omit<ApplicationUserEntity, 'id'> & { id?: string };
export type CreateServiceCredentialRecordInput = Omit<ServiceCredentialEntity, 'id'> & { id?: string };
export type CreateIdentityDocumentRecordInput = Omit<IdentityDocumentEntity, 'id'> & { id?: string };
export type CreateAuditLogRecordInput = Omit<AuditLogEntity, 'id'> & { id?: string };

export interface UpdateUserInput {
  name?: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  status?: UserStatus | string;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  lastLoginAt?: Date;
  deletedAt?: Date;
  updatedAt: Date;
}

export interface UserStorageAdapter {
  createUser(input: CreateUserInput): MaybePromise<UserIdentityEntity>;
  updateUser(id: string, input: UpdateUserInput): MaybePromise<UserIdentityEntity>;
  updateUserPasswordHash(id: string, passwordHash: string, updatedAt: Date): MaybePromise<UserIdentityEntity>;
  findUserById(id: string): MaybePromise<UserIdentityEntity | undefined>;
  findUserByEmail(email: string): MaybePromise<UserIdentityEntity | undefined>;
  findUserByUsername(username: string): MaybePromise<UserIdentityEntity | undefined>;
  findUserByPhoneNumber(phoneNumber: string): MaybePromise<UserIdentityEntity | undefined>;
  listUsers(): MaybePromise<UserIdentityEntity[]>;
}

export interface UserProfileStorageAdapter {
  upsertUserProfile(userId: string, metadata: JsonObject, now: Date): MaybePromise<UserProfileEntity>;
  findUserProfileByUserId(userId: string): MaybePromise<UserProfileEntity | undefined>;
}

export interface SessionStorageAdapter {
  createSession(input: CreateSessionRecordInput): MaybePromise<SessionEntity>;
  findSessionById(id: string): MaybePromise<SessionEntity | undefined>;
  findSessionByRefreshTokenHash(refreshTokenHash: string): MaybePromise<SessionEntity | undefined>;
  updateSessionRefreshToken(id: string, refreshTokenHash: string, accessTokenId: string, updatedAt: Date): MaybePromise<SessionEntity>;
  revokeSession(id: string, revokedAt: Date): MaybePromise<SessionEntity | undefined>;
  revokeUserSessions(userId: string, revokedAt: Date): MaybePromise<number>;
}

export interface TokenStorageAdapter {
  createTokenRecord(input: CreateTokenRecordInput): MaybePromise<TokenRecordEntity>;
  findTokenRecordByHash(type: string, tokenHash: string): MaybePromise<TokenRecordEntity | undefined>;
  markTokenRecordUsed(id: string, usedAt: Date): MaybePromise<TokenRecordEntity | undefined>;
  revokeTokenRecord(id: string, revokedAt: Date): MaybePromise<TokenRecordEntity | undefined>;
}

export interface RoleStorageAdapter {
  createRole(input: CreateRoleRecordInput): MaybePromise<RoleEntity>;
  updateRole(id: string, input: Partial<RoleEntity>): MaybePromise<RoleEntity>;
  deleteRole(id: string): MaybePromise<void>;
  findRoleById(id: string): MaybePromise<RoleEntity | undefined>;
  findRoleByCode(code: string): MaybePromise<RoleEntity | undefined>;
  listRoles(): MaybePromise<RoleEntity[]>;
  assignRoleToUser(input: CreateUserRoleRecordInput): MaybePromise<UserRoleEntity>;
  removeRoleFromUser(userId: string, roleId: string): MaybePromise<void>;
  listRolesByUserId(userId: string): MaybePromise<RoleEntity[]>;
}

export interface PermissionStorageAdapter {
  createPermission(input: CreatePermissionRecordInput): MaybePromise<PermissionEntity>;
  updatePermission(id: string, input: Partial<PermissionEntity>): MaybePromise<PermissionEntity>;
  deletePermission(id: string): MaybePromise<void>;
  findPermissionById(id: string): MaybePromise<PermissionEntity | undefined>;
  findPermissionByCode(code: string): MaybePromise<PermissionEntity | undefined>;
  listPermissions(): MaybePromise<PermissionEntity[]>;
  assignPermissionToRole(input: CreateRolePermissionRecordInput): MaybePromise<RolePermissionEntity>;
  removePermissionFromRole(roleId: string, permissionId: string): MaybePromise<void>;
  assignPermissionToUser(input: CreateUserPermissionRecordInput): MaybePromise<UserPermissionEntity>;
  listPermissionsByRoleIds(roleIds: string[]): MaybePromise<PermissionEntity[]>;
  listPermissionsByUserId(userId: string): MaybePromise<PermissionEntity[]>;
}

export interface GrantStorageAdapter {
  createGrant(input: CreateGrantRecordInput): MaybePromise<GrantEntity>;
  revokeGrant(id: string, revokedAt: Date): MaybePromise<GrantEntity | undefined>;
  listGrantsBySubject(subjectType: string, subjectId: string): MaybePromise<GrantEntity[]>;
}

export interface ApplicationAccessStorageAdapter {
  createApplication(input: CreateApplicationRecordInput): MaybePromise<ApplicationEntity>;
  updateApplication(id: string, input: Partial<ApplicationEntity>): MaybePromise<ApplicationEntity>;
  findApplicationById(id: string): MaybePromise<ApplicationEntity | undefined>;
  findApplicationByCode(code: string): MaybePromise<ApplicationEntity | undefined>;
  assignUserToApplication(input: CreateApplicationUserRecordInput): MaybePromise<ApplicationUserEntity>;
  revokeUserApplicationAccess(applicationId: string, userId: string, revokedAt: Date): MaybePromise<ApplicationUserEntity | undefined>;
  findUserApplicationAccess(applicationId: string, userId: string): MaybePromise<ApplicationUserEntity | undefined>;
}

export interface ServiceCredentialStorageAdapter {
  createServiceCredential(input: CreateServiceCredentialRecordInput): MaybePromise<ServiceCredentialEntity>;
  updateServiceCredential(id: string, input: Partial<ServiceCredentialEntity>): MaybePromise<ServiceCredentialEntity>;
  findServiceCredentialByClientId(clientId: string): MaybePromise<ServiceCredentialEntity | undefined>;
}

export interface IdentityDocumentStorageAdapter {
  createIdentityDocument(input: CreateIdentityDocumentRecordInput): MaybePromise<IdentityDocumentEntity>;
  updateIdentityDocument(id: string, input: Partial<IdentityDocumentEntity>): MaybePromise<IdentityDocumentEntity>;
  findIdentityDocumentById(id: string): MaybePromise<IdentityDocumentEntity | undefined>;
  listIdentityDocumentsByUserId(userId: string): MaybePromise<IdentityDocumentEntity[]>;
}

export interface AuditLogStorageAdapter {
  createAuditLog(input: CreateAuditLogRecordInput): MaybePromise<AuditLogEntity>;
  listAuditLogs(): MaybePromise<AuditLogEntity[]>;
}

export interface AuthIdentityStorageAdapter {
  capabilities: StorageCapability[];
  transaction?<T>(work: () => MaybePromise<T>): MaybePromise<T>;
  users?: UserStorageAdapter;
  profiles?: UserProfileStorageAdapter;
  sessions?: SessionStorageAdapter;
  tokens?: TokenStorageAdapter;
  roles?: RoleStorageAdapter;
  permissions?: PermissionStorageAdapter;
  grants?: GrantStorageAdapter;
  applications?: ApplicationAccessStorageAdapter;
  serviceCredentials?: ServiceCredentialStorageAdapter;
  identityDocuments?: IdentityDocumentStorageAdapter;
  auditLogs?: AuditLogStorageAdapter;
}

export function hasCapability(adapter: AuthIdentityStorageAdapter, capability: StorageCapability): boolean {
  return adapter.capabilities.includes(capability);
}
