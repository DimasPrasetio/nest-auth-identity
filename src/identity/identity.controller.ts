import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUserId, Permissions } from '../decorators';
import { JwtAuthGuard, PermissionGuard } from '../guards';
import { IdentityDocumentService } from '../identity-document/identity-document.service';
import { ProfileMetadataService } from '../profile/profile-metadata.service';
import { UserService } from './user.service';
import { CreateIdentityDocumentDto, UpdateProfileMetadataDto, UpdateUserDto, UpdateUserStatusDto } from './identity.dto';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('identity')
export class IdentityController {
  constructor(
    @Inject(UserService) private readonly userService: UserService,
    @Inject(ProfileMetadataService) private readonly profileMetadataService: ProfileMetadataService,
    @Inject(IdentityDocumentService) private readonly identityDocumentService: IdentityDocumentService,
  ) {}

  @Permissions('users.read')
  @Get('users')
  listUsers() {
    return this.userService.listUsers();
  }

  @Permissions('users.read')
  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.userService.getPublicUserById(id);
  }

  @Permissions('users.update')
  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(id, dto);
  }

  @Permissions('users.update_status')
  @Patch('users/:id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.userService.updateStatus(id, dto.status);
  }

  @Permissions('users.read')
  @Get('users/:id/profile')
  getProfile(@Param('id') id: string) {
    return this.profileMetadataService.getProfile(id);
  }

  @Permissions('users.update')
  @Patch('users/:id/profile')
  updateProfile(@Param('id') id: string, @Body() dto: UpdateProfileMetadataDto) {
    return this.profileMetadataService.updateProfile(id, dto.metadata);
  }

  @Permissions('identity_documents.read')
  @Get('users/:id/documents')
  listDocuments(@Param('id') id: string) {
    return this.identityDocumentService.listByUser(id);
  }

  @Permissions('identity_documents.create')
  @Post('users/:id/documents')
  createDocument(@Param('id') id: string, @Body() dto: CreateIdentityDocumentDto, @CurrentUserId() actorId?: string) {
    return this.identityDocumentService.create({
      userId: id,
      ...dto,
      actorId,
    });
  }

  @Permissions('identity_documents.read')
  @Get('documents/:id')
  getDocument(@Param('id') id: string, @CurrentUserId() actorId?: string) {
    return this.identityDocumentService.getMasked(id, actorId);
  }
}
