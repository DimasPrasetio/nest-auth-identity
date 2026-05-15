import { SetMetadata } from '@nestjs/common';
import { AUTH_GRANTS_METADATA } from './auth-metadata.constants';

export const Grants = (...grants: string[]) => SetMetadata(AUTH_GRANTS_METADATA, grants);

