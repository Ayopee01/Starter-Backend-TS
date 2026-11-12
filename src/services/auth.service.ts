// Import Config
import { AUTH_DEFAULTS, getAccessTokenExpiresInSeconds, getPasswordResetExpiresInSeconds, getPasswordResetUrl, getRefreshExpiresInSeconds } from "../config/auth.config";
import { withTransaction } from "../db/prisma";
// Import Repositories
import { createPending, findByUsername, updateRefreshTokenHash } from "../repositories/auth.repository";
import * as accountRepository from "../repositories/shared/account.repository";
import * as passwordResetTokenRepository from "../repositories/shared/password-reset-token.repository";
import * as sessionRepository from "../repositories/shared/session.repository";
// Import Mappers
import { sanitizeAccount } from "../repositories/shared/mappers";
// Import Services
import { getAccountPermissions } from "./shared/account-permission.service";
// Import Types
import type { AdminPermission } from "../config/permission.config";
import type { AccessTokenPayload, AuthSuccessResponse, AuthTokens, MeResponse, SessionDto, SessionRequestContext } from "../types/auth.type";
import type { AccountDto } from "../types/shared/account.type";
import type { DbConnection } from "../types/shared/common.type";
// Import Validation
import { parseWithSchema } from "../validation/parser";
import { changeOwnPasswordBodySchema, forgotPasswordBodySchema, loginBodySchema, refreshBodySchema, resetPasswordWithTokenBodySchema } from "../validation/schemas";
// Import Utils
import { buildAdminCode } from "../utils/admin-code";
import ApiError from "../utils/api-error";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { sendMail } from "../utils/mailer";
import { hashPassword, verifyPassword } from "../utils/password";
import { createPasswordResetToken as generatePasswordResetToken, hashPasswordResetToken } from "../utils/password-reset-token";
import { hashRefreshToken, refreshTokenHashesMatch } from "../utils/refresh-token-hash";

/* -------------------------------------- Config -------------------------------------- */

// Config hash หลอกให้ verify password ทำงานเสมอแม้ไม่พบ user (กัน timing attack)
const dummyPasswordHashPromise = hashPassword("dummy-password-for-constant-time-login-check");

// Config ข้อความตอบกลับของ forgot-password ที่เหมือนกันทุกกรณี (ไม่บอกว่ามี email นี้ในระบบหรือไม่)
const FORGOT_PASSWORD_RESPONSE = {
  message: "If an account with that email exists, a password reset link has been sent.",
} as const;

/* -------------------------------------- Helpers -------------------------------------- */

// Function ดึง account ที่ยัง active ตาม ID (ไม่ active throw ตาม error ที่ส่งมา)
async function requireActiveAccountById(accountId: number, statusCode: number, errorCode: string, errorMessage: string): Promise<AccountDto> {
  const account = await accountRepository.findById(accountId);

  if (!account || account.status !== "active") {
    throw new ApiError(statusCode, errorCode, errorMessage);
  }

  return account;
}

// Function สร้าง response ข้อมูลตัวเองของ account (ไม่มี password_hash แต่มี permissions)
function buildMeResponse(account: AccountDto, permissions: AdminPermission[], currentSession: SessionDto | null): MeResponse {
  return {
    ...sanitizeAccount(account),
    admin_code: buildAdminCode(account.id),
    permissions,
    latest_active_at: currentSession?.last_active_at ?? null,
  };
}

// Function เซ็น access token พร้อมระดับสิทธิ์และ permissions ล่าสุดของ account
function signAccountAccessToken(account: AccountDto, permissions: AdminPermission[], sessionId: number): string {
  return signAccessToken({
    account_id: account.id,
    permission_level: account.permission_level,
    permissions,
    session_id: sessionId,
  });
}

// Function สร้าง response หลังออก token สำเร็จ
function buildAuthSuccessResponse(tokens: Pick<AuthTokens, "accessToken" | "refreshToken">, profile?: MeResponse): AuthSuccessResponse {
  return {
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    token_type: "Bearer",
    expires_in: getAccessTokenExpiresInSeconds(),
    ...(profile && { profile }),
  };
}

// Function สร้าง session ใหม่พร้อมเซ็น access/refresh token แล้วเก็บ hash ของ refresh token
async function createSession(
  account: AccountDto,
  permissions: AdminPermission[],
  context: SessionRequestContext,
  connection: DbConnection
): Promise<AuthTokens> {
  const refreshExpiresInSeconds = getRefreshExpiresInSeconds();
  const session = await createPending(
    {
      account_id: account.id,
      ip_address: context.ip_address,
      user_agent: context.user_agent,
      expires_at: new Date(Date.now() + refreshExpiresInSeconds * 1000),
    },
    connection
  );
  const accessToken = signAccountAccessToken(account, permissions, session.id);
  const refreshToken = signRefreshToken({ account_id: account.id, session_id: session.id }, { expiresIn: refreshExpiresInSeconds });
  const updatedSession = await updateRefreshTokenHash(session.id, hashRefreshToken(refreshToken), session.refresh_token_hash, connection);

  return {
    accessToken,
    refreshToken,
    session: updatedSession ?? session,
  };
}

// Function ส่ง email ลิงก์ตั้งรหัสผ่านใหม่ (ล้มเหลวแค่เขียน log ไม่ให้ response ต่างจากกรณีไม่พบ email)
function sendPasswordResetEmail(account: AccountDto, email: string, token: string, expiresInSeconds: number): void {
  const resetUrl = new URL(getPasswordResetUrl());
  resetUrl.searchParams.set("token", token);

  const expiresInMinutes = Math.round(expiresInSeconds / 60);
  const link = resetUrl.toString();

  void sendMail({
    to: email,
    subject: "ตั้งรหัสผ่านใหม่ / Reset your password",
    text: `สวัสดี ${account.full_name}\n\nกดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ใช้ได้ ${expiresInMinutes} นาที และใช้ได้ครั้งเดียว)\n${link}\n\nถ้าคุณไม่ได้ขอเปลี่ยนรหัสผ่าน ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้ตามปกติ`,
    html: `<p>สวัสดี ${escapeHtml(account.full_name)}</p><p>กดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ใช้ได้ ${expiresInMinutes} นาที และใช้ได้ครั้งเดียว)</p><p><a href="${escapeHtml(link)}">ตั้งรหัสผ่านใหม่</a></p><p>ถ้าคุณไม่ได้ขอเปลี่ยนรหัสผ่าน ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้ตามปกติ</p>`,
  }).catch((error) => {
    console.error(`Failed to send password reset email to account ${account.id}.`, error);
  });
}

// Function escape ข้อความก่อนใส่ใน HTML ของ email
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* -------------------------------------- Functions -------------------------------------- */

// Function login ด้วย username/password แล้ว revoke session เดิมทั้งหมด (1 account มีได้ 1 session)
export async function login(body: unknown, context: SessionRequestContext): Promise<AuthSuccessResponse> {
  const { username, password } = parseWithSchema(loginBodySchema, body);
  const account = await findByUsername(username);
  // verify เสมอแม้ไม่พบ account เพื่อให้เวลาตอบเท่ากัน
  const passwordValid = await verifyPassword(password, account?.password_hash ?? (await dummyPasswordHashPromise));

  // บัญชีที่ถูกปิดตอบเหมือนรหัสผิด ไม่บอกว่ารหัสผ่านถูก
  if (!account || !passwordValid || account.status !== "active") {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid username or password.");
  }

  return withTransaction(async (transaction) => {
    await accountRepository.lockById(account.id, transaction);

    // อ่าน account ใหม่หลัง lock ให้ profile และ token มาจาก snapshot เดียวกัน
    const lockedAccount = await accountRepository.findById(account.id, transaction);

    if (!lockedAccount || lockedAccount.status !== "active") {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid username or password.");
    }

    await sessionRepository.revokeActiveByAccountId(lockedAccount.id, transaction);

    const { permissions } = await getAccountPermissions(lockedAccount, transaction);
    const tokens = await createSession(lockedAccount, permissions, context, transaction);

    return buildAuthSuccessResponse(tokens, buildMeResponse(lockedAccount, permissions, tokens.session));
  });
}

// Function ออก token ชุดใหม่ด้วย refresh token (หมุน refresh token ทุกครั้ง ใช้ซ้ำไม่ได้)
export async function refresh(body: unknown): Promise<AuthSuccessResponse> {
  const { refresh_token: refreshToken } = parseWithSchema(refreshBodySchema, body);
  const payload = verifyRefreshToken(refreshToken);
  const session = await sessionRepository.findActiveById(payload.session_id);

  if (!session || session.account_id !== payload.account_id) {
    throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token.");
  }

  if (!refreshTokenHashesMatch(hashRefreshToken(refreshToken), session.refresh_token_hash)) {
    throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token.");
  }

  const account = await requireActiveAccountById(payload.account_id, 423, "ACCOUNT_INACTIVE", "Account is inactive.");
  const { permissions } = await getAccountPermissions(account);
  const accessToken = signAccountAccessToken(account, permissions, session.id);
  // session expires_at คงที่นับจากตอน login ทำให้ refresh ต่ออายุเกิน absolute cap ไม่ได้
  const nextRefreshToken = signRefreshToken({ account_id: account.id, session_id: session.id }, { expiresIn: getRefreshExpiresInSeconds() });
  const rotated = await updateRefreshTokenHash(session.id, hashRefreshToken(nextRefreshToken), session.refresh_token_hash);

  // อีก request ใช้ refresh token เดียวกัน refresh ไปก่อนแล้ว
  if (!rotated) {
    throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token.");
  }

  return buildAuthSuccessResponse({ accessToken, refreshToken: nextRefreshToken });
}

// Function logout และ revoke session ปัจจุบัน
export async function logout(auth: AccessTokenPayload | undefined): Promise<{ message: string }> {
  if (!auth) {
    throw new ApiError(401, "INVALID_TOKEN", "Invalid or expired token.");
  }

  await sessionRepository.revoke(auth.session_id);

  return {
    message: "Logged out successfully.",
  };
}

// Function เปลี่ยน password ของตัวเอง (ตรวจรหัสเดิมก่อน) แล้ว revoke session อื่น ส่วน session ปัจจุบันใช้ต่อได้
export async function changeOwnPassword(auth: AccessTokenPayload | undefined, body: unknown): Promise<{ message: string }> {
  if (!auth) {
    throw new ApiError(401, "INVALID_TOKEN", "Invalid or expired token.");
  }

  const { current_password: currentPassword, new_password: newPassword } = parseWithSchema(changeOwnPasswordBodySchema, body);
  const account = await requireActiveAccountById(auth.account_id, 401, "INVALID_TOKEN", "Invalid or expired token.");

  if (!(await verifyPassword(currentPassword, account.password_hash))) {
    throw new ApiError(400, "INVALID_CURRENT_PASSWORD", "Current password is incorrect.");
  }

  const passwordHash = await hashPassword(newPassword);

  await withTransaction(async (transaction) => {
    await accountRepository.updatePassword(account.id, passwordHash, transaction);
    await sessionRepository.revokeActiveByAccountIdExcept(account.id, auth.session_id, transaction);
  });

  return {
    message: "Password changed successfully.",
  };
}

// Function ขอลิงก์ตั้งรหัสผ่านใหม่ทาง email (ตอบเหมือนกันทุกกรณี กันการเดาว่ามี email ไหนในระบบ)
export async function requestPasswordReset(body: unknown, context: SessionRequestContext): Promise<typeof FORGOT_PASSWORD_RESPONSE> {
  const { email } = parseWithSchema(forgotPasswordBodySchema, body);
  const account = await accountRepository.findByEmail(email);

  if (!account || account.status !== "active" || !account.email) {
    return FORGOT_PASSWORD_RESPONSE;
  }

  // ขอซ้ำภายใน cooldown ไม่ส่ง email ใหม่ (ลิงก์เดิมยังใช้ได้)
  const latestToken = await passwordResetTokenRepository.findLatestUnusedPasswordResetToken(account.id);
  const cooldownMs = AUTH_DEFAULTS.passwordResetCooldownSeconds * 1000;

  if (latestToken && Date.now() - new Date(latestToken.created_at).getTime() < cooldownMs) {
    return FORGOT_PASSWORD_RESPONSE;
  }

  const { token, tokenHash } = generatePasswordResetToken();
  const expiresInSeconds = getPasswordResetExpiresInSeconds();

  await withTransaction(async (transaction) => {
    await passwordResetTokenRepository.invalidateUnusedPasswordResetTokens(account.id, transaction);
    await passwordResetTokenRepository.createPasswordResetToken(
      {
        account_id: account.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + expiresInSeconds * 1000),
        ip_address: context.ip_address,
      },
      transaction
    );
  });

  sendPasswordResetEmail(account, account.email, token, expiresInSeconds);

  return FORGOT_PASSWORD_RESPONSE;
}

// Function ตั้งรหัสผ่านใหม่ด้วย token จาก email แล้ว revoke session ทั้งหมด (token ใช้ได้ครั้งเดียว)
export async function resetPasswordWithToken(body: unknown): Promise<{ message: string }> {
  const { token, new_password: newPassword } = parseWithSchema(resetPasswordWithTokenBodySchema, body);
  const resetToken = await passwordResetTokenRepository.findPasswordResetTokenByHash(hashPasswordResetToken(token));
  const invalidTokenError = new ApiError(400, "INVALID_RESET_TOKEN", "Reset token is invalid or has expired.");

  if (!resetToken || resetToken.used_at || new Date(resetToken.expires_at) <= new Date()) {
    throw invalidTokenError;
  }

  const account = await accountRepository.findById(resetToken.account_id);

  if (!account || account.status !== "active") {
    throw invalidTokenError;
  }

  const passwordHash = await hashPassword(newPassword);

  await withTransaction(async (transaction) => {
    // mark ใช้แล้วก่อนเปลี่ยนรหัส กันส่ง token เดียวกันพร้อมกันสองครั้ง
    if (!(await passwordResetTokenRepository.consumePasswordResetToken(resetToken.id, transaction))) {
      throw invalidTokenError;
    }

    await accountRepository.updatePassword(account.id, passwordHash, transaction);
    await passwordResetTokenRepository.invalidateUnusedPasswordResetTokens(account.id, transaction);
    await sessionRepository.revokeActiveByAccountId(account.id, transaction);
  });

  return {
    message: "Password has been reset successfully. Please log in with your new password.",
  };
}

// Function ดึงข้อมูลตัวเองของผู้ที่ login อยู่
export async function me(auth: AccessTokenPayload | undefined, currentSession: SessionDto | undefined): Promise<MeResponse> {
  if (!auth) {
    throw new ApiError(401, "INVALID_TOKEN", "Invalid or expired token.");
  }

  const account = await requireActiveAccountById(auth.account_id, 401, "INVALID_TOKEN", "Invalid or expired token.");
  const { permissions } = await getAccountPermissions(account);

  return buildMeResponse(account, permissions, currentSession ?? null);
}
