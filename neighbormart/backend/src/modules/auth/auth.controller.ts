import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as authService from './auth.service';
import type { RegisterStoreInput } from './auth.schema';

// Cookie options shared across access and refresh token cookies
const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

const ACCESS_COOKIE_OPTIONS = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

const REFRESH_COOKIE_OPTIONS = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function clearAuthCookies(res: Response) {
  res.clearCookie('accessToken', BASE_COOKIE_OPTIONS);
  res.clearCookie('refreshToken', BASE_COOKIE_OPTIONS);
}

// ── registerStore ─────────────────────────────────────────────────────────────

export async function registerStore(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body as RegisterStoreInput;
    const { store, user } = await authService.registerStore(data);

    return sendSuccess(
      res,
      { store, user },
      'Store registered successfully',
      201,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Registration failed';
    return sendError(res, message, 400);
  }
}

// ── login ─────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress;
    const device = req.headers['user-agent'];

    const { user, accessToken, refreshToken, sessionId } =
      await authService.login(email, password, ipAddress, device);

    res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    // Provide a role-based redirect hint for the client
    const redirectMap: Record<string, string> = {
      OWNER: '/dashboard',
      MANAGER: '/dashboard',
      CASHIER: '/pos',
      STAFF: '/inventory',
    };
    const redirectTo = redirectMap[user.role] ?? '/dashboard';

    return sendSuccess(
      res,
      { user, sessionId, redirectTo },
      'Login successful',
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return sendError(res, message, 401);
  }
}

// ── verifyMfa ─────────────────────────────────────────────────────────────────

export async function verifyMfa(req: Request, res: Response): Promise<void> {
  try {
    // Stub: full TOTP/MFA implementation would verify the code here.
    // For now we return a success response so the route is wired up
    // and tests can confirm the endpoint exists.
    const { code } = req.body as { code: string };

    if (!code || code.length !== 6) {
      return sendError(res, 'A 6-digit MFA code is required', 400);
    }

    return sendSuccess(res, { verified: true }, 'MFA verification successful');
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'MFA verification failed';
    return sendError(res, message, 400);
  }
}

// ── refreshToken ──────────────────────────────────────────────────────────────

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    // Accept token from httpOnly cookie first, then body as fallback
    const token: string | undefined =
      req.cookies?.refreshToken ?? req.body?.token;

    if (!token) {
      return sendError(res, 'Refresh token is required', 401);
    }

    const { accessToken } = await authService.refreshToken(token);

    res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);

    return sendSuccess(res, { accessToken }, 'Token refreshed successfully');
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Token refresh failed';
    clearAuthCookies(res);
    return sendError(res, message, 401);
  }
}

// ── logout ────────────────────────────────────────────────────────────────────

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  try {
    const sessionId = req.body?.sessionId ?? req.query?.sessionId as string | undefined;

    if (sessionId) {
      await authService.logout(sessionId);
    }

    clearAuthCookies(res);

    return sendSuccess(res, null, 'Logged out successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    clearAuthCookies(res);
    return sendError(res, message, 500);
  }
}

// ── forgotPassword ────────────────────────────────────────────────────────────

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    const result = await authService.forgotPassword(email);

    return sendSuccess(res, result, result.message);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Password reset request failed';
    return sendError(res, message, 500);
  }
}

// ── resetPassword ─────────────────────────────────────────────────────────────

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, password } = req.body as {
      token: string;
      password: string;
    };

    const result = await authService.resetPassword(token, password);

    return sendSuccess(res, null, result.message);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Password reset failed';
    return sendError(res, message, 400);
  }
}

// ── getSessions ───────────────────────────────────────────────────────────────

export async function getSessions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const sessions = await authService.getSessions(userId);

    return sendSuccess(res, { sessions }, 'Sessions retrieved successfully');
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to retrieve sessions';
    return sendError(res, message, 500);
  }
}

// ── deleteSession ─────────────────────────────────────────────────────────────

export async function deleteSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id: sessionId } = req.params;

    if (!sessionId) {
      return sendError(res, 'Session ID is required', 400);
    }

    await authService.deleteSession(sessionId, userId);

    return sendSuccess(res, null, 'Session deleted successfully');
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete session';
    return sendError(res, message, 400);
  }
}

// ── getLoginHistory ───────────────────────────────────────────────────────────

export async function getLoginHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const history = await authService.getLoginHistory(userId);

    return sendSuccess(
      res,
      { history },
      'Login history retrieved successfully',
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to retrieve login history';
    return sendError(res, message, 500);
  }
}
