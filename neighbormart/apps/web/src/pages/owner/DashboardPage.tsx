import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  Trash2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AIAlertsPanel } from '@/components/ai/AIAlertsPanel';
import { formatCurrency, formatNumber, formatRelativeTime } from '@/utils/format';
import { useAuthStore } from '@/stores/auth.store';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import type { OwnerDashboard, Product, AuditLog } from '@/types';

// ─── Inline StatCard ─────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: { value: number; label: string };
  onClick?: () => void;
  className?: string;
}

function StatCard({ title, value, icon, iconBg, trend, onClick, className }: StatCardProps) {
  const isPositive = trend ? trend.value >= 0 : null;
  return (
    <Card
      className={[
        'relative overflow-hidden transition-all duration-200',
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : '',
        className ?? '',
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
            {trend && (
              <p
                className={[
                  'mt-2 flex items-center gap-1 text-xs font-medium',
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400',
                ].join(' ')}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <TrendingDown className="h-3 w-3 flex-shrink-0" />
                )}
                <span>
                  {isPositive ? '+' : ''}
                  {trend.value}% {trend.label}
                </span>
              </p>
            )}
          </div>
          <div className={['flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl', iconBg].join(' ')}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-11 w-11 rounded-xl flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-sm">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="font-semibold text-foreground">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function todayLabel() {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(
    new Date()
  );
}

// ─── Empty / fallback data ────────────────────────────────────────────────────

const EMPTY_DASHBOARD: OwnerDashboard = {
  revenueToday: 0,
  ordersToday: 0,
  totalProducts: 0,
  staffOnlineNow: 0,
  lowStockItems: 0,
  wasteToday: 0,
  revenueChart: Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: 0 };
  }),
  topProducts: [],
  inventoryHealth: { inStock: 0, lowStock: 0, outOfStock: 0 },
  staffOnlineList: [],
  salesGoalProgress: { goal: 1, current: 0, percentage: 0 },
  recentActivity: [],
  alerts: { critical: [], warning: [], info: [] },
};

const PIE_COLORS = { inStock: '#10B981', lowStock: '#F59E0B', outOfStock: '#EF4444' };

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OwnerDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading, isError, refetch } = useQuery<OwnerDashboard>({
    queryKey: ['dashboard', 'owner'],
    queryFn: async () => {
      const res = await api.get('/dashboard/owner');
      const raw = res.data?.data ?? res.data;
      return {
        ...raw,
        lowStockItems: raw.lowStockCount ?? raw.lowStockItems ?? 0,
      };
    },
    staleTime: 30_000,
    placeholderData: EMPTY_DASHBOARD,
  });

  const d = data ?? EMPTY_DASHBOARD;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'owner'] });
  };

  // ── Revenue chart: filter by period ─────────────────────────────────────
  const chartData = (() => {
    const full = d.revenueChart ?? [];
    if (period === 'today') return full.slice(-1);
    if (period === 'week') return full.slice(-7);
    return full;
  })();

  // ── Inventory donut data ─────────────────────────────────────────────────
  const pieData = [
    { name: 'In Stock', value: d.inventoryHealth.inStock, color: PIE_COLORS.inStock },
    { name: 'Low Stock', value: d.inventoryHealth.lowStock, color: PIE_COLORS.lowStock },
    { name: 'Out of Stock', value: d.inventoryHealth.outOfStock, color: PIE_COLORS.outOfStock },
  ];

  // ── Sales goal ────────────────────────────────────────────────────────────
  const goalPct = Math.min(100, Math.round(d.salesGoalProgress.percentage));
  const goalReached = goalPct >= 100;

  // ── Alerts ────────────────────────────────────────────────────────────────
  const criticalAlerts = (d.alerts.critical ?? []).slice(0, 3) as Product[];
  const warningAlerts = (d.alerts.warning ?? []).slice(0, 3) as Product[];
  const totalAlerts = criticalAlerts.length + warningAlerts.length;

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

  return (
    <div
      className={[
        'min-h-screen bg-background p-4 sm:p-6 lg:p-8 transition-opacity duration-500',
        mounted ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* ── 1. PAGE HEADER ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {getGreeting()}, {user?.name?.split(' ')[0] ?? 'Owner'} 👋
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

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-1.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white" onClick={() => navigate('/owner/products/new')}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/owner/suppliers')}>
            <Package className="h-4 w-4" />
            Create PO
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/owner/team')}>
            <Users className="h-4 w-4" />
            Add Staff
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/owner/inventory')}>
            <BarChart3 className="h-4 w-4" />
            View Inventory
          </Button>
        </div>

        {/* ── 2. KPI CARDS ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                title="Revenue Today"
                value={formatCurrency(d.revenueToday)}
                icon={<DollarSign className="h-5 w-5 text-white" />}
                iconBg="bg-[#1B4332]"
                trend={{ value: 12, label: 'vs yesterday' }}
              />
              <StatCard
                title="Orders Today"
                value={formatNumber(d.ordersToday)}
                icon={<ShoppingBag className="h-5 w-5 text-white" />}
                iconBg="bg-blue-600"
              />
              <StatCard
                title="Total Products"
                value={formatNumber(d.totalProducts)}
                icon={<Package className="h-5 w-5 text-white" />}
                iconBg="bg-purple-600"
              />
              <StatCard
                title="Staff Online"
                value={formatNumber(d.staffOnlineNow)}
                icon={<Users className="h-5 w-5 text-white" />}
                iconBg="bg-indigo-600"
              />
              <StatCard
                title="Low Stock"
                value={formatNumber(d.lowStockItems)}
                icon={<AlertTriangle className="h-5 w-5 text-white" />}
                iconBg="bg-yellow-500"
                onClick={() => navigate('/owner/inventory?tab=low-stock')}
              />
              <StatCard
                title="Waste Today"
                value={formatCurrency(d.wasteToday)}
                icon={<Trash2 className="h-5 w-5 text-white" />}
                iconBg="bg-red-500"
              />
            </>
          )}
        </div>

        {/* ── 3. MIDDLE SECTION ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

          {/* LEFT — Revenue Chart */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Revenue Trend</CardTitle>
                <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
                  {(['today', 'week', 'month'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={[
                        'rounded-md px-3 py-1 text-xs font-medium capitalize transition-all duration-150',
                        period === p
                          ? 'bg-card shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      ].join(' ')}
                    >
                      {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              {isLoading ? (
                <Skeleton className="h-[240px] w-full rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1B4332" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#1B4332" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                      width={48}
                    />
                    <Tooltip content={<RevenueTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#1B4332"
                      strokeWidth={2.5}
                      fill="url(#revenueGrad)"
                      dot={false}
                      activeDot={{ r: 5, fill: '#1B4332', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-4 lg:col-span-2">

            {/* a) Inventory Health */}
            <Card className="flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Inventory Health</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-[100px] w-[100px] rounded-full flex-shrink-0" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-26" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={110} height={110}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={32}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {pieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 min-w-0">
                      {pieData.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-2 text-xs">
                          <span
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-muted-foreground truncate">{entry.name}</span>
                          <span className="ml-auto font-semibold text-foreground pl-2">
                            {formatNumber(entry.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* b) Staff Online */}
            <Card className="flex-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Staff Online Now</CardTitle>
                  <Badge variant="success">{d.staffOnlineNow}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
                        <div className="space-y-1 flex-1">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-2.5 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : d.staffOnlineList.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No staff currently online.</p>
                ) : (
                  <div className="space-y-2">
                    {d.staffOnlineList.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex items-center gap-2.5">
                        {s.photo ? (
                          <img
                            src={s.photo}
                            alt={s.name}
                            className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1B4332] text-[10px] font-bold text-white">
                            {getInitials(s.name)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">{s.name}</p>
                          <p className="truncate text-[10px] capitalize text-muted-foreground">{s.position}</p>
                        </div>
                        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
                      </div>
                    ))}
                    <Link
                      to="/owner/team"
                      className="flex items-center gap-1 pt-1 text-xs font-medium text-[#1B4332] hover:underline dark:text-green-400"
                    >
                      View All
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* c) Sales Goal Progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Daily Sales Goal</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-4 w-full rounded-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-bold text-foreground">{goalPct}%</p>
                      <p className="text-xs text-muted-foreground pb-0.5">
                        {formatCurrency(d.salesGoalProgress.current)} /{' '}
                        {formatCurrency(d.salesGoalProgress.goal)}
                      </p>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[#1B4332] transition-all duration-700"
                        style={{ width: `${goalPct}%` }}
                      />
                    </div>
                    <p
                      className={[
                        'text-xs font-medium',
                        goalReached ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
                      ].join(' ')}
                    >
                      {goalReached ? 'Goal achieved! 🎉' : 'Keep going!'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── 4. BOTTOM SECTION ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

          {/* LEFT — Top Products Table */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Top Products</CardTitle>
                <Link
                  to="/owner/inventory"
                  className="flex items-center gap-1 text-xs font-medium text-[#1B4332] hover:underline dark:text-green-400"
                >
                  View All
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0 overflow-x-auto">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-5 flex-shrink-0" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-20 flex-shrink-0" />
                      <Skeleton className="h-4 w-12 flex-shrink-0" />
                      <Skeleton className="h-4 w-16 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-8">
                        #
                      </th>
                      <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Product
                      </th>
                      <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Category
                      </th>
                      <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Stock
                      </th>
                      <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {/* If API returns top products use them; otherwise show empty state */}
                    {(d.topProducts ?? [])
                      .slice(0, 5)
                      .map((product, idx) => (
                        <tr key={product.id} className="group hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                          <td className="py-2.5">
                            <span className="font-medium text-foreground line-clamp-1">{product.name}</span>
                          </td>
                          <td className="py-2.5 text-xs text-muted-foreground">
                            {product.category?.name ?? '—'}
                          </td>
                          <td className="py-2.5 text-right">
                            <span
                              className={[
                                'text-xs font-medium',
                                product.stockQty === 0
                                  ? 'text-red-500'
                                  : product.stockQty <= product.lowStockThreshold
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-foreground',
                              ].join(' ')}
                            >
                              {formatNumber(product.stockQty)}
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-xs font-semibold text-foreground">
                            {formatCurrency(product.sellingPrice)}
                          </td>
                        </tr>
                      ))}
                    {(d.topProducts ?? []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                          No product data available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* RIGHT — Alerts & Activity */}
          <div className="flex flex-col gap-4 lg:col-span-2">

            {/* a) AI Alerts Panel */}
            <AIAlertsPanel />

            {/* b) Inventory Alerts Panel */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Alerts</CardTitle>
                  {totalAlerts > 0 && (
                    <Badge variant="error">{totalAlerts}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-lg" />
                    ))}
                  </div>
                ) : totalAlerts === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">All systems healthy</p>
                    <p className="text-xs text-muted-foreground">No alerts at this time.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {criticalAlerts.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-start gap-2 rounded-lg bg-red-50 p-2.5 dark:bg-red-900/15"
                      >
                        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">{p.name}</p>
                          <p className="text-[10px] text-red-600 dark:text-red-400">
                            Out of stock — {formatNumber(p.stockQty)} units left
                          </p>
                        </div>
                      </div>
                    ))}
                    {warningAlerts.map((p) => (
                      <div
                        key={(p as Product).id}
                        className="flex items-start gap-2 rounded-lg bg-yellow-50 p-2.5 dark:bg-yellow-900/15"
                      >
                        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-yellow-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">
                            {(p as Product).name}
                          </p>
                          <p className="text-[10px] text-yellow-600 dark:text-yellow-400">
                            Low stock — {formatNumber((p as Product).stockQty)} units left
                          </p>
                        </div>
                      </div>
                    ))}
                    <Link
                      to="/owner/inventory?tab=low-stock"
                      className="flex items-center gap-1 pt-1 text-xs font-medium text-[#1B4332] hover:underline dark:text-green-400"
                    >
                      View all alerts
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* b) Recent Activity Feed */}
            <Card className="flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
                        <div className="space-y-1 flex-1">
                          <Skeleton className="h-3 w-full max-w-[180px]" />
                          <Skeleton className="h-2.5 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : d.recentActivity.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No recent activity.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {(d.recentActivity as AuditLog[]).slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-start gap-2.5 py-2.5">
                        {log.user?.photo ? (
                          <img
                            src={log.user.photo}
                            alt={log.user.name}
                            className="h-7 w-7 flex-shrink-0 rounded-full object-cover mt-0.5"
                          />
                        ) : (
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground mt-0.5">
                            {log.user ? getInitials(log.user.name) : '?'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-foreground leading-snug">
                            <span className="font-medium">{log.user?.name ?? 'System'}</span>{' '}
                            <span className="text-muted-foreground lowercase">{log.action}</span>{' '}
                            <span className="font-medium">{log.module}</span>
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {formatRelativeTime(log.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
