// Import Library
import crypto from "node:crypto";

/* -------------------------------------- Functions -------------------------------------- */

// Function hash reset token ด้วย sha256 ก่อนเก็บหรือค้นใน DB (token สุ่ม 256 bit จึงไม่ต้องใช้ secret)
export function hashPasswordResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Function สร้าง reset token แบบสุ่มสำหรับใส่ในลิงก์ พร้อม hash สำหรับเก็บลง DB
export function createPasswordResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashPasswordResetToken(token),
  };
}
