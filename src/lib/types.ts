import type { Request, Response, RequestHandler, NextFunction } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

export type ExtRequest<
  Params extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = Request<Params, ResBody, ReqBody, ReqQuery, Locals>;

export type ExtResponse<
  ResBody = unknown,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = Response<ResBody, Locals>;

export type ExtHandler<
  Params extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = RequestHandler<Params, ResBody, ReqBody, ReqQuery, Locals>;

export type ExtNext = NextFunction;

export type SecurityMode = 'basic' | 'jwt' | boolean;
