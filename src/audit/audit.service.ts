import { Inject, Injectable } from '@nestjs/common';
import { redactSensitiveMetadata } from '../common/metadata';
import { AUTH_IDENTITY_CLOCK, AUTH_IDENTITY_ID_GENERATOR, AUTH_IDENTITY_OPTIONS, AUTH_IDENTITY_STORAGE_ADAPTER } from '../common/tokens';
import { isFeatureEnabled } from '../config/auth-identity-options';
import type { AuthIdentityClock } from '../common/clock';
import { generateEntityId, type AuthIdentityIdGenerator } from '../common/id-generator';
import type { JsonObject, RequestMetadata } from '../common/types';
import type { NormalizedAuthIdentityOptions } from '../config/auth-identity-options';
import type { AuditLogEntity } from '../contracts/entities';
import type { AuthIdentityStorageAdapter } from '../contracts/storage-adapter';

export interface WriteAuditLogInput {
  actorType: 'user' | 'service' | 'system' | string;
  actorId?: string;
  event: string;
  resource?: string;
  resourceId?: string;
  metadata?: JsonObject;
  request?: RequestMetadata;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject(AUTH_IDENTITY_OPTIONS) private readonly options: NormalizedAuthIdentityOptions,
    @Inject(AUTH_IDENTITY_STORAGE_ADAPTER) private readonly adapter: AuthIdentityStorageAdapter,
    @Inject(AUTH_IDENTITY_CLOCK) private readonly clock: AuthIdentityClock,
    @Inject(AUTH_IDENTITY_ID_GENERATOR) private readonly idGenerator: AuthIdentityIdGenerator,
  ) {}

  async write(input: WriteAuditLogInput): Promise<AuditLogEntity | undefined> {
    if (!isFeatureEnabled(this.options, 'auditLog') || !this.adapter.auditLogs) {
      return undefined;
    }

    return this.adapter.auditLogs.createAuditLog({
      id: generateEntityId(this.idGenerator, this.options.id, 'aud'),
      actorType: input.actorType,
      actorId: input.actorId,
      event: input.event,
      resource: input.resource,
      resourceId: input.resourceId,
      ipAddress: input.request?.ipAddress,
      userAgent: input.request?.userAgent,
      metadata: redactSensitiveMetadata(input.metadata, this.options.metadata?.sensitiveKeys),
      createdAt: this.clock.now(),
    });
  }

  async list(): Promise<AuditLogEntity[]> {
    if (!isFeatureEnabled(this.options, 'auditLog') || !this.adapter.auditLogs) {
      return [];
    }

    return this.adapter.auditLogs.listAuditLogs();
  }
}
