import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { CurrentUser, Public } from '../decorators';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  ValidateTokenDto,
} from './dto';
import type { AuthContext } from '../common/types';
import type { AuthenticatedHttpRequest } from '../guards/request-context';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() request: AuthenticatedHttpRequest) {
    return this.authService.register({
      ...dto,
      request: toRequestMetadata(request),
    });
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() request: AuthenticatedHttpRequest) {
    return this.authService.login({
      ...dto,
      request: toRequestMetadata(request),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() request: AuthenticatedHttpRequest) {
    if (request.authContext?.sessionId) {
      await this.authService.logout(request.authContext.sessionId, toRequestMetadata(request));
    }
    return { success: true };
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: unknown) {
    return user;
  }

  @Public()
  @Post('validate')
  validate(@Body() dto: ValidateTokenDto): Promise<AuthContext> {
    return this.authService.validateAccessToken(dto.token);
  }

  @Public()
  @Post('password/forgot')
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() request: AuthenticatedHttpRequest) {
    return this.authService.requestPasswordReset({
      ...dto,
      request: toRequestMetadata(request),
    });
  }

  @Public()
  @Post('password/reset')
  resetPassword(@Body() dto: ResetPasswordDto, @Req() request: AuthenticatedHttpRequest) {
    return this.authService.resetPassword({
      ...dto,
      request: toRequestMetadata(request),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('password/change')
  changePassword(@Body() dto: ChangePasswordDto, @Req() request: AuthenticatedHttpRequest) {
    if (!request.authContext?.userId) {
      return Promise.reject(new Error('Authenticated user context is required.'));
    }
    return this.authService.changePassword({
      userId: request.authContext.userId,
      ...dto,
      request: toRequestMetadata(request),
    });
  }
}

function toRequestMetadata(request: AuthenticatedHttpRequest) {
  return {
    ipAddress: request.ip ?? request.socket?.remoteAddress,
    userAgent: request.get?.('user-agent'),
  };
}
