// Import Library
import { randomUUID } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { ZodType } from "zod";
// Import Config
import { AUTH_DEFAULTS, getAccessTokenRefreshThresholdSeconds } from "../config/auth.config";
// Import Types
import type { AccessTokenPayload, RefreshTokenPayload, TokenConfig, TokenPayloadByType, TokenSignOptions, TokenType } from "../types/auth.type";
// Import Validation
import { parseWithSchema } from "../validation/parser";
import { accessTokenPayloadSchema, refreshTokenPayloadSchema } from "../validation/schemas";
// Import Utils
import ApiError from "./api-error";

/* -------------------------------------- Config -------------------------------------- */

// Config ค่า secret ที่ห้ามใช้ (ค่าง่ายเกินไป หรือ placeholder จาก .env.example)
const WEAK_JWT_SECRET_VALUES = new Set([
  "secret",
  "password",
  "change-me",
  "CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_BASE64_32_ACCESS",
  "CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_BASE64_32_REFRESH",
]);

// Config schema ที่ใช้ validate payload ของ token แต่ละชนิด
const TOKEN_PAYLOAD_SCHEMAS: { [TTokenType in TokenType]: ZodType<TokenPayloadByType[TTokenType]> } = {
  access: accessTokenPayloadSchema,
  refresh: refreshTokenPayloadSchema,
};

/* -------------------------------------- Functions -------------------------------------- */

// Function อ่าน config ของ token แต่ละชนิดจาก env (อ่านตอนเรียกใช้ ให้ dotenv โหลดก่อนเสมอ)
function readTokenConfig(tokenType: TokenType): TokenConfig {
  if (tokenType === "access") {
    return {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || AUTH_DEFAULTS.accessTokenExpiresIn,
      invalidCode: "INVALID_TOKEN",
      expiredCode: "TOKEN_EXPIRED",
    };
  }

  // refresh token ไม่มีอายุ default ผู้เรียกต้องส่ง options.expiresIn เสมอ
  return {
    secret: process.env.JWT_REFRESH_SECRET,
    invalidCode: "INVALID_REFRESH_TOKEN",
    expiredCode: "TOKEN_EXPIRED",
  };
}

// Function ดึง config ของ token ชนิดนั้น และตรวจว่า secret ถูกตั้งและแข็งแรงพอ
function getTokenConfig(tokenType: TokenType): TokenConfig & { secret: string } {
  const config = readTokenConfig(tokenType);

  if (!config.secret) {
    throw new Error(`${tokenType} token secret must be configured.`);
  }

  if (config.secret.length < 32 || WEAK_JWT_SECRET_VALUES.has(config.secret)) {
    throw new Error(`${tokenType} token secret must be a strong value (at least 32 characters, not a default placeholder).`);
  }

  return config as TokenConfig & { secret: string };
}

// Function เซ็น JWT ตามชนิด token ที่ระบุ
function signTypedToken<TTokenType extends TokenType>(
  payload: Omit<TokenPayloadByType[TTokenType], "token_type" | "iat" | "exp">,
  tokenType: TTokenType,
  options: TokenSignOptions = {}
): string {
  const config = getTokenConfig(tokenType);
  const expiresIn = options.expiresIn ?? config.expiresIn;

  if (expiresIn === undefined) {
    throw new TypeError(`${tokenType} token requires an expiresIn (no default configured for this type).`);
  }

  // jwtid สุ่มทุกครั้ง กัน token ที่เซ็นในวินาทีเดียวกันได้ค่าซ้ำกัน (refresh token เดิมจะ match hash ใหม่)
  return jwt.sign({ ...payload, token_type: tokenType }, config.secret, {
    algorithm: "HS256",
    expiresIn: expiresIn as SignOptions["expiresIn"],
    jwtid: randomUUID(),
  });
}

// Function ตรวจ JWT และ validate payload ตามชนิด token ที่ระบุ
function verifyTypedToken<TTokenType extends TokenType>(token: string, tokenType: TTokenType): TokenPayloadByType[TTokenType] {
  const config = getTokenConfig(tokenType);

  try {
    const payload = jwt.verify(token, config.secret, { algorithms: ["HS256"] });

    return parseWithSchema<TokenPayloadByType[TTokenType]>(TOKEN_PAYLOAD_SCHEMAS[tokenType], payload, {
      statusCode: 401,
      code: config.invalidCode,
      message: "Invalid token.",
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, config.expiredCode, "Token expired.");
    }

    throw new ApiError(401, config.invalidCode, "Invalid token.");
  }
}

// Function เซ็น access token
export const signAccessToken = (payload: Omit<AccessTokenPayload, "token_type" | "iat" | "exp">, options: TokenSignOptions = {}): string =>
  signTypedToken(payload, "access", options);

// Function เซ็น refresh token
export const signRefreshToken = (payload: Omit<RefreshTokenPayload, "token_type" | "iat" | "exp">, options: TokenSignOptions = {}): string =>
  signTypedToken(payload, "refresh", options);

// Function ตรวจ access token
export const verifyAccessToken = (token: string): AccessTokenPayload => verifyTypedToken(token, "access");

// Function ตรวจ refresh token
export const verifyRefreshToken = (token: string): RefreshTokenPayload => verifyTypedToken(token, "refresh");

// Function เช็คว่า access token ใกล้หมดอายุตาม threshold หรือยัง (ใช้เตือน client ให้ไป /refresh เอง)
export function isAccessTokenNearingExpiry(exp: number | undefined): boolean {
  if (typeof exp !== "number") {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  return exp - nowSeconds <= getAccessTokenRefreshThresholdSeconds();
}
