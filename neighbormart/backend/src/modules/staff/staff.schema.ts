import { z } from 'zod';

// ── Shifts ────────────────────────────────────────────────────────────────────

export const createShiftSchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required'),
  date: z.string().min(1, 'Date is required'),
  shiftType: z.enum(['MORNING', 'EVENING', 'FULL_DAY', 'SPLIT'], {
    errorMap: () => ({ message: "Shift type must be one of: MORNING, EVENING, FULL_DAY, SPLIT" }),
  }),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
});

export const updateShiftSchema = createShiftSchema.partial();

// ── Attendance ────────────────────────────────────────────────────────────────

export const clockInSchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required'),
  shiftId: z.string().optional(),
});

export const clockOutSchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required'),
  attendanceId: z.string().min(1, 'Attendance ID is required'),
});

// ── Leave Requests ────────────────────────────────────────────────────────────

export const leaveRequestSchema = z.object({
  dateFrom: z.string().min(1, 'Start date is required'),
  dateTo: z.string().min(1, 'End date is required'),
  reason: z.string().optional(),
});

export const leaveStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: "Status must be APPROVED or REJECTED" }),
  }),
  note: z.string().optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
export type LeaveStatusInput = z.infer<typeof leaveStatusSchema>;
