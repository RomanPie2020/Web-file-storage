export interface AuthenticatedUser {
  id: string;
  email?: string;
  claims: Record<string, unknown>;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
