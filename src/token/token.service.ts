import { Inject, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AuthIdentityError } from '../common/errors';
import { AUTH_IDENTITY_CLOCK, AUTH_IDENTITY_ID_GENERATOR, AUTH_IDENTITY_OPTIONS } from '../common/tokens';
import { generateOpaqueToken, parseDurationSeconds, sha256 } from '../common/security';
import type { AuthIdentityClock } from '../common/clock';
import type { AuthIdentityIdGenerator } from '../common/id-generator';
import type { AuthContext, PrincipalType } from '../common/types';
import type { NormalizedAuthIdentityOptions } from '../config/auth-identity-options';

export interface AccessTokenPayload {
  sub: string;
  sid?: string;
  jti: string;
  iss?: string;
  aud?: string | string[];
  roles?: string[];
  permissions?: string[];
  grants?: string[];
  applicationId?: string;
  typ: PrincipalType;
  iat: number;
  exp: number;
}

export interface IssueAccessTokenInput {
  subjectId: string;
  sessionId?: string;
  type?: PrincipalType;
  roles?: string[];
  permissions?: string[];
  grants?: string[];
  applicationId?: string;
  expiresIn?: string | number;
}

export interface IssuedAccessToken {
  accessToken: string;
  tokenId: string;
  expiresAt: Date;
  payload: AccessTokenPayload;
}

export interface IssuedRefreshToken {
  refreshToken: string;
  refreshTokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(
    @Inject(AUTH_IDENTITY_OPTIONS) private readonly options: NormalizedAuthIdentityOptions,
    @Inject(AUTH_IDENTITY_CLOCK) private readonly clock: AuthIdentityClock,
    @Inject(AUTH_IDENTITY_ID_GENERATOR) private readonly idGenerator: AuthIdentityIdGenerator,
  ) {}

  issueAccessToken(input: IssueAccessTokenInput): IssuedAccessToken {
    const now = this.clock.now();
    const issuedAt = Math.floor(now.getTime() / 1000);
    const ttlSeconds = parseDurationSeconds(input.expiresIn ?? this.options.jwt.accessTokenExpiresIn, 15 * 60);
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    const tokenId = this.idGenerator.generate('jti');
    const payload: AccessTokenPayload = {
      sub: input.subjectId,
      sid: input.sessionId,
      jti: tokenId,
      iss: this.options.jwt.issuer,
      aud: this.options.jwt.audience,
      roles: input.roles ?? [],
      permissions: input.permissions ?? [],
      grants: input.grants ?? [],
      applicationId: input.applicationId,
      typ: input.type ?? 'user',
      iat: issuedAt,
      exp: Math.floor(expiresAt.getTime() / 1000),
    };

    return {
      accessToken: this.sign(payload),
      tokenId,
      expiresAt,
      payload,
    };
  }

  issueRefreshToken(expiresIn?: string | number): IssuedRefreshToken {
    const now = this.clock.now();
    const ttlSeconds = parseDurationSeconds(expiresIn ?? this.options.jwt.refreshTokenExpiresIn, 30 * 24 * 60 * 60);
    const refreshToken = generateOpaqueToken(48);
    return {
      refreshToken,
      refreshTokenHash: this.hashOpaqueToken(refreshToken),
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
    };
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new AuthIdentityError('AUTH_TOKEN_INVALID');
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = this.hmac(`${encodedHeader}.${encodedPayload}`);
    if (!safeEqual(signature, expectedSignature)) {
      throw new AuthIdentityError('AUTH_TOKEN_INVALID');
    }

    const header = parseJson<Record<string, unknown>>(encodedHeader);
    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      throw new AuthIdentityError('AUTH_TOKEN_INVALID');
    }

    const payload = parseJson<AccessTokenPayload>(encodedPayload);
    const now = Math.floor(this.clock.now().getTime() / 1000);
    if (!payload.exp || payload.exp <= now) {
      throw new AuthIdentityError('AUTH_TOKEN_EXPIRED');
    }

    if (this.options.jwt.issuer && payload.iss !== this.options.jwt.issuer) {
      throw new AuthIdentityError('AUTH_TOKEN_INVALID', 'Token issuer is invalid.');
    }

    if (this.options.jwt.audience && !audienceMatches(payload.aud, this.options.jwt.audience)) {
      throw new AuthIdentityError('AUTH_TOKEN_INVALID', 'Token audience is invalid.');
    }

    if (!payload.sub || !payload.jti || !payload.typ) {
      throw new AuthIdentityError('AUTH_TOKEN_INVALID');
    }

    return payload;
  }

  toAuthContext(payload: AccessTokenPayload): AuthContext {
    return {
      principal: {
        id: payload.sub,
        type: payload.typ,
        roles: payload.roles ?? [],
        permissions: payload.permissions ?? [],
        grants: payload.grants ?? [],
        applicationId: payload.applicationId,
      },
      userId: payload.typ === 'user' ? payload.sub : undefined,
      sessionId: payload.sid,
      tokenId: payload.jti,
      tokenType: payload.typ,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      grants: payload.grants ?? [],
      applicationId: payload.applicationId,
    };
  }

  hashOpaqueToken(token: string): string {
    return sha256(token);
  }

  private sign(payload: AccessTokenPayload): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = encodeJson(header);
    const encodedPayload = encodeJson(payload);
    const signature = this.hmac(`${encodedHeader}.${encodedPayload}`);
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private hmac(value: string): string {
    return createHmac('sha256', this.options.jwt.secret).update(value).digest('base64url');
  }
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function parseJson<T>(value: string): T {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  } catch {
    throw new AuthIdentityError('AUTH_TOKEN_INVALID');
  }
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function audienceMatches(payloadAudience: string | string[] | undefined, expectedAudience: string | string[]): boolean {
  const payloadValues = Array.isArray(payloadAudience) ? payloadAudience : payloadAudience ? [payloadAudience] : [];
  const expectedValues = Array.isArray(expectedAudience) ? expectedAudience : [expectedAudience];
  return expectedValues.every((expected) => payloadValues.includes(expected));
}
