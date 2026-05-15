import type { JsonObject } from '../common/types';

export class RegisterDto {
  name!: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  password!: string;
  metadata?: JsonObject;
}

export class LoginDto {
  identifier!: string;
  password!: string;
}

export class RefreshTokenDto {
  refreshToken!: string;
}

export class ValidateTokenDto {
  token!: string;
}

export class ForgotPasswordDto {
  identifier!: string;
}

export class ResetPasswordDto {
  token!: string;
  newPassword!: string;
}

export class ChangePasswordDto {
  currentPassword!: string;
  newPassword!: string;
}
