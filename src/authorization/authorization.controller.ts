import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Permissions } from '../decorators';
import { JwtAuthGuard, PermissionGuard } from '../guards';
import { AuthorizationService } from './authorization.service';
import { AssignPermissionDto, AssignRoleDto, CreateGrantDto, CreatePermissionDto, CreateRoleDto } from './authorization.dto';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('identity')
export class AuthorizationController {
  constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  @Permissions('roles.read')
  @Get('roles')
  listRoles() {
    return this.authorizationService.listRoles();
  }

  @Permissions('roles.create')
  @Post('roles')
  createRole(@Body() dto: CreateRoleDto) {
    return this.authorizationService.createRole(dto);
  }

  @Permissions('roles.update')
  @Patch('roles/:id')
  updateRole(@Param('id') id: string, @Body() dto: Partial<CreateRoleDto>) {
    return this.authorizationService.updateRole(id, dto);
  }

  @Permissions('roles.delete')
  @Delete('roles/:id')
  async deleteRole(@Param('id') id: string) {
    await this.authorizationService.deleteRole(id);
    return { success: true };
  }

  @Permissions('permissions.read')
  @Get('permissions')
  listPermissions() {
    return this.authorizationService.listPermissions();
  }

  @Permissions('permissions.create')
  @Post('permissions')
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.authorizationService.createPermission(dto);
  }

  @Permissions('permissions.update')
  @Patch('permissions/:id')
  updatePermission(@Param('id') id: string, @Body() dto: Partial<CreatePermissionDto>) {
    return this.authorizationService.updatePermission(id, dto);
  }

  @Permissions('roles.assign')
  @Post('users/:id/roles')
  assignRole(@Param('id') userId: string, @Body() dto: AssignRoleDto) {
    return this.authorizationService.assignRoleToUser(userId, dto.roleId);
  }

  @Permissions('roles.assign')
  @Delete('users/:id/roles/:roleId')
  async removeRole(@Param('id') userId: string, @Param('roleId') roleId: string) {
    await this.authorizationService.removeRoleFromUser(userId, roleId);
    return { success: true };
  }

  @Permissions('permissions.assign')
  @Post('roles/:id/permissions')
  assignPermission(@Param('id') roleId: string, @Body() dto: AssignPermissionDto) {
    return this.authorizationService.assignPermissionToRole(roleId, dto.permissionId);
  }

  @Permissions('permissions.assign')
  @Delete('roles/:id/permissions/:permissionId')
  async removePermission(@Param('id') roleId: string, @Param('permissionId') permissionId: string) {
    await this.authorizationService.removePermissionFromRole(roleId, permissionId);
    return { success: true };
  }

  @Permissions('grants.create')
  @Post('grants')
  createGrant(@Body() dto: CreateGrantDto) {
    return this.authorizationService.createGrant(dto);
  }

  @Permissions('audit_logs.read')
  @Get('audit-logs')
  auditLogs() {
    return this.auditService.list();
  }
}
