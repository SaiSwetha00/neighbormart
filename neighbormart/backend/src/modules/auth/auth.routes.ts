import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyMfaSchema,
  registerStoreSchema,
} from './auth.schema';
import * as authController from './auth.controller';

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────────

/**
 * POST /auth/register-store
 * Register a new store along with its owner account.
 */
router.post(
  '/register-store',
  validate(registerStoreSchema),
  authController.registerStore,
);

/**
 * POST /auth/login
 * Authenticate a user and issue access + refresh tokens via httpOnly cookies.
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * POST /auth/verify-mfa
 * Verify a TOTP / MFA one-time code (stub – full implementation pending).
 */
router.post('/verify-mfa', validate(verifyMfaSchema), authController.verifyMfa);

/**
 * POST /auth/refresh-token
 * Silently refresh an access token using the refresh token cookie.
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * POST /auth/forgot-password
 * Initiate the password-reset flow; sends a reset link to the user's email.
 */
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

/**
 * POST /auth/reset-password
 * Consume a password-reset token and set a new password.
 */
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  authController.resetPassword,
);

// ── Protected routes (require valid access token) ─────────────────────────────

/**
 * POST /auth/logout
 * Revoke the current session and clear auth cookies.
 */
router.post('/logout', authenticate, authController.logout);

/**
 * GET /auth/sessions
 * List all active sessions for the authenticated user.
 */
router.get('/sessions', authenticate, authController.getSessions);

/**
 * DELETE /auth/sessions/:id
 * Revoke a specific session by ID (the user can only revoke their own sessions).
 */
router.delete('/sessions/:id', authenticate, authController.deleteSession);

/**
 * GET /auth/login-history
 * Return the last 20 login events for the authenticated user.
 */
router.get('/login-history', authenticate, authController.getLoginHistory);

export default router;
