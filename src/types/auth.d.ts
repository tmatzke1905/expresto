import 'express';

declare module 'express' {
  interface Request {
    auth?: Record<string, unknown>;
  }
}
