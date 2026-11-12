// Import Library
import crypto from "node:crypto";

/* -------------------------------------- Config -------------------------------------- */

// Config algorithm และ prefix ที่ใช้ hash refresh token
const REFRESH_TOKEN_HASH_CONFIG = {
  algorithm: "sha256",
  prefix: "hmac-sha256",
} as const;

// Config ค่า secret ที่ห้ามใช้ (ค่าง่ายเกินไป หรือ placeholder จาก .env.example)
const WEAK_REFRESH_TOKEN_HASH_SECRET_VALUES = new Set([
  "secret",
  "password",
  "change-me",
  "CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_BASE64_32_REFRESH_HASH",
]);

/* -------------------------------------- Functions -------------------------------------- */

// Function อ่าน secret สำหรับ hash refresh token และตรวจว่าแข็งแรงพอ
function getRefreshTokenHashSecret(): string {
  const secret = process.env.REFRESH_TOKEN_HASH_SECRET;

  if (!secret) {
    throw new Error("REFRESH_TOKEN_HASH_SECRET must be configured.");
  }

  if (secret.length < 32 || WEAK_REFRESH_TOKEN_HASH_SECRET_VALUES.has(secret)) {
    throw new Error("REFRESH_TOKEN_HASH_SECRET must be a strong value (at least 32 characters, not a default placeholder).");
  }

  return secret;
}

// Function hash refresh token ด้วย HMAC ก่อนเก็บลง DB
export function hashRefreshToken(refreshToken: string): string {
  if (typeof refreshToken !== "string" || refreshToken.length === 0) {
    throw new TypeError("Refresh token must be a non-empty string.");
  }

  const digest = crypto
    .createHmac(REFRESH_TOKEN_HASH_CONFIG.algorithm, getRefreshTokenHashSecret())
    .update(refreshToken)
    .digest("base64url");

  return `${REFRESH_TOKEN_HASH_CONFIG.prefix}$${digest}`;
}

// Function เทียบ hash ของ refresh token แบบ timing-safe
export function refreshTokenHashesMatch(candidateHash: string | null | undefined, storedHash: string | null | undefined): boolean {
  if (typeof candidateHash !== "string" || typeof storedHash !== "string") {
    return false;
  }

  const candidateBuffer = Buffer.from(candidateHash);
  const storedBuffer = Buffer.from(storedHash);

  return candidateBuffer.length === storedBuffer.length && crypto.timingSafeEqual(candidateBuffer, storedBuffer);
}
