// Import Config
import type { AdminPermission } from "../config/permission.config";
// Import Types
import type { SafeAccountDto } from "./shared/account.type";

/* -------------------------------------- Types -------------------------------------- */

// Type ประเภท token ที่ระบบ auth ออกให้
export type TokenType = "access" | "refresh";

// Type ส่วน Payload ของ access token ที่ใช้เรียก API หลัง login
export interface AccessTokenPayload {
  account_id: number;
  permission_level: string | null;
  permissions: AdminPermission[];
  session_id: number;
  token_type: "access";
  iat?: number;
  exp?: number;
}

// Type ส่วน Payload ของ refresh token สำหรับขอ access token ชุดใหม่
export interface RefreshTokenPayload {
  account_id: number;
  session_id: number;
  token_type: "refresh";
  iat?: number;
  exp?: number;
}

// Type map payload ตามชนิด token เพื่อให้ utility เซ็นและตรวจ token ได้ถูก shape
export type TokenPayloadByType = {
  access: AccessTokenPayload;
  refresh: RefreshTokenPayload;
};

// Type ส่วน DTO ของ table user_sessions ที่ผูกกับ refresh token
export interface SessionDto {
  id: number;
  account_id: number;
  refresh_token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  last_active_at: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

// Type ส่วน Repository input สำหรับสร้าง session ที่ยังไม่มี refresh token hash
export interface PendingSessionInput {
  account_id: number;
  ip_address?: string | null;
  user_agent?: string | null;
  expires_at: string | Date;
}

// Type ส่วน DTO ของ table password_reset_tokens
export interface PasswordResetTokenDto {
  id: number;
  account_id: number;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

// Type ส่วน Repository input สำหรับสร้าง reset token
export interface PasswordResetTokenCreateInput {
  account_id: number;
  token_hash: string;
  expires_at: Date;
  ip_address: string | null;
}

// Type ข้อมูล request ที่บันทึกลง session ตอน login
export interface SessionRequestContext {
  ip_address: string | null;
  user_agent: string | null;
}

// Type token ภายใน service พร้อม session ที่สร้างแล้ว
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  session: SessionDto;
}

// Type ส่วน Response ของ API auth me
export type MeResponse = SafeAccountDto & {
  admin_code: string;
  permissions: AdminPermission[];
  latest_active_at: string | null;
};

// Type ส่วน Response ของ API auth login / refresh
export interface AuthSuccessResponse {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  profile?: MeResponse;
}

// Type option ตอนเซ็น token
export interface TokenSignOptions {
  expiresIn?: string | number;
}

// Type config ของ token แต่ละชนิด (refresh token ไม่มี expiresIn default)
export interface TokenConfig {
  secret?: string;
  expiresIn?: string | number;
  invalidCode: string;
  expiredCode: string;
}
