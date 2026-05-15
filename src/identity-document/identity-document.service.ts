import { Inject, Injectable } from '@nestjs/common';
import { AUTH_IDENTITY_CLOCK, AUTH_IDENTITY_ENCRYPTION, AUTH_IDENTITY_ID_GENERATOR, AUTH_IDENTITY_OPTIONS, AUTH_IDENTITY_STORAGE_ADAPTER } from '../common/tokens';
import { AuthIdentityError, featureDisabled } from '../common/errors';
import { maskValue, sha256 } from '../common/security';
import { requireRepository } from '../common/adapter-utils';
import { assertNonEmptyString } from '../common/validation';
import { isFeatureEnabled } from '../config/auth-identity-options';
import { AuditService } from '../audit/audit.service';
import type { AuthIdentityClock } from '../common/clock';
import { generateEntityId, type AuthIdentityIdGenerator } from '../common/id-generator';
import type { EncryptionProvider } from '../common/encryption';
import type { JsonObject } from '../common/types';
import type { NormalizedAuthIdentityOptions } from '../config/auth-identity-options';
import type { IdentityDocumentEntity } from '../contracts/entities';
import type { AuthIdentityStorageAdapter } from '../contracts/storage-adapter';

@Injectable()
export class IdentityDocumentService {
  constructor(
    @Inject(AUTH_IDENTITY_OPTIONS) private readonly options: NormalizedAuthIdentityOptions,
    @Inject(AUTH_IDENTITY_STORAGE_ADAPTER) private readonly adapter: AuthIdentityStorageAdapter,
    @Inject(AUTH_IDENTITY_CLOCK) private readonly clock: AuthIdentityClock,
    @Inject(AUTH_IDENTITY_ID_GENERATOR) private readonly idGenerator: AuthIdentityIdGenerator,
    @Inject(AUTH_IDENTITY_ENCRYPTION) private readonly encryption: EncryptionProvider,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async create(input: {
    userId: string;
    documentType: string;
    documentNumber?: string;
    documentFileRef?: string;
    metadata?: JsonObject;
    actorId?: string;
  }): Promise<IdentityDocumentEntity> {
    this.assertFeature();
    assertNonEmptyString(input.userId, 'userId');
    assertNonEmptyString(input.documentType, 'documentType');
    if (!input.documentNumber && !input.documentFileRef) {
      throw new AuthIdentityError('AUTH_IDENTITY_DOCUMENT_INVALID');
    }

    const documents = requireRepository(this.adapter, 'identityDocuments', this.adapter.identityDocuments);
    const now = this.clock.now();
    let encrypted: string | undefined;
    try {
      encrypted = input.documentNumber ? await this.encryption.encrypt(input.documentNumber) : undefined;
    } catch (cause) {
      throw new AuthIdentityError('AUTH_ENCRYPTION_FAILED', undefined, { cause });
    }

    const document = await documents.createIdentityDocument({
      id: generateEntityId(this.idGenerator, this.options.id, 'doc'),
      userId: input.userId,
      documentType: input.documentType,
      documentNumberHash: input.documentNumber ? sha256(input.documentNumber) : undefined,
      documentNumberEncrypted: encrypted,
      documentNumberMasked: input.documentNumber ? maskValue(input.documentNumber) : undefined,
      documentFileRef: input.documentFileRef,
      verificationStatus: 'pending',
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    });

    await this.auditService.write({
      actorType: input.actorId ? 'user' : 'system',
      actorId: input.actorId,
      event: 'identity_document_created',
      resource: 'identity_document',
      resourceId: document.id,
    });

    return this.maskDocument(document);
  }

  async listByUser(userId: string): Promise<IdentityDocumentEntity[]> {
    this.assertFeature();
    assertNonEmptyString(userId, 'userId');
    const documents = requireRepository(this.adapter, 'identityDocuments', this.adapter.identityDocuments);
    return (await documents.listIdentityDocumentsByUserId(userId)).map((document) => this.maskDocument(document));
  }

  async getMasked(id: string, actorId?: string): Promise<IdentityDocumentEntity | undefined> {
    this.assertFeature();
    assertNonEmptyString(id, 'id');
    const documents = requireRepository(this.adapter, 'identityDocuments', this.adapter.identityDocuments);
    const document = await documents.findIdentityDocumentById(id);
    if (!document) {
      return undefined;
    }
    await this.auditService.write({
      actorType: actorId ? 'user' : 'system',
      actorId,
      event: 'identity_document_viewed',
      resource: 'identity_document',
      resourceId: id,
    });
    return this.maskDocument(document);
  }

  private maskDocument(document: IdentityDocumentEntity): IdentityDocumentEntity {
    return {
      ...document,
      documentNumberEncrypted: undefined,
    };
  }

  private assertFeature(): void {
    if (!isFeatureEnabled(this.options, 'identityDocument')) {
      throw featureDisabled('identityDocument');
    }
  }
}
