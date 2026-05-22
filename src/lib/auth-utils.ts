import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export type AuthSession = {
  user: {
    id: string;
    name: string;
    phone: string;
    role: string;
  };
};

export function getRoleLabel(role: string): string {
  if (role === 'admin') return '管理员';
  return '';
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    return { session: null, error: NextResponse.json({ error: '未登录' }, { status: 401 }) };
  }
  return { session: session as unknown as AuthSession, error: null };
}

export async function requireAdmin() {
  const result = await requireAuth();
  if (result.error) return result;
  if (result.session.user.role !== 'admin') {
    return { session: null, error: NextResponse.json({ error: '无权操作' }, { status: 403 }) };
  }
  return result;
}

// 登录失败计数
const loginFailures = new Map<string, { count: number; lastAttempt: number }>();
const MAX_FAILURES = 5;
const LOCKOUT_MINUTES = 15;

export function checkLoginRateLimit(phone: string): { blocked: boolean; waitMinutes?: number } {
  const entry = loginFailures.get(phone);
  if (!entry) return { blocked: false };
  const elapsed = (Date.now() - entry.lastAttempt) / 60000;
  if (elapsed >= LOCKOUT_MINUTES) {
    loginFailures.delete(phone);
    return { blocked: false };
  }
  if (entry.count >= MAX_FAILURES) {
    return { blocked: true, waitMinutes: Math.ceil(LOCKOUT_MINUTES - elapsed) };
  }
  return { blocked: false };
}

export function recordLoginFailure(phone: string): void {
  const entry = loginFailures.get(phone);
  if (entry) {
    entry.count++;
    entry.lastAttempt = Date.now();
  } else {
    loginFailures.set(phone, { count: 1, lastAttempt: Date.now() });
  }
}

export function resetLoginFailures(phone: string): void {
  loginFailures.delete(phone);
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of loginFailures) {
    if ((now - val.lastAttempt) / 60000 >= LOCKOUT_MINUTES) {
      loginFailures.delete(key);
    }
  }
}, 60000);

export async function verifyPassword(phone: string, password: string) {
  const limit = checkLoginRateLimit(phone);
  if (limit.blocked) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, phone: true, name: true, role: true, hashedPassword: true, isActive: true },
  });
  if (!user || !user.hashedPassword || !user.isActive) {
    recordLoginFailure(phone);
    return null;
  }
  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) {
    recordLoginFailure(phone);
    return null;
  }
  resetLoginFailures(phone);
  return {
    id: user.id,
    name: user.name || user.phone,
    phone: user.phone,
    role: user.role,
  };
}
