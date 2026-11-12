/* -------------------------------------- Types -------------------------------------- */

// Type สิทธิ์ของ admin แต่ละรายการ
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

// Type ระดับสิทธิ์ของ admin
export type AdminPermissionLevel = (typeof ADMIN_PERMISSION_LEVELS)[number];

/* -------------------------------------- Config -------------------------------------- */

// Config รายการสิทธิ์ทั้งหมดที่ admin มีได้ (เพิ่ม feature ใหม่ให้เพิ่มสิทธิ์ที่นี่)
export const ADMIN_PERMISSIONS = [
  "roles:read",
  "admins:create",
  "admins:update",
  "admins:delete",
  "permissions:read",
  "permissions:update",
] as const;

// Config ระดับสิทธิ์ของ admin เรียงจากสูงไปต่ำ
export const ADMIN_PERMISSION_LEVELS = ["owner", "manager", "supervisor"] as const;

/* -------------------------------------- Functions -------------------------------------- */

// Function ตรวจว่า value เป็นชื่อ permission ที่ถูกต้องหรือไม่
export function isAdminPermission(value: string): value is AdminPermission {
  return (ADMIN_PERMISSIONS as readonly string[]).includes(value);
}

// Function ตรวจว่า value เป็นระดับสิทธิ์ที่ถูกต้องหรือไม่
export function isAdminPermissionLevel(value: string): value is AdminPermissionLevel {
  return (ADMIN_PERMISSION_LEVELS as readonly string[]).includes(value);
}

// Function คืนลำดับของ permission level (ยิ่งน้อยยิ่งสิทธิ์สูง, -1 ถ้าไม่พบ)
export function getPermissionLevelOrder(permissionLevel?: string | null): number {
  return ADMIN_PERMISSION_LEVELS.findIndex((level) => level === permissionLevel);
}

// Function ตรวจว่า actorLevel สูงกว่า targetLevel พอจะจัดการได้หรือไม่ (ระดับเท่ากันจัดการกันไม่ได้)
export function canManagePermissionLevel(actorLevel?: string | null, targetLevel?: string | null): boolean {
  const actorOrder = getPermissionLevelOrder(actorLevel);
  const targetOrder = getPermissionLevelOrder(targetLevel);

  return actorOrder >= 0 && targetOrder >= 0 && actorOrder < targetOrder;
}
