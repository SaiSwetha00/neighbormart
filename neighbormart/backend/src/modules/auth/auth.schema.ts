import { z } from 'zod';

export const registerStoreSchema = z.object({
  store: z.object({
    name: z.string().min(1, 'Store name is required').max(255),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    country: z.string().min(1, 'Country is required').max(100),
    currency: z.string().min(1, 'Currency is required').max(10),
    timezone: z.string().min(1, 'Timezone is required').max(100),
  }),
  owner: z.object({
    name: z.string().min(1, 'Owner name is required').max(255),
    email: z.string().email('Invalid email address'),
    phone: z.string().max(20).optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      ),
  }),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    ),
});

export const verifyMfaSchema = z.object({
  code: z
    .string()
    .length(6, 'MFA code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'MFA code must contain only digits'),
});

export const refreshTokenSchema = z
  .object({
    token: z.string().optional(),
  })
  .optional();

export type RegisterStoreInput = z.infer<typeof registerStoreSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyMfaInput = z.infer<typeof verifyMfaSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
