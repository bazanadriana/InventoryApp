import "express";

declare global {
  namespace Express {
    interface User {
      id: number;
      role?: "ADMIN" | "USER";
      email?: string | null;
      name?: string | null;
    }
  }
}
export {};
