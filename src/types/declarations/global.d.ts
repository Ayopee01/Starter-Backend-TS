// Import Library
import type { PrismaClient } from "@prisma/client";
// Import Types
import type { AccessTokenPayload, SessionDto } from "../auth.type";

declare global {
  // Type Prisma client ที่เก็บไว้ใช้ซ้ำทั้ง process
  // eslint-disable-next-line no-var
  var prismaClient: PrismaClient | null | undefined;

  namespace Express {
    // Type ค่าที่ auth/session middleware แนบไว้ใน request
    interface Request {
      auth?: AccessTokenPayload;
      session?: SessionDto;
    }
  }
}

export {};
