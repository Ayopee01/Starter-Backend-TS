// Import Config
import { readPositiveIntegerEnv, readRequiredEnv } from "./env";

/* -------------------------------------- Types -------------------------------------- */

// Type config การเชื่อมต่อ SMTP สำหรับส่ง email
export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

/* -------------------------------------- Functions -------------------------------------- */

// Function อ่าน config SMTP จาก env (อ่านตอนเรียกใช้ ให้ dotenv โหลดก่อนเสมอ)
export function getMailConfig(): MailConfig {
  return {
    host: readRequiredEnv("SMTP_HOST"),
    port: readPositiveIntegerEnv("SMTP_PORT", 587),
    // true = ใช้ TLS ตั้งแต่ต่อ (port 465), false = STARTTLS หรือไม่เข้ารหัส (587 / 1025 ของ Mailpit)
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    from: readRequiredEnv("MAIL_FROM"),
  };
}
