import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../../config/database';
import config from '../../config';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import type { RegisterStoreInput } from './auth.schema';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;
const RESET_TOKEN_EXPIRY_MINUTES = 60;
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── registerStore ────────────────────────────────────────────────────────────

export async function registerStore(data: RegisterStoreInput) {
  const { store: storeData, owner: ownerData } = data;

  const existingUser = await prisma.user.findUnique({
    where: { email: ownerData.email },
  });

  if (existingUser) {
    throw new Error('A user with this email address already exists');
  }

  const hashedPassword = await bcrypt.hash(ownerData.password, config.bcrypt.rounds);

  const result = await prisma.$transaction(async (tx) => {
    const store = await tx.store.create({
      data: {
        name: storeData.name,
        address: storeData.address,
        city: storeData.city,
        country: storeData.country,
        currency: storeData.currency,
        timezone: storeData.timezone,
      },
    });

    const user = await tx.user.create({
      data: {
        name: ownerData.name,
        email: ownerData.email,
        phone: ownerData.phone,
        password: hashedPassword,
        role: 'OWNER',
        storeId: store.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        storeId: true,
        createdAt: true,
      },
    });

    return { store, user };
  });

  return result;
}

// ── login ────────────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
  ipAddress?: string,
  device?: string,
) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { store: true },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new Error(`Account is locked. Try again in ${minutesLeft} minute(s).`);
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    const newFailedCount = (user.failedLogins ?? 0) + 1;
    const shouldLock = newFailedCount >= MAX_FAILED_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: newFailedCount,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
          : undefined,
      },
    });

    if (shouldLock) {
      throw new Error(`Too many failed attempts. Account locked for ${LOCK_DURATION_MINUTES} minutes.`);
    }

    const remaining = MAX_FAILED_ATTEMPTS - newFailedCount;
    throw new Error(`Invalid email or password. ${remaining} attempt(s) remaining before lockout.`);
  }

  // Reset failed attempts on successful login
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null },
  });

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    storeId: user.storeId,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Create session
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token: refreshToken,
      ipAddress: ipAddress ?? null,
      device: device ?? null,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    },
  });

  // Record login history
  await prisma.loginHistory.create({
    data: {
      userId: user.id,
      ipAddress: ipAddress ?? null,
      device: device ?? null,
      status: 'SUCCESS',
    },
  });

  const { password: _pwd, failedLogins: _fa, lockedUntil: _lu, ...safeUser } = user;

  return { user: safeUser, accessToken, refreshToken, sessionId: session.id };
}

// ── refreshToken ─────────────────────────────────────────────────────────────

export async function refreshToken(token: string) {
  let payload: ReturnType<typeof verifyRefreshToken>;

  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new Error('Invalid or expired refresh token');
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) {
    throw new Error('Session not found or has been revoked');
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    throw new Error('Session has expired, please log in again');
  }

  const newPayload = {
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
    storeId: session.user.storeId,
  };

  const newAccessToken = generateAccessToken(newPayload);

  return { accessToken: newAccessToken };
}

// ── logout ───────────────────────────────────────────────────────────────────

export async function logout(sessionId: string) {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

// ── forgotPassword ────────────────────────────────────────────────────────────

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      token: resetToken,
      expiresAt,
    },
  });

  return {
    message: 'If that email exists, a reset link has been sent.',
    resetToken,
  };
}

// ── resetPassword ─────────────────────────────────────────────────────────────

export async function resetPassword(token: string, newPassword: string) {
  const session = await prisma.session.findUnique({ where: { token } });

  if (!session) {
    throw new Error('Invalid or expired password reset token');
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    throw new Error('Password reset token has expired');
  }

  const hashedPassword = await bcrypt.hash(newPassword, config.bcrypt.rounds);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: { password: hashedPassword, failedLogins: 0, lockedUntil: null },
    }),
    prisma.session.deleteMany({ where: { userId: session.userId } }),
  ]);

  return { message: 'Password has been reset successfully' };
}

// ── getSessions ───────────────────────────────────────────────────────────────

export async function getSessions(userId: string) {
  const sessions = await prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    select: { id: true, ipAddress: true, device: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return sessions;
}

// ── deleteSession ─────────────────────────────────────────────────────────────

export async function deleteSession(sessionId: string, userId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });

  if (!session || session.userId !== userId) {
    throw new Error('Session not found');
  }

  await prisma.session.delete({ where: { id: sessionId } });
}

// ── getLoginHistory ───────────────────────────────────────────────────────────

export async function getLoginHistory(userId: string) {
  const history = await prisma.loginHistory.findMany({
    where: { userId },
    select: { id: true, ipAddress: true, device: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return history;
}
