// Import Library
import path from "node:path";
import type { Express } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

/* -------------------------------------- Config -------------------------------------- */

// Config โฟลเดอร์ OpenAPI yaml (อ่านจาก source เสมอ เพราะ tsc ไม่ copy yaml ไป dist)
const OPENAPI_DIR = path.join(process.cwd(), "src/docs/openapi");

// Config OpenAPI spec ที่รวมจาก yaml แยกตาม tag
const openapi = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Backend API",
      version: "1.0.0",
    },
  },
  apis: ["system.yaml", "auth.yaml", "admin-settings.yaml", "components.yaml"].map((file) => path.join(OPENAPI_DIR, file).split(path.sep).join("/")),
});

/* -------------------------------------- Functions -------------------------------------- */

// Function ติดตั้ง Swagger UI ที่ /api-docs และ spec JSON ที่ /api-docs/openapi.json
export default function setupSwagger(app: Express): void {
  app.get("/api-docs/openapi.json", (_req, res) => {
    res.json(openapi);
  });

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      customSiteTitle: "Backend API Docs",
      swaggerOptions: {
        url: "/api-docs/openapi.json",
      },
    })
  );
}
