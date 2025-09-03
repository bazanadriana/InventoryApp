import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | null = null;

    // Allow Bearer header
    const auth = req.get("authorization") || "";
    if (auth.toLowerCase().startsWith("bearer ")) token = auth.slice(7);

    // Or httpOnly cookie set by OAuth
    if (!token && req.cookies?.token) token = req.cookies.token;

    if (!token) return res.status(401).json({ error: "unauthorized" });

    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = { id: payload.uid, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
}
