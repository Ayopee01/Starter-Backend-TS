// Import Library
import { Router } from "express";
// Import Middlewares
import authMiddleware from "../middlewares/auth.middleware";
import sessionMiddleware from "../middlewares/session.middleware";
// Import Routes
import adminSettingsRoutes from "./admin-settings.routes";

const router = Router();

/* -------------------------------------- Admin Routes -------------------------------------- */

// ตรวจ token และ session ครั้งเดียวต่อ request ก่อนเข้า router ย่อยของ Admin ทุกตัว
router.use(authMiddleware);
router.use(sessionMiddleware);

router.use("/", adminSettingsRoutes);

export default router;
