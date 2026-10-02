import { randomBytes } from 'node:crypto';
import { Request } from 'express';
import { db } from './db.js';
import type { User } from '../src/types.js';

interface AuthSession {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  lastUsedAt: number;
}

const SESSION_DURATION_MS =
  12 * 60 * 60 * 1000; // 12 hours

const authSessions =
  new Map<string, AuthSession>();

function unauthorized(
  message = 'Authentication required.'
): never {
  const error: any =
    new Error(message);

  error.status = 401;

  throw error;
}

export function createAuthSession(
  userId: string
): string {
  const user = db.users.find(
    u =>
      u.id === userId &&
      u.active
  );

  if (!user) {
    unauthorized(
      'Cannot create a session for an invalid or inactive operator.'
    );
  }

  // Remove previous sessions for this operator.
  revokeUserSessions(userId);

  const token =
    randomBytes(32).toString(
      'hex'
    );

  const now = Date.now();

  authSessions.set(
    token,
    {
      token,
      userId,
      createdAt: now,
      lastUsedAt: now,
      expiresAt:
        now +
        SESSION_DURATION_MS,
    }
  );

  return token;
}

export function getBearerToken(
  req: Request
): string | null {
  const authorization =
    String(
      req.headers.authorization ||
        ''
    ).trim();

  if (!authorization) {
    return null;
  }

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i
    );

  if (!match) {
    return null;
  }

  const token =
    match[1]?.trim();

  return token || null;
}

export function getAuthUser(
  req: Request
): User {
  cleanupExpiredSessions();

  const token =
    getBearerToken(req);

  if (!token) {
    unauthorized(
      'Authentication required.'
    );
  }

  const session =
    authSessions.get(token);

  if (!session) {
    unauthorized(
      'Operator session is invalid or expired.'
    );
  }

  if (
    session.expiresAt <=
    Date.now()
  ) {
    authSessions.delete(
      token
    );

    unauthorized(
      'Operator session has expired. Please sign in again.'
    );
  }

  const user =
    db.users.find(
      u =>
        u.id ===
          session.userId &&
        u.active
    );

  if (!user) {
    authSessions.delete(
      token
    );

    unauthorized(
      'Operator account is inactive or no longer exists.'
    );
  }

  session.lastUsedAt =
    Date.now();

  return user;
}

export function revokeAuthSession(
  token: string | null | undefined
): void {
  if (!token) {
    return;
  }

  authSessions.delete(
    token
  );
}

export function revokeUserSessions(
  userId: string
): void {
  for (
    const [
      token,
      session,
    ] of authSessions
  ) {
    if (
      session.userId ===
      userId
    ) {
      authSessions.delete(
        token
      );
    }
  }
}

export function logoutRequest(
  req: Request
): void {
  const token =
    getBearerToken(req);

  if (token) {
    revokeAuthSession(
      token
    );
  }
}

export function cleanupExpiredSessions(): void {
  const now =
    Date.now();

  for (
    const [
      token,
      session,
    ] of authSessions
  ) {
    if (
      session.expiresAt <=
      now
    ) {
      authSessions.delete(
        token
      );
    }
  }
}

export function getActiveSessionCount(): number {
  cleanupExpiredSessions();

  return authSessions.size;
}
