// Import Repositories
import * as permissionRepository from "../../repositories/shared/permission.repository";
// Import Types
import type { AccountDto } from "../../types/shared/account.type";
import type { AccountPermissionsResponse } from "../../types/shared/account-permission.type";
import type { DbConnection } from "../../types/shared/common.type";
// Import Utils
import { buildAdminCode } from "../../utils/admin-code";

/* -------------------------------------- Functions -------------------------------------- */

// Function ดึง permission ทั้งหมดของ account พร้อมระดับสิทธิ์และ status
export async function getAccountPermissions(account: AccountDto, connection?: DbConnection): Promise<AccountPermissionsResponse> {
  return {
    account_id: account.id,
    admin_code: buildAdminCode(account.id),
    status: account.status,
    permission_level: account.permission_level,
    permissions: await permissionRepository.listByAccountId(account.id, connection),
  };
}
