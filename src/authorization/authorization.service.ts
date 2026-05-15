import { Inject, Injectable } from '@nestjs/common';
import { AuthIdentityError, featureDisabled } from '../common/errors';
import { requireRepository } from '../common/adapter-utils';
import { assertNonEmptyString, assertOptionalDate } from '../common/validation';
import {
  AUTH_IDENTITY_CLOCK,
  AUTH_IDENTITY_ID_GENERATOR,
  AUTH_IDENTITY_OPTIONS,
  AUTH_IDENTITY_STORAGE_ADAPTER,
} from '../common/tokens';
import { isFeatureEnabled } from '../config/auth-identity-options';
import type { AuthIdentityClock } from '../common/clock';
import { generateEntityId, type AuthIdentityIdGenerator } from '../common/id-generator';
import type { NormalizedAuthIdentityOptions } from '../config/auth-identity-options';
import type { GrantEntity, PermissionEntity, PrincipalSubjectType, RoleEntity } from '../contracts/entities';
import type { AuthIdentityStorageAdapter } from '../contracts/storage-adapter';

export interface CreateRoleInput {
  code: string;
  name: string;
  description?: string;
  isSystem?: boolean;
}

export interface CreatePermissionInput {
  code: string;
  name: string;
  description?: string;
  resource?: string;
  action?: string;
}

export interface CreateGrantInput {
  subjectType: PrincipalSubjectType;
  subjectId: string;
  resource: string;
  action: string;
  scope: string;
  expiredAt?: Date;
}

@Injectable()
export class AuthorizationService {
  constructor(
    @Inject(AUTH_IDENTITY_OPTIONS) private readonly options: NormalizedAuthIdentityOptions,
    @Inject(AUTH_IDENTITY_STORAGE_ADAPTER) private readonly adapter: AuthIdentityStorageAdapter,
    @Inject(AUTH_IDENTITY_CLOCK) private readonly clock: AuthIdentityClock,
    @Inject(AUTH_IDENTITY_ID_GENERATOR) private readonly idGenerator: AuthIdentityIdGenerator,
  ) {}

  async createRole(input: CreateRoleInput): Promise<RoleEntity> {
    this.assertFeature('role');
    assertNonEmptyString(input.code, 'code');
    assertNonEmptyString(input.name, 'name');
    const roles = requireRepository(this.adapter, 'roles', this.adapter.roles);
    const existing = await roles.findRoleByCode(input.code);
    if (existing) {
      throw new AuthIdentityError('AUTH_DUPLICATE_IDENTITY', 'Role code is already used.', { code: input.code });
    }
    const now = this.clock.now();
    return roles.createRole({
      id: generateEntityId(this.idGenerator, this.options.id, 'rol'),
      code: input.code,
      name: input.name,
      description: input.description,
      isSystem: input.isSystem ?? false,
      createdAt: now,
      updatedAt: now,
    });
  }

  async listRoles(): Promise<RoleEntity[]> {
    this.assertFeature('role');
    const roles = requireRepository(this.adapter, 'roles', this.adapter.roles);
    return roles.listRoles();
  }

  async updateRole(id: string, input: Partial<CreateRoleInput>): Promise<RoleEntity> {
    this.assertFeature('role');
    assertNonEmptyString(id, 'id');
    const roles = requireRepository(this.adapter, 'roles', this.adapter.roles);
    return roles.updateRole(id, { ...input, updatedAt: this.clock.now() });
  }

  async deleteRole(id: string): Promise<void> {
    this.assertFeature('role');
    assertNonEmptyString(id, 'id');
    const roles = requireRepository(this.adapter, 'roles', this.adapter.roles);
    await roles.deleteRole(id);
  }

  async createPermission(input: CreatePermissionInput): Promise<PermissionEntity> {
    this.assertFeature('permission');
    assertNonEmptyString(input.code, 'code');
    assertNonEmptyString(input.name, 'name');
    const permissions = requireRepository(this.adapter, 'permissions', this.adapter.permissions);
    const existing = await permissions.findPermissionByCode(input.code);
    if (existing) {
      throw new AuthIdentityError('AUTH_DUPLICATE_IDENTITY', 'Permission code is already used.', { code: input.code });
    }
    const now = this.clock.now();
    return permissions.createPermission({
      id: generateEntityId(this.idGenerator, this.options.id, 'per'),
      code: input.code,
      name: input.name,
      description: input.description,
      resource: input.resource,
      action: input.action,
      createdAt: now,
      updatedAt: now,
    });
  }

  async listPermissions(): Promise<PermissionEntity[]> {
    this.assertFeature('permission');
    const permissions = requireRepository(this.adapter, 'permissions', this.adapter.permissions);
    return permissions.listPermissions();
  }

  async updatePermission(id: string, input: Partial<CreatePermissionInput>): Promise<PermissionEntity> {
    this.assertFeature('permission');
    assertNonEmptyString(id, 'id');
    const permissions = requireRepository(this.adapter, 'permissions', this.adapter.permissions);
    return permissions.updatePermission(id, { ...input, updatedAt: this.clock.now() });
  }

  async deletePermission(id: string): Promise<void> {
    this.assertFeature('permission');
    assertNonEmptyString(id, 'id');
    const permissions = requireRepository(this.adapter, 'permissions', this.adapter.permissions);
    await permissions.deletePermission(id);
  }

  async assignRoleToUser(userId: string, roleId: string, assignedBy?: string) {
    this.assertFeature('role');
    assertNonEmptyString(userId, 'userId');
    assertNonEmptyString(roleId, 'roleId');
    const roles = requireRepository(this.adapter, 'roles', this.adapter.roles);
    return roles.assignRoleToUser({
      id: generateEntityId(this.idGenerator, this.options.id, 'url'),
      userId,
      roleId,
      assignedBy,
      assignedAt: this.clock.now(),
    });
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    this.assertFeature('role');
    assertNonEmptyString(userId, 'userId');
    assertNonEmptyString(roleId, 'roleId');
    const roles = requireRepository(this.adapter, 'roles', this.adapter.roles);
    await roles.removeRoleFromUser(userId, roleId);
  }

  async assignPermissionToRole(roleId: string, permissionId: string, assignedBy?: string) {
    this.assertFeature('permission');
    assertNonEmptyString(roleId, 'roleId');
    assertNonEmptyString(permissionId, 'permissionId');
    const permissions = requireRepository(this.adapter, 'permissions', this.adapter.permissions);
    return permissions.assignPermissionToRole({
      id: generateEntityId(this.idGenerator, this.options.id, 'rpe'),
      roleId,
      permissionId,
      assignedBy,
      assignedAt: this.clock.now(),
    });
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    this.assertFeature('permission');
    assertNonEmptyString(roleId, 'roleId');
    assertNonEmptyString(permissionId, 'permissionId');
    const permissions = requireRepository(this.adapter, 'permissions', this.adapter.permissions);
    await permissions.removePermissionFromRole(roleId, permissionId);
  }

  async assignPermissionToUser(userId: string, permissionId: string, assignedBy?: string, expiredAt?: Date) {
    this.assertFeature('permission');
    assertNonEmptyString(userId, 'userId');
    assertNonEmptyString(permissionId, 'permissionId');
    assertOptionalDate(expiredAt, 'expiredAt');
    const permissions = requireRepository(this.adapter, 'permissions', this.adapter.permissions);
    return permissions.assignPermissionToUser({
      id: generateEntityId(this.idGenerator, this.options.id, 'upe'),
      userId,
      permissionId,
      assignedBy,
      expiredAt,
      assignedAt: this.clock.now(),
    });
  }

  async getUserRoleCodes(userId: string): Promise<string[]> {
    if (!isFeatureEnabled(this.options, 'role')) {
      return [];
    }
    const roles = requireRepository(this.adapter, 'roles', this.adapter.roles);
    return (await roles.listRolesByUserId(userId)).map((role) => role.code);
  }

  async getUserPermissionCodes(userId: string): Promise<string[]> {
    if (!isFeatureEnabled(this.options, 'permission')) {
      return [];
    }
    const roles = requireRepository(this.adapter, 'roles', this.adapter.roles);
    const permissions = requireRepository(this.adapter, 'permissions', this.adapter.permissions);
    const userRoles = await roles.listRolesByUserId(userId);
    const rolePermissions = await permissions.listPermissionsByRoleIds(userRoles.map((role) => role.id));
    const directPermissions = await permissions.listPermissionsByUserId(userId);
    return unique([...rolePermissions, ...directPermissions].map((permission) => permission.code));
  }

  async createGrant(input: CreateGrantInput): Promise<GrantEntity> {
    this.assertFeature('grant');
    assertNonEmptyString(input.subjectType, 'subjectType');
    assertNonEmptyString(input.subjectId, 'subjectId');
    assertNonEmptyString(input.resource, 'resource');
    assertNonEmptyString(input.action, 'action');
    assertNonEmptyString(input.scope, 'scope');
    assertOptionalDate(input.expiredAt, 'expiredAt');
    const grants = requireRepository(this.adapter, 'grants', this.adapter.grants);
    return grants.createGrant({
      id: generateEntityId(this.idGenerator, this.options.id, 'grn'),
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      resource: input.resource,
      action: input.action,
      scope: input.scope,
      expiredAt: input.expiredAt,
      createdAt: this.clock.now(),
    });
  }

  async getActiveGrantScopes(subjectType: PrincipalSubjectType, subjectId: string): Promise<string[]> {
    if (!isFeatureEnabled(this.options, 'grant')) {
      return [];
    }
    const grants = requireRepository(this.adapter, 'grants', this.adapter.grants);
    const now = this.clock.now();
    return (await grants.listGrantsBySubject(subjectType, subjectId))
      .filter((grant) => !grant.revokedAt && (!grant.expiredAt || grant.expiredAt > now))
      .map((grant) => grant.scope);
  }

  async assertUserHasAnyRole(userId: string, requiredRoles: string[]): Promise<void> {
    if (requiredRoles.length === 0) {
      return;
    }
    const roles = await this.getUserRoleCodes(userId);
    if (!requiredRoles.some((role) => roles.includes(role))) {
      throw new AuthIdentityError('AUTH_FORBIDDEN_ROLE');
    }
  }

  async assertUserHasPermissions(userId: string, requiredPermissions: string[], requireAll = true): Promise<void> {
    if (requiredPermissions.length === 0) {
      return;
    }
    const permissions = await this.getUserPermissionCodes(userId);
    const allowed = requireAll
      ? requiredPermissions.every((permission) => permissions.includes(permission))
      : requiredPermissions.some((permission) => permissions.includes(permission));
    if (!allowed) {
      throw new AuthIdentityError('AUTH_FORBIDDEN_PERMISSION');
    }
  }

  async assertSubjectHasGrants(subjectType: PrincipalSubjectType, subjectId: string, requiredGrants: string[], requireAll = true): Promise<void> {
    if (requiredGrants.length === 0) {
      return;
    }
    const grants = await this.getActiveGrantScopes(subjectType, subjectId);
    const allowed = requireAll
      ? requiredGrants.every((grant) => grants.includes(grant))
      : requiredGrants.some((grant) => grants.includes(grant));
    if (!allowed) {
      throw new AuthIdentityError('AUTH_FORBIDDEN_GRANT');
    }
  }

  private assertFeature(feature: 'role' | 'permission' | 'grant'): void {
    if (!isFeatureEnabled(this.options, feature)) {
      throw featureDisabled(feature);
    }
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
