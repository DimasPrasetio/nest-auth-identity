import { Inject, Injectable } from '@nestjs/common';
import { AuthIdentityError, featureDisabled } from '../common/errors';
import { requireRepository } from '../common/adapter-utils';
import { assertNonEmptyString } from '../common/validation';
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
import type { ApplicationEntity, ApplicationUserEntity } from '../contracts/entities';
import type { AuthIdentityStorageAdapter } from '../contracts/storage-adapter';

@Injectable()
export class ApplicationAccessService {
  constructor(
    @Inject(AUTH_IDENTITY_OPTIONS) private readonly options: NormalizedAuthIdentityOptions,
    @Inject(AUTH_IDENTITY_STORAGE_ADAPTER) private readonly adapter: AuthIdentityStorageAdapter,
    @Inject(AUTH_IDENTITY_CLOCK) private readonly clock: AuthIdentityClock,
    @Inject(AUTH_IDENTITY_ID_GENERATOR) private readonly idGenerator: AuthIdentityIdGenerator,
  ) {}

  async registerApplication(input: { code: string; name: string; description?: string }): Promise<ApplicationEntity> {
    this.assertFeature();
    assertNonEmptyString(input.code, 'code');
    assertNonEmptyString(input.name, 'name');
    const applications = requireRepository(this.adapter, 'applications', this.adapter.applications);
    const existing = await applications.findApplicationByCode(input.code);
    if (existing) {
      throw new AuthIdentityError('AUTH_DUPLICATE_IDENTITY', 'Application code is already used.', { code: input.code });
    }
    const now = this.clock.now();
    return applications.createApplication({
      id: generateEntityId(this.idGenerator, this.options.id, 'app'),
      code: input.code,
      name: input.name,
      description: input.description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  async setApplicationActive(id: string, isActive: boolean): Promise<ApplicationEntity> {
    this.assertFeature();
    assertNonEmptyString(id, 'id');
    const applications = requireRepository(this.adapter, 'applications', this.adapter.applications);
    return applications.updateApplication(id, { isActive, updatedAt: this.clock.now() });
  }

  async assignUserAccess(applicationId: string, userId: string): Promise<ApplicationUserEntity> {
    this.assertFeature();
    assertNonEmptyString(applicationId, 'applicationId');
    assertNonEmptyString(userId, 'userId');
    const applications = requireRepository(this.adapter, 'applications', this.adapter.applications);
    return applications.assignUserToApplication({
      id: generateEntityId(this.idGenerator, this.options.id, 'apu'),
      applicationId,
      userId,
      status: 'active',
      grantedAt: this.clock.now(),
    });
  }

  async revokeUserAccess(applicationId: string, userId: string): Promise<ApplicationUserEntity | undefined> {
    this.assertFeature();
    assertNonEmptyString(applicationId, 'applicationId');
    assertNonEmptyString(userId, 'userId');
    const applications = requireRepository(this.adapter, 'applications', this.adapter.applications);
    return applications.revokeUserApplicationAccess(applicationId, userId, this.clock.now());
  }

  async validateUserAccess(applicationId: string, userId: string): Promise<void> {
    this.assertFeature();
    assertNonEmptyString(applicationId, 'applicationId');
    assertNonEmptyString(userId, 'userId');
    const applications = requireRepository(this.adapter, 'applications', this.adapter.applications);
    const application = await applications.findApplicationById(applicationId);
    const access = await applications.findUserApplicationAccess(applicationId, userId);
    if (!application?.isActive || !access || access.status !== 'active' || access.revokedAt) {
      throw new AuthIdentityError('AUTH_FORBIDDEN_PERMISSION', 'Application access is not allowed.');
    }
  }

  private assertFeature(): void {
    if (!isFeatureEnabled(this.options, 'applicationAccess')) {
      throw featureDisabled('applicationAccess');
    }
  }
}
