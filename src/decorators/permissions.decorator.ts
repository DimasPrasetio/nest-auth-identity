import { SetMetadata } from '@nestjs/common';
import { AUTH_PERMISSIONS_METADATA } from './auth-metadata.constants';

export const Permissions = (...permissions: string[]) => SetMetadata(AUTH_PERMISSIONS_METADATA, permissions);

