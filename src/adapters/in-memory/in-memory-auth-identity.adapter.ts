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
} from '../../contracts/entities';
import type {
  ApplicationAccessStorageAdapter,
  AuditLogStorageAdapter,
  AuthIdentityStorageAdapter,
  GrantStorageAdapter,
  IdentityDocumentStorageAdapter,
  PermissionStorageAdapter,
  RoleStorageAdapter,
  ServiceCredentialStorageAdapter,
  SessionStorageAdapter,
  StorageCapability,
  TokenStorageAdapter,
  UserProfileStorageAdapter,
  UserStorageAdapter,
} from '../../contracts/storage-adapter';

export class InMemoryAuthIdentityAdapter implements AuthIdentityStorageAdapter {
  readonly capabilities: StorageCapability[] = [
    'users',
    'profiles',
    'identityDocuments',
    'roles',
    'permissions',
    'sessions',
    'tokens',
    'grants',
    'applications',
    'serviceCredentials',
    'auditLogs',
  ];

  private readonly state = {
    users: new Map<string, UserIdentityEntity>(),
    profiles: new Map<string, UserProfileEntity>(),
    sessions: new Map<string, SessionEntity>(),
    tokens: new Map<string, TokenRecordEntity>(),
    roles: new Map<string, RoleEntity>(),
    permissions: new Map<string, PermissionEntity>(),
    userRoles: new Map<string, UserRoleEntity>(),
    rolePermissions: new Map<string, RolePermissionEntity>(),
    userPermissions: new Map<string, UserPermissionEntity>(),
    grants: new Map<string, GrantEntity>(),
    applications: new Map<string, ApplicationEntity>(),
    applicationUsers: new Map<string, ApplicationUserEntity>(),
    serviceCredentials: new Map<string, ServiceCredentialEntity>(),
    identityDocuments: new Map<string, IdentityDocumentEntity>(),
    auditLogs: new Map<string, AuditLogEntity>(),
  };
  private readonly localCounters = new Map<string, number>();

  readonly users: UserStorageAdapter = {
    createUser: (input) => {
      const user = { ...input, id: input.id ?? this.nextLocalId('users') };
      this.state.users.set(user.id, user);
      return clone(user);
    },
    updateUser: (id, input) => {
      const current = this.require(this.state.users, id, 'User');
      const updated = { ...current, ...input };
      this.state.users.set(id, updated);
      return clone(updated);
    },
    updateUserPasswordHash: (id, passwordHash, updatedAt) => {
      const current = this.require(this.state.users, id, 'User');
      const updated = { ...current, passwordHash, updatedAt };
      this.state.users.set(id, updated);
      return clone(updated);
    },
    findUserById: (id) => cloneOptional(this.state.users.get(id)),
    findUserByEmail: (email) => cloneOptional([...this.state.users.values()].find((user) => user.email === email)),
    findUserByUsername: (username) => cloneOptional([...this.state.users.values()].find((user) => user.username === username)),
    findUserByPhoneNumber: (phoneNumber) => cloneOptional([...this.state.users.values()].find((user) => user.phoneNumber === phoneNumber)),
    listUsers: () => [...this.state.users.values()].map(clone),
  };

  readonly profiles: UserProfileStorageAdapter = {
    upsertUserProfile: (userId, metadata, now) => {
      const current = this.state.profiles.get(userId);
      const profile: UserProfileEntity = current
        ? { ...current, metadata: clone(metadata), updatedAt: now }
        : { id: this.nextLocalId('profiles'), userId, metadata: clone(metadata), createdAt: now, updatedAt: now };
      this.state.profiles.set(userId, profile);
      return clone(profile);
    },
    findUserProfileByUserId: (userId) => cloneOptional(this.state.profiles.get(userId)),
  };

  readonly sessions: SessionStorageAdapter = {
    createSession: (input) => {
      const session = { ...input, id: input.id ?? this.nextLocalId('sessions') };
      this.state.sessions.set(session.id, clone(session));
      return clone(session);
    },
    findSessionById: (id) => cloneOptional(this.state.sessions.get(id)),
    findSessionByRefreshTokenHash: (refreshTokenHash) =>
      cloneOptional([...this.state.sessions.values()].find((session) => session.refreshTokenHash === refreshTokenHash)),
    updateSessionRefreshToken: (id, refreshTokenHash, accessTokenId, updatedAt) => {
      const current = this.require(this.state.sessions, id, 'Session');
      const updated = { ...current, refreshTokenHash, accessTokenId, updatedAt };
      this.state.sessions.set(id, updated);
      return clone(updated);
    },
    revokeSession: (id, revokedAt) => {
      const current = this.state.sessions.get(id);
      if (!current) {
        return undefined;
      }
      const updated = { ...current, revokedAt, updatedAt: revokedAt };
      this.state.sessions.set(id, updated);
      return clone(updated);
    },
    revokeUserSessions: (userId, revokedAt) => {
      let count = 0;
      for (const session of this.state.sessions.values()) {
        if (session.userId === userId && !session.revokedAt) {
          this.state.sessions.set(session.id, { ...session, revokedAt, updatedAt: revokedAt });
          count += 1;
        }
      }
      return count;
    },
  };

  readonly tokens: TokenStorageAdapter = {
    createTokenRecord: (input) => {
      const token = { ...input, id: input.id ?? this.nextLocalId('tokens') };
      this.state.tokens.set(token.id, clone(token));
      return clone(token);
    },
    findTokenRecordByHash: (type, tokenHash) =>
      cloneOptional([...this.state.tokens.values()].find((token) => token.type === type && token.tokenHash === tokenHash)),
    markTokenRecordUsed: (id, usedAt) => {
      const current = this.state.tokens.get(id);
      if (!current) {
        return undefined;
      }
      const updated = { ...current, usedAt, updatedAt: usedAt };
      this.state.tokens.set(id, updated);
      return clone(updated);
    },
    revokeTokenRecord: (id, revokedAt) => {
      const current = this.state.tokens.get(id);
      if (!current) {
        return undefined;
      }
      const updated = { ...current, revokedAt, updatedAt: revokedAt };
      this.state.tokens.set(id, updated);
      return clone(updated);
    },
  };

  readonly roles: RoleStorageAdapter = {
    createRole: (input) => {
      const role = { ...input, id: input.id ?? this.nextLocalId('roles') };
      this.state.roles.set(role.id, clone(role));
      return clone(role);
    },
    updateRole: (id, input) => {
      const current = this.require(this.state.roles, id, 'Role');
      const updated = { ...current, ...input };
      this.state.roles.set(id, updated);
      return clone(updated);
    },
    deleteRole: (id) => {
      this.state.roles.delete(id);
    },
    findRoleById: (id) => cloneOptional(this.state.roles.get(id)),
    findRoleByCode: (code) => cloneOptional([...this.state.roles.values()].find((role) => role.code === code)),
    listRoles: () => [...this.state.roles.values()].map(clone),
    assignRoleToUser: (input) => {
      const assignment = { ...input, id: input.id ?? this.nextLocalId('userRoles') };
      this.state.userRoles.set(assignment.id, clone(assignment));
      return clone(assignment);
    },
    removeRoleFromUser: (userId, roleId) => {
      for (const [id, assignment] of this.state.userRoles.entries()) {
        if (assignment.userId === userId && assignment.roleId === roleId) {
          this.state.userRoles.delete(id);
        }
      }
    },
    listRolesByUserId: (userId) => {
      const roleIds = [...this.state.userRoles.values()]
        .filter((assignment) => assignment.userId === userId)
        .map((assignment) => assignment.roleId);
      return [...this.state.roles.values()].filter((role) => roleIds.includes(role.id)).map(clone);
    },
  };

  readonly permissions: PermissionStorageAdapter = {
    createPermission: (input) => {
      const permission = { ...input, id: input.id ?? this.nextLocalId('permissions') };
      this.state.permissions.set(permission.id, clone(permission));
      return clone(permission);
    },
    updatePermission: (id, input) => {
      const current = this.require(this.state.permissions, id, 'Permission');
      const updated = { ...current, ...input };
      this.state.permissions.set(id, updated);
      return clone(updated);
    },
    deletePermission: (id) => {
      this.state.permissions.delete(id);
    },
    findPermissionById: (id) => cloneOptional(this.state.permissions.get(id)),
    findPermissionByCode: (code) => cloneOptional([...this.state.permissions.values()].find((permission) => permission.code === code)),
    listPermissions: () => [...this.state.permissions.values()].map(clone),
    assignPermissionToRole: (input) => {
      const assignment = { ...input, id: input.id ?? this.nextLocalId('rolePermissions') };
      this.state.rolePermissions.set(assignment.id, clone(assignment));
      return clone(assignment);
    },
    removePermissionFromRole: (roleId, permissionId) => {
      for (const [id, assignment] of this.state.rolePermissions.entries()) {
        if (assignment.roleId === roleId && assignment.permissionId === permissionId) {
          this.state.rolePermissions.delete(id);
        }
      }
    },
    assignPermissionToUser: (input) => {
      const assignment = { ...input, id: input.id ?? this.nextLocalId('userPermissions') };
      this.state.userPermissions.set(assignment.id, clone(assignment));
      return clone(assignment);
    },
    listPermissionsByRoleIds: (roleIds) => {
      const permissionIds = [...this.state.rolePermissions.values()]
        .filter((assignment) => roleIds.includes(assignment.roleId))
        .map((assignment) => assignment.permissionId);
      return [...this.state.permissions.values()].filter((permission) => permissionIds.includes(permission.id)).map(clone);
    },
    listPermissionsByUserId: (userId) => {
      const now = new Date();
      const permissionIds = [...this.state.userPermissions.values()]
        .filter((assignment) => assignment.userId === userId && (!assignment.expiredAt || assignment.expiredAt > now))
        .map((assignment) => assignment.permissionId);
      return [...this.state.permissions.values()].filter((permission) => permissionIds.includes(permission.id)).map(clone);
    },
  };

  readonly grants: GrantStorageAdapter = {
    createGrant: (input) => {
      const grant = { ...input, id: input.id ?? this.nextLocalId('grants') };
      this.state.grants.set(grant.id, clone(grant));
      return clone(grant);
    },
    revokeGrant: (id, revokedAt) => {
      const current = this.state.grants.get(id);
      if (!current) {
        return undefined;
      }
      const updated = { ...current, revokedAt };
      this.state.grants.set(id, updated);
      return clone(updated);
    },
    listGrantsBySubject: (subjectType, subjectId) =>
      [...this.state.grants.values()]
        .filter((grant) => grant.subjectType === subjectType && grant.subjectId === subjectId)
        .map(clone),
  };

  readonly applications: ApplicationAccessStorageAdapter = {
    createApplication: (input) => {
      const application = { ...input, id: input.id ?? this.nextLocalId('applications') };
      this.state.applications.set(application.id, clone(application));
      return clone(application);
    },
    updateApplication: (id, input) => {
      const current = this.require(this.state.applications, id, 'Application');
      const updated = { ...current, ...input };
      this.state.applications.set(id, updated);
      return clone(updated);
    },
    findApplicationById: (id) => cloneOptional(this.state.applications.get(id)),
    findApplicationByCode: (code) => cloneOptional([...this.state.applications.values()].find((application) => application.code === code)),
    assignUserToApplication: (input) => {
      const access = { ...input, id: input.id ?? this.nextLocalId('applicationUsers') };
      this.state.applicationUsers.set(access.id, clone(access));
      return clone(access);
    },
    revokeUserApplicationAccess: (applicationId, userId, revokedAt) => {
      const current = [...this.state.applicationUsers.values()].find(
        (access) => access.applicationId === applicationId && access.userId === userId,
      );
      if (!current) {
        return undefined;
      }
      const updated = { ...current, status: 'revoked', revokedAt };
      this.state.applicationUsers.set(current.id, updated);
      return clone(updated);
    },
    findUserApplicationAccess: (applicationId, userId) =>
      cloneOptional(
        [...this.state.applicationUsers.values()].find(
          (access) => access.applicationId === applicationId && access.userId === userId,
        ),
      ),
  };

  readonly serviceCredentials: ServiceCredentialStorageAdapter = {
    createServiceCredential: (input) => {
      const credential = { ...input, id: input.id ?? this.nextLocalId('serviceCredentials') };
      this.state.serviceCredentials.set(credential.id, clone(credential));
      return clone(credential);
    },
    updateServiceCredential: (id, input) => {
      const current = this.require(this.state.serviceCredentials, id, 'Service credential');
      const updated = { ...current, ...input };
      this.state.serviceCredentials.set(id, updated);
      return clone(updated);
    },
    findServiceCredentialByClientId: (clientId) =>
      cloneOptional([...this.state.serviceCredentials.values()].find((credential) => credential.clientId === clientId)),
  };

  readonly identityDocuments: IdentityDocumentStorageAdapter = {
    createIdentityDocument: (input) => {
      const document = { ...input, id: input.id ?? this.nextLocalId('identityDocuments') };
      this.state.identityDocuments.set(document.id, clone(document));
      return clone(document);
    },
    updateIdentityDocument: (id, input) => {
      const current = this.require(this.state.identityDocuments, id, 'Identity document');
      const updated = { ...current, ...input };
      this.state.identityDocuments.set(id, updated);
      return clone(updated);
    },
    findIdentityDocumentById: (id) => cloneOptional(this.state.identityDocuments.get(id)),
    listIdentityDocumentsByUserId: (userId) =>
      [...this.state.identityDocuments.values()].filter((document) => document.userId === userId).map(clone),
  };

  readonly auditLogs: AuditLogStorageAdapter = {
    createAuditLog: (input) => {
      const auditLog = { ...input, id: input.id ?? this.nextLocalId('auditLogs') };
      this.state.auditLogs.set(auditLog.id, clone(auditLog));
      return clone(auditLog);
    },
    listAuditLogs: () => [...this.state.auditLogs.values()].map(clone),
  };

  transaction<T>(work: () => T | Promise<T>): T | Promise<T> {
    return work();
  }

  reset(): void {
    for (const store of Object.values(this.state)) {
      store.clear();
    }
    this.localCounters.clear();
  }

  private require<T>(store: Map<string, T>, id: string, label: string): T {
    const value = store.get(id);
    if (!value) {
      throw new Error(`${label} "${id}" not found.`);
    }
    return value;
  }

  private nextLocalId(scope: string): string {
    const next = this.localCounters.get(scope) ?? 1;
    this.localCounters.set(scope, next + 1);
    return String(next);
  }
}

function clone<T>(value: T): T {
  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (Array.isArray(value)) {
    return value.map(clone) as T;
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = clone(entry);
    }
    return output as T;
  }

  return value;
}

function cloneOptional<T>(value: T | undefined): T | undefined {
  return value ? clone(value) : undefined;
}
