import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Clock,
  CalendarCheck,
  UserCheck,
  UserX,
  AlertCircle,
  Plus,
  Check,
  X,
  CalendarDays,
} from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/utils/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type ShiftType = "MORNING" | "EVENING" | "FULL_DAY" | "SPLIT";

interface Shift {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  hoursWorked?: number;
}

interface StaffScheduleRow {
  staffId: string;
  staffName: string;
  position: string;
  shifts: Record<string, Shift | null>;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  staffId: string;
  staffName: string;
  position: string;
  clockIn?: string;
  clockOut?: string;
  status: "ON_TIME" | "LATE" | "ABSENT" | "NOT_CLOCKED_IN";
}

interface AttendanceSummary {
  present: number;
  late: number;
  absent: number;
  notClockedIn: number;
  records: AttendanceRecord[];
}

interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  dateFrom: string;
  dateTo: string;
  durationDays: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note?: string;
}

// ─── Week Helpers ─────────────────────────────────────────────────────────────

function getWeekDates(startMonday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startMonday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `Week of ${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Shift Badge ──────────────────────────────────────────────────────────────

const SHIFT_COLORS: Record<ShiftType, string> = {
  MORNING: "bg-blue-100 text-blue-700",
  EVENING: "bg-orange-100 text-orange-700",
  FULL_DAY: "bg-green-100 text-green-700",
  SPLIT: "bg-purple-100 text-purple-700",
};

function ShiftBadge({ shift, onClick }: { shift: Shift | null; onClick?: () => void }) {
  if (!shift) {
    return (
      <button
        onClick={onClick}
        className="w-full h-10 rounded border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center justify-center group"
      >
        <Plus className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary/60" />
      </button>
    );
  }
  const isOvertime = shift.hoursWorked !== undefined && shift.hoursWorked > 8;
  return (
    <button
      onClick={onClick}
      className={`w-full h-10 rounded px-1.5 text-xs font-medium ${SHIFT_COLORS[shift.shiftType]} ${isOvertime ? "ring-2 ring-red-400" : ""} hover:opacity-80 transition-opacity`}
    >
      <div className="truncate">{shift.shiftType.replace(/_/g, " ")}</div>
      <div className="text-[10px] opacity-70">{shift.startTime}–{shift.endTime}</div>
    </button>
  );
}

// ─── Assign Shift Dialog ───────────────────────────────────────────────────────

function AssignShiftDialog({
  staffId,
  staffName,
  date,
  existingShift,
  onClose,
}: {
  staffId: string;
  staffName: string;
  date: Date;
  existingShift: Shift | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    shiftType: existingShift?.shiftType ?? "MORNING" as ShiftType,
    startTime: existingShift?.startTime ?? "08:00",
    endTime: existingShift?.endTime ?? "16:00",
  });

  const save = useMutation({
    mutationFn: async () => {
      if (existingShift?.id) {
        await api.put(`/shifts/${existingShift.id}`, { ...form });
      } else {
        await api.post("/shifts", {
          staffId,
          date: date.toISOString().split("T")[0],
          ...form,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      onClose();
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (existingShift?.id) {
        await api.delete(`/shifts/${existingShift.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      onClose();
    },
  });

  const dateStr = date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Shift</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium">{staffName}</p>
            <p className="text-muted-foreground">{dateStr}</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Shift Type</label>
            <Select value={form.shiftType} onValueChange={(v) => setForm((f) => ({ ...f, shiftType: v as ShiftType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MORNING">Morning</SelectItem>
                <SelectItem value="EVENING">Evening</SelectItem>
                <SelectItem value="FULL_DAY">Full Day</SelectItem>
                <SelectItem value="SPLIT">Split</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Start Time</label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">End Time</label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          {existingShift && (
            <Button variant="outline" className="text-red-600 mr-auto" onClick={() => remove.mutate()} disabled={remove.isPending}>
              Remove Shift
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving..." : "Save Shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────

function ScheduleTab() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [assignDialog, setAssignDialog] = useState<{ staffId: string; staffName: string; date: Date; shift: Shift | null } | null>(null);

  const weekDates = getWeekDates(weekStart);
  const startDate = weekDates[0].toISOString().split("T")[0];
  const endDate = weekDates[6].toISOString().split("T")[0];

  const { data, isLoading } = useQuery<StaffScheduleRow[]>({
    queryKey: ["schedule", startDate, endDate],
    queryFn: async () => {
      const raw = (await api.get(`/shifts?startDate=${startDate}&endDate=${endDate}`)).data.data ?? [];
      const byStaff = new Map<string, StaffScheduleRow>();
      for (const s of raw) {
        if (!byStaff.has(s.staffId)) {
          byStaff.set(s.staffId, {
            staffId: s.staffId,
            staffName: s.staff?.user?.name ?? "Unknown",
            position: s.staff?.position ?? "",
            shifts: {},
          });
        }
        const row = byStaff.get(s.staffId)!;
        const dateKey = new Date(s.date).toISOString().split("T")[0];
        row.shifts[dateKey] = {
          id: s.id,
          staffId: s.staffId,
          staffName: s.staff?.user?.name ?? "Unknown",
          date: dateKey,
          shiftType: s.shiftType as ShiftType,
          startTime: s.startTime,
          endTime: s.endTime,
        };
      }
      return Array.from(byStaff.values());
    },
  });

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={prevWeek}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-medium text-sm">{formatWeekRange(weekStart)}</span>
          <Button variant="outline" size="sm" onClick={nextWeek}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" /> Print Schedule
        </Button>
      </div>

      <div className="flex gap-2 text-xs flex-wrap">
        {(Object.entries(SHIFT_COLORS) as [ShiftType, string][]).map(([type, color]) => (
          <span key={type} className={`px-2 py-0.5 rounded-full font-medium ${color}`}>{type.replace(/_/g, " ")}</span>
        ))}
        <span className="px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-700 ring-2 ring-red-400">Overtime (&gt;8h)</span>
      </div>

      <Card className="overflow-x-auto">
        <div className="min-w-[700px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Staff</TableHead>
                {weekDates.map((d, i) => (
                  <TableHead key={i} className="text-center w-28">
                    <div>{DAY_LABELS[i]}</div>
                    <div className="text-xs font-normal text-muted-foreground">
                      {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-10 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                (data ?? []).map((row) => (
                  <TableRow key={row.staffId}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{row.staffName}</p>
                        <p className="text-xs text-muted-foreground">{row.position}</p>
                      </div>
                    </TableCell>
                    {weekDates.map((d, i) => {
                      const key = d.toISOString().split("T")[0];
                      const shift = row.shifts[key] ?? null;
                      return (
                        <TableCell key={i} className="p-1">
                          <ShiftBadge
                            shift={shift}
                            onClick={() => setAssignDialog({ staffId: row.staffId, staffName: row.staffName, date: d, shift })}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {assignDialog && (
        <AssignShiftDialog
          staffId={assignDialog.staffId}
          staffName={assignDialog.staffName}
          date={assignDialog.date}
          existingShift={assignDialog.shift}
          onClose={() => setAssignDialog(null)}
        />
      )}
    </div>
  );
}

// ─── Manual Override Dialog ────────────────────────────────────────────────────

function ManualOverrideDialog({
  record,
  onClose,
}: {
  record: AttendanceRecord;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [clockIn, setClockIn] = useState(record.clockIn?.slice(11, 16) ?? "");
  const [clockOut, setClockOut] = useState(record.clockOut?.slice(11, 16) ?? "");

  const save = useMutation({
    mutationFn: async () => {
      await api.put(`/attendance/${record.id}/override`, { clockIn, clockOut });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual Override — {record.staffName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Clock In Time</label>
            <Input type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Clock Out Time</label>
            <Input type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving..." : "Apply Override"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Attendance Tab ────────────────────────────────────────────────────────────

const ATTENDANCE_COLORS: Record<string, string> = {
  ON_TIME: "bg-green-100 text-green-700",
  LATE: "bg-yellow-100 text-yellow-700",
  ABSENT: "bg-red-100 text-red-700",
  NOT_CLOCKED_IN: "bg-gray-100 text-gray-600",
};

function AttendanceTab() {
  const [overrideRecord, setOverrideRecord] = useState<AttendanceRecord | null>(null);

  const { data, isLoading } = useQuery<AttendanceSummary>({
    queryKey: ["attendance-today"],
    queryFn: async () => {
      const raw: any[] = (await api.get("/attendance/today")).data.data ?? [];
      const records: AttendanceRecord[] = raw.map((r) => ({
        id: r.id,
        employeeId: r.staff?.employeeId ?? "",
        staffId: r.staffId,
        staffName: r.staff?.user?.name ?? "Unknown",
        position: r.staff?.position ?? "",
        clockIn: r.clockIn,
        clockOut: r.clockOut,
        status: r.status as AttendanceRecord["status"],
      }));
      const summary: AttendanceSummary = { present: 0, late: 0, absent: 0, notClockedIn: 0, records };
      for (const r of records) {
        if (r.status === "ON_TIME") summary.present++;
        else if (r.status === "LATE") { summary.present++; summary.late++; }
        else if (r.status === "ABSENT") summary.absent++;
        else summary.notClockedIn++;
      }
      return summary;
    },
  });

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const summaryCards = [
    { label: "Present Today", value: data?.present ?? 0, color: "bg-green-50 text-green-700", icon: UserCheck },
    { label: "Late", value: data?.late ?? 0, color: "bg-yellow-50 text-yellow-700", icon: Clock },
    { label: "Absent", value: data?.absent ?? 0, color: "bg-red-50 text-red-700", icon: UserX },
    { label: "Not Clocked In", value: data?.notClockedIn ?? 0, color: "bg-gray-50 text-gray-600", icon: AlertCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Attendance</h2>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, color, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${color} w-full justify-between`}>
                <div>
                  <p className="text-xs font-medium opacity-70">{label}</p>
                  <p className="text-2xl font-bold">{isLoading ? "—" : value}</p>
                </div>
                <Icon className="h-6 w-6 opacity-60" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Clock In</TableHead>
              <TableHead>Clock Out</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              (data?.records ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.employeeId}</TableCell>
                  <TableCell className="font-medium">{r.staffName}</TableCell>
                  <TableCell className="text-muted-foreground">{r.position}</TableCell>
                  <TableCell>{r.clockIn ? new Date(r.clockIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                  <TableCell>{r.clockOut ? new Date(r.clockOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ATTENDANCE_COLORS[r.status]}`}>
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setOverrideRecord(r)}>
                      Override
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {overrideRecord && (
        <ManualOverrideDialog record={overrideRecord} onClose={() => setOverrideRecord(null)} />
      )}
    </div>
  );
}

// ─── Leave Requests Tab ────────────────────────────────────────────────────────

function LeaveActionDialog({
  request,
  action,
  onClose,
}: {
  request: LeaveRequest;
  action: "APPROVED" | "REJECTED";
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      await api.patch(`/leave-requests/${request.id}`, { status: action, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action === "APPROVED" ? "Approve" : "Reject"} Leave Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p className="font-medium">{request.staffName}</p>
            <p className="text-muted-foreground">{formatDate(request.dateFrom)} – {formatDate(request.dateTo)} ({request.durationDays} days)</p>
            <p>{request.reason}</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Note (optional)</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the staff member..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className={action === "APPROVED" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
          >
            {submit.isPending ? "Saving..." : action === "APPROVED" ? "Approve" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeaveRequestsTab() {
  const [actionState, setActionState] = useState<{ request: LeaveRequest; action: "APPROVED" | "REJECTED" } | null>(null);

  const { data, isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["leave-requests"],
    queryFn: async () => {
      const raw: any[] = (await api.get("/leave-requests")).data.data ?? [];
      return raw.map((r) => {
        const durationDays =
          Math.ceil((new Date(r.dateTo).getTime() - new Date(r.dateFrom).getTime()) / 86400000) + 1;
        return {
          id: r.id,
          staffId: r.staffId,
          staffName: r.staff?.user?.name ?? "Unknown",
          dateFrom: r.dateFrom,
          dateTo: r.dateTo,
          durationDays,
          reason: r.reason,
          status: r.status as LeaveRequest["status"],
          note: r.note ?? undefined,
        } as LeaveRequest;
      });
    },
  });

  const pending = (data ?? []).filter((r) => r.status === "PENDING");
  const approved = (data ?? []).filter((r) => r.status === "APPROVED");
  const rejected = (data ?? []).filter((r) => r.status === "REJECTED");

  const LeaveTable = ({ items, showActions }: { items: LeaveRequest[]; showActions?: boolean }) => (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            {showActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: showActions ? 7 : 6 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 7 : 6} className="text-center text-muted-foreground py-8">No requests</TableCell>
            </TableRow>
          ) : (
            items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.staffName}</TableCell>
                <TableCell>{formatDate(r.dateFrom)}</TableCell>
                <TableCell>{formatDate(r.dateTo)}</TableCell>
                <TableCell>{r.durationDays} day{r.durationDays !== 1 ? "s" : ""}</TableCell>
                <TableCell className="max-w-xs truncate">{r.reason}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.status === "APPROVED" ? "bg-green-100 text-green-700" :
                    r.status === "REJECTED" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {r.status}
                  </span>
                </TableCell>
                {showActions && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setActionState({ request: r, action: "APPROVED" })}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => setActionState({ request: r, action: "REJECTED" })}>
                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <div className="space-y-4">
      {approved.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-green-600" />
            Approved Leaves Calendar Preview
          </h3>
          <div className="flex flex-wrap gap-2">
            {approved.map((r) => (
              <div key={r.id} className="bg-green-50 text-green-700 text-xs px-3 py-1.5 rounded-full">
                {r.staffName}: {formatDate(r.dateFrom)} – {formatDate(r.dateTo)}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pending.length > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5">{pending.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <LeaveTable items={pending} showActions />
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <LeaveTable items={approved} />
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <LeaveTable items={rejected} />
        </TabsContent>
      </Tabs>

      {actionState && (
        <LeaveActionDialog
          request={actionState.request}
          action={actionState.action}
          onClose={() => setActionState(null)}
        />
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Schedule & Attendance</h1>
        <p className="text-muted-foreground">Manage staff schedules, attendance, and leave requests</p>
      </div>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave-requests">Leave Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule" className="mt-6"><ScheduleTab /></TabsContent>
        <TabsContent value="attendance" className="mt-6"><AttendanceTab /></TabsContent>
        <TabsContent value="leave-requests" className="mt-6"><LeaveRequestsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
