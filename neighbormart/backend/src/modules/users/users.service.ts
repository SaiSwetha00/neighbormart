import bcrypt from 'bcryptjs';
import prisma from '../../config/database';
import type { CreateManagerInput, UpdateManagerInput, CreateStaffInput, UpdateStaffInput, UpdateProfileInput } from './users.schema';

const USER_SELECT = { id: true, name: true, email: true, phone: true, status: true, photo: true, createdAt: true } as const;

// ── Managers ──────────────────────────────────────────────────────────────────

export async function getManagers(storeId: string, query: Record<string, string>) {
  const page = Math.max(1, parseInt(query.page ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { storeId };
  if (query.status) where.status = query.status;

  const userWhere: Record<string, unknown> = {};
  if (query.search) {
    userWhere.OR = [
      { name: { contains: query.search } },
      { email: { contains: query.search } },
    ];
  }

  const [managers, total] = await Promise.all([
    prisma.manager.findMany({
      where,
      skip,
      take: limit,
      include: { user: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.manager.count({ where }),
  ]);

  const filtered = query.search
    ? managers.filter((m) =>
        m.user.name.toLowerCase().includes(query.search!.toLowerCase()) ||
        m.user.email.toLowerCase().includes(query.search!.toLowerCase())
      )
    : managers;

  return { managers: filtered, total, page, limit };
}

export async function createManager(storeId: string, data: CreateManagerInput, createdByUserId: string) {
  const { name, email, phone, password, permissions } = data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('A user with this email already exists');

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, phone, password: hashedPassword, role: 'MANAGER', status: 'ACTIVE', storeId },
  });

  return prisma.manager.create({
    data: { userId: user.id, storeId, assignedBy: createdByUserId, permissions: permissions ?? {} },
    include: { user: { select: USER_SELECT } },
  });
}

export async function getManager(id: string) {
  const manager = await prisma.manager.findUnique({
    where: { id },
    include: { user: { select: { ...USER_SELECT, updatedAt: true } } },
  });
  if (!manager) throw new Error('Manager not found');
  return manager;
}

export async function updateManager(id: string, data: UpdateManagerInput) {
  const manager = await prisma.manager.findUnique({ where: { id }, include: { user: true } });
  if (!manager) throw new Error('Manager not found');

  const { name, email, phone, permissions } = data;

  if (email && email !== manager.user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error('Email already in use');
  }

  const [updatedManager] = await prisma.$transaction([
    prisma.manager.update({
      where: { id },
      data: {
        ...(permissions !== undefined && { permissions }),
        user: {
          update: {
            ...(name && { name }),
            ...(email && { email }),
            ...(phone !== undefined && { phone }),
          },
        },
      },
      include: { user: { select: USER_SELECT } },
    }),
  ]);

  return updatedManager;
}

export async function updateManagerStatus(id: string, status: string) {
  const manager = await prisma.manager.findUnique({ where: { id } });
  if (!manager) throw new Error('Manager not found');
  await prisma.user.update({ where: { id: manager.userId }, data: { status: status as any } });
  return getManager(id);
}

export async function updateManagerPermissions(id: string, permissions: Record<string, boolean>) {
  const manager = await prisma.manager.findUnique({ where: { id } });
  if (!manager) throw new Error('Manager not found');
  return prisma.manager.update({
    where: { id },
    data: { permissions },
    include: { user: { select: USER_SELECT } },
  });
}

export async function resetManagerPassword(id: string, newPassword: string) {
  const manager = await prisma.manager.findUnique({ where: { id } });
  if (!manager) throw new Error('Manager not found');
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: manager.userId }, data: { password: hashedPassword } });
  return { message: 'Password reset successfully' };
}

export async function deleteManager(id: string) {
  const manager = await prisma.manager.findUnique({ where: { id } });
  if (!manager) throw new Error('Manager not found');
  await prisma.$transaction([
    prisma.manager.delete({ where: { id } }),
    prisma.user.delete({ where: { id: manager.userId } }),
  ]);
  return { message: 'Manager deleted successfully' };
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export async function getStaff(storeId: string, query: Record<string, string>) {
  const page = Math.max(1, parseInt(query.page ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '50')));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { storeId };
  if (query.position) where.position = query.position;
  if (query.shiftType) where.shiftType = query.shiftType;
  if (query.status) where.status = query.status;

  const [staff, total] = await Promise.all([
    prisma.staff.findMany({
      where,
      skip,
      take: limit,
      include: { user: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.staff.count({ where }),
  ]);

  const filtered = query.search
    ? staff.filter((s) =>
        s.user.name.toLowerCase().includes(query.search!.toLowerCase()) ||
        s.user.email.toLowerCase().includes(query.search!.toLowerCase()) ||
        s.employeeId.toLowerCase().includes(query.search!.toLowerCase())
      )
    : staff;

  return { staff: filtered, total, page, limit };
}

export async function createStaff(storeId: string, data: CreateStaffInput, createdByUserId: string) {
  const { name, email, phone, position, shiftType, dateJoined, notes } = data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('A user with this email already exists');

  const staffCount = await prisma.staff.count({ where: { storeId } });
  const employeeId = `EMP-${String(staffCount + 1).padStart(3, '0')}`;
  const tempPassword = await bcrypt.hash('changeme123', 12);

  const user = await prisma.user.create({
    data: { name, email, phone, password: tempPassword, role: 'STAFF', status: 'ACTIVE', storeId },
  });

  return prisma.staff.create({
    data: {
      userId: user.id,
      storeId,
      employeeId,
      position,
      shiftType,
      dateJoined: dateJoined ? new Date(dateJoined) : new Date(),
      notes,
      createdBy: createdByUserId,
    },
    include: { user: { select: USER_SELECT } },
  });
}

export async function getStaffMember(id: string) {
  const staff = await prisma.staff.findUnique({
    where: { id },
    include: {
      user: { select: { ...USER_SELECT, updatedAt: true } },
      shifts: { orderBy: { date: 'desc' }, take: 10 },
      attendance: { orderBy: { date: 'desc' }, take: 30 },
    },
  });
  if (!staff) throw new Error('Staff member not found');

  const totalDays = staff.attendance.length;
  const presentDays = staff.attendance.filter((a) => a.status === 'ON_TIME' || a.status === 'LATE').length;
  const absentDays = staff.attendance.filter((a) => a.status === 'ABSENT').length;
  const lateDays = staff.attendance.filter((a) => a.status === 'LATE').length;

  return { ...staff, attendanceSummary: { totalDays, presentDays, absentDays, lateDays } };
}

export async function updateStaff(id: string, data: UpdateStaffInput) {
  const staff = await prisma.staff.findUnique({ where: { id }, include: { user: true } });
  if (!staff) throw new Error('Staff member not found');

  const { name, email, phone, position, shiftType, dateJoined, notes } = data;

  if (email && email !== staff.user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error('Email already in use');
  }

  const [updatedStaff] = await prisma.$transaction([
    prisma.staff.update({
      where: { id },
      data: {
        ...(position && { position }),
        ...(shiftType && { shiftType }),
        ...(dateJoined !== undefined && { dateJoined: new Date(dateJoined) }),
        ...(notes !== undefined && { notes }),
        user: {
          update: {
            ...(name && { name }),
            ...(email && { email }),
            ...(phone !== undefined && { phone }),
          },
        },
      },
      include: { user: { select: USER_SELECT } },
    }),
  ]);

  return updatedStaff;
}

export async function updateStaffStatus(id: string, status: string) {
  const staff = await prisma.staff.findUnique({ where: { id } });
  if (!staff) throw new Error('Staff member not found');
  await prisma.user.update({ where: { id: staff.userId }, data: { status: status as any } });
  return getStaffMember(id);
}

export async function deleteStaff(id: string) {
  const staff = await prisma.staff.findUnique({ where: { id } });
  if (!staff) throw new Error('Staff member not found');
  await prisma.user.update({ where: { id: staff.userId }, data: { status: 'TERMINATED' } });
  return { message: 'Staff member marked as terminated' };
}

export async function getNextEmployeeId(storeId: string) {
  const count = await prisma.staff.count({ where: { storeId } });
  return { employeeId: `EMP-${String(count + 1).padStart(3, '0')}` };
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, role: true, status: true, photo: true, storeId: true, createdAt: true, updatedAt: true },
  });
  if (!user) throw new Error('User not found');
  return user;
}

export async function updateProfile(userId: string, data: UpdateProfileInput) {
  const { name, phone, email } = data;
  if (email) {
    const existing = await prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
    if (existing) throw new Error('Email already in use');
  }
  return prisma.user.update({
    where: { id: userId },
    data: { ...(name && { name }), ...(phone !== undefined && { phone }), ...(email && { email }) },
    select: { id: true, name: true, email: true, phone: true, role: true, status: true, photo: true, updatedAt: true },
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) throw new Error('Current password is incorrect');
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
  return { message: 'Password changed successfully' };
}

export async function uploadPhoto(userId: string, photo: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { photo },
    select: { id: true, name: true, email: true, photo: true },
  });
}
