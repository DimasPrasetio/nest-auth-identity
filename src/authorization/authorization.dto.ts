export class CreateRoleDto {
  code!: string;
  name!: string;
  description?: string;
  isSystem?: boolean;
}

export class CreatePermissionDto {
  code!: string;
  name!: string;
  description?: string;
  resource?: string;
  action?: string;
}

export class AssignRoleDto {
  roleId!: string;
}

export class AssignPermissionDto {
  permissionId!: string;
}

export class CreateGrantDto {
  subjectType!: 'user' | 'role' | 'application' | 'serviceCredential';
  subjectId!: string;
  resource!: string;
  action!: string;
  scope!: string;
  expiredAt?: Date;
}

