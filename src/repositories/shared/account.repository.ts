// Import Repositories
import { client, requireMapped } from "./repository-utils";
// Import Mappers
import { mapAccount } from "./mappers";
// Import Types
import type { AccountDto, AccountStatus, AccountUpsertInput } from "../../types/shared/account.type";
import type { DbConnection } from "../../types/shared/common.type";

/* -------------------------------------- Functions -------------------------------------- */

// Function ค้นหา account ตาม ID จาก DB
export async function findById(id: number, connection?: DbConnection): Promise<AccountDto | null> {
  return mapAccount(await client(connection).account.findUnique({ where: { id } }));
}

// Function ค้นหา account ตาม email จาก DB (email เก็บเป็นตัวพิมพ์เล็กเสมอ)
export async function findByEmail(email: string, connection?: DbConnection): Promise<AccountDto | null> {
  return mapAccount(await client(connection).account.findUnique({ where: { email: email.toLowerCase() } }));
}

// Function ดึง account ทั้งหมดที่มีระดับสิทธิ์ (admin) เรียงตาม id
export async function listAdmins(connection?: DbConnection): Promise<AccountDto[]> {
  const records = await client(connection).account.findMany({
    where: { permissionLevel: { not: null } },
    orderBy: { id: "asc" },
  });

  return records.map((record) => requireMapped(mapAccount(record), "Account", "list"));
}

// Function lock แถว account ไว้จนจบ transaction (กันแก้ account เดียวกันพร้อมกัน)
export async function lockById(id: number, connection: DbConnection): Promise<void> {
  await connection.$queryRaw`SELECT id FROM accounts WHERE id = ${id} FOR UPDATE`;
}

// Function อัปเดต status ของ account
export async function updateStatus(id: number, status: AccountStatus, connection?: DbConnection): Promise<AccountDto> {
  return requireMapped(mapAccount(await client(connection).account.update({ where: { id }, data: { status } })), "Account", "update");
}

// Function อัปเดต password hash ของ account
export async function updatePassword(id: number, passwordHash: string, connection?: DbConnection): Promise<void> {
  await client(connection).account.update({ where: { id }, data: { passwordHash } });
}

// Function สร้าง account ใหม่ หรืออัปเดตถ้ามี username นี้อยู่แล้ว
export async function upsertByUsername(input: AccountUpsertInput, connection?: DbConnection): Promise<AccountDto> {
  const data = {
    passwordHash: input.password_hash,
    fullName: input.full_name,
    email: input.email?.toLowerCase() ?? null,
    status: input.status,
    permissionLevel: input.permission_level,
  };
  const record = await client(connection).account.upsert({
    where: { username: input.username },
    update: data,
    create: { username: input.username, ...data },
  });

  return requireMapped(mapAccount(record), "Account", "upsert");
}
