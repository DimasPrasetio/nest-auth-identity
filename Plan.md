# Development Plan - @elcodelabs/nest-auth-identity

Plan ini dibuat berdasarkan analisis `PRD.md` saat ini. PRD mendefinisikan `@elcodelabs/nest-auth-identity` sebagai reusable NestJS package untuk authentication, identity, token, session, role, permission, grant, application access, service credential, identity document, audit log, guard, decorator, dan storage adapter.

## 1. Kesimpulan Analisis PRD

Keputusan produk yang harus dijaga selama development:

- MVP adalah satu package utama: `@elcodelabs/nest-auth-identity`.
- Package didistribusikan melalui private Git repository.
- Internal codebase tetap modular, tetapi tidak dipisah menjadi banyak package pada MVP.
- Core package harus database agnostic dan tidak boleh bergantung langsung pada Prisma, TypeORM, Mongoose, PostgreSQL, MySQL, MongoDB, atau database spesifik.
- Semua persistence harus lewat storage adapter contract.
- Fitur harus dapat diaktifkan atau dinonaktifkan melalui konfigurasi.
- Package menyediakan service, controller endpoint opsional, guard, decorator, DTO, interface, dan utility.
- Metadata hanya untuk data profil tambahan yang tidak sering dicari, tidak unik, dan tidak sensitif.
- Data sensitif seperti NIK, passport, NPWP, dan dokumen legal harus masuk identity document, bukan metadata umum.
- Password, refresh token, client secret, raw token, dan raw identity document value tidak boleh bocor ke response, metadata, atau audit log.
- MVP mencakup reset password dan change password, bukan hanya register/login/logout.
- MVP juga mencakup grant management dan `GrantGuard`, bukan hanya role dan permission.

## 2. Verifikasi Urutan Awal

Urutan yang Anda usulkan sudah aman sebagai garis besar, tetapi perlu beberapa koreksi agar sesuai PRD:

1. Setelah setup repository, segera kunci public API, error model, config schema, dan endpoint strategy. Ini akan menentukan bentuk seluruh feature.
2. Adapter contract harus dibuat sebelum user/auth core, karena semua service bergantung pada contract tersebut.
3. In-memory adapter wajib dibuat awal untuk development dan test, sedangkan adapter Prisma/TypeORM/Mongoose cukup sebagai minimal reference adapter setelah contract stabil.
4. Token dan session harus dirancang bersamaan, karena refresh token hash, rotation, revoke, `session_id`, dan logout saling bergantung.
5. Reset password dan change password harus masuk authentication core sesuai PRD.
6. Grant management perlu diletakkan setelah role/permission dasar dan sebelum application access/service credential, karena grant dipakai untuk akses khusus, scope, user, role, aplikasi, dan service credential.
7. Audit contract sebaiknya dibuat awal, tetapi integrasi event dilakukan bertahap pada setiap feature.
8. Documentation dan example project tidak perlu menunggu semua selesai. Keduanya harus mulai divalidasi sejak flow register/login/guard pertama berjalan.

## 3. Roadmap Development yang Direkomendasikan

### Phase 0 - PRD Lock dan Technical Baseline

Tujuan:

- Mengunci scope MVP berdasarkan PRD agar implementasi tidak melebar.
- Menetapkan keputusan teknis yang mempengaruhi public API.

Pekerjaan:

- Review final PRD dan tandai fitur MVP vs fitur lanjutan.
- Putuskan adapter DB pertama untuk reference implementation jika dibutuhkan: Prisma, TypeORM, atau Mongoose.
- Putuskan apakah endpoint bawaan package aktif default atau harus diaktifkan melalui feature flag.
- Putuskan route prefix default, misalnya `/auth` dan `/identity`.
- Putuskan token strategy default:
  - stateless JWT only.
  - JWT plus session validation.
- Putuskan refresh token rotation default.
- Putuskan password hashing default.
- Putuskan reset password mechanism:
  - token berbasis random opaque token yang disimpan hash.
  - TTL reset token.
  - single-use reset token.
- Putuskan ID strategy default:
  - auto increment sebagai default.
  - UUID sebagai opsi konfigurasi project.
  - adapter DB dapat memetakan integer auto increment ke string pada public contract.
  - storage-generated ID harus didukung untuk adapter production yang memakai auto increment database.
- Putuskan format error response standar untuk semua error code PRD.

Deliverables:

- PRD dianggap final untuk MVP.
- Technical decision notes.
- Public API draft.

Exit criteria:

- Tidak ada fitur MVP yang masih ambigu untuk mulai scaffold.

### Phase 1 - Setup Repository Package

Tujuan:

- Membuat package siap dikembangkan, diuji, dan dipakai sebagai library NestJS.

Pekerjaan:

- Inisialisasi git repository.
- Setup `package.json` dengan nama `@elcodelabs/nest-auth-identity`.
- Setup TypeScript library build.
- Setup lint, format, test, coverage, dan build script.
- Setup private Git installation flow.
- Setup `npm pack` validation untuk memastikan package bisa diinstall dari tarball.
- Setup CI minimal:
  - lint.
  - test.
  - build.
  - package validation.
- Setup public export lewat `src/index.ts`.
- Setup folder internal sesuai PRD:

```text
src/
  index.ts
  auth-identity.module.ts
  auth/
  identity/
  authorization/
  token/
  session/
  profile/
  identity-document/
  application-access/
  service-credential/
  audit/
  guards/
  decorators/
  contracts/
  adapters/
  common/
```

Deliverables:

- Package dapat di-build.
- Package dapat di-test.
- Package dapat diinstall secara lokal.

Exit criteria:

- `npm run lint`, `npm run test`, `npm run build`, dan `npm pack` berhasil.

### Phase 2 - Core Architecture, Config, Feature Toggle, dan Error Model

Tujuan:

- Menyediakan fondasi dynamic module, dependency injection, config, feature toggle, dan error handling.

Pekerjaan:

- Implement `AuthIdentityModule.forRoot()`.
- Implement `AuthIdentityModule.forRootAsync()`.
- Buat config schema:
  - JWT secret.
  - access token expiration.
  - refresh token expiration.
  - enabled features.
  - storage adapter.
  - password hashing configuration.
  - session strategy.
  - token strategy.
  - default user status.
  - default role.
  - metadata configuration.
  - identity document configuration.
  - audit log configuration.
- Buat feature toggle:
  - register.
  - login.
  - refresh token.
  - session management.
  - reset password.
  - role.
  - permission.
  - grant.
  - application access.
  - service credential.
  - audit log.
  - identity document.
  - profile metadata.
- Buat DI token untuk:
  - storage adapter.
  - password hasher.
  - token signer/verifier.
  - random token generator.
  - clock.
  - ID generator.
  - encryption provider.
  - audit sink.
- Implement error code PRD:
  - `AUTH_FEATURE_DISABLED`.
  - `AUTH_INVALID_CREDENTIAL`.
  - `AUTH_USER_INACTIVE`.
  - `AUTH_TOKEN_EXPIRED`.
  - `AUTH_TOKEN_INVALID`.
  - `AUTH_SESSION_REVOKED`.
  - `AUTH_REFRESH_TOKEN_INVALID`.
  - `AUTH_FORBIDDEN_ROLE`.
  - `AUTH_FORBIDDEN_PERMISSION`.
  - `AUTH_STORAGE_ERROR`.
  - `AUTH_DUPLICATE_IDENTITY`.
  - `AUTH_INVALID_PASSWORD_POLICY`.
  - `AUTH_METADATA_INVALID`.
  - `AUTH_SENSITIVE_DATA_NOT_ALLOWED_IN_METADATA`.
  - `AUTH_IDENTITY_DOCUMENT_FORBIDDEN`.
  - `AUTH_IDENTITY_DOCUMENT_INVALID`.
  - `AUTH_ENCRYPTION_FAILED`.
  - `AUTH_PACKAGE_CONFIG_INVALID`.
  - `AUTH_ADAPTER_NOT_CONFIGURED`.
- Buat common response mapper agar aplikasi pengguna bisa memetakan error secara konsisten.

Deliverables:

- Dynamic module.
- Config validation.
- Feature gate.
- Standard error model.

Exit criteria:

- Test valid config.
- Test invalid config.
- Test missing adapter.
- Test disabled feature.
- Test error mapping.

### Phase 3 - Storage Adapter Contract dan In-Memory Adapter

Tujuan:

- Membuat abstraction persistence yang menjadi fondasi semua feature.

Pekerjaan:

- Definisikan root `AuthIdentityStorageAdapter`.
- Definisikan adapter contract minimal sesuai PRD:
  - `UserStorageAdapter`.
  - `UserProfileStorageAdapter`.
  - `IdentityDocumentStorageAdapter`.
  - `RoleStorageAdapter`.
  - `PermissionStorageAdapter`.
  - `SessionStorageAdapter`.
  - `TokenStorageAdapter`.
  - `GrantStorageAdapter`.
  - `ApplicationAccessStorageAdapter`.
  - `ServiceCredentialStorageAdapter`.
  - `AuditLogStorageAdapter`.
- Definisikan adapter capability supaya fitur yang tidak aktif tidak memaksa table/dependency.
- Definisikan transaction boundary untuk operation multi-write:
  - register user plus profile plus audit.
  - login plus session plus token plus audit.
  - role assignment plus audit.
  - identity document update plus audit.
- Buat `InMemoryAuthIdentityAdapter` sebagai minimal adapter implementation untuk development/test.
- Buat adapter contract test suite agar adapter DB lain bisa divalidasi dengan test yang sama.

Deliverables:

- Storage contracts.
- In-memory adapter.
- Adapter contract tests.

Exit criteria:

- Semua service bisa dikembangkan tanpa database.
- Feature aktif gagal cepat jika adapter capability tidak tersedia.
- In-memory adapter lulus contract tests.

### Phase 4 - Domain Model dan Validation Foundation

Tujuan:

- Menetapkan entity contract dan aturan validasi sebelum service logic.

Pekerjaan:

- Definisikan entity/type utama:
  - `UserIdentity`.
  - `UserProfile`.
  - `IdentityDocument`.
  - `Role`.
  - `Permission`.
  - `Grant`.
  - `Session`.
  - `TokenRecord`.
  - `Application`.
  - `ApplicationUser`.
  - `ServiceCredential`.
  - `AuditLog`.
- Definisikan enum/status:
  - user status.
  - login method.
  - verification status.
  - session status.
  - service credential status.
  - document verification status.
- Buat validation utility:
  - email normalization.
  - username normalization.
  - phone normalization hook.
  - password policy.
  - metadata sensitive-field detection.
  - document type validation.
- Buat serialization/sanitization layer untuk response publik.

Deliverables:

- Domain types.
- Validation utilities.
- Sanitized response mapper.

Exit criteria:

- Test data sensitif tidak keluar dari mapper.
- Test metadata menolak field sensitif.
- Test password policy.

### Phase 5 - User Identity dan Profile Metadata

Tujuan:

- Mengimplementasikan identity dasar user dan profile metadata.

Pekerjaan:

- Implement `UserService`.
- Implement create/update/get/list user.
- Implement get user by:
  - id.
  - email.
  - username.
  - phone number.
- Implement activate/deactivate user.
- Implement update last login.
- Implement `ProfileMetadataService`.
- Implement metadata schema validation jika config menyediakan schema.
- Pastikan data utama tetap di kolom utama:
  - name.
  - username.
  - email.
  - phone number.
  - password hash.
  - status.
  - login method.
  - email verified at.
  - phone verified at.
  - last login at.
- Pastikan metadata tidak dipakai untuk data yang butuh unique constraint, sering difilter, atau sensitif.

Deliverables:

- User identity service.
- Profile metadata service.
- Sanitized user response.

Exit criteria:

- Test duplicate email/username/phone.
- Test update profile metadata.
- Test metadata invalid.
- Test deactivate user.

### Phase 6 - Security Utilities, Token Service, dan Session Service

Tujuan:

- Membuat fondasi token, password, refresh token, dan session sebelum auth flow.

Pekerjaan password/security:

- Implement `PasswordHasher`.
- Implement password hash.
- Implement password verify.
- Implement timing-safe comparison untuk secret/token hash.
- Implement random opaque token generator.

Pekerjaan token:

- Implement access token generation.
- Implement access token validation.
- Implement refresh token generation.
- Implement refresh token hashing.
- Implement token payload mapping.
- Implement token expiration handling.
- Implement token revocation support jika token storage aktif.

Pekerjaan session:

- Implement create session.
- Implement validate session.
- Implement revoke session.
- Implement revoke all user sessions.
- Implement refresh token rotation.
- Implement replay detection jika refresh rotation aktif.
- Support stateless JWT mode dan session-backed mode sesuai config.

Deliverables:

- `TokenService`.
- `SessionService`.
- Password/security utilities.

Exit criteria:

- Test expired token.
- Test invalid token.
- Test refresh token hash.
- Test session revoked.
- Test refresh token rotation.
- Test stateless mode tidak selalu query DB.

### Phase 7 - Authentication Core

Tujuan:

- Mengimplementasikan register, login, logout, refresh token, validate token, reset password, dan change password.

Pekerjaan:

- Implement `AuthService.register()`.
- Implement `AuthService.login()`.
- Implement `AuthService.logout()`.
- Implement `AuthService.refreshToken()`.
- Implement `AuthService.validateToken()`.
- Implement `AuthService.getCurrentUserContext()`.
- Implement `AuthService.requestPasswordReset()`.
- Implement `AuthService.resetPassword()`.
- Implement `AuthService.changePassword()`.
- Integrasikan audit event:
  - register.
  - login success.
  - login failed.
  - logout.
  - refresh token.
  - password reset request.
  - password changed.
- Pastikan jika session gagal dibuat, token tidak dikembalikan ke client.
- Pastikan disabled feature mengembalikan `AUTH_FEATURE_DISABLED`.

Deliverables:

- Authentication core service.
- Password reset/change flow.
- Auth audit integration awal.

Exit criteria:

- Test register success.
- Test duplicate identity.
- Test invalid password policy.
- Test login success.
- Test invalid credential.
- Test inactive user.
- Test logout revokes session.
- Test refresh success.
- Test reset token single-use.
- Test change password membutuhkan credential/session valid.

### Phase 8 - HTTP Endpoint Layer, DTO, dan Controller Toggle

Tujuan:

- Menyediakan endpoint bawaan package sesuai PRD, tetapi tetap bisa dikendalikan oleh config.

Pekerjaan:

- Implement auth endpoints:

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| `POST` | `/auth/register` | Register user baru |
| `POST` | `/auth/login` | Login user |
| `POST` | `/auth/logout` | Logout user |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET` | `/auth/me` | Mengambil user context saat ini |
| `POST` | `/auth/validate` | Validasi token |
| `POST` | `/auth/password/forgot` | Request reset password |
| `POST` | `/auth/password/reset` | Reset password |
| `POST` | `/auth/password/change` | Change password |

- Implement identity endpoints opsional:
  - list user.
  - detail user.
  - update user.
  - update user status.
  - get/update profile metadata.
  - list/create/detail/update/verify identity document.
- Implement authorization endpoints opsional:
  - list/create/update/delete role.
  - list/create/update permission.
  - assign/remove role to user.
  - assign/remove permission to role.
  - list audit logs.
- Buat DTO dan validation pipe compatible dengan NestJS.
- Pastikan endpoint tidak aktif jika feature disabled.
- Pastikan controller bisa tidak dipakai jika aplikasi ingin memakai service saja.

Deliverables:

- Controllers.
- DTO.
- Endpoint feature toggle.

Exit criteria:

- E2E auth endpoint flow.
- E2E disabled endpoint.
- E2E validation error.

### Phase 9 - Guard, Decorator, dan Auth Context

Tujuan:

- Membuat integrasi route protection yang siap dipakai di aplikasi NestJS.

Pekerjaan:

- Implement guard minimal:
  - `JwtAuthGuard`.
  - `SessionGuard`.
  - `RoleGuard`.
  - `PermissionGuard`.
  - `GrantGuard`.
- Implement decorator minimal:
  - `@CurrentUser()`.
  - `@CurrentUserId()`.
  - `@AuthContext()`.
  - `@Roles()`.
  - `@Permissions()`.
  - `@Grants()`.
  - `@Public()`.
- Implement request auth context extraction.
- Implement default deny jika context tidak tersedia.
- Implement optional session validation pada protected request.

Deliverables:

- Guards.
- Decorators.
- Request context.

Exit criteria:

- Test protected route.
- Test public route.
- Test current user decorator.
- Test revoked session ditolak jika session validation aktif.

### Phase 10 - Authorization Core: Role, Permission, dan Grant

Tujuan:

- Mengimplementasikan RBAC, permission-based access, dan grant management sesuai PRD.

Pekerjaan role:

- Create/update/delete role.
- Assign/remove role to user.
- Get roles by user.
- Validate role access.

Pekerjaan permission:

- Create/update/delete permission.
- Assign/remove permission to role.
- Assign direct permission to user.
- Resolve effective permission dari role dan direct permission.
- Validate permission pada endpoint.

Pekerjaan grant:

- Create grant.
- Revoke grant.
- Check active grant.
- Expire grant.
- Validate grant scope.
- Assign grant to subject:
  - user.
  - role.
  - application.
  - service credential.
- Integrasikan `GrantGuard` dan `@Grants()`.

Deliverables:

- `RoleService`.
- `PermissionService`.
- `GrantService`.
- Authorization guards integrated.

Exit criteria:

- Test role allow/deny.
- Test permission allow/deny.
- Test effective permission.
- Test grant active/expired/revoked.
- Test permission default deny.

### Phase 11 - Application Access

Tujuan:

- Mendukung akses user terhadap aplikasi tertentu untuk ekosistem multi-app.

Pekerjaan:

- Implement `ApplicationAccessService`.
- Register application.
- Update application.
- Activate/deactivate application.
- Assign user access to application.
- Validate user access to application.
- Revoke application access.
- Integrasikan application context dengan token audience jika config mengaktifkan audience validation.
- Integrasikan grant jika application access diberikan sebagai grant.

Deliverables:

- Application entity/service.
- Application user access.
- Access validation.

Exit criteria:

- Test user access application.
- Test revoked application access.
- Test inactive application.
- Test application-aware token/audience jika aktif.

### Phase 12 - Service Credential

Tujuan:

- Mendukung machine-to-machine authentication tanpa menggunakan akun user manusia.

Pekerjaan:

- Implement `ServiceCredentialService`.
- Create service credential.
- Generate `client_id`.
- Generate `client_secret`.
- Hash client secret.
- Validate service credential.
- Assign scope atau permission.
- Revoke service credential.
- Rotate client secret.
- Issue service access token dengan principal type service.
- Integrasikan audit:
  - service credential created.
  - service credential used.
  - service credential revoked.

Deliverables:

- Service credential contract/service.
- Client credential validation.
- Service token.

Exit criteria:

- Test raw client secret hanya muncul saat create/rotate.
- Test client secret hash tidak bocor.
- Test revoked credential ditolak.
- Test service token punya context service.
- Test service permission/scope.

### Phase 13 - Identity Document

Tujuan:

- Menyediakan penyimpanan data identitas sensitif yang aman dan terpisah dari metadata umum.

Pekerjaan:

- Implement `IdentityDocumentService`.
- Support document type:
  - NIK.
  - passport.
  - NPWP.
  - KTP document reference.
  - business registration document.
  - verification document.
- Implement document number hash.
- Implement document number encryption hook.
- Implement masked display value.
- Implement document file reference, bukan file storage bawaan.
- Implement verification status.
- Implement permission check untuk akses full value.
- Implement audit:
  - identity document created.
  - identity document viewed.
  - identity document updated.
  - identity document verified.
- Pastikan jika encryption gagal, raw value tidak disimpan.

Deliverables:

- Identity document contract/service.
- Encryption/masking utility.
- Document access control.

Exit criteria:

- Test masked response default.
- Test full document read membutuhkan permission.
- Test encryption failure.
- Test document audit.
- Test metadata umum menolak data dokumen sensitif.

### Phase 14 - Audit Log Hardening

Tujuan:

- Memastikan semua event penting PRD tercatat dan aman dari data sensitif.

Pekerjaan:

- Finalisasi `AuditService`.
- Implement audit event untuk:
  - register.
  - login success.
  - login failed.
  - logout.
  - refresh token.
  - password reset request.
  - password changed.
  - user status changed.
  - role assigned.
  - role removed.
  - permission assigned.
  - permission removed.
  - session revoked.
  - identity document created.
  - identity document viewed.
  - identity document updated.
  - identity document verified.
  - service credential created.
  - service credential used.
  - service credential revoked.
- Implement metadata redaction.
- Support no-op audit jika audit feature disabled.
- Support async/deferred audit hook jika aplikasi pengguna ingin mengirim audit ke queue.
- Implement audit log list endpoint jika feature aktif.

Deliverables:

- Audit log lengkap sesuai MVP.
- Redaction policy.
- Audit endpoint.

Exit criteria:

- Test setiap event minimal.
- Test audit disabled.
- Test audit metadata tidak berisi password, raw token, client secret, atau raw document value.

### Phase 15 - Minimal Built-In Adapter dan Reference Adapter

Tujuan:

- Membuktikan adapter contract dapat diimplementasikan pada storage nyata tanpa mengikat core package ke ORM.

Pekerjaan:

- Pastikan in-memory adapter menjadi minimal adapter yang selalu tersedia untuk test/development.
- Pilih satu reference adapter untuk MVP jika memang diperlukan:
  - Prisma, atau
  - TypeORM, atau
  - Mongoose.
- Karena PRD menuntut single package MVP, adapter DB tetap berada di package yang sama, tetapi dependency ORM harus optional atau peer dependency.
- Implement adapter DB berdasarkan schema konseptual PRD:
  - `users`.
  - `user_profiles`.
  - `identity_documents`.
  - `roles`.
  - `permissions`.
  - `user_roles`.
  - `role_permissions`.
  - `user_permissions`.
  - `sessions`.
  - `grants`.
  - `applications`.
  - `application_users`.
  - `service_credentials`.
  - `audit_logs`.
- Jalankan adapter contract test suite terhadap reference adapter.
- Dokumentasikan schema, migration, dan index penting:
  - email.
  - username.
  - phone number.
  - refresh token hash.
  - revoked at.
  - expired at.
  - role code.
  - permission code.
  - client id.

Deliverables:

- In-memory adapter stabil.
- Minimal DB reference adapter jika dipilih.
- Schema/migration reference.

Exit criteria:

- Adapter DB lulus contract tests.
- Core package tetap bisa dipakai tanpa install ORM jika hanya memakai in-memory/custom adapter.

### Phase 16 - Documentation

Tujuan:

- Membuat developer bisa memakai package tanpa membaca source code.

Pekerjaan:

- Tulis README:
  - install dari private Git repository.
  - import `AuthIdentityModule`.
  - basic JWT config.
  - enabled features config.
  - storage adapter config.
  - password hashing config.
  - session strategy.
  - token strategy.
  - metadata strategy.
  - identity document strategy.
  - audit log config.
- Tulis guide:
  - implement custom storage adapter.
  - menggunakan guard.
  - menggunakan decorator.
  - role dan permission.
  - grant.
  - profile metadata.
  - identity document.
  - handling data sensitif.
  - service credential.
  - application access.
  - daftar endpoint.
  - daftar error code.
  - migration guide untuk breaking changes.
  - kapan fitur layak dipisahkan menjadi package tambahan di masa depan.

Deliverables:

- README.
- Adapter guide.
- Security guide.
- API reference ringkas.

Exit criteria:

- Developer baru bisa menjalankan register/login/protected route dari dokumentasi saja.

### Phase 17 - Example Project dan Real Integration Flow

Tujuan:

- Memvalidasi package pada project NestJS nyata.

Pekerjaan:

- Buat example NestJS project.
- Install package dari local tarball/private Git style.
- Configure `AuthIdentityModule`.
- Gunakan in-memory adapter untuk smoke test.
- Jika reference DB adapter dibuat, buat example kedua memakai adapter tersebut.
- Implement sample flow:
  - register.
  - login.
  - me.
  - refresh.
  - logout.
  - protected route.
  - role-protected route.
  - permission-protected route.
  - grant-protected route.
  - update profile metadata.
  - create/read masked identity document.
  - create service credential.
  - service token access.

Deliverables:

- Example app.
- Integration test.
- Local install validation.

Exit criteria:

- Package bisa digunakan di project NestJS lain tanpa import internal/private path.
- Full auth flow berjalan dari HTTP endpoint.

### Phase 18 - Release Hardening

Tujuan:

- Menyiapkan package untuk digunakan lintas project secara stabil.

Pekerjaan:

- Review public exports.
- Review feature flags.
- Review error code consistency.
- Review dependency weight.
- Run security-focused tests.
- Validate `npm pack`.
- Validate install di clean NestJS project.
- Setup changelog.
- Setup versioning policy.
- Setup release workflow untuk private Git repository.

Deliverables:

- Release candidate.
- Changelog.
- Publish/install instructions.

Exit criteria:

- CI hijau.
- Clean install valid.
- Example project valid.
- Documentation sesuai API aktual.

## 4. Public API Draft

Target module config:

```ts
AuthIdentityModule.forRoot({
  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '30d',
    issuer: 'identity',
    audience: 'internal-app',
  },
  features: {
    register: true,
    login: true,
    refreshToken: true,
    session: true,
    resetPassword: true,
    role: true,
    permission: true,
    grant: true,
    applicationAccess: true,
    serviceCredential: true,
    auditLog: true,
    identityDocument: true,
    profileMetadata: true,
  },
  storage: {
    adapter: new InMemoryAuthIdentityAdapter(),
  },
  password: {
    policy: {
      minLength: 8,
    },
  },
  session: {
    validateOnRequest: true,
    refreshTokenRotation: true,
  },
});
```

Async config:

```ts
AuthIdentityModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    jwt: {
      secret: config.getOrThrow('JWT_SECRET'),
      accessTokenExpiresIn: config.get('JWT_ACCESS_TTL', '15m'),
      refreshTokenExpiresIn: config.get('JWT_REFRESH_TTL', '30d'),
    },
    storage: {
      adapter: config.getOrThrow('AUTH_IDENTITY_STORAGE_ADAPTER'),
    },
  }),
});
```

Controller usage:

```ts
@UseGuards(JwtAuthGuard)
@Get('me')
me(@CurrentUser() user: UserIdentity) {
  return user;
}
```

Authorization usage:

```ts
@UseGuards(JwtAuthGuard, PermissionGuard)
@Permissions('users.read')
@Get('users')
findUsers() {
  return this.userService.findMany();
}
```

Grant usage:

```ts
@UseGuards(JwtAuthGuard, GrantGuard)
@Grants('billing:read')
@Get('billing')
findBilling() {
  return this.billingService.findMany();
}
```

## 5. Testing Strategy

Minimal test layers:

- Unit test untuk service dan utility.
- Contract test untuk storage adapter.
- Module test untuk dynamic module dan dependency injection.
- E2E test untuk controller, guard, decorator, dan endpoint.
- Example app integration test.
- Package install test dari tarball/private Git style.

Test matrix:

| Area | Coverage |
| --- | --- |
| Config | valid config, invalid config, missing adapter, disabled feature |
| Errors | semua error code utama dapat dipetakan konsisten |
| Adapter | in-memory contract, DB adapter contract jika ada |
| User | create, update, get, duplicate email/username/phone, status |
| Metadata | valid metadata, invalid schema, sensitive field rejected |
| Auth | register, login, logout, validate, disabled register/login |
| Password | policy, hash, verify, reset, change |
| Token | generate, validate, expired, invalid, payload mapping |
| Session | create, validate, revoke, refresh rotation, replay detection |
| Guards | public, JWT, session, role, permission, grant |
| Role | create, update, delete, assign, remove, validate |
| Permission | create, assign to role, direct user permission, effective permission |
| Grant | create, revoke, expire, validate scope |
| Application | register, update, activate/deactivate, user access, revoke |
| Service Credential | create, hash secret, validate, rotate, revoke, service token |
| Identity Document | create, mask, encrypt/hash, permission, verify, audit |
| Audit | event emitted, redaction, disabled audit |
| Package | build, pack, install in clean NestJS app |

## 6. Security Requirements

Security rules yang harus diberi test:

- Password tidak boleh disimpan plain text.
- Password hash tidak boleh muncul di response publik.
- Refresh token harus disimpan sebagai hash.
- Raw refresh token tidak boleh masuk audit log.
- Client secret harus disimpan sebagai hash.
- Raw client secret hanya boleh muncul saat create/rotate.
- JWT secret tidak boleh hardcoded.
- Access token harus punya expiration.
- Guard harus menolak token expired, invalid, malformed, atau revoked.
- Logout harus menginvalidasi session.
- Session revoked tidak boleh dipakai refresh token.
- Permission validation default deny jika user context tidak tersedia.
- Metadata tidak boleh berisi password, raw token, client secret, atau dokumen sensitif.
- Identity document harus encrypted atau hashed sesuai jenis data.
- Identity document tampil masked by default.
- Full identity document access membutuhkan permission khusus.
- Audit log tidak boleh menyimpan password, raw token, raw client secret, atau raw identity document value.

## 7. Dependency Strategy

Core package dependency harus dijaga ringan.

Peer dependency utama:

- `@nestjs/common`.
- `@nestjs/core`.
- `reflect-metadata`.
- `rxjs`.

Direct dependency yang mungkin dibutuhkan:

- JWT library.
- Password hashing library.
- Runtime validation library jika dipakai untuk config/DTO.

Optional peer dependency untuk adapter DB:

- `@prisma/client` jika memilih Prisma.
- `typeorm` jika memilih TypeORM.
- `mongoose` jika memilih Mongoose.

Prinsip:

- Core tidak boleh memaksa user menginstall ORM yang tidak dipakai.
- Adapter DB harus memberi error jelas jika dependency opsional belum tersedia.
- Untuk MVP, adapter tetap berada dalam satu package jika dibuat, sesuai batasan PRD.

## 8. Milestone Rilis

### v0.1.0 - Package Foundation

- Repository setup.
- Build/test/lint.
- Dynamic module.
- Config validation.
- Feature toggle.
- Error model.

### v0.2.0 - Adapter and Identity

- Storage adapter contract.
- In-memory adapter.
- Domain model.
- User identity.
- Profile metadata.

### v0.3.0 - Authentication

- Password hashing.
- Token service.
- Session service.
- Register/login/logout.
- Refresh token.
- Reset password.
- Change password.

### v0.4.0 - NestJS Integration

- Auth controllers.
- DTO.
- `JwtAuthGuard`.
- `SessionGuard`.
- `@CurrentUser()`.
- `@AuthContext()`.
- `@Public()`.

### v0.5.0 - Authorization

- Role.
- Permission.
- Grant.
- `RoleGuard`.
- `PermissionGuard`.
- `GrantGuard`.
- Authorization endpoints.

### v0.6.0 - Application and Service Access

- Application access.
- Service credential.
- Service token.
- Scope/permission validation.

### v0.7.0 - Sensitive Identity and Audit

- Identity document.
- Encryption/masking.
- Audit log hardening.
- Audit endpoint.

### v0.8.0 - Reference Adapter and Docs

- Minimal DB adapter if selected.
- Adapter contract tests.
- README.
- Adapter/security/API docs.

### v1.0.0 - Stable MVP

- Example project.
- Clean install validation.
- Public API review.
- Security review.
- Release candidate.

## 9. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Scope MVP terlalu besar | Development lambat dan API tidak stabil | Pakai milestone v0.x dan feature flag |
| Core terikat ORM | Package berat dan tidak reusable | Semua persistence lewat adapter contract |
| Adapter contract terlalu idealis | Sulit diimplementasikan di DB nyata | In-memory plus satu reference adapter dan contract tests |
| Endpoint bawaan terlalu kaku | Sulit dipakai aplikasi berbeda | Endpoint dapat dimatikan, service tetap public |
| Refresh token tanpa session model kuat | Logout/revoke tidak aman | Token dan session dirancang bersama |
| Audit menyimpan data sensitif | Risiko keamanan tinggi | Redaction utility dan test wajib |
| Metadata dipakai untuk data penting | Query/unique constraint buruk | Main column vs metadata rules ditegakkan |
| Identity document raw tersimpan | Risiko compliance/security | Encryption/hash/masking dan failure-safe save |
| Permission default allow | Data bocor | Default deny untuk semua authorization failure |
| Dependency package terlalu berat | Aplikasi kecil ikut terbebani | Optional peer dependency untuk adapter DB |

## 10. Definition of Done MVP

MVP dianggap selesai jika:

- Package bisa diinstall dari private Git repository atau tarball.
- `AuthIdentityModule.forRoot()` dan `forRootAsync()` berjalan.
- Feature toggle bekerja untuk semua fitur MVP.
- Storage adapter contract tersedia.
- In-memory adapter tersedia.
- Register, login, logout, refresh, validate, reset password, dan change password berjalan.
- Session revoke dan refresh token hash berjalan.
- User identity dan profile metadata berjalan.
- Identity document terpisah, masked by default, dan diaudit.
- Role, permission, dan grant validation berjalan.
- Application access dasar berjalan.
- Service credential contract dan validation berjalan.
- Audit log mencatat event penting tanpa data sensitif.
- Guard dan decorator bekerja di endpoint NestJS.
- Endpoint MVP tersedia sesuai feature flag.
- Error code standar PRD digunakan konsisten.
- Docs mencakup install, config, adapter, guard/decorator, endpoint, error code, dan data sensitif.
- Example NestJS project berhasil menjalankan real integration flow.
- CI menjalankan lint, test, build, dan package validation.

## 11. Immediate Next Steps

1. Jalankan Phase 0 untuk mengunci keputusan teknis yang belum eksplisit di PRD.
2. Setup repository/package foundation.
3. Implement dynamic module, config, feature toggle, dan error model.
4. Implement storage adapter contract dan in-memory adapter.
5. Bangun user identity, auth, token, dan session sebagai vertical slice pertama.
6. Validasi vertical slice pertama lewat endpoint `/auth/register`, `/auth/login`, `/auth/me`, `/auth/refresh`, dan `/auth/logout`.
