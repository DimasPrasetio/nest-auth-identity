import type { JsonObject } from '../common/types';

export type UserStatus = 'active' | 'inactive' | 'disabled' | 'pending' | 'deleted';
export type LoginMethod = 'password' | 'service' | 'external';
export type PrincipalSubjectType = 'user' | 'role' | 'application' | 'serviceCredential';

export interface UserIdentityEntity {
  id: string;
  name: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  passwordHash?: string;
  status: UserStatus | string;
  loginMethod: LoginMethod | string;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface PublicUserIdentity {
  id: string;
  name: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  status: UserStatus | string;
  loginMethod: LoginMethod | string;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface UserProfileEntity {
  id: string;
  userId: string;
  metadata: JsonObject;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionEntity {
  id: string;
  userId: string;
  accessTokenId?: string;
  refreshTokenHash: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  expiredAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TokenRecordType = 'password_reset' | 'access' | 'refresh';

export interface TokenRecordEntity {
  id: string;
  type: TokenRecordType;
  subjectId: string;
  tokenHash: string;
  expiredAt: Date;
  usedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleEntity {
  id: string;
  code: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionEntity {
  id: string;
  code: string;
  name: string;
  description?: string;
  resource?: string;
  action?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRoleEntity {
  id: string;
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy?: string;
}

export interface RolePermissionEntity {
  id: string;
  roleId: string;
  permissionId: string;
  assignedAt: Date;
  assignedBy?: string;
}

export interface UserPermissionEntity {
  id: string;
  userId: string;
  permissionId: string;
  assignedAt: Date;
  expiredAt?: Date;
  assignedBy?: string;
}

export interface GrantEntity {
  id: string;
  subjectType: PrincipalSubjectType;
  subjectId: string;
  resource: string;
  action: string;
  scope: string;
  expiredAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
}

export interface ApplicationEntity {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationUserEntity {
  id: string;
  applicationId: string;
  userId: string;
  status: 'active' | 'revoked' | 'inactive' | string;
  grantedAt: Date;
  revokedAt?: Date;
}

export interface ServiceCredentialEntity {
  id: string;
  applicationId?: string;
  clientId: string;
  clientSecretHash: string;
  name: string;
  status: 'active' | 'revoked' | 'expired' | string;
  scopes: string[];
  permissions: string[];
  expiredAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IdentityDocumentEntity {
  id: string;
  userId: string;
  documentType: string;
  documentNumberHash?: string;
  documentNumberEncrypted?: string;
  documentNumberMasked?: string;
  documentFileRef?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected' | string;
  verifiedAt?: Date;
  verifiedBy?: string;
  metadata?: JsonObject;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogEntity {
  id: string;
  actorType: 'user' | 'service' | 'system' | string;
  actorId?: string;
  event: string;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: JsonObject;
  createdAt: Date;
}
