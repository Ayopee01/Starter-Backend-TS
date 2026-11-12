/* -------------------------------------- Config -------------------------------------- */

// Config หน่วยเวลาที่รองรับสำหรับแปลงค่าอายุ token จาก env
const TIME_UNIT_SECONDS = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
} as const;

// Type หน่วยเวลาที่ระบบ auth รองรับ
type DurationUnit = keyof typeof TIME_UNIT_SECONDS;

// Config รูปแบบ duration เช่น 15m, 24h หรือเลขวินาที
const DURATION_PATTERN = /^(\d+)([smhd])?$/;

// Config ค่า default ของ token และ session เมื่อไม่ได้กำหนดผ่าน env
export const AUTH_DEFAULTS = {
  accessTokenExpiresIn: "15m",
  accessTokenExpiresInSeconds: 15 * TIME_UNIT_SECONDS.m,
  // อายุ refresh token ใช้ทั้ง JWT exp และ session expires_at
  refreshExpiresInSeconds: 24 * TIME_UNIT_SECONDS.h,
  // เวลาก่อน access token หมดอายุที่เริ่มเตือนให้ client ไป /refresh
  accessTokenRefreshThresholdSeconds: 2 * TIME_UNIT_SECONDS.m,
  // อายุลิงก์ตั้งรหัสผ่านใหม่ที่ส่งทาง email
  passwordResetExpiresInSeconds: 30 * TIME_UNIT_SECONDS.m,
  // ขอลิงก์ใหม่ได้อีกครั้งหลังจากนี้ (กันยิงส่ง email ถี่)
  passwordResetCooldownSeconds: 60,
} as const;

/* -------------------------------------- Functions -------------------------------------- */

// Function แปลงค่า duration เป็นวินาที และใช้ fallback เมื่อรูปแบบไม่ถูกต้อง
function parseDurationSeconds(value: string | undefined, fallbackSeconds: number): number {
  const match = value?.trim().match(DURATION_PATTERN);

  if (!match) {
    return fallbackSeconds;
  }

  const durationAmount = Number(match[1]);
  const durationUnit = (match[2] || "s") as DurationUnit;

  return durationAmount * TIME_UNIT_SECONDS[durationUnit];
}

// Function อ่านอายุ access token จาก env เป็นวินาที
export function getAccessTokenExpiresInSeconds(): number {
  return parseDurationSeconds(process.env.JWT_ACCESS_EXPIRES_IN, AUTH_DEFAULTS.accessTokenExpiresInSeconds);
}

// Function อ่านอายุ refresh token (วินาที) ใช้ทั้ง JWT exp และ session expires_at
export function getRefreshExpiresInSeconds(): number {
  return parseDurationSeconds(process.env.JWT_REFRESH_EXPIRES_IN, AUTH_DEFAULTS.refreshExpiresInSeconds);
}

// Function อ่านอายุลิงก์ตั้งรหัสผ่านใหม่จาก env เป็นวินาที
export function getPasswordResetExpiresInSeconds(): number {
  return parseDurationSeconds(process.env.PASSWORD_RESET_EXPIRES_IN, AUTH_DEFAULTS.passwordResetExpiresInSeconds);
}

// Function อ่าน URL หน้าเว็บตั้งรหัสผ่านใหม่ของ frontend (ระบบต่อ ?token=... ให้)
export function getPasswordResetUrl(): string {
  const url = process.env.PASSWORD_RESET_URL;

  if (!url) {
    throw new Error("PASSWORD_RESET_URL is required.");
  }

  return url;
}

// Function อ่าน threshold เตือนก่อน access token หมดอายุ (ต้องน้อยกว่าอายุ access token เสมอ)
export function getAccessTokenRefreshThresholdSeconds(): number {
  const thresholdSeconds = parseDurationSeconds(
    process.env.ACCESS_TOKEN_REFRESH_THRESHOLD,
    AUTH_DEFAULTS.accessTokenRefreshThresholdSeconds
  );
  const accessTokenSeconds = getAccessTokenExpiresInSeconds();

  if (thresholdSeconds <= 0 || thresholdSeconds >= accessTokenSeconds) {
    throw new Error(
      `ACCESS_TOKEN_REFRESH_THRESHOLD (${thresholdSeconds}s) must be greater than 0 and less than the access token lifetime (${accessTokenSeconds}s).`
    );
  }

  return thresholdSeconds;
}
