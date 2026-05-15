import { Inject, Injectable } from '@nestjs/common';
import { AuthIdentityError, featureDisabled } from '../common/errors';
import { requireRepository } from '../common/adapter-utils';
import {
  AUTH_IDENTITY_CLOCK,
  AUTH_IDENTITY_ID_GENERATOR,
  AUTH_IDENTITY_OPTIONS,
  AUTH_IDENTITY_PASSWORD_HASHER,
  AUTH_IDENTITY_STORAGE_ADAPTER,
} from '../common/tokens';
import { generateOpaqueToken } from '../common/security';
import { isFeatureEnabled } from '../config/auth-identity-options';
import { assertNonEmptyString, assertPlainObject } from '../common/validation';
import { AuditService } from '../audit/audit.service';
import { ProfileMetadataService } from '../profile/profile-metadata.service';
import { SessionService } from '../session/session.service';
import { TokenService } from '../token/token.service';
import { UserService } from '../identity/user.service';
import { toPublicUser } from '../identity/user.mapper';
import { assertPasswordPolicy } from './password-policy';
import type { AuthIdentityClock } from '../common/clock';
import { generateEntityId, type AuthIdentityIdGenerator } from '../common/id-generator';
import type { AuthContext, JsonObject, RequestMetadata } from '../common/types';
import type { NormalizedAuthIdentityOptions } from '../config/auth-identity-options';
import type { PublicUserIdentity, SessionEntity } from '../contracts/entities';
import type { AuthIdentityStorageAdapter } from '../contracts/storage-adapter';
import type { PasswordHasher } from './password-hasher';

export interface RegisterInput {
  name: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  password: string;
  metadata?: JsonObject;
  request?: RequestMetadata;
}

export interface LoginInput {
  identifier: string;
  password: string;
  request?: RequestMetadata;
}

export interface LoginResult {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
  session?: SessionEntity;
  user: PublicUserIdentity;
}

export interface RefreshTokenResult {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
  session: SessionEntity;
}

export interface RequestPasswordResetInput {
  identifier: string;
  request?: RequestMetadata;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
  request?: RequestMetadata;
}

export interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
  request?: RequestMetadata;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_IDENTITY_OPTIONS) private readonly options: NormalizedAuthIdentityOptions,
    @Inject(AUTH_IDENTITY_STORAGE_ADAPTER) private readonly adapter: AuthIdentityStorageAdapter,
    @Inject(AUTH_IDENTITY_PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(AUTH_IDENTITY_CLOCK) private readonly clock: AuthIdentityClock,
    @Inject(AUTH_IDENTITY_ID_GENERATOR) private readonly idGenerator: AuthIdentityIdGenerator,
    @Inject(UserService) private readonly userService: UserService,
    @Inject(ProfileMetadataService) private readonly profileMetadataService: ProfileMetadataService,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(SessionService) private readonly sessionService: SessionService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async register(input: RegisterInput): Promise<PublicUserIdentity> {
    this.assertFeature('register');
    assertPlainObject(input, 'register');
    assertNonEmptyString(input.name, 'name');
    assertNonEmptyString(input.password, 'password');
    assertPasswordPolicy(input.password, this.options.password.policy);

    const work = async () => {
      const passwordHash = await this.passwordHasher.hash(input.password);
      const user = await this.userService.createUser({
        name: input.name,
        username: input.username,
        email: input.email,
        phoneNumber: input.phoneNumber,
        passwordHash,
        loginMethod: 'password',
      });

      if (input.metadata && isFeatureEnabled(this.options, 'profileMetadata')) {
        await this.profileMetadataService.updateProfile(user.id, input.metadata);
      }

      await this.auditService.write({
        actorType: 'user',
        actorId: user.id,
        event: 'register',
        resource: 'user',
        resourceId: user.id,
        request: input.request,
      });

      return toPublicUser(user);
    };

    return this.adapter.transaction ? this.adapter.transaction(work) : work();
  }

  async login(input: LoginInput): Promise<LoginResult> {
    this.assertFeature('login');
    assertPlainObject(input, 'login');
    assertNonEmptyString(input.identifier, 'identifier');
    assertNonEmptyString(input.password, 'password');

    const user = await this.userService.findByIdentifier(input.identifier);
    if (!user || !user.passwordHash) {
      await this.auditService.write({
        actorType: 'system',
        event: 'login_failed',
        resource: 'user',
        metadata: { identifier: input.identifier },
        request: input.request,
      });
      throw new AuthIdentityError('AUTH_INVALID_CREDENTIAL');
    }

    this.userService.assertUserCanAuthenticate(user);

    const validPassword = await this.passwordHasher.verify(input.password, user.passwordHash);
    if (!validPassword) {
      await this.auditService.write({
        actorType: 'user',
        actorId: user.id,
        event: 'login_failed',
        resource: 'user',
        resourceId: user.id,
        request: input.request,
      });
      throw new AuthIdentityError('AUTH_INVALID_CREDENTIAL');
    }

    const work = async () => {
      const sessionEnabled = isFeatureEnabled(this.options, 'session');
      const refreshEnabled = isFeatureEnabled(this.options, 'refreshToken') && sessionEnabled;
      const sessionId = sessionEnabled ? this.idGenerator.generate('ses') : undefined;
      const refresh = refreshEnabled ? this.tokenService.issueRefreshToken() : undefined;
      const access = this.tokenService.issueAccessToken({
        subjectId: user.id,
        sessionId,
        type: 'user',
      });

      let session: SessionEntity | undefined;
      if (sessionEnabled && refresh) {
        session = await this.sessionService.createSession({
          sessionId,
          userId: user.id,
          accessTokenId: access.tokenId,
          refreshTokenHash: refresh.refreshTokenHash,
          expiredAt: refresh.expiresAt,
          request: input.request,
        });
      }

      await this.userService.updateLastLogin(user.id);
      await this.auditService.write({
        actorType: 'user',
        actorId: user.id,
        event: 'login_success',
        resource: 'user',
        resourceId: user.id,
        request: input.request,
      });

      return {
        accessToken: access.accessToken,
        accessTokenExpiresAt: access.expiresAt,
        refreshToken: refresh?.refreshToken,
        refreshTokenExpiresAt: refresh?.expiresAt,
        session,
        user: toPublicUser(user),
      };
    };

    return this.adapter.transaction ? this.adapter.transaction(work) : work();
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResult> {
    this.assertFeature('refreshToken');
    this.assertFeature('session');
    assertNonEmptyString(refreshToken, 'refreshToken');

    const result = await this.sessionService.refresh(refreshToken);
    await this.auditService.write({
      actorType: 'user',
      actorId: result.session.userId,
      event: 'refresh_token',
      resource: 'session',
      resourceId: result.session.id,
    });

    return {
      accessToken: result.accessToken.accessToken,
      accessTokenExpiresAt: result.accessToken.expiresAt,
      refreshToken: result.refreshToken,
      refreshTokenExpiresAt: result.refreshTokenExpiresAt,
      session: result.session,
    };
  }

  async logout(sessionId: string, request?: RequestMetadata): Promise<void> {
    this.assertFeature('session');
    assertNonEmptyString(sessionId, 'sessionId');
    const session = await this.sessionService.revokeSession(sessionId);
    if (session) {
      await this.auditService.write({
        actorType: 'user',
        actorId: session.userId,
        event: 'logout',
        resource: 'session',
        resourceId: session.id,
        request,
      });
    }
  }

  async validateAccessToken(token: string): Promise<AuthContext> {
    assertNonEmptyString(token, 'token');
    const payload = this.tokenService.verifyAccessToken(token);
    const context = this.tokenService.toAuthContext(payload);

    if (this.options.session.validateOnRequest && context.sessionId && isFeatureEnabled(this.options, 'session')) {
      await this.sessionService.validateSession(context.sessionId);
    }

    return context;
  }

  async getCurrentUser(context: AuthContext): Promise<PublicUserIdentity | undefined> {
    if (!context.userId) {
      return undefined;
    }
    return this.userService.getPublicUserById(context.userId);
  }

  async requestPasswordReset(input: RequestPasswordResetInput): Promise<{ resetToken?: string; expiresAt?: Date }> {
    this.assertFeature('resetPassword');
    assertPlainObject(input, 'passwordReset');
    assertNonEmptyString(input.identifier, 'identifier');
    const user = await this.userService.findByIdentifier(input.identifier);
    if (!user) {
      await this.auditService.write({
        actorType: 'system',
        event: 'password_reset_request',
        resource: 'user',
        metadata: { identifier: input.identifier, accepted: false },
        request: input.request,
      });
      return {};
    }

    const tokens = requireRepository(this.adapter, 'tokens', this.adapter.tokens);
    const resetToken = generateOpaqueToken(48);
    const tokenHash = this.tokenService.hashOpaqueToken(resetToken);
    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    await tokens.createTokenRecord({
      id: generateEntityId(this.idGenerator, this.options.id, 'tok'),
      type: 'password_reset',
      subjectId: user.id,
      tokenHash,
      expiredAt: expiresAt,
      createdAt: now,
      updatedAt: now,
    });
    await this.auditService.write({
      actorType: 'user',
      actorId: user.id,
      event: 'password_reset_request',
      resource: 'user',
      resourceId: user.id,
      request: input.request,
    });

    return { resetToken, expiresAt };
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    this.assertFeature('resetPassword');
    assertPlainObject(input, 'resetPassword');
    assertNonEmptyString(input.token, 'token');
    assertNonEmptyString(input.newPassword, 'newPassword');
    assertPasswordPolicy(input.newPassword, this.options.password.policy);

    const tokens = requireRepository(this.adapter, 'tokens', this.adapter.tokens);
    const tokenHash = this.tokenService.hashOpaqueToken(input.token);
    const record = await tokens.findTokenRecordByHash('password_reset', tokenHash);
    if (!record || record.usedAt || record.revokedAt || record.expiredAt <= this.clock.now()) {
      throw new AuthIdentityError('AUTH_TOKEN_INVALID', 'Password reset token is invalid.');
    }

    const passwordHash = await this.passwordHasher.hash(input.newPassword);
    await this.userService.updatePasswordHash(record.subjectId, passwordHash);
    await tokens.markTokenRecordUsed(record.id, this.clock.now());
    await this.sessionService.revokeUserSessions(record.subjectId);
    await this.auditService.write({
      actorType: 'user',
      actorId: record.subjectId,
      event: 'password_changed',
      resource: 'user',
      resourceId: record.subjectId,
      request: input.request,
    });
  }

  async changePassword(input: ChangePasswordInput): Promise<void> {
    assertPlainObject(input, 'changePassword');
    assertNonEmptyString(input.userId, 'userId');
    assertNonEmptyString(input.currentPassword, 'currentPassword');
    assertNonEmptyString(input.newPassword, 'newPassword');
    assertPasswordPolicy(input.newPassword, this.options.password.policy);
    const user = await this.userService.getUserById(input.userId);
    if (!user || !user.passwordHash) {
      throw new AuthIdentityError('AUTH_INVALID_CREDENTIAL');
    }

    const validPassword = await this.passwordHasher.verify(input.currentPassword, user.passwordHash);
    if (!validPassword) {
      throw new AuthIdentityError('AUTH_INVALID_CREDENTIAL');
    }

    const passwordHash = await this.passwordHasher.hash(input.newPassword);
    await this.userService.updatePasswordHash(user.id, passwordHash);
    await this.sessionService.revokeUserSessions(user.id);
    await this.auditService.write({
      actorType: 'user',
      actorId: user.id,
      event: 'password_changed',
      resource: 'user',
      resourceId: user.id,
      request: input.request,
    });
  }

  private assertFeature(feature: Parameters<typeof isFeatureEnabled>[1]): void {
    if (!isFeatureEnabled(this.options, feature)) {
      throw featureDisabled(feature);
    }
  }
}
