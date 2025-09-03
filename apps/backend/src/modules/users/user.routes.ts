// src/modules/users/user.routes.ts
import { Router } from "express";
import { prisma } from "../../db/prisma/client.js";
import { requireAdmin, requireAuth } from "../../middleware/auth.js";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const me = await prisma.user.findUnique({ where: { id: req.user!.id } });
  res.json(me);
});

router.get("/", requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
  res.json(users);
});

export default router;