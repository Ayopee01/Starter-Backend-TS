// Import Library
import nodemailer, { type Transporter } from "nodemailer";
// Import Config
import { getMailConfig } from "../config/mail.config";

/* -------------------------------------- Types -------------------------------------- */

// Type ส่วน Payload ของ email ที่จะส่ง
export interface MailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/* -------------------------------------- Config -------------------------------------- */

// Config transporter ที่สร้างครั้งแรกตอนส่ง แล้วใช้ซ้ำทั้ง process
let transporter: Transporter | null = null;

/* -------------------------------------- Functions -------------------------------------- */

// Function สร้าง SMTP transporter จาก config (สร้างครั้งเดียว)
function getTransporter(): Transporter {
  if (!transporter) {
    const config = getMailConfig();

    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  return transporter;
}

// Function ส่ง email ผ่าน SMTP โดยใช้ผู้ส่งจาก MAIL_FROM
export async function sendMail(payload: MailPayload): Promise<void> {
  await getTransporter().sendMail({
    from: getMailConfig().from,
    ...payload,
  });
}
