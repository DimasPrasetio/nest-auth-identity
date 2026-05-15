import { SetMetadata } from '@nestjs/common';
import { AUTH_ROLES_METADATA } from './auth-metadata.constants';

export const Roles = (...roles: string[]) => SetMetadata(AUTH_ROLES_METADATA, roles);

