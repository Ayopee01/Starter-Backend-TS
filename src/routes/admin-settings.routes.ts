// Import Library
import { Router } from "express";
// Import Middlewares
import permissionMiddleware from "../middlewares/permission.middleware";
// Import Services
import * as adminSettingsService from "../services/admin-settings.service";

const router = Router();

/* -------------------------------------- Admin Settings Routes -------------------------------------- */

router.get("/roles", permissionMiddleware(["roles:read"]), async (_req, res, next) => {
  try {
    const result = await adminSettingsService.listRoles();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/admins", permissionMiddleware(["admins:create"]), async (req, res, next) => {
  try {
    const result = await adminSettingsService.createAdminAccount(req.body, req.auth);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.patch("/admins/:adminCode", permissionMiddleware(["admins:update"]), async (req, res, next) => {
  try {
    const result = await adminSettingsService.updateAdminAccount(req.params.adminCode, req.body, req.auth);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete("/admins/:adminCode", permissionMiddleware(["admins:delete"]), async (req, res, next) => {
  try {
    const result = await adminSettingsService.deleteAdminAccount(req.params.adminCode, req.auth);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/users/:adminCode/permissions", permissionMiddleware(["permissions:read"]), async (req, res, next) => {
  try {
    const result = await adminSettingsService.getAdminUserPermissions(req.params.adminCode, req.auth);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:adminCode/permissions", permissionMiddleware(["permissions:update"]), async (req, res, next) => {
  try {
    const result = await adminSettingsService.updateAdminUserPermissions(req.params.adminCode, req.body, req.auth);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
