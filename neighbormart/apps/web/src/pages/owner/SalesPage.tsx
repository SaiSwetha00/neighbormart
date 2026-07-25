import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Receipt,
  Tag,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency, formatNumber, formatDateTime } from '@/utils/format';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SummaryData {
  revenue: number;
  revenueChange: number;
  orders: number;
  avgOrderValue: number;
  taxCollected: number;
  discountsGiven: number;
}

interface DailyRevenue {
  date: string;
  amount: number;
}

interface PeakHour {
  hour: number;
  count: number;
}

interface TopProduct {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface StaffPerf {
  cashierId: string;
  name: string;
  orders: number;
  revenue: number;
  avgOrder?: number;
}

interface OverviewData {
  summary: SummaryData;
  dailyRevenue: DailyRevenue[];
  peakHours: PeakHour[];
  topProducts: TopProduct[];
  staffPerformance: StaffPerf[];
}

interface OrderItem {
  productName: string;
  quantity: number;
  subtotal: number;
}

interface Transaction {
  id: string;
  createdAt: string;
  type: string;
  status: string;
  total: number;
  customer?: { user?: { name: string } };
  cashier?: { name: string };
  items: OrderItem[];
}

interface TransactionData {
  orders: Transaction[];
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayRange() {
  const d = new Date();
  const from = d.toISOString().slice(0, 10);
  return { dateFrom: from, dateTo: from };
}

function weekRange() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 6);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
  };
}

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  change?: number;
  changeLabel?: string;
  loading?: boolean;
}

function StatCard({ title, value, icon, iconBg, change, changeLabel, loading }: StatCardProps) {
  if (loading) {
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

  const isPositive = change !== undefined ? change >= 0 : null;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
              {title}
            </p>
            <p className="mt-1.5 text-2xl font-bold text-foreground leading-none">{value}</p>
            {change !== undefined && changeLabel && (
              <p
                className={[
                  'mt-2 flex items-center gap-1 text-xs font-medium',
                  isPositive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-500 dark:text-red-400',
                ].join(' ')}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <TrendingDown className="h-3 w-3 flex-shrink-0" />
                )}
                <span>
                  {isPositive ? '+' : ''}
                  {change.toFixed(1)}% {changeLabel}
                </span>
              </p>
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

function RevenueTooltip({
  active,
  payload,
  label,
}: {
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

// ─── Peak Hours Heatmap ───────────────────────────────────────────────────────

function PeakHoursHeatmap({ data, loading }: { data: PeakHour[]; loading: boolean }) {
  if (loading) {
    return <Skeleton className="h-16 w-full rounded-lg" />;
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const countMap: Record<number, number> = {};
  data.forEach((d) => { countMap[d.hour] = d.count; });
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  function formatHourLabel(h: number) {
    if (h === 0) return '12a';
    if (h < 12) return `${h}a`;
    if (h === 12) return '12p';
    return `${h - 12}p`;
  }

  return (
    <div>
      <div className="flex gap-0.5 items-end">
        {hours.map((h) => {
          const count = countMap[h] ?? 0;
          const intensity = count / maxCount;
          return (
            <div key={h} className="flex flex-col items-center gap-1 flex-1 min-w-0 group relative">
              <div
                className="w-full rounded-sm transition-all duration-300"
                style={{
                  height: `${Math.max(8, intensity * 48)}px`,
                  backgroundColor: `rgba(27, 67, 50, ${0.1 + intensity * 0.9})`,
                }}
              />
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex z-10 pointer-events-none">
                <div className="rounded bg-foreground text-background text-[10px] px-1.5 py-0.5 whitespace-nowrap shadow-lg">
                  {formatHourLabel(h)}: {count}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>11 PM</span>
      </div>
    </div>
  );
}

// ─── Transaction type badge helper ────────────────────────────────────────────

function typeBadgeVariant(type: string): 'default' | 'info' | 'warning' | 'outline' {
  const t = type?.toLowerCase();
  if (t === 'in-store' || t === 'in_store' || t === 'pos') return 'default';
  if (t === 'online' || t === 'delivery') return 'info';
  if (t === 'pickup') return 'warning';
  return 'outline';
}

function statusBadgeVariant(status: string): 'success' | 'warning' | 'error' | 'outline' {
  const s = status?.toLowerCase();
  if (s === 'completed' || s === 'paid') return 'success';
  if (s === 'pending') return 'warning';
  if (s === 'cancelled' || s === 'refunded') return 'error';
  return 'outline';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SalesPage() {
  const [preset, setPreset] = useState<'today' | 'week' | 'month'>('week');
  const [dateFrom, setDateFrom] = useState(() => weekRange().dateFrom);
  const [dateTo, setDateTo] = useState(() => weekRange().dateTo);
  const [tab, setTab] = useState('overview');

  function applyPreset(p: 'today' | 'week' | 'month') {
    setPreset(p);
    const range = p === 'today' ? todayRange() : p === 'week' ? weekRange() : monthRange();
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
  }

  // ── Overview query ─────────────────────────────────────────────────────────
  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    refetch: refetchOverview,
  } = useQuery<OverviewData>({
    queryKey: ['sales', 'overview', dateFrom, dateTo],
    queryFn: async () => {
      try {
        const res = await api.get('/sales/overview', {
          params: { dateFrom, dateTo },
        });
        const raw = res.data?.data ?? res.data;
        return raw as OverviewData;
      } catch (err) {
        throw err;
      }
    },
    staleTime: 60_000,
  });

  // ── Transactions query ─────────────────────────────────────────────────────
  const {
    data: txData,
    isLoading: txLoading,
    isError: txError,
    refetch: refetchTx,
  } = useQuery<TransactionData>({
    queryKey: ['sales', 'transactions', dateFrom, dateTo],
    queryFn: async () => {
      try {
        const res = await api.get('/sales/transactions', {
          params: { page: 1, limit: 50, dateFrom, dateTo },
        });
        const raw = res.data?.data ?? res.data;
        return raw as TransactionData;
      } catch (err) {
        throw err;
      }
    },
    staleTime: 60_000,
    enabled: tab === 'transactions',
  });

  // ── By Product query ───────────────────────────────────────────────────────
  const {
    data: byProductData,
    isLoading: byProductLoading,
    isError: byProductError,
    refetch: refetchByProduct,
  } = useQuery<{ products: TopProduct[] }>({
    queryKey: ['sales', 'by-product', dateFrom, dateTo],
    queryFn: async () => {
      try {
        const res = await api.get('/sales/by-product', {
          params: { dateFrom, dateTo },
        });
        const raw = res.data?.data ?? res.data;
        return raw as { products: TopProduct[] };
      } catch (err) {
        throw err;
      }
    },
    staleTime: 60_000,
    enabled: tab === 'by-product',
  });

  // ── Staff Performance query ────────────────────────────────────────────────
  const {
    data: staffData,
    isLoading: staffLoading,
    isError: staffError,
    refetch: refetchStaff,
  } = useQuery<{ performance: StaffPerf[] }>({
    queryKey: ['sales', 'staff-performance', dateFrom, dateTo],
    queryFn: async () => {
      try {
        const res = await api.get('/sales/staff-performance', {
          params: { dateFrom, dateTo },
        });
        const raw = res.data?.data ?? res.data;
        return raw as { performance: StaffPerf[] };
      } catch (err) {
        throw err;
      }
    },
    staleTime: 60_000,
    enabled: tab === 'staff',
  });

  const summary = overview?.summary;
  const dailyRevenue = overview?.dailyRevenue ?? [];
  const peakHours = overview?.peakHours ?? [];

  const chartData = dailyRevenue.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: d.amount,
  }));

  const transactions = txData?.orders ?? [];
  const products = byProductData?.products ?? [];
  const staffPerf = staffData?.performance ?? [];

  // ── Refetch all relevant queries ──────────────────────────────────────────
  function handleRefresh() {
    refetchOverview();
    if (tab === 'transactions') refetchTx();
    if (tab === 'by-product') refetchByProduct();
    if (tab === 'staff') refetchStaff();
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Sales</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Revenue, transactions, and performance analytics
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2 self-start"
            disabled={overviewLoading}
          >
            <RefreshCw
              className={['h-4 w-4', overviewLoading ? 'animate-spin' : ''].join(' ')}
            />
            Refresh
          </Button>
        </div>

        {/* ── Date Range Filter ────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Preset buttons */}
              <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
                {(['today', 'week', 'month'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => applyPreset(p)}
                    className={[
                      'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all duration-150',
                      preset === p
                        ? 'bg-card shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    ].join(' ')}
                  >
                    {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
                  </button>
                ))}
              </div>

              {/* Custom date inputs */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-muted-foreground">From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPreset('today'); // clear preset
                  }}
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                />
                <span className="text-xs text-muted-foreground">To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPreset('today');
                  }}
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── KPI Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <StatCard
            title="Revenue"
            value={summary ? formatCurrency(summary.revenue) : '$0.00'}
            icon={<DollarSign className="h-5 w-5 text-white" />}
            iconBg="bg-[#1B4332]"
            change={summary?.revenueChange}
            changeLabel="vs prev period"
            loading={overviewLoading}
          />
          <StatCard
            title="Orders"
            value={summary ? formatNumber(summary.orders) : '0'}
            icon={<ShoppingBag className="h-5 w-5 text-white" />}
            iconBg="bg-blue-600"
            loading={overviewLoading}
          />
          <StatCard
            title="Avg Order Value"
            value={summary ? formatCurrency(summary.avgOrderValue) : '$0.00'}
            icon={<Receipt className="h-5 w-5 text-white" />}
            iconBg="bg-purple-600"
            loading={overviewLoading}
          />
          <StatCard
            title="Tax Collected"
            value={summary ? formatCurrency(summary.taxCollected) : '$0.00'}
            icon={<Tag className="h-5 w-5 text-white" />}
            iconBg="bg-indigo-600"
            loading={overviewLoading}
          />
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="by-product">By Product</TabsTrigger>
            <TabsTrigger value="staff">Staff Performance</TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ──────────────────────────────────────────────── */}
          <TabsContent value="overview">
            <div className="space-y-4">

              {/* Error state */}
              {overviewError && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-12 text-center">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <p className="text-sm font-medium text-foreground">Failed to load overview data</p>
                  <Button variant="outline" size="sm" onClick={() => refetchOverview()} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              )}

              {/* Revenue chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Daily Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  {overviewLoading ? (
                    <Skeleton className="h-[260px] w-full rounded-lg" />
                  ) : chartData.length === 0 ? (
                    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                      No revenue data for this period.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
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
                          tickFormatter={(v) =>
                            `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`
                          }
                          width={48}
                        />
                        <Tooltip content={<RevenueTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke="#1B4332"
                          strokeWidth={2.5}
                          fill="url(#salesGrad)"
                          dot={false}
                          activeDot={{ r: 5, fill: '#1B4332', strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Two-column bottom: peak hours + top products */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

                {/* Peak Hours */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Peak Hours</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Order volume by hour of day
                    </p>
                  </CardHeader>
                  <CardContent>
                    <PeakHoursHeatmap data={peakHours} loading={overviewLoading} />
                  </CardContent>
                </Card>

                {/* Top Products (from overview) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Top Products</CardTitle>
                    <p className="text-xs text-muted-foreground">Best sellers this period</p>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    {overviewLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-4 w-5 flex-shrink-0" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-4 w-16 flex-shrink-0" />
                            <Skeleton className="h-4 w-20 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    ) : (overview?.topProducts ?? []).length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No product data for this period.
                      </p>
                    ) : (
                      <table className="w-full min-w-[320px] text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-8">#</th>
                            <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Product</th>
                            <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Qty</th>
                            <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {(overview?.topProducts ?? []).slice(0, 5).map((p, idx) => (
                            <tr key={p.productId} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                              <td className="py-2.5 font-medium text-foreground">{p.name}</td>
                              <td className="py-2.5 text-right text-xs text-muted-foreground">{formatNumber(p.quantity)}</td>
                              <td className="py-2.5 text-right text-xs font-semibold text-foreground">{formatCurrency(p.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── Transactions Tab ───────────────────────────────────────────── */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Transactions</CardTitle>
                <p className="text-xs text-muted-foreground">
                  All orders in the selected period
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {txError && (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                    <p className="text-sm font-medium text-foreground">Failed to load transactions</p>
                    <Button variant="outline" size="sm" onClick={() => refetchTx()} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Try Again
                    </Button>
                  </div>
                )}
                {txLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-4 w-24 flex-shrink-0" />
                        <Skeleton className="h-4 w-32 flex-shrink-0" />
                        <Skeleton className="h-4 w-16 flex-shrink-0" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-20 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : !txError && (
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">ID</th>
                        <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                        <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                        <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Cashier</th>
                        <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Customer</th>
                        <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Items</th>
                        <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                            No transactions found for this period.
                          </td>
                        </tr>
                      ) : (
                        transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-muted/30 transition-colors group">
                            <td className="py-2.5 font-mono text-xs text-muted-foreground">
                              #{tx.id.slice(-8).toUpperCase()}
                            </td>
                            <td className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                              {formatDateTime(tx.createdAt)}
                            </td>
                            <td className="py-2.5">
                              <Badge variant={typeBadgeVariant(tx.type)} className="capitalize text-[10px]">
                                {tx.type?.replace(/_/g, ' ') ?? 'N/A'}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-xs text-foreground">
                              {tx.cashier?.name ?? '—'}
                            </td>
                            <td className="py-2.5 text-xs text-foreground">
                              {tx.customer?.user?.name ?? 'Walk-in'}
                            </td>
                            <td className="py-2.5 text-right text-xs text-muted-foreground">
                              {tx.items?.length ?? 0}
                            </td>
                            <td className="py-2.5 text-right text-xs font-semibold text-foreground">
                              {formatCurrency(tx.total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── By Product Tab ─────────────────────────────────────────────── */}
          <TabsContent value="by-product">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Sales by Product</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Products ranked by revenue this period
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {byProductError && (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                    <p className="text-sm font-medium text-foreground">Failed to load product data</p>
                    <Button variant="outline" size="sm" onClick={() => refetchByProduct()} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Try Again
                    </Button>
                  </div>
                )}
                {byProductLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-4 w-6 flex-shrink-0" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-16 flex-shrink-0" />
                        <Skeleton className="h-4 w-20 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : !byProductError && (
                  <table className="w-full min-w-[460px] text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-10">Rank</th>
                        <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Product Name</th>
                        <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Qty Sold</th>
                        <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                            No product sales data for this period.
                          </td>
                        </tr>
                      ) : (
                        [...products]
                          .sort((a, b) => b.revenue - a.revenue)
                          .map((p, idx) => (
                            <tr key={p.productId} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2.5">
                                <span
                                  className={[
                                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
                                    idx === 0
                                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                      : idx === 1
                                      ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                      : idx === 2
                                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                      : 'bg-muted text-muted-foreground',
                                  ].join(' ')}
                                >
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-2.5 font-medium text-foreground">{p.name}</td>
                              <td className="py-2.5 text-right text-xs text-muted-foreground">
                                {formatNumber(p.quantity)}
                              </td>
                              <td className="py-2.5 text-right text-xs font-semibold text-foreground">
                                {formatCurrency(p.revenue)}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Staff Performance Tab ──────────────────────────────────────── */}
          <TabsContent value="staff">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Staff Performance</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Cashier-level sales metrics this period
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {staffError && (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                    <p className="text-sm font-medium text-foreground">Failed to load staff data</p>
                    <Button variant="outline" size="sm" onClick={() => refetchStaff()} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Try Again
                    </Button>
                  </div>
                )}
                {staffLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-16 flex-shrink-0" />
                        <Skeleton className="h-4 w-20 flex-shrink-0" />
                        <Skeleton className="h-4 w-20 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : !staffError && (
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Staff Member</th>
                        <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Orders</th>
                        <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Revenue</th>
                        <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Order</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {staffPerf.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                            No staff performance data for this period.
                          </td>
                        </tr>
                      ) : (
                        [...staffPerf]
                          .sort((a, b) => b.revenue - a.revenue)
                          .map((s) => {
                            const avg =
                              s.avgOrder ?? (s.orders > 0 ? s.revenue / s.orders : 0);
                            const initials = s.name
                              .split(' ')
                              .map((w) => w[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2);
                            return (
                              <tr key={s.cashierId} className="hover:bg-muted/30 transition-colors">
                                <td className="py-2.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1B4332] text-[11px] font-bold text-white">
                                      {initials}
                                    </div>
                                    <span className="font-medium text-foreground">{s.name}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 text-right text-xs text-muted-foreground">
                                  {formatNumber(s.orders)}
                                </td>
                                <td className="py-2.5 text-right text-xs font-semibold text-foreground">
                                  {formatCurrency(s.revenue)}
                                </td>
                                <td className="py-2.5 text-right text-xs text-muted-foreground">
                                  {formatCurrency(avg)}
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
