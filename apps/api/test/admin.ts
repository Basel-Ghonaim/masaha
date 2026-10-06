import type { ErrorEnvelope } from '@masaha/shared/core';
import type { Express } from 'express';
import request from 'supertest';

import { prisma } from '../src/db/index.ts';
import type { Role } from '../src/generated/prisma/enums.ts';
import { accessTokens } from './app.ts';

// The callers every /admin endpoint is proven against (docs/development/testing.md §4).

export type Caller = 'guest' | Role | 'ADMIN with a pending password change';

/** The callers the /admin guard refuses, and how. */
export const REFUSED_CALLERS = [
  { caller: 'guest', status: 401, type: 'unauthorized', code: undefined },
  { caller: 'USER', status: 403, type: 'forbidden', code: undefined },
  { caller: 'OWNER', status: 403, type: 'forbidden', code: undefined },
  {
    caller: 'ADMIN with a pending password change',
    status: 403,
    type: 'forbidden',
    code: 'PASSWORD_CHANGE_REQUIRED',
  },
] as const satisfies readonly { caller: Caller; status: number; type: string; code?: string }[];

/** A new account for the caller, and the Authorization header of its access token. */
export async function signIn(
  caller: Exclude<Caller, 'guest'>,
): Promise<{ id: number; authorization: string }> {
  const pending = caller === 'ADMIN with a pending password change';
  const role: Role = pending ? 'ADMIN' : caller;
  const user = await prisma.user.create({
    data: {
      email: `${pending ? 'pending' : role.toLowerCase()}@example.com`,
      name: 'Sara',
      role,
      passwordHash: 'x',
    },
  });
  const token = await accessTokens.sign({ userId: user.id, role, mustChangePassword: pending });
  return { id: user.id, authorization: `Bearer ${token}` };
}

type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';

/** A request to `/api/v1/admin<path>`, as the caller, with a JSON body when one is given. */
export async function adminRequest(
  app: Express,
  caller: Caller | { authorization: string },
  method: Method,
  path: string,
  body?: object,
) {
  const call = request(app)[method](`/api/v1/admin${path}`);
  const authorization =
    typeof caller === 'object'
      ? caller.authorization
      : caller === 'guest'
        ? undefined
        : (await signIn(caller)).authorization;
  if (authorization) call.set('Authorization', authorization);
  return body ? call.send(body) : call;
}

/** The audit entries written so far, oldest first, without their ids and times. */
export function auditEntries() {
  return prisma.auditLog.findMany({
    select: {
      actorId: true,
      action: true,
      entityType: true,
      entityId: true,
      spaceId: true,
      before: true,
      after: true,
    },
    orderBy: { id: 'asc' },
  });
}

/** A response's error, from its envelope. */
export function errorOf(response: request.Response): ErrorEnvelope['error'] {
  return (response.body as ErrorEnvelope).error;
}

/** A response's data, from its envelope. */
export function dataOf(response: request.Response): unknown {
  return (response.body as { data: unknown }).data;
}
