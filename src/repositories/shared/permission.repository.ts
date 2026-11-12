// Import Config
import { isAdminPermission, type AdminPermission } from "../../config/permission.config";
// Import Repositories
import { client } from "./repository-utils";
// Import Types
import type { DbConnection } from "../../types/shared/common.type";

/* -------------------------------------- Functions -------------------------------------- */

// Function ดึงรายการ permission ตาม account id จาก DB (ตัดค่าที่ไม่รู้จักทิ้ง)
export async function listByAccountId(accountId: number, connection?: DbConnection): Promise<AdminPermission[]> {
  const records = await client(connection).accountPermission.findMany({
    where: { accountId },
    orderBy: { permission: "asc" },
  });

  return records.map((record) => record.permission).filter(isAdminPermission);
}

// Function แทนที่ permissions ทั้งหมดของ account ด้วยชุดใหม่ (ลบของเก่าแล้วสร้างใหม่)
export async function replaceAccountPermissions(accountId: number, permissions: AdminPermission[], connection?: DbConnection): Promise<void> {
  const db = client(connection);

  await db.accountPermission.deleteMany({ where: { accountId } });

  if (permissions.length === 0) {
    return;
  }

  await db.accountPermission.createMany({
    data: permissions.map((permission) => ({ accountId, permission })),
    skipDuplicates: true,
  });
}
