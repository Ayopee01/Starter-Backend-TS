// Import Config
import type { AdminPermissionLevel } from "../config/permission.config";
// Import Repositories
import { client, requireMapped } from "./shared/repository-utils";
// Import Mappers
import { mapAccount } from "./shared/mappers";
// Import Types
import type { AdminCreateInput, AdminUpdateInput } from "../types/admin-settings.type";
import type { AccountDto } from "../types/shared/account.type";
import type { DbConnection } from "../types/shared/common.type";

/* -------------------------------------- Functions -------------------------------------- */

// Function ค้นหา admin ตาม ID (account ที่ไม่มีระดับสิทธิ์ไม่ถือเป็น admin คืน null)
export async function findAdminById(id: number, connection?: DbConnection): Promise<AccountDto | null> {
  return mapAccount(await client(connection).account.findFirst({ where: { id, permissionLevel: { not: null } } }));
}

// Function ตรวจว่า username ถูกใช้แล้วหรือยัง
export async function usernameExists(username: string, connection?: DbConnection): Promise<boolean> {
  return (await client(connection).account.count({ where: { username } })) > 0;
}

// Function สร้าง admin account ใหม่
export async function createAdmin(input: AdminCreateInput, connection?: DbConnection): Promise<AccountDto> {
  const record = await client(connection).account.create({
    data: {
      username: input.username,
      passwordHash: input.password_hash,
      status: input.status,
      fullName: input.full_name,
      email: input.email,
      permissionLevel: input.permission_level,
      createdBy: input.created_by,
    },
  });

  return requireMapped(mapAccount(record), "Admin", "create");
}

// Function แก้ข้อมูลพื้นฐานของ admin (field ที่เป็น undefined ไม่ถูกแก้)
export async function updateAdminAccount(id: number, input: AdminUpdateInput, connection?: DbConnection): Promise<AccountDto> {
  const record = await client(connection).account.update({
    where: { id },
    data: {
      fullName: input.full_name,
      email: input.email,
    },
  });

  return requireMapped(mapAccount(record), "Admin", "update");
}

// Function อัปเดตระดับสิทธิ์ของ admin
export async function updatePermissionLevel(id: number, permissionLevel: AdminPermissionLevel, connection?: DbConnection): Promise<AccountDto> {
  const record = await client(connection).account.update({ where: { id }, data: { permissionLevel } });

  return requireMapped(mapAccount(record), "Admin", "update");
}

// Function ล้าง created_by ของ account ที่ admin คนนี้เคยสร้าง (กัน FK ค้างตอนลบผู้สร้าง)
export async function clearCreatedBy(creatorId: number, connection?: DbConnection): Promise<void> {
  await client(connection).account.updateMany({ where: { createdBy: creatorId }, data: { createdBy: null } });
}

// Function ลบ admin account (permissions และ reset token ถูกลบตามด้วย cascade)
export async function deleteAdmin(id: number, connection?: DbConnection): Promise<void> {
  await client(connection).account.delete({ where: { id } });
}
