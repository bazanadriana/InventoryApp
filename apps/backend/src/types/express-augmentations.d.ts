declare global {
    namespace Express {
      interface User {
        id: number;
        email: string | null;
        role?: 'admin' | 'user';
      }
  
      interface Request {
        user?: User; 
        userId?: string;
        role?: 'admin' | 'user';
      }
    }
  }
  export {};
  