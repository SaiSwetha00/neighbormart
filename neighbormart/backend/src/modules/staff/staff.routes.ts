import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireManager, requireStaff } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createShiftSchema,
  updateShiftSchema,
  clockInSchema,
  clockOutSchema,
  leaveRequestSchema,
  leaveStatusSchema,
} from './staff.schema';
import * as staffController from './staff.controller';

const router = Router();

// ── Shifts ────────────────────────────────────────────────────────────────────

// GET /shifts?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/shifts', authenticate, requireManager, staffController.getShifts);

router.post(
  '/shifts',
  authenticate,
  requireManager,
  validate(createShiftSchema),
  staffController.createShift
);

router.put(
  '/shifts/:id',
  authenticate,
  requireManager,
  validate(updateShiftSchema),
  staffController.updateShift
);

router.delete('/shifts/:id', authenticate, requireManager, staffController.deleteShift);

// ── Attendance ────────────────────────────────────────────────────────────────

router.post(
  '/attendance/clock-in',
  authenticate,
  requireStaff,
  validate(clockInSchema),
  staffController.clockIn
);

router.post(
  '/attendance/clock-out',
  authenticate,
  requireStaff,
  validate(clockOutSchema),
  staffController.clockOut
);

// GET /attendance/today — must be defined before /attendance/:staffId to avoid param capture
router.get('/attendance/today', authenticate, requireManager, staffController.getTodayAttendance);

// GET /attendance/:staffId?month=M&year=YYYY
router.get('/attendance/:staffId', authenticate, requireManager, staffController.getAttendance);

// ── Leave Requests ────────────────────────────────────────────────────────────

// GET /leave-requests?status=PENDING|APPROVED|REJECTED
router.get('/leave-requests', authenticate, requireManager, staffController.getLeaveRequests);

// POST /leave-requests — any authenticated staff member submits their own request
router.post(
  '/leave-requests',
  authenticate,
  validate(leaveRequestSchema),
  staffController.createLeaveRequest
);

// PATCH /leave-requests/:id/status — manager approves or rejects
router.patch(
  '/leave-requests/:id/status',
  authenticate,
  requireManager,
  validate(leaveStatusSchema),
  staffController.updateLeaveStatus
);

export default router;
