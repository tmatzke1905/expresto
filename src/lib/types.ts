// src/lib/types.ts
import type { Request, Response, RequestHandler, NextFunction } from 'express';
import type { ParsedQs } from 'qs';

export type ExtRequest<
  Params extends Record<string, any> = Record<string, any>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>,
> = Request<Params, ResBody, ReqBody, ReqQuery, Locals>;

export type ExtResponse<
  ResBody = any,
  Locals extends Record<string, any> = Record<string, any>
> = Response<ResBody, Locals>;

export type ExtHandler<
  Params extends Record<string, any> = Record<string, any>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>,
> = RequestHandler<Params, ResBody, ReqBody, ReqQuery, Locals>;

export type ExtNext = NextFunction;

export type SecurityMode = 'basic' | 'jwt' | boolean;
