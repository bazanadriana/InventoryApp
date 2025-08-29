export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: number;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
}