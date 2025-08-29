// src/modules/inventories/inventory.routes.ts
import { Router } from "express";
import { prisma } from "../../db/prisma/client.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const inventories = await prisma.inventory.findMany({
    where: {
      OR: [
        { ownerId: req.user!.id },
        { access: { some: { userId: req.user!.id } } }
      ],
    },
    orderBy: { id: "asc" },
  });
  res.json(inventories);
});

router.post("/", requireAuth, async (req, res) => {
  const { title, description } = req.body ?? {};
  const created = await prisma.inventory.create({
    data: { title, description, ownerId: req.user!.id },
  });
  res.status(201).json(created);
});

export default router;
