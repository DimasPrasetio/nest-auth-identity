import type { PublicUserIdentity, UserIdentityEntity } from '../contracts/entities';

export function toPublicUser(user: UserIdentityEntity): PublicUserIdentity {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    phoneNumber: user.phoneNumber,
    status: user.status,
    loginMethod: user.loginMethod,
    emailVerifiedAt: user.emailVerifiedAt,
    phoneVerifiedAt: user.phoneVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
  };
}
