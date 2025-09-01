import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.user) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === "ADMIN") return next();
  return res.status(403).json({ error: "Forbidden" });
}

