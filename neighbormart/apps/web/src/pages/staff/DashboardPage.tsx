import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  RefreshCw,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/format';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/services/api';
import type { LeaveStatus, ShiftType } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffProfileResponse {
  id: string;
  userId: string;
  position: string;
  shiftType: string;
  employeeId: string;
  user: { id: string; name: string; photo?: string };
}

interface ShiftRecord {
  id: string;
  date: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  status: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  clockIn?: string | null;
  clockOut?: string | null;
  status: string;
  shiftId?: string | null;
}

interface LeaveRecord {
  id: string;
  dateFrom: string;
  dateTo: string;
  reason?: string;
  status: LeaveStatus;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLong() {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

function formatTime(dt?: string | Date | null): string {
  if (!dt) return '—';
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(dt));
}

function calcHours(clockIn?: string | null, clockOut?: string | null): string {
  if (!clockIn || !clockOut) return '—';
  const diff = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  if (diff < 0) return '—';
  return `${(diff / (1000 * 60 * 60)).toFixed(1)}h`;
}

function shiftTypeLabel(type: string): string {
  const map: Record<string, string> = {
    MORNING: 'Morning', EVENING: 'Evening', FULL_DAY: 'Full Day', SPLIT: 'Split',
  };
  return map[type] ?? type.replace('_', ' ');
}

function shiftTypeStyle(type: string): string {
  const map: Record<string, string> = {
    MORNING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    EVENING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    FULL_DAY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    SPLIT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };
  return map[type] ?? 'bg-muted text-muted-foreground';
}

function attendanceStatusStyle(status: string): string {
  const map: Record<string, string> = {
    ON_TIME: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    LATE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    ABSENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return map[status] ?? 'bg-muted text-muted-foreground';
}

function leaveVariant(status: LeaveStatus): 'success' | 'warning' | 'error' | 'secondary' {
  const map = { APPROVED: 'success', PENDING: 'warning', REJECTED: 'error' } as const;
  return map[status] ?? 'secondary';
}

function workingDaysSoFarThisMonth(): number {
  const now = new Date();
  let count = 0;
  for (let d = 1; d <= now.getDate(); d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

function isWithin30MinOfStart(startTime: string, shiftDate: string): boolean {
  const [h, m] = startTime.split(':').map(Number);
  const start = new Date(shiftDate);
  start.setHours(h, m, 0, 0);
  const diffMin = (start.getTime() - Date.now()) / 60000;
  return diffMin >= -60 && diffMin <= 30; // 60 min after start, 30 min before
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StaffDashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ dateFrom: '', dateTo: '', reason: '' });
  const [activeAttendanceId, setActiveAttendanceId] = useState<string | null>(null);
  const [clockMessage, setClockMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const showMsg = (text: string, ok: boolean) => {
    setClockMessage({ text, ok });
    setTimeout(() => setClockMessage(null), 3500);
  };

  // ── Staff profile ─────────────────────────────────────────────────────────
  const { data: staffProfile, isLoading: profileLoading, isError: profileError } =
    useQuery<StaffProfileResponse>({
      queryKey: ['my-staff-profile'],
      queryFn: () => api.get('/profile').then((r) => r.data?.data ?? r.data),
      staleTime: 60_000,
    });

  const staffId: string | undefined = staffProfile?.id ?? staffProfile?.user?.id;

  // ── Today's shift ─────────────────────────────────────────────────────────
  const { data: todayShift } = useQuery<ShiftRecord | null>({
    queryKey: ['my-today-shift', staffId],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const res = await api.get('/shifts', { params: { startDate: today, endDate: today } });
      const shifts: ShiftRecord[] = res.data?.data ?? res.data ?? [];
      return shifts.find((s: { staffId?: string; staff?: { userId?: string } }) =>
        s.staffId === staffId || s.staff?.userId === user?.id
      ) ?? null;
    },
    enabled: !!staffId || !!user?.id,
    staleTime: 60_000,
  });

  // ── Next upcoming shift ───────────────────────────────────────────────────
  const { data: nextShift } = useQuery<ShiftRecord | null>({
    queryKey: ['my-next-shift', staffId],
    queryFn: async () => {
      const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
      const weekLater = format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd');
      const res = await api.get('/shifts', { params: { startDate: tomorrow, endDate: weekLater } });
      const shifts: ShiftRecord[] = res.data?.data ?? res.data ?? [];
      const mine = shifts.filter((s: { staffId?: string; staff?: { userId?: string } }) =>
        s.staffId === staffId || s.staff?.userId === user?.id
      );
      return mine[0] ?? null;
    },
    enabled: !!staffId || !!user?.id,
    staleTime: 60_000,
  });

  // ── Today's attendance ────────────────────────────────────────────────────
  const { data: todayAttendance } = useQuery<AttendanceRecord | null>({
    queryKey: ['my-today-attendance', staffId],
    queryFn: async () => {
      if (!staffId) return null;
      const today = format(new Date(), 'yyyy-MM-dd');
      const res = await api.get(`/attendance/${staffId}`, { params: { date: today } });
      const records: AttendanceRecord[] = res.data?.data ?? res.data ?? [];
      const rec = Array.isArray(records) ? records[0] ?? null : records;
      if (rec?.id && !rec?.clockOut) setActiveAttendanceId(rec.id);
      return rec;
    },
    enabled: !!staffId,
    staleTime: 30_000,
  });

  // ── Recent attendance ─────────────────────────────────────────────────────
  const { data: attendanceList, isLoading: attLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['my-attendance', staffId],
    queryFn: async () => {
      if (!staffId) return [];
      const res = await api.get(`/attendance/${staffId}`);
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    },
    enabled: !!staffId,
    staleTime: 60_000,
  });

  // ── Leave requests ────────────────────────────────────────────────────────
  const { data: leaveList, isLoading: leaveLoading } = useQuery<LeaveRecord[]>({
    queryKey: ['my-leaves'],
    queryFn: async () => {
      const res = await api.get('/leave-requests');
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    },
    staleTime: 60_000,
  });

  // ── Clock In ──────────────────────────────────────────────────────────────
  const clockInMutation = useMutation({
    mutationFn: () =>
      api.post('/attendance/clock-in', { staffId, shiftId: todayShift?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-today-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      showMsg('Clocked in successfully!', true);
    },
    onError: () => showMsg('Failed to clock in. Please try again.', false),
  });

  // ── Clock Out ─────────────────────────────────────────────────────────────
  const clockOutMutation = useMutation({
    mutationFn: () =>
      api.post('/attendance/clock-out', { staffId, attendanceId: activeAttendanceId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-today-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      setActiveAttendanceId(null);
      showMsg('Clocked out successfully. Great work today!', true);
    },
    onError: () => showMsg('Failed to clock out. Please try again.', false),
  });

  // ── Request Leave ─────────────────────────────────────────────────────────
  const requestLeaveMutation = useMutation({
    mutationFn: () =>
      api.post('/leave-requests', { ...leaveForm, staffId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      setShowLeaveDialog(false);
      setLeaveForm({ dateFrom: '', dateTo: '', reason: '' });
    },
    onError: () => {
      // error message shown inline
    },
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const records = (attendanceList ?? []).slice(0, 10);
  const leaves = leaveList ?? [];
  const approvedLeaves = leaves.filter((l) => l.status === 'APPROVED').length;
  const totalLeaveAllowed = 15;

  // Month attendance summary
  const thisMonthRecords = (attendanceList ?? []).filter((a) => {
    const d = new Date(a.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const presentDays = thisMonthRecords.filter((a) => a.status !== 'ABSENT').length;
  const totalWorkingDays = workingDaysSoFarThisMonth();
  const attendancePct = totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 0;

  const isClockedIn =
    !!(activeAttendanceId || (todayAttendance?.id && !todayAttendance?.clockOut));
  const hasClockedOut = !!todayAttendance?.clockOut;
  const canClockIn =
    !isClockedIn &&
    !todayAttendance?.clockIn &&
    !!todayShift &&
    isWithin30MinOfStart(todayShift.startTime, todayShift.date);

  const isLoading = profileLoading;

  // ── Error state ───────────────────────────────────────────────────────────
  if (profileError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Failed to load your dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">Could not load your staff profile.</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['my-staff-profile'] })}
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-h-screen bg-background p-4 sm:p-6 lg:p-8 transition-opacity duration-500',
        mounted ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div className="mx-auto max-w-[1200px] space-y-6">

        {/* ── 1. HEADER ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            {isLoading ? (
              <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            ) : (
              <Avatar className="h-12 w-12 flex-shrink-0 border-2 border-[#1B4332]">
                {user?.photo && <AvatarImage src={user.photo} alt={user.name} />}
                <AvatarFallback className="bg-[#1B4332] text-white font-semibold">
                  {getInitials(user?.name ?? 'S')}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              {isLoading ? (
                <div className="space-y-1.5">
                  <Skeleton className="h-6 w-52" />
                  <Skeleton className="h-4 w-36" />
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                    Welcome back, {user?.name?.split(' ')[0] ?? 'there'}! 👋
                  </h1>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <p className="text-sm text-muted-foreground">{todayLong()}</p>
                    {todayShift && (
                      <>
                        <span className="text-muted-foreground text-xs">&middot;</span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                            shiftTypeStyle(todayShift.shiftType)
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          {shiftTypeLabel(todayShift.shiftType)} · {todayShift.startTime}–{todayShift.endTime}
                        </span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 self-start"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['my-staff-profile'] });
              queryClient.invalidateQueries({ queryKey: ['my-today-attendance'] });
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* ── 2. TOP ROW — 3 Info Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-32" />
                  <Skeleton className="h-3 w-40" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              {/* My Next Shift */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        My Next Shift
                      </p>
                      {nextShift ? (
                        <div className="mt-1.5">
                          <p className="text-lg font-bold text-foreground leading-tight">
                            {new Intl.DateTimeFormat('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            }).format(new Date(nextShift.date))}
                          </p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {shiftTypeLabel(nextShift.shiftType)} · {nextShift.startTime}–{nextShift.endTime}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-1.5">
                          <p className="text-base font-semibold text-muted-foreground">No upcoming shift</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Contact your manager</p>
                        </div>
                      )}
                    </div>
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* This Month Attendance */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        This Month Attendance
                      </p>
                      <p className="mt-1.5 text-2xl font-bold text-foreground leading-none">
                        {attendancePct}%
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {presentDays} / {totalWorkingDays} working days
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-700',
                            attendancePct >= 90
                              ? 'bg-green-500'
                              : attendancePct >= 70
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          )}
                          style={{ width: `${attendancePct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-600">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leave Balance */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Leave Balance
                      </p>
                      <div className="mt-1.5 flex items-baseline gap-1">
                        <p className="text-2xl font-bold text-foreground leading-none">{approvedLeaves}</p>
                        <p className="text-base text-muted-foreground">/ {totalLeaveAllowed} days</p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {totalLeaveAllowed - approvedLeaves} days remaining
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-purple-500 transition-all duration-700"
                          style={{
                            width: `${Math.min(100, (approvedLeaves / totalLeaveAllowed) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-600">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* ── 3. TODAY'S SCHEDULE CARD ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-10 w-28 rounded-lg flex-shrink-0" />
              </div>
            ) : todayShift ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {/* Shift type badge block */}
                  <div
                    className={cn(
                      'flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-xl gap-0.5',
                      shiftTypeStyle(todayShift.shiftType)
                    )}
                  >
                    <Clock className="h-5 w-5" />
                    <span className="text-[9px] font-bold leading-none tracking-wide uppercase">
                      {shiftTypeLabel(todayShift.shiftType)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">
                      {todayShift.startTime} – {todayShift.endTime}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {shiftTypeLabel(todayShift.shiftType)} shift
                      {staffProfile?.position ? ` · ${staffProfile.position.replace('_', ' ')}` : ''}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      {todayAttendance?.clockIn && (
                        <span className="text-green-600 dark:text-green-400">
                          Clocked in: {formatTime(todayAttendance.clockIn)}
                        </span>
                      )}
                      {todayAttendance?.clockOut && (
                        <span className="text-muted-foreground">
                          · Clocked out: {formatTime(todayAttendance.clockOut)}
                          · Hours: {calcHours(todayAttendance.clockIn, todayAttendance.clockOut)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Clock Actions */}
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  {clockMessage && (
                    <p
                      className={cn(
                        'text-sm font-medium',
                        clockMessage.ok
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-500 dark:text-red-400'
                      )}
                    >
                      {clockMessage.text}
                    </p>
                  )}

                  {hasClockedOut ? (
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 dark:bg-green-900/20">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        Shift complete · {calcHours(todayAttendance?.clockIn, todayAttendance?.clockOut)}
                      </span>
                    </div>
                  ) : isClockedIn ? (
                    <Button
                      onClick={() => clockOutMutation.mutate()}
                      disabled={clockOutMutation.isPending}
                      className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                    >
                      {clockOutMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                      Clock Out
                    </Button>
                  ) : canClockIn ? (
                    <Button
                      onClick={() => clockInMutation.mutate()}
                      disabled={clockInMutation.isPending}
                      className="gap-2 bg-[#1B4332] hover:bg-[#2D6A4F] text-white"
                    >
                      {clockInMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogIn className="h-4 w-4" />
                      )}
                      Clock In
                    </Button>
                  ) : !todayAttendance?.clockIn ? (
                    <p className="text-xs italic text-muted-foreground">
                      Clock-in opens 30 minutes before your shift starts
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Calendar className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">No shift today</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    You don&apos;t have a shift scheduled for today. Enjoy your time off!
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 4. BOTTOM ROW ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* My Recent Attendance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">My Recent Attendance</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 overflow-x-auto">
              {attLoading ? (
                <div className="space-y-3 min-w-[340px]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-4 w-20 flex-shrink-0" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-14 ml-auto" />
                    </div>
                  ))}
                </div>
              ) : records.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No attendance records yet.</p>
                </div>
              ) : (
                <table className="w-full min-w-[340px] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Date', 'Clock In', 'Clock Out', 'Hours', 'Status'].map((h, i) => (
                        <th
                          key={h}
                          className={cn(
                            'pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground',
                            i === 4 ? 'text-right' : 'text-left'
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {records.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 text-xs text-foreground">
                          {new Intl.DateTimeFormat('en-US', {
                            month: 'short',
                            day: 'numeric',
                          }).format(new Date(row.date))}
                        </td>
                        <td className="py-2.5 text-xs text-foreground">{formatTime(row.clockIn)}</td>
                        <td className="py-2.5 text-xs text-foreground">{formatTime(row.clockOut)}</td>
                        <td className="py-2.5 text-xs text-muted-foreground">
                          {calcHours(row.clockIn, row.clockOut)}
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                              attendanceStatusStyle(row.status)
                            )}
                          >
                            {row.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* My Leave Requests */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">My Leave Requests</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  onClick={() => setShowLeaveDialog(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Request Leave
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {leaveLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-5 w-20 rounded-full flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : leaves.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">No leave requests</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      You haven&apos;t submitted any leave requests yet.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 mt-1"
                    onClick={() => setShowLeaveDialog(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Request Leave
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {leaves.slice(0, 8).map((req) => (
                    <div
                      key={req.id}
                      className="flex items-start justify-between gap-3 py-2.5 first:pt-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
                            new Date(req.dateFrom)
                          )}
                          {req.dateFrom !== req.dateTo && (
                            <>
                              {' '}–{' '}
                              {new Intl.DateTimeFormat('en-US', {
                                month: 'short',
                                day: 'numeric',
                              }).format(new Date(req.dateTo))}
                            </>
                          )}
                        </p>
                        {req.reason && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            {req.reason}
                          </p>
                        )}
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          Submitted{' '}
                          {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
                            new Date(req.createdAt)
                          )}
                        </p>
                      </div>
                      <Badge
                        variant={leaveVariant(req.status)}
                        className="flex-shrink-0 mt-0.5 capitalize text-[10px]"
                      >
                        {req.status}
                      </Badge>
                    </div>
                  ))}
                  {leaves.length > 8 && (
                    <div className="pt-2.5">
                      <button className="flex items-center gap-1 text-xs font-medium text-[#1B4332] hover:underline dark:text-green-400">
                        View all {leaves.length} requests
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Leave Request Dialog ────────────────────────────────────────────── */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={leaveForm.dateFrom}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, dateFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={leaveForm.dateTo}
                  min={leaveForm.dateFrom || format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, dateTo: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason</Label>
              <textarea
                id="reason"
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))}
                rows={3}
                placeholder="Reason for leave request..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowLeaveDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#1B4332] hover:bg-[#2D6A4F] text-white"
                disabled={requestLeaveMutation.isPending || !leaveForm.dateFrom || !leaveForm.dateTo}
                onClick={() => requestLeaveMutation.mutate()}
              >
                {requestLeaveMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
