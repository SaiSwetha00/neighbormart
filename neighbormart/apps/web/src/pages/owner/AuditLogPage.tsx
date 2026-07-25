import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  Search,
  Download,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import api from '@/services/api';
import { formatDateTime, getInitials } from '@/utils/format';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuditUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  user: AuditUser;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'BULK_DELETE';
  module: string;
  recordId?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string;
  affected?: number;
}

interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MODULES = ['All', 'Auth', 'Products', 'Inventory', 'Users', 'Suppliers', 'Staff', 'Settings'];
const ACTIONS = ['All', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
const PAGE_SIZE = 25;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const actionBadge = (action: string) => {
  const map: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    BULK_DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    LOGIN: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    LOGOUT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };
  return map[action] ?? 'bg-gray-100 text-gray-700';
};

const highlightDiff = (
  obj: Record<string, unknown>,
  other: Record<string, unknown> | null,
  side: 'old' | 'new'
): string => {
  const json = JSON.stringify(obj, null, 2);
  if (!other) return json;
  return json
    .split('\n')
    .map((line) => {
      const keyMatch = line.match(/^\s+"([^"]+)":/);
      if (!keyMatch) return line;
      const key = keyMatch[1];
      const changed = Object.prototype.hasOwnProperty.call(other, key) && obj[key] !== other[key];
      if (changed) {
        const cls =
          side === 'old'
            ? 'background:rgba(239,68,68,0.15)'
            : 'background:rgba(34,197,94,0.15)';
        return `<span style="${cls};display:block;border-radius:2px;">${line}</span>`;
      }
      return line;
    })
    .join('\n');
};

// ─── Changes Dialog ───────────────────────────────────────────────────────────

interface ChangesDialogProps {
  log: AuditLog | null;
  open: boolean;
  onClose: () => void;
}

function ChangesDialog({ log, open, onClose }: ChangesDialogProps) {
  if (!log) return null;

  const hasOld = log.oldValue !== null && log.oldValue !== undefined;
  const hasNew = log.newValue !== null && log.newValue !== undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle>Record Changes</DialogTitle>
          <DialogDescription>
            {log.action} on {log.module} — {formatDateTime(log.timestamp)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {/* Old Value */}
          <div>
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
              Old Value
            </p>
            <div
              className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800
                         p-3 overflow-auto max-h-96 font-mono text-xs leading-relaxed"
            >
              {!hasOld ? (
                <span className="italic text-[var(--muted-foreground)]">Record created</span>
              ) : (
                <pre
                  dangerouslySetInnerHTML={{
                    __html: highlightDiff(
                      log.oldValue as Record<string, unknown>,
                      log.newValue as Record<string, unknown> | null,
                      'old'
                    ),
                  }}
                />
              )}
            </div>
          </div>

          {/* New Value */}
          <div>
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
              New Value
            </p>
            <div
              className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800
                         p-3 overflow-auto max-h-96 font-mono text-xs leading-relaxed"
            >
              {!hasNew ? (
                <span className="italic text-[var(--muted-foreground)]">Record deleted</span>
              ) : (
                <pre
                  dangerouslySetInnerHTML={{
                    __html: highlightDiff(
                      log.newValue as Record<string, unknown>,
                      log.oldValue as Record<string, unknown> | null,
                      'new'
                    ),
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState('all');
  const [module, setModule] = useState('All');
  const [action, setAction] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [changesOpen, setChangesOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Build query params
  const params: Record<string, string | number> = {
    page,
    limit: PAGE_SIZE,
  };
  if (userId !== 'all') params.userId = userId;
  if (module !== 'All') params.module = module;
  if (action !== 'All') params.action = action;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const { data, isLoading, isError } = useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', params],
    queryFn: async () => {
      const res = await api.get('/audit-logs', { params });
      const payload = res.data?.data ?? res.data;
      const rawLogs: any[] = payload.data ?? [];
      return {
        data: rawLogs.map((l) => ({ ...l, timestamp: l.timestamp ?? l.createdAt })),
        total: payload.pagination?.total ?? 0,
        page: payload.pagination?.page ?? 1,
        totalPages: payload.pagination?.totalPages ?? 1,
      } as AuditLogsResponse;
    },
    placeholderData: (prev) => prev,
  });

  // Users list for filter dropdown
  const { data: usersData } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['audit-users'],
    queryFn: async () => {
      const [mgrs, stf] = await Promise.all([
        api.get('/managers', { params: { limit: 100 } }),
        api.get('/staff', { params: { limit: 100 } }),
      ]);
      return [...(mgrs.data?.data?.managers ?? []), ...(stf.data?.data?.staff ?? [])];
    },
  });

  const logs = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  // Client-side text search on top of server results
  const filtered = search.trim()
    ? logs.filter(
        (l) =>
          l.module.toLowerCase().includes(search.toLowerCase()) ||
          l.action.toLowerCase().includes(search.toLowerCase()) ||
          l.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
          l.recordId?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const clearFilters = () => {
    setSearch('');
    setUserId('all');
    setModule('All');
    setAction('All');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get('/audit-logs/export', {
        params: { userId, module, action, startDate, endDate },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: convert current page to CSV
      const headers = ['Timestamp', 'User', 'Action', 'Module', 'Record ID', 'IP'];
      const rows = logs.map((l) =>
        [
          formatDateTime(l.timestamp),
          l.user?.name ?? '',
          l.action,
          l.module,
          l.recordId ?? '',
          l.ipAddress ?? '',
        ].join(',')
      );
      const csv = [headers.join(','), ...rows].join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const openChanges = (log: AuditLog) => {
    setSelectedLog(log);
    setChangesOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Audit Log</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Track every action in your store
          </p>
        </div>
        <Button onClick={exportCsv} disabled={exporting} variant="outline" size="sm">
          <Download size={14} className="mr-1.5" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              placeholder="Search module, action, user…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* User */}
          <Select value={userId} onValueChange={(v) => { setUserId(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm w-44">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {(usersData ?? []).map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Module */}
          <Select value={module} onValueChange={(v) => { setModule(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODULES.map((m) => (
                <SelectItem key={m} value={m}>{m === 'All' ? 'All Modules' : m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Action */}
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>{a === 'All' ? 'All Actions' : a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">From</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="h-9 text-sm w-38"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">To</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="h-9 text-sm w-38"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 text-sm text-[var(--muted-foreground)]"
          >
            <X size={14} className="mr-1" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[var(--muted)]/40">
              <TableHead className="text-xs font-semibold">Timestamp</TableHead>
              <TableHead className="text-xs font-semibold">User</TableHead>
              <TableHead className="text-xs font-semibold">Action</TableHead>
              <TableHead className="text-xs font-semibold">Module</TableHead>
              <TableHead className="text-xs font-semibold">Record ID</TableHead>
              <TableHead className="text-xs font-semibold">Changes</TableHead>
              <TableHead className="text-xs font-semibold">IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-[var(--muted-foreground)]">
                  Failed to load audit logs. Please try again.
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-20">
                  <div className="flex flex-col items-center gap-3 text-[var(--muted-foreground)]">
                    <ClipboardList size={40} strokeWidth={1.2} />
                    <p className="text-sm font-medium">No activity recorded yet</p>
                    <p className="text-xs">Actions taken in your store will appear here.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => {
                const isBulkWarning =
                  log.action === 'BULK_DELETE' && (log.affected ?? 0) > 5;
                return (
                  <TableRow
                    key={log.id}
                    className={isBulkWarning ? 'bg-red-50 dark:bg-red-950/10' : ''}
                  >
                    {/* Timestamp */}
                    <TableCell className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </TableCell>

                    {/* User */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px] bg-[var(--muted)]">
                            {getInitials(log.user?.name ?? '?')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-tight">{log.user?.name}</p>
                          <p className="text-[10px] text-[var(--muted-foreground)]">{log.user?.role}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Action */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {isBulkWarning && (
                          <AlertTriangle size={12} className="text-red-600" />
                        )}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${actionBadge(log.action)}`}
                        >
                          {log.action}
                        </span>
                        {isBulkWarning && (
                          <span className="text-[10px] text-red-600 font-semibold">
                            ×{log.affected}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Module */}
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">
                        {log.module}
                      </Badge>
                    </TableCell>

                    {/* Record ID */}
                    <TableCell className="font-mono text-xs text-[var(--muted-foreground)]">
                      {log.recordId
                        ? log.recordId.length > 12
                          ? log.recordId.slice(0, 8) + '…'
                          : log.recordId
                        : '—'}
                    </TableCell>

                    {/* Changes */}
                    <TableCell>
                      {(log.oldValue !== undefined || log.newValue !== undefined) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openChanges(log)}
                          className="h-7 text-xs px-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        >
                          <Eye size={12} className="mr-1" />
                          View
                        </Button>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">—</span>
                      )}
                    </TableCell>

                    {/* IP */}
                    <TableCell className="font-mono text-xs text-[var(--muted-foreground)]">
                      {log.ipAddress ?? '—'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--muted-foreground)]">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} entries
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={14} />
              </Button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pg = i + 1;
                return (
                  <Button
                    key={pg}
                    variant={pg === page ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 w-7 p-0 text-xs"
                    onClick={() => setPage(pg)}
                  >
                    {pg}
                  </Button>
                );
              })}
              {totalPages > 7 && page < totalPages - 3 && (
                <>
                  <span className="text-xs text-[var(--muted-foreground)] px-1">…</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 text-xs"
                    onClick={() => setPage(totalPages)}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Changes Dialog */}
      <ChangesDialog
        log={selectedLog}
        open={changesOpen}
        onClose={() => setChangesOpen(false)}
      />
    </div>
  );
}
