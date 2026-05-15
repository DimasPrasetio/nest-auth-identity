import { Inject, Injectable } from '@nestjs/common';
import { AuthIdentityError } from '../common/errors';
import { requireRepository } from '../common/adapter-utils';
import {
  AUTH_IDENTITY_CLOCK,
  AUTH_IDENTITY_ID_GENERATOR,
  AUTH_IDENTITY_OPTIONS,
  AUTH_IDENTITY_STORAGE_ADAPTER,
} from '../common/tokens';
import { TokenService } from '../token/token.service';
import type { AuthIdentityClock } from '../common/clock';
import type { AuthIdentityIdGenerator } from '../common/id-generator';
import type { RequestMetadata } from '../common/types';
import type { NormalizedAuthIdentityOptions } from '../config/auth-identity-options';
import type { SessionEntity } from '../contracts/entities';
import type { AuthIdentityStorageAdapter } from '../contracts/storage-adapter';
import type { IssuedAccessToken } from '../token/token.service';

export interface CreateSessionInput {
  sessionId?: string;
  userId: string;
  accessTokenId: string;
  refreshTokenHash: string;
  expiredAt: Date;
  request?: RequestMetadata;
}

export interface RefreshSessionResult {
  accessToken: IssuedAccessToken;
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
  session: SessionEntity;
}

@Injectable()
export class SessionService {
  constructor(
    @Inject(AUTH_IDENTITY_OPTIONS) private readonly options: NormalizedAuthIdentityOptions,
    @Inject(AUTH_IDENTITY_STORAGE_ADAPTER) private readonly adapter: AuthIdentityStorageAdapter,
    @Inject(AUTH_IDENTITY_CLOCK) private readonly clock: AuthIdentityClock,
    @Inject(AUTH_IDENTITY_ID_GENERATOR) private readonly idGenerator: AuthIdentityIdGenerator,
    @Inject(TokenService) private readonly tokenService: TokenService,
  ) {}

  async createSession(input: CreateSessionInput): Promise<SessionEntity> {
    const sessions = requireRepository(this.adapter, 'sessions', this.adapter.sessions);
    const now = this.clock.now();
    return sessions.createSession({
      id: input.sessionId ?? this.idGenerator.generate('ses'),
      userId: input.userId,
      accessTokenId: input.accessTokenId,
      refreshTokenHash: input.refreshTokenHash,
      deviceInfo: input.request?.deviceInfo,
      ipAddress: input.request?.ipAddress,
      userAgent: input.request?.userAgent,
      expiredAt: input.expiredAt,
      createdAt: now,
      updatedAt: now,
    });
  }

  async validateSession(sessionId: string): Promise<SessionEntity> {
    const sessions = requireRepository(this.adapter, 'sessions', this.adapter.sessions);
    const session = await sessions.findSessionById(sessionId);
    if (!session || session.revokedAt) {
      throw new AuthIdentityError('AUTH_SESSION_REVOKED');
    }

    if (session.expiredAt <= this.clock.now()) {
      throw new AuthIdentityError('AUTH_SESSION_REVOKED', 'Session is expired.');
    }

    return session;
  }

  async refresh(refreshToken: string, roles: string[] = [], permissions: string[] = [], grants: string[] = []): Promise<RefreshSessionResult> {
    const sessions = requireRepository(this.adapter, 'sessions', this.adapter.sessions);
    const refreshTokenHash = this.tokenService.hashOpaqueToken(refreshToken);
    const session = await sessions.findSessionByRefreshTokenHash(refreshTokenHash);

    if (!session) {
      throw new AuthIdentityError('AUTH_REFRESH_TOKEN_INVALID');
    }

    if (session.revokedAt) {
      throw new AuthIdentityError('AUTH_SESSION_REVOKED');
    }

    if (session.expiredAt <= this.clock.now()) {
      throw new AuthIdentityError('AUTH_REFRESH_TOKEN_INVALID', 'Refresh token is expired.');
    }

    const accessToken = this.tokenService.issueAccessToken({
      subjectId: session.userId,
      sessionId: session.id,
      roles,
      permissions,
      grants,
    });

    if (!this.options.session.refreshTokenRotation) {
      const updated = await sessions.updateSessionRefreshToken(session.id, session.refreshTokenHash, accessToken.tokenId, this.clock.now());
      return { accessToken, session: updated };
    }

    const nextRefreshToken = this.tokenService.issueRefreshToken();
    const updated = await sessions.updateSessionRefreshToken(
      session.id,
      nextRefreshToken.refreshTokenHash,
      accessToken.tokenId,
      this.clock.now(),
    );

    return {
      accessToken,
      refreshToken: nextRefreshToken.refreshToken,
      refreshTokenExpiresAt: nextRefreshToken.expiresAt,
      session: updated,
    };
  }

  async revokeSession(sessionId: string): Promise<SessionEntity | undefined> {
    const sessions = requireRepository(this.adapter, 'sessions', this.adapter.sessions);
    return sessions.revokeSession(sessionId, this.clock.now());
  }

  async revokeUserSessions(userId: string): Promise<number> {
    const sessions = requireRepository(this.adapter, 'sessions', this.adapter.sessions);
    return sessions.revokeUserSessions(userId, this.clock.now());
  }
}
