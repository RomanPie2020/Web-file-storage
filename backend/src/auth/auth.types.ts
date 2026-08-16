export interface AuthenticatedUser {
  id: string;
  email?: string;
  claims: Record<string, unknown>;
}

export interface AuthenticatedRequest {
  headers: {
    authorization?: string;
  };
  user?: AuthenticatedUser;
}

// Express uses a namespace for request declaration merging.
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */
