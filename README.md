# Backend Starter

โปรเจกต์ตั้งต้นสำหรับเริ่ม Backend ใหม่ มีระบบพื้นฐานที่แทบทุกระบบต้องใช้พร้อมแล้ว คัดลอกไปต่อยอดเพิ่ม feature ของตัวเองได้ทันที

**สิ่งที่มีให้แล้ว**

- ระบบ Login ด้วย Access Token + Refresh Token (JWT) ผูกกับ session ใน DB
- Login ซ้ำแล้ว session เก่าถูก revoke (1 บัญชีใช้ได้ทีละ 1 session) และ session หมดอายุตามเวลา
- เปลี่ยนรหัสผ่านของตัวเอง และลืมรหัสผ่านแบบส่งลิงก์ทาง email
- ระบบสิทธิ์ Admin แบบระดับ (`owner` > `manager` > `supervisor`) + permission รายตัว
- จัดการ Admin: สร้าง / แก้ไข / ลบ / กำหนดสิทธิ์ ตามกฎระดับ
- Swagger (OpenAPI) docs, Zod validation, error response มาตรฐาน
- PostgreSQL + Mailpit (SMTP ทดสอบ) ผ่าน Docker Compose

---

## Tech Stack

| เทคโนโลยี | Version |
| --- | --- |
| Node.js | 26 |
| TypeScript | 7 |
| Express | 5 |
| Prisma | 7 |
| PostgreSQL | 17 |

---

## เริ่มต้นใช้งาน

### สิ่งที่ต้องมี

- Node.js 26 ขึ้นไป
- Docker Desktop (สำหรับ PostgreSQL และ Mailpit)

### ขั้นตอน

```bash
# 1. ติดตั้ง dependencies (จะ generate Prisma Client ให้อัตโนมัติ)
npm install

# 2. สร้างไฟล์ .env จากตัวอย่าง แล้วแก้ secret ทั้ง 3 ตัว (ดูหัวข้อ Environment Variables)
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env

# 3. เปิด PostgreSQL และ Mailpit
docker compose up -d

# 4. สร้างตารางในฐานข้อมูล
npm run db:migrate

# 5. สร้างบัญชี admin เริ่มต้น (admin / admin1234 ระดับ owner ได้ทุกสิทธิ์)
npm run db:seed

# 6. รัน server
npm run dev
```

| URL | ใช้ทำอะไร |
| --- | --- |
| http://localhost:8080 | API |
| http://localhost:8080/api-docs | Swagger UI (กด **Authorize** แล้วใส่ `access_token` เพื่อทดสอบ route ที่ต้อง login) |
| http://localhost:8025 | Mailpit ดู email ที่ระบบส่ง (dev เท่านั้น ไม่ได้ส่งออกจริง) |

---

## Scripts

| คำสั่ง | ใช้ทำอะไร |
| --- | --- |
| `npm run dev` | รัน development (hot reload เมื่อแก้ `.ts` และไฟล์ OpenAPI `.yaml`) |
| `npm run build` | generate Prisma Client + compile TypeScript ไปที่ `dist/` |
| `npm start` | รัน `dist/src/index.js` (ต้องรันจาก root project เพราะ Swagger อ่าน yaml จาก `src/docs`) |
| `npm run typecheck` | ตรวจ type ด้วย `tsc --noEmit` |
| `npm run db:migrate` | development: สร้าง/apply migration เมื่อแก้ `prisma/schema.prisma` แล้ว generate client |
| `npm run db:deploy` | production: apply migration ที่มีอยู่เท่านั้น |
| `npm run db:seed` | สร้างข้อมูลเริ่มต้นจาก `prisma/seed.ts` |
| `npm run db:generate` | generate Prisma Client ใหม่ |
| `npm run db:studio` | เปิด Prisma Studio ดูข้อมูลในฐานข้อมูล |

---

## Project Structure

```txt
prisma/
  schema.prisma                 # Database models
  migrations/                   # Migration history
  seed.ts                       # Seed runner (calls services, which hash passwords)
  admin-account.seed.ts         # Initial account data (data only)
prisma.config.ts                # Prisma 7 config
docker-compose.yml              # PostgreSQL + Mailpit
src/
  index.ts                      # Starts the HTTP server
  app.ts                        # Express app, middleware, route mounting
  config/                       # Config and values read from .env
  db/prisma.ts                  # Prisma client and withTransaction
  docs/
    swagger.ts                  # Merges OpenAPI YAML and serves Swagger UI
    openapi/*.yaml              # OpenAPI files per tag + components.yaml (shared schemas)
  middlewares/                  # auth, session, permission, error
  routes/                       # Receive requests and pass them to services only
  services/                     # Business logic per route
    shared/                     # Logic shared across multiple flows
  repositories/                 # Route-specific DB queries via Prisma
    shared/                     # Queries shared across services + mappers
  types/                        # Types per feature (shared = used by many)
  validation/                   # Zod schemas + parser
  utils/                        # Helpers with no business-flow knowledge (jwt, password, mailer, ...)
```