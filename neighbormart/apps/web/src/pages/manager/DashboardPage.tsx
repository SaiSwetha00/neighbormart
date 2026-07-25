import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  AlertTriangle,
  Users,
  Clock,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  Package,
  ShoppingCart,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCurrency, formatNumber, formatDate, getInitials } from '@/utils/format';
import { useAuthStore } from '@/stores/auth.store';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LowStockProduct {
  id: string;
  name: string;
  stockQty: number;
  lowStockThreshold: number;
  unitOfMeasure?: string;
  unit?: string;
}

interface ExpiringBatch {
  id: string;
  batchNumber: string;
  expiryDate: string | Date;
  quantity: number;
  product: { name: string; unitOfMeasure?: string; unit?: string };
}

interface StaffOnShift {
  staffId: string;
  name: string;
  photo?: string | null;
  position: string;
  clockInTime: string | Date;
}

interface ManagerDashboardData {
  revenueToday: number;
  lowStockItems: LowStockProduct[];
  expiringThisWeek: ExpiringBatch[];
  staffOnShift: StaffOnShift[];
  pendingLeaveRequests: number;
}

// ─── Empty fallback ───────────────────────────────────────────────────────────

const EMPTY: ManagerDashboardData = {
  revenueToday: 0,
  lowStockItems: [],
  expiringThisWeek: [],
  staffOnShift: [],
  pendingLeaveRequests: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel() {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

function daysUntilExpiry(expiryDate: string | Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryStyle(days: number): { badge: string; bar: string; label: string } {
  if (days <= 1) return { badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', bar: 'bg-red-500', label: 'Critical' };
  if (days <= 3) return { badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', bar: 'bg-orange-500', label: 'Urgent' };
  if (days <= 5) return { badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', bar: 'bg-yellow-500', label: 'Soon' };
  return { badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', bar: 'bg-green-500', label: 'This week' };
}

function formatClockTime(dt: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(dt));
}

function positionLabel(pos: string): string {
  const map: Record<string, string> = {
    CASHIER: 'Cashier',
    STOCK: 'Stock',
    SUPERVISOR: 'Supervisor',
    DELI: 'Deli',
    BAKER: 'Baker',
  };
  return map[pos] ?? pos;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  subtitle?: string;
  onClick?: () => void;
}

function StatCard({ title, value, icon, iconBg, subtitle, onClick }: StatCardProps) {
  return (
    <Card
      className={[
        'relative overflow-hidden transition-all duration-200',
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : '',
      ].join(' ')}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
              {title}
            </p>
            <p className="mt-1.5 text-2xl font-bold text-foreground leading-none">{value}</p>
            {subtitle && (
              <p className="mt-1.5 text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          <div
            className={[
              'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl',
              iconBg,
            ].join(' ')}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-11 w-11 rounded-xl flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Panel Skeletons ──────────────────────────────────────────────────────────

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ManagerDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const { data, isLoading, isError, refetch } = useQuery<ManagerDashboardData>({
    queryKey: ['dashboard', 'manager'],
    queryFn: async () => {
      const res = await api.get('/dashboard/manager');
      return res.data?.data ?? res.data;
    },
    staleTime: 30_000,
    placeholderData: EMPTY,
  });

  const d = data ?? EMPTY;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'manager'] });
  };

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Failed to load dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">Something went wrong fetching your data.</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  // ── Derived counts ────────────────────────────────────────────────────────
  const lowStockCount = d.lowStockItems.length;
  const expiringCount = d.expiringThisWeek.length;
  const staffCount = d.staffOnShift.length;

  return (
    <div
      className={[
        'min-h-screen bg-background p-4 sm:p-6 lg:p-8 transition-opacity duration-500',
        mounted ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      <div className="mx-auto max-w-[1400px] space-y-6">

        {/* ── 1. PAGE HEADER ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {getGreeting()}, {user?.name?.split(' ')[0] ?? 'Manager'} 👋
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{todayLabel()}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2 self-start"
            disabled={isLoading}
          >
            <RefreshCw className={['h-4 w-4', isLoading ? 'animate-spin' : ''].join(' ')} />
            Refresh
          </Button>
        </div>

        {/* ── 2. KPI CARDS ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                title="Revenue Today"
                value={formatCurrency(d.revenueToday)}
                icon={<DollarSign className="h-5 w-5 text-white" />}
                iconBg="bg-blue-600"
                subtitle="Read-only view"
              />
              <StatCard
                title="Low Stock Items"
                value={formatNumber(lowStockCount)}
                icon={<AlertTriangle className="h-5 w-5 text-white" />}
                iconBg="bg-yellow-500"
                subtitle={lowStockCount > 0 ? 'Needs attention' : 'All good'}
                onClick={() => navigate('/manager/inventory?tab=low-stock')}
              />
              <StatCard
                title="Staff On Shift"
                value={formatNumber(staffCount)}
                icon={<Users className="h-5 w-5 text-white" />}
                iconBg="bg-green-600"
                subtitle="Currently clocked in"
              />
              <StatCard
                title="Pending Approvals"
                value={formatNumber(d.pendingLeaveRequests)}
                icon={<Clock className="h-5 w-5 text-white" />}
                iconBg="bg-orange-500"
                subtitle="Leave requests"
                onClick={() => navigate('/owner/team?tab=leave')}
              />
            </>
          )}
        </div>

        {/* ── 3. MIDDLE ROW ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* LEFT — Low Stock Alert Panel */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Needs Reorder</CardTitle>
                  {lowStockCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-500 px-1.5 text-[10px] font-bold text-white">
                      {lowStockCount}
                    </span>
                  )}
                </div>
                <Link
                  to="/manager/inventory?tab=low-stock"
                  className="flex items-center gap-1 text-xs font-medium text-[#1B4332] hover:underline dark:text-green-400"
                >
                  View All
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <ListSkeleton rows={5} />
              ) : d.lowStockItems.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <CheckCircle2 className="h-9 w-9 text-green-500" />
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Stock levels are healthy</p>
                  <p className="text-xs text-muted-foreground">No items need reordering right now.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {d.lowStockItems.slice(0, 10).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Threshold: {item.lowStockThreshold} {item.unitOfMeasure ?? item.unit ?? 'units'}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span
                          className={[
                            'text-sm font-bold',
                            item.stockQty <= 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-yellow-600 dark:text-yellow-400',
                          ].join(' ')}
                        >
                          {item.stockQty <= 0 ? 'Out' : item.stockQty}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() =>
                            navigate(`/owner/purchase-orders/new?product=${item.id}`)
                          }
                        >
                          <Package className="h-3 w-3" />
                          Create PO
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* RIGHT — Expiring This Week */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Expiring Soon</CardTitle>
                  {expiringCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {expiringCount}
                    </span>
                  )}
                </div>
                <Link
                  to="/manager/inventory?tab=expiring"
                  className="flex items-center gap-1 text-xs font-medium text-[#1B4332] hover:underline dark:text-green-400"
                >
                  View All
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <ListSkeleton rows={5} />
              ) : d.expiringThisWeek.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <CheckCircle2 className="h-9 w-9 text-green-500" />
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">No expiring products</p>
                  <p className="text-xs text-muted-foreground">Nothing expiring in the next 7 days.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {d.expiringThisWeek.map((batch) => {
                    const days = daysUntilExpiry(batch.expiryDate);
                    const style = getExpiryStyle(days);
                    return (
                      <div key={batch.id} className="py-2.5 first:pt-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {batch.product.name}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Batch {batch.batchNumber} &middot; Qty: {batch.quantity}&nbsp;
                              {batch.product.unitOfMeasure ?? batch.product.unit ?? ''}
                            </p>
                          </div>
                          <div className="flex flex-shrink-0 flex-col items-end gap-1">
                            <span
                              className={[
                                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                style.badge,
                              ].join(' ')}
                            >
                              {days <= 0 ? 'Expired' : days === 1 ? '1 day' : `${days} days`}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(batch.expiryDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── 4. BOTTOM ROW ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* LEFT — Today's Staff */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Staff On Shift Today</CardTitle>
                {!isLoading && (
                  <Badge variant={staffCount > 0 ? 'success' : 'secondary'}>
                    {staffCount} active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : d.staffOnShift.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">No staff on shift</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      No staff members have clocked in today yet.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {d.staffOnShift.map((member) => (
                    <div key={member.staffId} className="flex items-center gap-3 py-2.5 first:pt-0">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        {member.photo && <AvatarImage src={member.photo} alt={member.name} />}
                        <AvatarFallback className="bg-[#1B4332] text-white text-xs font-semibold">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {positionLabel(member.position)} &middot; In at {formatClockTime(member.clockInTime)}
                        </p>
                      </div>
                      <span className="flex h-5 items-center gap-1 rounded-full bg-green-100 px-2 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        On Shift
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* RIGHT — Pending Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pending Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">

                  {/* Leave requests */}
                  <Link
                    to="/owner/team?tab=leave"
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/40 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/20">
                        <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">Leave Requests to Review</p>
                        <p className="text-xs text-muted-foreground">Awaiting approval</p>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {d.pendingLeaveRequests > 0 ? (
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-bold text-white">
                          {d.pendingLeaveRequests}
                        </span>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>

                  {/* Expiring products */}
                  <Link
                    to="/manager/inventory?tab=expiring"
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/40 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">Expiring Products to Action</p>
                        <p className="text-xs text-muted-foreground">Expiring within 7 days</p>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {expiringCount > 0 ? (
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                          {expiringCount}
                        </span>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>

                  {/* Pending POs */}
                  <Link
                    to="/owner/suppliers?tab=orders"
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/40 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                        <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">Pending POs to Receive</p>
                        <p className="text-xs text-muted-foreground">Purchase orders pending</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>

                  {/* Low stock items */}
                  <Link
                    to="/manager/inventory?tab=low-stock"
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/40 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                        <Package className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">Low Stock Items to Reorder</p>
                        <p className="text-xs text-muted-foreground">Below reorder threshold</p>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {lowStockCount > 0 ? (
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-yellow-500 px-1.5 text-xs font-bold text-white">
                          {lowStockCount}
                        </span>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>

                  {/* Reports quick link */}
                  <Link
                    to="/owner/reports"
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/40 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
                        <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">View Reports</p>
                        <p className="text-xs text-muted-foreground">Sales & inventory reports</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>

                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
