// Import Library
import { z } from "zod";
// Import Config
import { ADMIN_PERMISSION_LEVELS, ADMIN_PERMISSIONS } from "../config/permission.config";
// Import Types
import { ACCOUNT_STATUSES } from "../types/shared/account.type";

/* -------------------------------------- Formats -------------------------------------- */

// Format ข้อความที่ trim แล้วและห้ามว่าง
const trimmedString = z.string().trim().min(1, "Required.");

// Format รหัสผ่านใหม่ที่ admin กำหนดเอง
const newPasswordSchema = trimmedString.min(8, "Password must be at least 8 characters.");

// Format username ที่ใช้ login (ตัวอักษร ตัวเลข . _ - เท่านั้น)
const usernameSchema = trimmedString.max(100).regex(/^[A-Za-z0-9._-]+$/, "Use letters, numbers, dot, underscore, or dash.");

// Format email แปลงเป็นตัวพิมพ์เล็ก (email ใน DB เป็น unique แบบตัวพิมพ์เล็กเสมอ)
const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(255));

// Format email ที่ไม่บังคับ (ส่ง null เพื่อลบค่าได้)
const optionalEmailSchema = emailSchema.nullable().optional();

// Format รายการ permission ที่ไม่ซ้ำกัน
const permissionsSchema = z
  .array(z.enum(ADMIN_PERMISSIONS))
  .default([])
  .transform((permissions) => [...new Set(permissions)]);

/* -------------------------------------- Auth Schemas -------------------------------------- */

// Schema body สำหรับเข้าสู่ระบบด้วย username/password
export const loginBodySchema = z.object({
  username: trimmedString,
  password: trimmedString,
});

// Schema body สำหรับขอ token ใหม่ด้วย refresh token
export const refreshBodySchema = z.object({
  refresh_token: trimmedString,
});

// Schema body สำหรับขอลิงก์ตั้งรหัสผ่านใหม่ทาง email
export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

// Schema body สำหรับตั้งรหัสผ่านใหม่ด้วย token จากลิงก์ใน email
export const resetPasswordWithTokenBodySchema = z.object({
  token: trimmedString.max(200),
  new_password: newPasswordSchema,
});

// Schema body สำหรับเปลี่ยน password ของตัวเอง (ต้องยืนยันรหัสเดิม)
export const changeOwnPasswordBodySchema = z.object({
  current_password: trimmedString,
  new_password: newPasswordSchema,
});

/* -------------------------------------- Admin Settings Schemas -------------------------------------- */

// Schema body สำหรับสร้าง admin account
export const createAdminAccountBodySchema = z.object({
  username: usernameSchema,
  password: newPasswordSchema,
  full_name: trimmedString.max(255),
  email: optionalEmailSchema,
  status: z.enum(ACCOUNT_STATUSES).default("active"),
  permission_level: z.enum(ADMIN_PERMISSION_LEVELS),
  permissions: permissionsSchema,
});

// Schema body สำหรับแก้ข้อมูลพื้นฐานของ admin account
export const updateAdminAccountBodySchema = z.object({
  full_name: trimmedString.max(255).optional(),
  email: optionalEmailSchema,
});

// Schema body สำหรับแก้ระดับสิทธิ์ status และ permissions ของ admin
export const updateAccountPermissionsBodySchema = z.object({
  permission_level: z.enum(ADMIN_PERMISSION_LEVELS),
  status: z.enum(ACCOUNT_STATUSES).optional(),
  permissions: permissionsSchema,
});

/* -------------------------------------- Token Schemas -------------------------------------- */

// Schema jti/iat/exp ที่ jsonwebtoken ใส่ให้ทุก token
const tokenTimestampsSchema = {
  jti: z.string().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
};

// Schema payload ของ access token
export const accessTokenPayloadSchema = z.object({
  account_id: z.number().int().positive(),
  permission_level: z.string().nullable(),
  permissions: z.array(z.enum(ADMIN_PERMISSIONS)),
  session_id: z.number().int().positive(),
  token_type: z.literal("access"),
  ...tokenTimestampsSchema,
});

// Schema payload ของ refresh token
export const refreshTokenPayloadSchema = z.object({
  account_id: z.number().int().positive(),
  session_id: z.number().int().positive(),
  token_type: z.literal("refresh"),
  ...tokenTimestampsSchema,
});
