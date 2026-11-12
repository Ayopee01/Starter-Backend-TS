// Import Library
import { Router } from "express";
// Import Middlewares
import authMiddleware from "../middlewares/auth.middleware";
import sessionMiddleware from "../middlewares/session.middleware";
// Import Services
import * as authService from "../services/auth.service";

const router = Router();

/* -------------------------------------- Authentication Routes -------------------------------------- */

router.post("/login", async (req, res, next) => {
  try {
    const result = await authService.login(req.body, { ip_address: req.ip ?? null, user_agent: req.get("user-agent") ?? null });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const result = await authService.refresh(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const result = await authService.requestPasswordReset(req.body, { ip_address: req.ip ?? null, user_agent: req.get("user-agent") ?? null });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const result = await authService.resetPasswordWithToken(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/logout", authMiddleware, sessionMiddleware, async (req, res, next) => {
  try {
    const result = await authService.logout(req.auth);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/me", authMiddleware, sessionMiddleware, async (req, res, next) => {
  try {
    const result = await authService.me(req.auth, req.session);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch("/me/password", authMiddleware, sessionMiddleware, async (req, res, next) => {
  try {
    const result = await authService.changeOwnPassword(req.auth, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
