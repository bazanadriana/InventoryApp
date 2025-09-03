import 'express';

declare module 'express-serve-static-core' {
  interface User {
    id: number;
    role?: 'admin' | 'user';
  }
  interface Request {
    user?: User;
  }
}
