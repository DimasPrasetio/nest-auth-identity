import type { JsonObject } from '../common/types';

export class UpdateUserDto {
  name?: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  status?: string;
}

export class UpdateUserStatusDto {
  status!: string;
}

export class UpdateProfileMetadataDto {
  metadata!: JsonObject;
}

export class CreateIdentityDocumentDto {
  documentType!: string;
  documentNumber?: string;
  documentFileRef?: string;
  metadata?: JsonObject;
}

