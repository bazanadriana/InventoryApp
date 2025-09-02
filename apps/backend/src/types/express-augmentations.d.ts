declare global {
    namespace Express {
      interface Request {
        userId?: string;
        role?: 'admin' | 'user';
      }
    }
  }
  export {};
  