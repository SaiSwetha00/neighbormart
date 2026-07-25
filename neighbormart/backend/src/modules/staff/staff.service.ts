import prisma from '../../config/database';
import type { CreateShiftInput, UpdateShiftInput, LeaveRequestInput } from './staff.schema';

// ── Shifts ────────────────────────────────────────────────────────────────────

export async function getShifts(storeId: string, startDate: string, endDate: string) {
  return prisma.shift.findMany({
    where: { storeId, date: { gte: new Date(startDate), lte: new Date(endDate) } },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    include: {
      staff: {
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      },
    },
  });
}

export async function createShift(storeId: string, data: CreateShiftInput, userId: string) {
  const staff = await prisma.staff.findFirst({ where: { id: data.staffId, storeId } });
  if (!staff) throw new Error('Staff member not found in this store');

  const existing = await prisma.shift.findFirst({
    where: {
      staffId: data.staffId,
      date: new Date(data.date),
      OR: [
        { startTime: { lte: data.startTime }, endTime: { gte: data.startTime } },
        { startTime: { lte: data.endTime }, endTime: { gte: data.endTime } },
        { startTime: { gte: data.startTime }, endTime: { lte: data.endTime } },
      ],
    },
  });
  if (existing) throw new Error('Staff member already has an overlapping shift on this date');

  return prisma.shift.create({
    data: {
      storeId,
      staffId: data.staffId,
      date: new Date(data.date),
      shiftType: data.shiftType,
      startTime: data.startTime,
      endTime: data.endTime,
      createdBy: userId,
    },
    include: {
      staff: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
}

export async function updateShift(id: string, data: UpdateShiftInput) {
  const shift = await prisma.shift.findUnique({ where: { id } });
  if (!shift) throw new Error('Shift not found');

  return prisma.shift.update({
    where: { id },
    data: { ...data, date: data.date ? new Date(data.date) : undefined },
    include: { staff: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
}

export async function deleteShift(id: string) {
  const shift = await prisma.shift.findUnique({ where: { id } });
  if (!shift) throw new Error('Shift not found');
  return prisma.shift.delete({ where: { id } });
}

// ── Attendance ────────────────────────────────────────────────────────────────

export async function clockIn(staffId: string, shiftId?: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const open = await prisma.attendance.findFirst({
    where: { staffId, date: { gte: today, lt: tomorrow }, clockOut: null },
  });
  if (open) throw new Error('Staff member is already clocked in. Please clock out first.');

  let status: 'ON_TIME' | 'LATE' = 'ON_TIME';
  let resolvedShiftId = shiftId;

  if (shiftId) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (shift) {
      const now = new Date();
      const [h, m] = shift.startTime.split(':').map(Number);
      const shiftStart = new Date(now);
      shiftStart.setHours(h, m, 0, 0);
      status = (now.getTime() - shiftStart.getTime()) / 60000 > 15 ? 'LATE' : 'ON_TIME';
    }
  } else {
    const todayShift = await prisma.shift.findFirst({
      where: { staffId, date: { gte: today, lt: tomorrow } },
    });
    if (todayShift) {
      resolvedShiftId = todayShift.id;
      const now = new Date();
      const [h, m] = todayShift.startTime.split(':').map(Number);
      const shiftStart = new Date(now);
      shiftStart.setHours(h, m, 0, 0);
      status = (now.getTime() - shiftStart.getTime()) / 60000 > 15 ? 'LATE' : 'ON_TIME';
    }
  }

  return prisma.attendance.create({
    data: {
      staffId,
      shiftId: resolvedShiftId ?? null,
      clockIn: new Date(),
      date: new Date(),
      status,
    },
    include: { shift: { select: { id: true, shiftType: true, startTime: true, endTime: true } } },
  });
}

export async function clockOut(staffId: string, attendanceId: string) {
  const attendance = await prisma.attendance.findUnique({ where: { id: attendanceId } });
  if (!attendance) throw new Error('Attendance record not found');
  if (attendance.staffId !== staffId) throw new Error('Attendance record does not belong to this staff member');
  if (attendance.clockOut) throw new Error('Staff member has already clocked out');

  return prisma.attendance.update({
    where: { id: attendanceId },
    data: { clockOut: new Date() },
  });
}

export async function getAttendance(staffId: string, month?: number, year?: number) {
  const where: Record<string, unknown> = { staffId };
  if (month !== undefined && year !== undefined) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }

  return prisma.attendance.findMany({
    where,
    orderBy: { date: 'desc' },
    include: {
      shift: { select: { id: true, shiftType: true, startTime: true, endTime: true, date: true } },
    },
  });
}

export async function getTodayAttendance(storeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.attendance.findMany({
    where: { date: { gte: today, lt: tomorrow }, staff: { storeId } },
    include: {
      staff: { include: { user: { select: { id: true, name: true, email: true } } } },
      shift: { select: { id: true, shiftType: true, startTime: true, endTime: true } },
    },
    orderBy: { clockIn: 'asc' },
  });
}

// ── Leave Requests ────────────────────────────────────────────────────────────

export async function getLeaveRequests(storeId: string, status?: string) {
  const where: Record<string, unknown> = { staff: { storeId } };
  if (status) where.status = status;

  return prisma.leaveRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      staff: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
}

export async function createLeaveRequest(staffId: string, storeId: string, data: LeaveRequestInput) {
  const staff = await prisma.staff.findFirst({ where: { id: staffId, storeId } });
  if (!staff) throw new Error('Staff member not found in this store');

  const dateFrom = new Date(data.dateFrom);
  const dateTo = new Date(data.dateTo);
  if (dateFrom > dateTo) throw new Error('Start date must be before or equal to end date');

  const overlap = await prisma.leaveRequest.findFirst({
    where: { staffId, status: 'APPROVED', OR: [{ dateFrom: { lte: dateTo }, dateTo: { gte: dateFrom } }] },
  });
  if (overlap) throw new Error('There is an existing approved leave request for this period');

  return prisma.leaveRequest.create({
    data: { staffId, storeId, dateFrom, dateTo, reason: data.reason, status: 'PENDING' },
  });
}

export async function updateLeaveStatus(id: string, status: 'APPROVED' | 'REJECTED', approvedByUserId: string) {
  const leave = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!leave) throw new Error('Leave request not found');
  if (leave.status !== 'PENDING') throw new Error('Only pending leave requests can be updated');

  if (status === 'APPROVED') {
    const conflicts = await prisma.shift.findMany({
      where: { staffId: leave.staffId, date: { gte: leave.dateFrom, lte: leave.dateTo } },
      select: { id: true, date: true, shiftType: true },
    });

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status, approvedBy: approvedByUserId },
      include: { staff: { include: { user: { select: { id: true, name: true } } } } },
    });
    return { ...updated, scheduleConflicts: conflicts };
  }

  return prisma.leaveRequest.update({
    where: { id },
    data: { status, approvedBy: approvedByUserId },
    include: { staff: { include: { user: { select: { id: true, name: true } } } } },
  });
}
