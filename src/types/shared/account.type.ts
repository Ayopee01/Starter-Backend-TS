// Import Config
import type { AdminPermission, AdminPermissionLevel } from "../../config/permission.config";

/* -------------------------------------- Types -------------------------------------- */

// Config ค่า status ที่ account ใช้ได้
export const ACCOUNT_STATUSES = ["active", "inactive"] as const;

// Type status ของ account
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

// Type ส่วน DTO ของ table accounts
export interface AccountDto {
  id: number;
  username: string;
  password_hash: string;
  status: AccountStatus;
  full_name: string;
  email: string | null;
  permission_level: AdminPermissionLevel | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

// Type account ที่ตัด password_hash ออกแล้ว
export type SafeAccountDto = Omit<AccountDto, "password_hash">;

// Type input ของ service สร้าง/อัปเดต account (password เป็นข้อความธรรมดา service จะ hash ให้)
export interface UpsertAccountInput {
  username: string;
  password: string;
  full_name: string;
  email: string | null;
  permission_level: AdminPermissionLevel;
  permissions: AdminPermission[];
}

// Type ส่วน Repository input สำหรับสร้าง/อัปเดต account ตาม username (password hash แล้ว)
export interface AccountUpsertInput {
  username: string;
  password_hash: string;
  full_name: string;
  email: string | null;
  status: AccountStatus;
  permission_level: AdminPermissionLevel;
}
