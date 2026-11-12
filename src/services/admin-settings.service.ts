// Import Config
import { ADMIN_PERMISSION_LEVELS, canManagePermissionLevel, type AdminPermission } from "../config/permission.config";
import { withTransaction } from "../db/prisma";
// Import Repositories
import * as adminSettingsRepository from "../repositories/admin-settings.repository";
import * as accountRepository from "../repositories/shared/account.repository";
import * as passwordResetTokenRepository from "../repositories/shared/password-reset-token.repository";
import * as permissionRepository from "../repositories/shared/permission.repository";
import * as sessionRepository from "../repositories/shared/session.repository";
// Import Mappers
import { sanitizeAccount } from "../repositories/shared/mappers";
// Import Services
import { getAccountPermissions } from "./shared/account-permission.service";
// Import Types
import type { AdminAccountResponse, AdminRoleListResponse, CreateAdminAccountResponse } from "../types/admin-settings.type";
import type { AccessTokenPayload } from "../types/auth.type";
import type { AccountDto } from "../types/shared/account.type";
import type { AccountPermissionsResponse } from "../types/shared/account-permission.type";
// Import Validation
import { parseWithSchema } from "../validation/parser";
import { createAdminAccountBodySchema, updateAccountPermissionsBodySchema, updateAdminAccountBodySchema } from "../validation/schemas";
// Import Utils
import { buildAdminCode, parseAdminCode } from "../utils/admin-code";
import ApiError from "../utils/api-error";
import { hashPassword } from "../utils/password";

/* -------------------------------------- Helpers -------------------------------------- */

// Function ดึง admin ที่ทำรายการจาก token (ไม่มี auth 401 / ไม่ใช่ admin 403)
async function requireAdminActor(auth?: AccessTokenPayload): Promise<AccountDto> {
  if (!auth) {
    throw new ApiError(401, "INVALID_TOKEN", "Invalid or expired token.");
  }

  const actorAccount = await adminSettingsRepository.findAdminById(auth.account_id);

  if (!actorAccount) {
    throw new ApiError(403, "ADMIN_ACTOR_NOT_FOUND", "Admin actor not found.");
  }

  return actorAccount;
}

// Function ดึง admin เป้าหมายตาม AdminCode (รูปแบบไม่ถูก throw 400, ไม่พบ throw 404)
async function requireAdminAccount(adminCodeParam: unknown): Promise<AccountDto> {
  const accountId = typeof adminCodeParam === "string" ? parseAdminCode(adminCodeParam) : null;

  if (accountId === null) {
    throw new ApiError(400, "INVALID_ADMIN_CODE", "AdminCode is invalid. Use the AdminCode format such as ADM0001.");
  }

  const account = await adminSettingsRepository.findAdminById(accountId);

  if (!account) {
    throw new ApiError(404, "ADMIN_NOT_FOUND", "Admin account not found.");
  }

  return account;
}

// Function ตรวจว่าผู้ทำรายการจัดการ admin เป้าหมายได้ (ห้ามจัดการตัวเอง และต้องมีระดับสูงกว่าเป้าหมาย)
function assertCanManageTarget(actorAccount: AccountDto, targetAccount: AccountDto): void {
  if (actorAccount.id === targetAccount.id) {
    throw new ApiError(403, "CANNOT_MANAGE_OWN_ACCOUNT", "Admin cannot manage their own account through this endpoint.");
  }

  if (!canManagePermissionLevel(actorAccount.permission_level, targetAccount.permission_level)) {
    throw new ApiError(403, "TARGET_PERMISSION_LEVEL_NOT_MANAGEABLE", "Admin cannot manage an account with an equal or higher permission level.");
  }
}

// Function ตรวจว่าผู้ทำรายการกำหนดระดับสิทธิ์ใหม่นี้ได้ (ต้องต่ำกว่าระดับของตัวเอง)
function assertCanAssignLevel(actorAccount: AccountDto, nextPermissionLevel: string): void {
  if (!canManagePermissionLevel(actorAccount.permission_level, nextPermissionLevel)) {
    throw new ApiError(403, "NEW_PERMISSION_LEVEL_NOT_MANAGEABLE", "Admin cannot assign an equal or higher permission level.");
  }
}

// Function ตรวจว่าสิทธิ์ที่จะให้คนอื่นเป็นสิทธิ์ที่ผู้ทำรายการมีอยู่จริง (กัน privilege escalation)
async function assertPermissionsGrantable(actorAccount: AccountDto, requestedPermissions: AdminPermission[]): Promise<void> {
  const actorPermissions = new Set(await permissionRepository.listByAccountId(actorAccount.id));
  const ungrantable = requestedPermissions.filter((permission) => !actorPermissions.has(permission));

  if (ungrantable.length > 0) {
    throw new ApiError(403, "PERMISSIONS_NOT_GRANTABLE", `Admin cannot grant permissions they do not have: ${ungrantable.join(", ")}`);
  }
}

// Function ตรวจว่า username ยังไม่ถูกใช้
async function assertUsernameAvailable(username: string): Promise<void> {
  if (await adminSettingsRepository.usernameExists(username)) {
    throw new ApiError(409, "USERNAME_ALREADY_EXISTS", "Username already exists.");
  }
}

// Function ตรวจว่า email ยังไม่ถูก account อื่นใช้ (email ใช้รับลิงก์ลืมรหัสผ่านจึงห้ามซ้ำ)
async function assertEmailAvailable(email: string | null | undefined, exceptAccountId?: number): Promise<void> {
  if (!email) {
    return;
  }

  const owner = await accountRepository.findByEmail(email);

  if (owner && owner.id !== exceptAccountId) {
    throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "Email is already used by another account.");
  }
}

// Function แปลง admin account เป็น response พร้อม AdminCode (ตัด password_hash ออก)
function formatAdminAccount(account: AccountDto): AdminAccountResponse {
  return {
    ...sanitizeAccount(account),
    admin_code: buildAdminCode(account.id),
  };
}

/* -------------------------------------- Functions -------------------------------------- */

// Function ดึงรายชื่อ admin แยกตามระดับสิทธิ์
export async function listRoles(): Promise<AdminRoleListResponse> {
  const admins = await accountRepository.listAdmins();

  return {
    data: ADMIN_PERMISSION_LEVELS.map((level, index) => ({
      key: level,
      name: level.charAt(0).toUpperCase() + level.slice(1),
      order: index,
      admins: admins.filter((account) => account.permission_level === level).map(formatAdminAccount),
    })),
  };
}

// Function สร้าง admin account ใหม่ (ระดับต้องต่ำกว่าผู้สร้าง และให้ได้เฉพาะสิทธิ์ที่ผู้สร้างมี)
export async function createAdminAccount(body: unknown, auth?: AccessTokenPayload): Promise<CreateAdminAccountResponse> {
  const input = parseWithSchema(createAdminAccountBodySchema, body);
  const actorAccount = await requireAdminActor(auth);

  assertCanAssignLevel(actorAccount, input.permission_level);
  await assertPermissionsGrantable(actorAccount, input.permissions);
  await assertUsernameAvailable(input.username);
  await assertEmailAvailable(input.email);

  const passwordHash = await hashPassword(input.password);

  return withTransaction(async (transaction) => {
    const account = await adminSettingsRepository.createAdmin(
      {
        username: input.username,
        password_hash: passwordHash,
        status: input.status,
        full_name: input.full_name,
        email: input.email ?? null,
        permission_level: input.permission_level,
        created_by: actorAccount.id,
      },
      transaction
    );

    await permissionRepository.replaceAccountPermissions(account.id, input.permissions, transaction);

    return {
      message: "Admin account created successfully.",
      account: formatAdminAccount(account),
      ...(await getAccountPermissions(account, transaction)),
    };
  });
}

// Function แก้ข้อมูลพื้นฐานของ admin คนอื่น เช่นแก้ email ให้ลูกทีมที่ลืมรหัสแล้วไปขอลิงก์ตั้งรหัสใหม่เอง
export async function updateAdminAccount(adminCodeParam: unknown, body: unknown, auth?: AccessTokenPayload): Promise<{ message: string; account: AdminAccountResponse }> {
  const input = parseWithSchema(updateAdminAccountBodySchema, body);
  const account = await requireAdminAccount(adminCodeParam);

  assertCanManageTarget(await requireAdminActor(auth), account);
  await assertEmailAvailable(input.email, account.id);

  const emailChanged = input.email !== undefined && input.email !== account.email;
  const updatedAccount = await withTransaction(async (transaction) => {
    const updated = await adminSettingsRepository.updateAdminAccount(account.id, input, transaction);

    // ลิงก์ลืมรหัสที่ส่งไป email เดิมต้องใช้ไม่ได้ทันที ไม่งั้นเจ้าของ email เก่ายังตั้งรหัสแทนได้
    if (emailChanged) {
      await passwordResetTokenRepository.invalidateUnusedPasswordResetTokens(account.id, transaction);
    }

    return updated;
  });

  return {
    message: "Admin account updated successfully.",
    account: formatAdminAccount(updatedAccount),
  };
}

// Function ลบ admin คนอื่นถาวร (ลบได้เฉพาะระดับที่ต่ำกว่าตัวเอง และลบตัวเองไม่ได้)
export async function deleteAdminAccount(adminCodeParam: unknown, auth?: AccessTokenPayload): Promise<{ message: string }> {
  const account = await requireAdminAccount(adminCodeParam);
  const actorAccount = await requireAdminActor(auth);

  assertCanManageTarget(actorAccount, account);

  await withTransaction(async (transaction) => {
    // lock เป้าหมายแล้วเช็คระดับซ้ำ กันโดนเลื่อนระดับระหว่างลบ
    await accountRepository.lockById(account.id, transaction);

    const freshTarget = await adminSettingsRepository.findAdminById(account.id, transaction);

    if (!freshTarget) {
      throw new ApiError(404, "ADMIN_NOT_FOUND", "Admin account not found.");
    }

    assertCanManageTarget(actorAccount, freshTarget);

    await adminSettingsRepository.clearCreatedBy(account.id, transaction);
    await sessionRepository.deleteByAccountId(account.id, transaction);
    await adminSettingsRepository.deleteAdmin(account.id, transaction);
  });

  return {
    message: "Admin account deleted successfully.",
  };
}

// Function ดึงสิทธิ์ของ admin เป้าหมาย
export async function getAdminUserPermissions(adminCodeParam: unknown, auth?: AccessTokenPayload): Promise<AccountPermissionsResponse> {
  const account = await requireAdminAccount(adminCodeParam);

  assertCanManageTarget(await requireAdminActor(auth), account);

  return getAccountPermissions(account);
}

// Function แก้ระดับสิทธิ์ status และ permissions ของ admin เป้าหมาย แล้ว revoke session ให้สิทธิ์ใหม่มีผลทันที
export async function updateAdminUserPermissions(
  adminCodeParam: unknown,
  body: unknown,
  auth?: AccessTokenPayload
): Promise<AccountPermissionsResponse & { message: string }> {
  const input = parseWithSchema(updateAccountPermissionsBodySchema, body);
  const account = await requireAdminAccount(adminCodeParam);
  const actorAccount = await requireAdminActor(auth);

  assertCanManageTarget(actorAccount, account);
  assertCanAssignLevel(actorAccount, input.permission_level);
  await assertPermissionsGrantable(actorAccount, input.permissions);

  return withTransaction(async (transaction) => {
    // lock เป้าหมายแล้วเช็คระดับซ้ำ กัน admin สองคนแก้คนเดียวกันพร้อมกัน
    await accountRepository.lockById(account.id, transaction);

    const freshTarget = await adminSettingsRepository.findAdminById(account.id, transaction);

    if (!freshTarget) {
      throw new ApiError(404, "ADMIN_NOT_FOUND", "Admin account not found.");
    }

    assertCanManageTarget(actorAccount, freshTarget);

    let updatedAccount = await adminSettingsRepository.updatePermissionLevel(account.id, input.permission_level, transaction);

    if (input.status !== undefined) {
      updatedAccount = await accountRepository.updateStatus(account.id, input.status, transaction);
    }

    await permissionRepository.replaceAccountPermissions(account.id, input.permissions, transaction);
    // permissions อยู่ใน access token จึงต้อง revoke ให้ login ใหม่เพื่อรับสิทธิ์ชุดใหม่
    await sessionRepository.revokeActiveByAccountId(account.id, transaction);

    return {
      message: "Admin permissions updated successfully. Active sessions were revoked.",
      ...(await getAccountPermissions(updatedAccount, transaction)),
    };
  });
}
