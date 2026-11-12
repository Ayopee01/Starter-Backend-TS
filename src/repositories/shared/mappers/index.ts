// Import Library
import type { Account, PasswordResetToken, UserSession } from "@prisma/client";
// Import Config
import { isAdminPermissionLevel, type AdminPermissionLevel } from "../../../config/permission.config";
// Import Types
import type { PasswordResetTokenDto, SessionDto } from "../../../types/auth.type";
import { ACCOUNT_STATUSES, type AccountDto, type AccountStatus, type SafeAccountDto } from "../../../types/shared/account.type";

/* -------------------------------------- Functions -------------------------------------- */

// Function แปลงวันที่จาก DB เป็น ISO string สำหรับ DTO
function toIsoString(value: Date): string;
function toIsoString(value: Date | null): string | null;
function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

// Function แปลง status จาก DB เป็น AccountStatus (ค่าที่ไม่รู้จักถือเป็น inactive)
function toAccountStatus(status: string): AccountStatus {
  return (ACCOUNT_STATUSES as readonly string[]).includes(status) ? (status as AccountStatus) : "inactive";
}

// Function แปลง permission level จาก DB (ค่าที่ไม่รู้จักถือว่าไม่มีระดับ)
function toPermissionLevel(permissionLevel: string | null): AdminPermissionLevel | null {
  return permissionLevel && isAdminPermissionLevel(permissionLevel) ? permissionLevel : null;
}

// Function ตัดข้อมูล sensitive ออกจาก account response
export function sanitizeAccount(account: AccountDto): SafeAccountDto {
  const { password_hash: _passwordHash, ...safeAccount } = account;

  return safeAccount;
}

// Function แปลง account จาก DB เป็น AccountDto
export function mapAccount(record: Account | null): AccountDto | null {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    username: record.username,
    password_hash: record.passwordHash,
    status: toAccountStatus(record.status),
    full_name: record.fullName,
    email: record.email,
    permission_level: toPermissionLevel(record.permissionLevel),
    created_by: record.createdBy,
    created_at: toIsoString(record.createdAt),
    updated_at: toIsoString(record.updatedAt),
  };
}

// Function แปลง session จาก DB เป็น SessionDto
export function mapSession(record: UserSession | null): SessionDto | null {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    account_id: record.accountId,
    refresh_token_hash: record.refreshTokenHash,
    ip_address: record.ipAddress,
    user_agent: record.userAgent,
    is_active: record.isActive,
    last_active_at: toIsoString(record.lastActiveAt),
    expires_at: toIsoString(record.expiresAt),
    revoked_at: toIsoString(record.revokedAt),
    created_at: toIsoString(record.createdAt),
    updated_at: toIsoString(record.updatedAt),
  };
}

// Function แปลง reset token จาก DB เป็น PasswordResetTokenDto
export function mapPasswordResetToken(record: PasswordResetToken | null): PasswordResetTokenDto | null {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    account_id: record.accountId,
    token_hash: record.tokenHash,
    expires_at: toIsoString(record.expiresAt),
    used_at: toIsoString(record.usedAt),
    created_at: toIsoString(record.createdAt),
  };
}
