import { Inject, Injectable } from '@nestjs/common';
import { AuthIdentityError, featureDisabled } from '../common/errors';
import { requireRepository } from '../common/adapter-utils';
import { generateOpaqueToken } from '../common/security';
import { assertNonEmptyString, assertOptionalDate } from '../common/validation';
import {
  AUTH_IDENTITY_CLOCK,
  AUTH_IDENTITY_ID_GENERATOR,
  AUTH_IDENTITY_OPTIONS,
  AUTH_IDENTITY_PASSWORD_HASHER,
  AUTH_IDENTITY_STORAGE_ADAPTER,
} from '../common/tokens';
import { isFeatureEnabled } from '../config/auth-identity-options';
import { TokenService } from '../token/token.service';
import type { AuthIdentityClock } from '../common/clock';
import { generateEntityId, type AuthIdentityIdGenerator } from '../common/id-generator';
import type { NormalizedAuthIdentityOptions } from '../config/auth-identity-options';
import type { ServiceCredentialEntity } from '../contracts/entities';
import type { AuthIdentityStorageAdapter } from '../contracts/storage-adapter';
import type { PasswordHasher } from '../auth/password-hasher';

export interface CreateServiceCredentialResult {
  credential: Omit<ServiceCredentialEntity, 'clientSecretHash'>;
  clientSecret: string;
}

@Injectable()
export class ServiceCredentialService {
  constructor(
    @Inject(AUTH_IDENTITY_OPTIONS) private readonly options: NormalizedAuthIdentityOptions,
    @Inject(AUTH_IDENTITY_STORAGE_ADAPTER) private readonly adapter: AuthIdentityStorageAdapter,
    @Inject(AUTH_IDENTITY_PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(AUTH_IDENTITY_CLOCK) private readonly clock: AuthIdentityClock,
    @Inject(AUTH_IDENTITY_ID_GENERATOR) private readonly idGenerator: AuthIdentityIdGenerator,
    @Inject(TokenService) private readonly tokenService: TokenService,
  ) {}

  async create(input: {
    name: string;
    applicationId?: string;
    scopes?: string[];
    permissions?: string[];
    expiredAt?: Date;
  }): Promise<CreateServiceCredentialResult> {
    this.assertFeature();
    assertNonEmptyString(input.name, 'name');
    assertOptionalDate(input.expiredAt, 'expiredAt');
    const serviceCredentials = requireRepository(this.adapter, 'serviceCredentials', this.adapter.serviceCredentials);
    const now = this.clock.now();
    const clientSecret = generateOpaqueToken(48);
    const credential = await serviceCredentials.createServiceCredential({
      id: generateEntityId(this.idGenerator, this.options.id, 'svc'),
      applicationId: input.applicationId,
      clientId: this.idGenerator.generate('client'),
      clientSecretHash: await this.passwordHasher.hash(clientSecret),
      name: input.name,
      status: 'active',
      scopes: input.scopes ?? [],
      permissions: input.permissions ?? [],
      expiredAt: input.expiredAt,
      createdAt: now,
      updatedAt: now,
    });

    return { credential: sanitizeCredential(credential), clientSecret };
  }

  async validate(clientId: string, clientSecret: string): Promise<ServiceCredentialEntity> {
    this.assertFeature();
    assertNonEmptyString(clientId, 'clientId');
    assertNonEmptyString(clientSecret, 'clientSecret');
    const serviceCredentials = requireRepository(this.adapter, 'serviceCredentials', this.adapter.serviceCredentials);
    const credential = await serviceCredentials.findServiceCredentialByClientId(clientId);
    if (!credential || credential.status !== 'active' || credential.revokedAt || (credential.expiredAt && credential.expiredAt <= this.clock.now())) {
      throw new AuthIdentityError('AUTH_INVALID_CREDENTIAL');
    }

    const valid = await this.passwordHasher.verify(clientSecret, credential.clientSecretHash);
    if (!valid) {
      throw new AuthIdentityError('AUTH_INVALID_CREDENTIAL');
    }

    return credential;
  }

  async issueServiceToken(clientId: string, clientSecret: string) {
    const credential = await this.validate(clientId, clientSecret);
    return this.tokenService.issueAccessToken({
      subjectId: credential.id,
      type: 'service',
      permissions: credential.permissions,
      grants: credential.scopes,
      applicationId: credential.applicationId,
    });
  }

  async revoke(id: string): Promise<ServiceCredentialEntity> {
    this.assertFeature();
    assertNonEmptyString(id, 'id');
    const serviceCredentials = requireRepository(this.adapter, 'serviceCredentials', this.adapter.serviceCredentials);
    return serviceCredentials.updateServiceCredential(id, { status: 'revoked', revokedAt: this.clock.now(), updatedAt: this.clock.now() });
  }

  private assertFeature(): void {
    if (!isFeatureEnabled(this.options, 'serviceCredential')) {
      throw featureDisabled('serviceCredential');
    }
  }
}

function sanitizeCredential(credential: ServiceCredentialEntity): Omit<ServiceCredentialEntity, 'clientSecretHash'> {
  const safe = { ...credential };
  delete (safe as Partial<ServiceCredentialEntity>).clientSecretHash;
  return safe;
}
