import { Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as staffService from './staff.service';

// ── Shifts ────────────────────────────────────────────────────────────────────

export async function getShifts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    if (!startDate || !endDate) {
      return sendError(res, 'startDate and endDate query parameters are required', 400);
    }

    const shifts = await staffService.getShifts(storeId, startDate, endDate);
    return sendSuccess(res, shifts, 'Shifts retrieved successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve shifts';
    return sendError(res, message, 500);
  }
}

export async function createShift(req: AuthRequest, res: Response): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const userId = req.user!.userId;
    const shift = await staffService.createShift(storeId, req.body, userId);
    return sendSuccess(res, shift, 'Shift created successfully', 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create shift';
    const statusCode = message.includes('not found') ? 404 : 400;
    return sendError(res, message, statusCode);
  }
}

export async function updateShift(req: AuthRequest, res: Response): Promise<void> {
  try {
    const shift = await staffService.updateShift(req.params.id, req.body);
    return sendSuccess(res, shift, 'Shift updated successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update shift';
    const statusCode = message === 'Shift not found' ? 404 : 400;
    return sendError(res, message, statusCode);
  }
}

export async function deleteShift(req: AuthRequest, res: Response): Promise<void> {
  try {
    await staffService.deleteShift(req.params.id);
    return sendSuccess(res, null, 'Shift deleted successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete shift';
    const statusCode = message === 'Shift not found' ? 404 : 500;
    return sendError(res, message, statusCode);
  }
}

// ── Attendance ────────────────────────────────────────────────────────────────

export async function clockIn(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { staffId, shiftId } = req.body as { staffId: string; shiftId?: string };
    const attendance = await staffService.clockIn(staffId, shiftId);
    return sendSuccess(res, attendance, 'Clocked in successfully', 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to clock in';
    return sendError(res, message, 400);
  }
}

export async function clockOut(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { staffId, attendanceId } = req.body as { staffId: string; attendanceId: string };
    const attendance = await staffService.clockOut(staffId, attendanceId);
    return sendSuccess(res, attendance, 'Clocked out successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to clock out';
    const statusCode = message === 'Attendance record not found' ? 404 : 400;
    return sendError(res, message, statusCode);
  }
}

export async function getAttendance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { staffId } = req.params;
    const { month, year } = req.query as { month?: string; year?: string };

    const attendance = await staffService.getAttendance(
      staffId,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined
    );
    return sendSuccess(res, attendance, 'Attendance retrieved successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve attendance';
    return sendError(res, message, 500);
  }
}

export async function getTodayAttendance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const attendance = await staffService.getTodayAttendance(storeId);
    return sendSuccess(res, attendance, "Today's attendance retrieved successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to retrieve today's attendance";
    return sendError(res, message, 500);
  }
}

// ── Leave Requests ────────────────────────────────────────────────────────────

export async function getLeaveRequests(req: AuthRequest, res: Response): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const { status } = req.query as { status?: string };
    const requests = await staffService.getLeaveRequests(storeId, status);
    return sendSuccess(res, requests, 'Leave requests retrieved successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve leave requests';
    return sendError(res, message, 500);
  }
}

export async function createLeaveRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const userId = req.user!.userId;

    // Staff can only create leave requests for themselves
    // Manager/owner can supply a staffId in body; staff uses their own
    const staffRecord = await import('../../config/database').then((m) =>
      m.default.staff.findFirst({ where: { userId, storeId } })
    );
    if (!staffRecord) {
      return sendError(res, 'No staff profile found for this user', 404);
    }

    const request = await staffService.createLeaveRequest(staffRecord.id, storeId, req.body);
    return sendSuccess(res, request, 'Leave request submitted successfully', 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create leave request';
    const statusCode = message.includes('not found') ? 404 : 400;
    return sendError(res, message, statusCode);
  }
}

export async function updateLeaveStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const approvedById = req.user!.userId;
    const { status } = req.body as { status: 'APPROVED' | 'REJECTED' };
    const result = await staffService.updateLeaveStatus(req.params.id, status, approvedById);
    return sendSuccess(res, result, `Leave request ${status.toLowerCase()} successfully`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update leave status';
    const statusCode = message === 'Leave request not found' ? 404 : 400;
    return sendError(res, message, statusCode);
  }
}
