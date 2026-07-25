import { z } from 'zod';

const permissionsSchema = z.object({
  viewSales: z.boolean().optional(),
  manageInventory: z.boolean().optional(),
  manageProducts: z.boolean().optional(),
  manageStaff: z.boolean().optional(),
  viewReports: z.boolean().optional(),
  processReturns: z.boolean().optional(),
  viewCustomers: z.boolean().optional(),
  manageSuppliers: z.boolean().optional(),
});

export const createManagerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  permissions: permissionsSchema.optional(),
});

export const updateManagerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(6).optional(),
  permissions: permissionsSchema.optional(),
});

export const createStaffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  position: z.enum(['CASHIER', 'STOCK', 'SUPERVISOR', 'DELI', 'BAKER'], {
    errorMap: () => ({ message: 'Position must be one of CASHIER, STOCK, SUPERVISOR, DELI, BAKER' }),
  }),
  shiftType: z.enum(['MORNING', 'EVENING', 'FULL_DAY', 'SPLIT'], {
    errorMap: () => ({ message: 'Shift type must be one of MORNING, EVENING, FULL_DAY, SPLIT' }),
  }),
  dateJoined: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  notes: z.string().optional(),
});

export const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  position: z.enum(['CASHIER', 'STOCK', 'SUPERVISOR', 'DELI', 'BAKER']).optional(),
  shiftType: z.enum(['MORNING', 'EVENING', 'FULL_DAY', 'SPLIT']).optional(),
  dateJoined: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  notes: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export type CreateManagerInput = z.infer<typeof createManagerSchema>;
export type UpdateManagerInput = z.infer<typeof updateManagerSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
