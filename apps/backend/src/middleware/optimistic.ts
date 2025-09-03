import { Request, Response, NextFunction } from 'express';
/**
 * Checks x-version header or body.version against the current version from DB.
 * If mismatch -> 409 Conflict.
 */
export function optimisticVersion(
  getCurrentVersion: (req: Request) => Promise<number | undefined | null>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientVersionRaw = (req.header('x-version') ?? req.body?.version) as string | undefined;
      const clientVersion = clientVersionRaw ? Number(clientVersionRaw) : undefined;
      const current = await getCurrentVersion(req);
      if (clientVersion !== undefined && current !== undefined && current !== null) {
        if (clientVersion !== current) {
          return res.status(409).json({ error: 'Version conflict' });
        }
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}