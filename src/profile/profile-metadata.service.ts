import { Inject, Injectable } from '@nestjs/common';
import { assertJsonObject, assertMetadataAllowed } from '../common/metadata';
import { requireRepository } from '../common/adapter-utils';
import { assertNonEmptyString } from '../common/validation';
import { AUTH_IDENTITY_CLOCK, AUTH_IDENTITY_OPTIONS, AUTH_IDENTITY_STORAGE_ADAPTER } from '../common/tokens';
import { isFeatureEnabled } from '../config/auth-identity-options';
import { featureDisabled, AuthIdentityError } from '../common/errors';
import type { AuthIdentityClock } from '../common/clock';
import type { JsonObject } from '../common/types';
import type { NormalizedAuthIdentityOptions } from '../config/auth-identity-options';
import type { UserProfileEntity } from '../contracts/entities';
import type { AuthIdentityStorageAdapter } from '../contracts/storage-adapter';

@Injectable()
export class ProfileMetadataService {
  constructor(
    @Inject(AUTH_IDENTITY_OPTIONS) private readonly options: NormalizedAuthIdentityOptions,
    @Inject(AUTH_IDENTITY_STORAGE_ADAPTER) private readonly adapter: AuthIdentityStorageAdapter,
    @Inject(AUTH_IDENTITY_CLOCK) private readonly clock: AuthIdentityClock,
  ) {}

  async getProfile(userId: string): Promise<UserProfileEntity | undefined> {
    if (!isFeatureEnabled(this.options, 'profileMetadata')) {
      throw featureDisabled('profileMetadata');
    }

    assertNonEmptyString(userId, 'userId');
    const profiles = requireRepository(this.adapter, 'profiles', this.adapter.profiles);
    return profiles.findUserProfileByUserId(userId);
  }

  async updateProfile(userId: string, metadata: unknown): Promise<UserProfileEntity> {
    if (!isFeatureEnabled(this.options, 'profileMetadata')) {
      throw featureDisabled('profileMetadata');
    }

    assertNonEmptyString(userId, 'userId');
    assertJsonObject(metadata);
    assertMetadataAllowed(metadata, this.options.metadata?.sensitiveKeys);

    const schemaResult = this.options.metadata?.schema?.(metadata);
    if (schemaResult !== undefined && schemaResult !== true) {
      throw new AuthIdentityError('AUTH_METADATA_INVALID', typeof schemaResult === 'string' ? schemaResult : undefined);
    }

    const profiles = requireRepository(this.adapter, 'profiles', this.adapter.profiles);
    return profiles.upsertUserProfile(userId, metadata as JsonObject, this.clock.now());
  }
}
