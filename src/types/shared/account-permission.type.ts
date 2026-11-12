// Import Config
import type { AdminPermission, AdminPermissionLevel } from "../../config/permission.config";
// Import Types
import type { AccountStatus } from "./account.type";

/* -------------------------------------- Types -------------------------------------- */

// Type ส่วน Response ของสิทธิ์ทั้งหมดของ account
export interface AccountPermissionsResponse {
  account_id: number;
  admin_code: string;
  status: AccountStatus;
  permission_level: AdminPermissionLevel | null;
  permissions: AdminPermission[];
}
