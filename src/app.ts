// Import Library
import cors from "cors";
import express from "express";
// Import Middlewares
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
// Import Routes
import adminRoutes from "./routes/admin.routes";
import authRoutes from "./routes/auth.routes";
import systemRoutes from "./routes/system.routes";
// Import Docs
import setupSwagger from "./docs/swagger";

/* -------------------------------------- App -------------------------------------- */

// Config Express app
const app = express();

// Config CORS origin จาก env (บังคับต้องมี)
const corsOrigin = process.env.CORS_ORIGIN;

if (!corsOrigin) {
  throw new Error("CORS_ORIGIN is required.");
}

// รองรับหลาย origin คั่นด้วย comma
const corsOrigins = corsOrigin === "*" ? corsOrigin : corsOrigin.split(",").map((origin) => origin.trim()).filter(Boolean);

app.use(
  cors({
    origin: corsOrigins,
    // ให้ browser อ่าน header เตือน token ใกล้หมดอายุได้
    exposedHeaders: ["X-Should-Refresh"],
  })
);
app.use(express.json());

/* -------------------------------------- Routes -------------------------------------- */

app.use("/", systemRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// Config Swagger และ error handler (ต้องอยู่หลัง routes เสมอ)
setupSwagger(app);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
