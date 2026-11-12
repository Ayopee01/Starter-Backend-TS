// Import Config
import type { AdminPermissionLevel } from "../config/permission.config";
// Import Types
import type { AccountStatus, SafeAccountDto } from "./shared/account.type";
import type { AccountPermissionsResponse } from "./shared/account-permission.type";

/* -------------------------------------- Types -------------------------------------- */

// Type ส่วน DTO ของ admin ที่ส่งออก API (ไม่มี password_hash และมี admin_code)
export type AdminAccountResponse = SafeAccountDto & { admin_code: string };

// Type ส่วน Response ของ API roles (รายชื่อ admin แยกตามระดับสิทธิ์)
export interface AdminRoleListResponse {
  data: {
    key: AdminPermissionLevel;
    name: string;
    order: number;
    admins: AdminAccountResponse[];
  }[];
}

// Type ส่วน Response ของ API สร้าง admin
export type CreateAdminAccountResponse = AccountPermissionsResponse & {
  message: string;
  account: AdminAccountResponse;
};

// Type ส่วน Repository input สำหรับสร้าง admin account
export interface AdminCreateInput {
  username: string;
  password_hash: string;
  status: AccountStatus;
  full_name: string;
  email: string | null;
  permission_level: AdminPermissionLevel;
  created_by: number;
}

// Type ส่วน Repository input สำหรับแก้ข้อมูลพื้นฐานของ admin (undefined = ไม่แก้ field นั้น)
export interface AdminUpdateInput {
  full_name?: string;
  email?: string | null;
}
