// Import Config
import { ADMIN_PERMISSIONS } from "../src/config/permission.config";
// Import Types
import type { UpsertAccountInput } from "../src/types/shared/account.type";

/* -------------------------------------- Mock Data -------------------------------------- */

// Mock data บัญชี admin เริ่มต้น เพิ่มหรือแก้บัญชีได้ที่นี่ (ใส่ password ธรรมดา backend จะ hash ให้ตอนบันทึก)
export const SEED_ADMIN_ACCOUNTS: UpsertAccountInput[] = [
  {
    username: "admin",
    password: "admin1234",
    full_name: "System Admin",
    email: "admin@example.com",
    permission_level: "owner",
    permissions: [...ADMIN_PERMISSIONS],
  },
];
