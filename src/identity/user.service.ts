import { Inject, Injectable } from '@nestjs/common';
import { AuthIdentityError, featureDisabled } from '../common/errors';
import { normalizeEmail, normalizePhoneNumber, normalizeUsername } from '../common/normalizers';
import { requireRepository } from '../common/adapter-utils';
import { assertAtLeastOneIdentifier, assertEmail, assertNonEmptyString, assertOptionalString } from '../common/validation';
import {
  AUTH_IDENTITY_CLOCK,
  AUTH_IDENTITY_ID_GENERATOR,
  AUTH_IDENTITY_OPTIONS,
  AUTH_IDENTITY_STORAGE_ADAPTER,
} from '../common/tokens';
import { isFeatureEnabled } from '../config/auth-identity-options';
import { toPublicUser } from './user.mapper';
import type { AuthIdentityClock } from '../common/clock';
import { generateEntityId, type AuthIdentityIdGenerator } from '../common/id-generator';
import type { NormalizedAuthIdentityOptions } from '../config/auth-identity-options';
import type { PublicUserIdentity, UserIdentityEntity } from '../contracts/entities';
import type { AuthIdentityStorageAdapter } from '../contracts/storage-adapter';

export interface CreateUserInput {
  name: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  passwordHash?: string;
  status?: string;
  loginMethod?: string;
}

export interface UpdateUserInput {
  name?: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  status?: string;
}

@Injectable()
export class UserService {
  constructor(
    @Inject(AUTH_IDENTITY_OPTIONS) private readonly options: NormalizedAuthIdentityOptions,
    @Inject(AUTH_IDENTITY_STORAGE_ADAPTER) private readonly adapter: AuthIdentityStorageAdapter,
    @Inject(AUTH_IDENTITY_CLOCK) private readonly clock: AuthIdentityClock,
    @Inject(AUTH_IDENTITY_ID_GENERATOR) private readonly idGenerator: AuthIdentityIdGenerator,
  ) {}

  async createUser(input: CreateUserInput): Promise<UserIdentityEntity> {
    const users = requireRepository(this.adapter, 'users', this.adapter.users);
    const normalized = this.normalizeIdentity(input);
    assertNonEmptyString(input.name, 'name');
    assertAtLeastOneIdentifier(normalized);
    assertEmail(normalized.email);
    await this.assertUniqueIdentity(normalized.email, normalized.username, normalized.phoneNumber);
    const now = this.clock.now();

    return users.createUser({
      id: generateEntityId(this.idGenerator, this.options.id, 'usr'),
      name: input.name,
      username: normalized.username,
      email: normalized.email,
      phoneNumber: normalized.phoneNumber,
      passwordHash: input.passwordHash,
      status: input.status ?? this.options.defaultUserStatus ?? 'active',
      loginMethod: input.loginMethod ?? 'password',
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<PublicUserIdentity> {
    const users = requireRepository(this.adapter, 'users', this.adapter.users);
    const normalized = this.normalizeIdentity(input);
    assertNonEmptyString(id, 'id');
    assertOptionalString(input.name, 'name');
    assertEmail(normalized.email);
    await this.assertUniqueIdentity(normalized.email, normalized.username, normalized.phoneNumber, id);
    const user = await users.updateUser(id, {
      name: input.name,
      username: normalized.username,
      email: normalized.email,
      phoneNumber: normalized.phoneNumber,
      status: input.status,
      updatedAt: this.clock.now(),
    });
    return toPublicUser(user);
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<UserIdentityEntity> {
    const users = requireRepository(this.adapter, 'users', this.adapter.users);
    return users.updateUserPasswordHash(id, passwordHash, this.clock.now());
  }

  async updateLastLogin(id: string): Promise<void> {
    const users = requireRepository(this.adapter, 'users', this.adapter.users);
    await users.updateUser(id, { lastLoginAt: this.clock.now(), updatedAt: this.clock.now() });
  }

  async updateStatus(id: string, status: string): Promise<PublicUserIdentity> {
    const users = requireRepository(this.adapter, 'users', this.adapter.users);
    const user = await users.updateUser(id, { status, updatedAt: this.clock.now() });
    return toPublicUser(user);
  }

  async getUserById(id: string): Promise<UserIdentityEntity | undefined> {
    const users = requireRepository(this.adapter, 'users', this.adapter.users);
    return users.findUserById(id);
  }

  async getPublicUserById(id: string): Promise<PublicUserIdentity | undefined> {
    const user = await this.getUserById(id);
    return user ? toPublicUser(user) : undefined;
  }

  async findByIdentifier(identifier: string): Promise<UserIdentityEntity | undefined> {
    const users = requireRepository(this.adapter, 'users', this.adapter.users);
    const normalizedEmail = normalizeEmail(identifier);
    const normalizedUsername = normalizeUsername(identifier);
    const normalizedPhone = normalizePhoneNumber(identifier);

    return (
      (normalizedEmail ? await users.findUserByEmail(normalizedEmail) : undefined) ??
      (normalizedUsername ? await users.findUserByUsername(normalizedUsername) : undefined) ??
      (normalizedPhone ? await users.findUserByPhoneNumber(normalizedPhone) : undefined)
    );
  }

  async listUsers(): Promise<PublicUserIdentity[]> {
    const users = requireRepository(this.adapter, 'users', this.adapter.users);
    return (await users.listUsers()).map(toPublicUser);
  }

  assertUserCanAuthenticate(user: UserIdentityEntity): void {
    if (user.deletedAt || !['active', 'pending'].includes(String(user.status))) {
      throw new AuthIdentityError('AUTH_USER_INACTIVE');
    }
  }

  assertProfileMetadataFeatureEnabled(): void {
    if (!isFeatureEnabled(this.options, 'profileMetadata')) {
      throw featureDisabled('profileMetadata');
    }
  }

  private async assertUniqueIdentity(email?: string, username?: string, phoneNumber?: string, ignoreUserId?: string): Promise<void> {
    const users = requireRepository(this.adapter, 'users', this.adapter.users);
    const matches = await Promise.all([
      email ? users.findUserByEmail(email) : undefined,
      username ? users.findUserByUsername(username) : undefined,
      phoneNumber ? users.findUserByPhoneNumber(phoneNumber) : undefined,
    ]);

    if (matches.some((match) => match && match.id !== ignoreUserId)) {
      throw new AuthIdentityError('AUTH_DUPLICATE_IDENTITY');
    }
  }

  private normalizeIdentity(input: { email?: string; username?: string; phoneNumber?: string }) {
    return {
      email: normalizeEmail(input.email),
      username: normalizeUsername(input.username),
      phoneNumber: normalizePhoneNumber(input.phoneNumber),
    };
  }
}
