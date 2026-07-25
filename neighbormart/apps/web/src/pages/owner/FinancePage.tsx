import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  Plus,
  CheckCircle,
  XCircle,
  Trash2,
  BarChart3,
  Receipt,
  Percent,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { formatCurrency, formatDate } from '@/utils/format';
import api from '@/services/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PLData {
  period: { from: string; to: string };
  income: { revenue: number; tax: number; discounts: number };
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  expenses: { total: number; byCategory: Record<string, number> };
  waste: number;
  netProfit: number;
  netMargin: number;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  status: string;
  loggedByUser: { name: string } | null;
  approvedByUser: { name: string } | null;
}

interface ExpensesData {
  expenses: Expense[];
}

interface ForecastPoint {
  date: string;
  amount?: number;
  predicted?: number;
}

interface ForecastData {
  history: { date: string; amount: number }[];
  forecast: { date: string; predicted: number }[];
}

interface TaxConfig {
  id: string;
  taxName: string;
  taxRate: number;
  taxType: string;
  categoryId: string | null;
  isActive: boolean;
}

interface TaxConfigsData {
  taxConfigs: TaxConfig[];
}

// ─── Date helpers ───────────────────────────────────────────────────────────────

function thisMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
  };
}

function lastMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
}

function thisQuarterRange() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const from = new Date(now.getFullYear(), q * 3, 1);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
  };
}

function thisYearRange() {
  const now = new Date();
  return {
    dateFrom: `${now.getFullYear()}-01-01`,
    dateTo: now.toISOString().slice(0, 10),
  };
}

type DatePreset = 'this-month' | 'last-month' | 'this-quarter' | 'this-year' | 'custom';

const PRESET_LABELS: Record<DatePreset, string> = {
  'this-month': 'This Month',
  'last-month': 'Last Month',
  'this-quarter': 'This Quarter',
  'this-year': 'This Year',
  custom: 'Custom',
};

function getRangeForPreset(p: DatePreset) {
  if (p === 'this-month') return thisMonthRange();
  if (p === 'last-month') return lastMonthRange();
  if (p === 'this-quarter') return thisQuarterRange();
  if (p === 'this-year') return thisYearRange();
  return thisMonthRange();
}

// ─── Expense categories ─────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Other'];

// ─── Custom tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-sm">
      <p className="text-muted-foreground text-xs mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── P&L Stat card ─────────────────────────────────────────────────────────────

interface PLStatProps {
  title: string;
  value: number;
  margin?: number;
  icon: React.ReactNode;
  iconBg: string;
  positive?: boolean;
  loading?: boolean;
  subtitle?: string;
}

function PLStat({ title, value, margin, icon, iconBg, positive, loading, subtitle }: PLStatProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-11 w-11 rounded-xl flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isNeg = value < 0;
  const displayPositive = positive !== undefined ? positive : !isNeg;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <p
              className={[
                'mt-1.5 text-2xl font-bold leading-none',
                displayPositive ? 'text-foreground' : 'text-red-600 dark:text-red-400',
              ].join(' ')}
            >
              {formatCurrency(value)}
            </p>
            {margin !== undefined && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Percent className="h-3 w-3" />
                Margin: {margin.toFixed(1)}%
              </p>
            )}
            {subtitle && (
              <p className="mt-1.5 text-xs text-muted-foreground">{subtitle}</p>
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

// ─── Main component ─────────────────────────────────────────────────────────────

export default function FinancePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('pl');

  // ── P&L date range ─────────────────────────────────────────────────────────
  const [preset, setPreset] = useState<DatePreset>('this-month');
  const [dateFrom, setDateFrom] = useState(() => thisMonthRange().dateFrom);
  const [dateTo, setDateTo] = useState(() => thisMonthRange().dateTo);

  function applyPreset(p: DatePreset) {
    setPreset(p);
    if (p !== 'custom') {
      const range = getRangeForPreset(p);
      setDateFrom(range.dateFrom);
      setDateTo(range.dateTo);
    }
  }

  // ── Expense filters ─────────────────────────────────────────────────────────
  const [expenseStatus, setExpenseStatus] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');

  // ── Add expense dialog ──────────────────────────────────────────────────────
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [expForm, setExpForm] = useState({
    category: 'Rent',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

  // ── Add tax config dialog ───────────────────────────────────────────────────
  const [addTaxOpen, setAddTaxOpen] = useState(false);
  const [taxForm, setTaxForm] = useState({
    taxName: '',
    taxRate: '',
    taxType: 'PERCENTAGE',
    isActive: true,
  });

  // ── Queries ─────────────────────────────────────────────────────────────────

  const {
    data: plData,
    isLoading: plLoading,
    isError: plError,
    refetch: refetchPL,
  } = useQuery<PLData>({
    queryKey: ['finance', 'pl', dateFrom, dateTo],
    queryFn: async () => {
      const res = await api.get('/finance/pl', { params: { dateFrom, dateTo } });
      const raw = res.data?.data ?? res.data;
      return raw as PLData;
    },
    staleTime: 60_000,
    enabled: tab === 'pl',
  });

  const {
    data: expensesData,
    isLoading: expensesLoading,
    isError: expensesError,
    refetch: refetchExpenses,
  } = useQuery<ExpensesData>({
    queryKey: ['expenses', expenseStatus, expenseCategory],
    queryFn: async () => {
      const res = await api.get('/finance/expenses', {
        params: {
          page: 1,
          limit: 100,
          ...(expenseStatus ? { status: expenseStatus } : {}),
          ...(expenseCategory ? { category: expenseCategory } : {}),
        },
      });
      const raw = res.data?.data ?? res.data;
      return raw as ExpensesData;
    },
    staleTime: 30_000,
    enabled: tab === 'expenses',
  });

  const {
    data: forecastData,
    isLoading: forecastLoading,
    isError: forecastError,
    refetch: refetchForecast,
  } = useQuery<ForecastData>({
    queryKey: ['finance', 'forecast'],
    queryFn: async () => {
      const res = await api.get('/finance/forecast');
      const raw = res.data?.data ?? res.data;
      return raw as ForecastData;
    },
    staleTime: 5 * 60_000,
    enabled: tab === 'forecast',
  });

  const {
    data: taxData,
    isLoading: taxLoading,
    isError: taxError,
    refetch: refetchTax,
  } = useQuery<TaxConfigsData>({
    queryKey: ['finance', 'tax-configs'],
    queryFn: async () => {
      const res = await api.get('/finance/tax-configs');
      const raw = res.data?.data ?? res.data;
      return raw as TaxConfigsData;
    },
    staleTime: 5 * 60_000,
    enabled: tab === 'tax',
  });

  // ── Mutations ───────────────────────────────────────────────────────────────

  const createExpense = useMutation({
    mutationFn: async (body: { category: string; amount: number; description: string; date: string }) => {
      const res = await api.post('/finance/expenses', body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setAddExpenseOpen(false);
      setExpForm({ category: 'Rent', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
      toast({ title: 'Expense added', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Failed to add expense', variant: 'error' });
    },
  });

  const approveExpense = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) => {
      const res = await api.patch(`/finance/expenses/${id}/approve`, { status });
      return res.data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({
        title: status === 'APPROVED' ? 'Expense approved' : 'Expense rejected',
        variant: status === 'APPROVED' ? 'success' : 'warning',
      });
    },
    onError: () => {
      toast({ title: 'Action failed', variant: 'error' });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/finance/expenses/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Expense deleted', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Failed to delete expense', variant: 'error' });
    },
  });

  const createTaxConfig = useMutation({
    mutationFn: async (body: { taxName: string; taxRate: number; taxType: string; isActive: boolean }) => {
      const res = await api.post('/finance/tax-configs', body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'tax-configs'] });
      setAddTaxOpen(false);
      setTaxForm({ taxName: '', taxRate: '', taxType: 'PERCENTAGE', isActive: true });
      toast({ title: 'Tax rule created', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Failed to create tax rule', variant: 'error' });
    },
  });

  // ── Derived data ────────────────────────────────────────────────────────────

  const pl = plData;
  const expenses = expensesData?.expenses ?? [];
  const taxConfigs = taxData?.taxConfigs ?? [];

  // Build combined chart data for forecast tab
  const combinedChartData: ForecastPoint[] = [];
  if (forecastData) {
    forecastData.history.forEach((h) => {
      combinedChartData.push({
        date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: h.amount,
      });
    });
    // Overlap last history point with first forecast for continuity
    const lastHistory = forecastData.history[forecastData.history.length - 1];
    forecastData.forecast.forEach((f, idx) => {
      combinedChartData.push({
        date: new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ...(idx === 0 && lastHistory ? { amount: lastHistory.amount } : {}),
        predicted: f.predicted,
      });
    });
  }

  // Category breakdown for bar chart
  const categoryEntries = pl
    ? Object.entries(pl.expenses.byCategory).sort((a, b) => b[1] - a[1])
    : [];

  // ── Status badge variant ────────────────────────────────────────────────────
  function statusVariant(s: string): 'success' | 'warning' | 'error' | 'outline' {
    if (s === 'APPROVED') return 'success';
    if (s === 'PENDING') return 'warning';
    if (s === 'REJECTED') return 'error';
    return 'outline';
  }

  // ── Handle add expense submit ───────────────────────────────────────────────
  function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(expForm.amount);
    if (!expForm.description.trim() || isNaN(amt) || amt <= 0) {
      toast({ title: 'Please fill all required fields with valid values', variant: 'warning' });
      return;
    }
    createExpense.mutate({
      category: expForm.category,
      amount: amt,
      description: expForm.description.trim(),
      date: expForm.date,
    });
  }

  // ── Handle add tax submit ───────────────────────────────────────────────────
  function handleAddTax(e: React.FormEvent) {
    e.preventDefault();
    const rate = parseFloat(taxForm.taxRate);
    if (!taxForm.taxName.trim() || isNaN(rate) || rate < 0) {
      toast({ title: 'Please fill all required fields with valid values', variant: 'warning' });
      return;
    }
    createTaxConfig.mutate({
      taxName: taxForm.taxName.trim(),
      taxRate: rate,
      taxType: taxForm.taxType,
      isActive: taxForm.isActive,
    });
  }

  // ── Current tab refresh ─────────────────────────────────────────────────────
  function handleRefresh() {
    if (tab === 'pl') refetchPL();
    if (tab === 'expenses') refetchExpenses();
    if (tab === 'forecast') refetchForecast();
    if (tab === 'tax') refetchTax();
  }

  const isCurrentTabLoading =
    (tab === 'pl' && plLoading) ||
    (tab === 'expenses' && expensesLoading) ||
    (tab === 'forecast' && forecastLoading) ||
    (tab === 'tax' && taxLoading);

  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Finance</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Profit &amp; Loss, expenses, revenue forecast, and tax configuration
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2 self-start"
            disabled={isCurrentTabLoading}
          >
            <RefreshCw className={['h-4 w-4', isCurrentTabLoading ? 'animate-spin' : ''].join(' ')} />
            Refresh
          </Button>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pl">P&amp;L</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="tax">Tax Config</TabsTrigger>
          </TabsList>

          {/* ════════════════════════════════════════════════════════════════
              P&L TAB
          ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="pl" className="space-y-4 mt-4">

            {/* Date Range Filter */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
                    {(['this-month', 'last-month', 'this-quarter', 'this-year'] as DatePreset[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => applyPreset(p)}
                        className={[
                          'rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150',
                          preset === p
                            ? 'bg-card shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                        ].join(' ')}
                      >
                        {PRESET_LABELS[p]}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 ml-auto flex-wrap">
                    <span className="text-xs text-muted-foreground">From</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setPreset('custom');
                      }}
                      className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                    />
                    <span className="text-xs text-muted-foreground">To</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setPreset('custom');
                      }}
                      className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error state */}
            {plError && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-12 text-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <p className="text-sm font-medium text-foreground">Failed to load P&L data</p>
                <Button variant="outline" size="sm" onClick={() => refetchPL()} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Try Again
                </Button>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <PLStat
                title="Revenue"
                value={pl?.income.revenue ?? 0}
                icon={<DollarSign className="h-5 w-5 text-white" />}
                iconBg="bg-[#1B4332]"
                positive
                loading={plLoading}
                subtitle={pl ? `Tax: ${formatCurrency(pl.income.tax)} · Disc: ${formatCurrency(pl.income.discounts)}` : undefined}
              />
              <PLStat
                title="Cost of Goods"
                value={pl?.cogs ?? 0}
                icon={<BarChart3 className="h-5 w-5 text-white" />}
                iconBg="bg-orange-600"
                loading={plLoading}
              />
              <PLStat
                title="Gross Profit"
                value={pl?.grossProfit ?? 0}
                margin={pl?.grossMargin}
                icon={<TrendingUp className="h-5 w-5 text-white" />}
                iconBg="bg-blue-600"
                positive={(pl?.grossProfit ?? 0) >= 0}
                loading={plLoading}
              />
              <PLStat
                title="Operating Expenses"
                value={pl?.expenses.total ?? 0}
                icon={<Receipt className="h-5 w-5 text-white" />}
                iconBg="bg-purple-600"
                loading={plLoading}
                subtitle={pl ? `Waste: ${formatCurrency(pl.waste)}` : undefined}
              />
              <PLStat
                title="Net Profit"
                value={pl?.netProfit ?? 0}
                margin={pl?.netMargin}
                icon={
                  (pl?.netProfit ?? 0) >= 0
                    ? <TrendingUp className="h-5 w-5 text-white" />
                    : <TrendingDown className="h-5 w-5 text-white" />
                }
                iconBg={(pl?.netProfit ?? 0) >= 0 ? 'bg-emerald-600' : 'bg-red-600'}
                positive={(pl?.netProfit ?? 0) >= 0}
                loading={plLoading}
              />
            </div>

            {/* Expense breakdown by category */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Expense Breakdown by Category</CardTitle>
                <p className="text-xs text-muted-foreground">Operating expenses for the selected period</p>
              </CardHeader>
              <CardContent>
                {plLoading ? (
                  <Skeleton className="h-[220px] w-full rounded-lg" />
                ) : categoryEntries.length === 0 ? (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    No expense data for this period.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categoryEntries.map(([cat, amt]) => {
                      const max = categoryEntries[0][1] || 1;
                      const pct = Math.round((amt / max) * 100);
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground">{cat}</span>
                            <span className="text-muted-foreground">{formatCurrency(amt)}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#1B4332] transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════
              EXPENSES TAB
          ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="expenses" className="space-y-4 mt-4">

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status filter */}
              <div className="w-40">
                <Select
                  value={expenseStatus || '__all__'}
                  onValueChange={(v) => setExpenseStatus(v === '__all__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category filter */}
              <div className="w-44">
                <Select
                  value={expenseCategory || '__all__'}
                  onValueChange={(v) => setExpenseCategory(v === '__all__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Categories</SelectItem>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => setAddExpenseOpen(true)}
                className="ml-auto gap-2 bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Add Expense
              </Button>
            </div>

            {/* Error state */}
            {expensesError && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-12 text-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <p className="text-sm font-medium text-foreground">Failed to load expenses</p>
                <Button variant="outline" size="sm" onClick={() => refetchExpenses()} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Try Again
                </Button>
              </div>
            )}

            {/* Expenses table */}
            {!expensesError && (
              <Card>
                <CardContent className="overflow-x-auto p-0">
                  {expensesLoading ? (
                    <div className="space-y-3 p-5">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-4 w-20 flex-shrink-0" />
                          <Skeleton className="h-4 w-24 flex-shrink-0" />
                          <Skeleton className="h-4 w-16 flex-shrink-0" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="h-4 w-20 flex-shrink-0" />
                          <Skeleton className="h-6 w-16 flex-shrink-0 rounded-md" />
                          <Skeleton className="h-7 w-20 flex-shrink-0 rounded-md" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {['Date', 'Category', 'Amount', 'Description', 'Logged By', 'Status', 'Actions'].map((h) => (
                            <th
                              key={h}
                              className={[
                                'px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground',
                                h === 'Amount' || h === 'Actions' ? 'text-right' : 'text-left',
                              ].join(' ')}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {expenses.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                              No expenses found.
                            </td>
                          </tr>
                        ) : (
                          expenses.map((exp) => (
                            <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                {formatDate(exp.date)}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-foreground">{exp.category}</td>
                              <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                                {formatCurrency(exp.amount)}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                                {exp.description || '—'}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {exp.loggedByUser?.name ?? '—'}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={statusVariant(exp.status)} className="capitalize text-[10px]">
                                  {exp.status?.toLowerCase()}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  {exp.status === 'PENDING' && (
                                    <>
                                      <button
                                        onClick={() => approveExpense.mutate({ id: exp.id, status: 'APPROVED' })}
                                        disabled={approveExpense.isPending}
                                        title="Approve"
                                        className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => approveExpense.mutate({ id: exp.id, status: 'REJECTED' })}
                                        disabled={approveExpense.isPending}
                                        title="Reject"
                                        className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (confirm('Delete this expense?')) {
                                        deleteExpense.mutate(exp.id);
                                      }
                                    }}
                                    disabled={deleteExpense.isPending}
                                    title="Delete"
                                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-500 transition-colors disabled:opacity-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════
              FORECAST TAB
          ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="forecast" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Revenue Forecast</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Last 30 days of actual revenue + 7-day AI forecast
                </p>
              </CardHeader>
              <CardContent>
                {forecastError && (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                    <p className="text-sm font-medium text-foreground">Failed to load forecast</p>
                    <Button variant="outline" size="sm" onClick={() => refetchForecast()} className="gap-2">
                      <RefreshCw className="h-4 w-4" /> Try Again
                    </Button>
                  </div>
                )}

                {forecastLoading ? (
                  <Skeleton className="h-[320px] w-full rounded-lg" />
                ) : !forecastError && combinedChartData.length === 0 ? (
                  <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                    No forecast data available.
                  </div>
                ) : !forecastError && (
                  <>
                    <ResponsiveContainer width="100%" height={320}>
                      <ComposedChart data={combinedChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                          axisLine={false}
                          tickLine={false}
                          dy={6}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                          width={52}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend
                          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                          formatter={(value) =>
                            value === 'amount' ? 'Actual Revenue' : 'Forecast'
                          }
                        />
                        {/* Divider between history and forecast */}
                        {forecastData && forecastData.history.length > 0 && (
                          <ReferenceLine
                            x={new Date(
                              forecastData.history[forecastData.history.length - 1].date
                            ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            stroke="var(--muted-foreground)"
                            strokeDasharray="4 4"
                            strokeOpacity={0.5}
                            label={{
                              value: 'Today',
                              position: 'insideTopRight',
                              fontSize: 10,
                              fill: 'var(--muted-foreground)',
                            }}
                          />
                        )}
                        <Bar
                          dataKey="amount"
                          name="amount"
                          fill="#1B4332"
                          fillOpacity={0.8}
                          radius={[3, 3, 0, 0]}
                          maxBarSize={20}
                        />
                        <Line
                          type="monotone"
                          dataKey="predicted"
                          name="predicted"
                          stroke="#16a34a"
                          strokeWidth={2.5}
                          strokeDasharray="6 3"
                          dot={{ r: 4, fill: '#16a34a', strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: '#16a34a', strokeWidth: 0 }}
                          connectNulls
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#1B4332]" />
                        Actual daily revenue (last 30 days)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-0.5 w-5 bg-green-600"
                          style={{ borderTop: '2px dashed #16a34a' }}
                        />
                        Predicted revenue (7 days)
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════
              TAX CONFIG TAB
          ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="tax" className="space-y-4 mt-4">

            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Configure tax rules applied to products and orders
                </p>
              </div>
              <Button
                onClick={() => setAddTaxOpen(true)}
                className="gap-2 bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Add Tax Rule
              </Button>
            </div>

            {/* Error state */}
            {taxError && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-12 text-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <p className="text-sm font-medium text-foreground">Failed to load tax configurations</p>
                <Button variant="outline" size="sm" onClick={() => refetchTax()} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Try Again
                </Button>
              </div>
            )}

            {!taxError && (
              <Card>
                <CardContent className="overflow-x-auto p-0">
                  {taxLoading ? (
                    <div className="space-y-3 p-5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="h-4 w-16 flex-shrink-0" />
                          <Skeleton className="h-4 w-24 flex-shrink-0" />
                          <Skeleton className="h-6 w-14 flex-shrink-0 rounded-md" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {['Tax Name', 'Rate', 'Type', 'Active'].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {taxConfigs.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                              No tax rules configured yet.
                            </td>
                          </tr>
                        ) : (
                          taxConfigs.map((tc) => (
                            <tr key={tc.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-[#1B4332] flex-shrink-0" />
                                {tc.taxName}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                                {tc.taxRate}%
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="info" className="text-[10px] capitalize">
                                  {tc.taxType?.toLowerCase().replace(/_/g, ' ')}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={tc.isActive ? 'success' : 'outline'} className="text-[10px]">
                                  {tc.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ADD EXPENSE DIALOG
      ════════════════════════════════════════════════════════════════ */}
      <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Category</label>
              <Select
                value={expForm.category}
                onValueChange={(v) => setExpForm((p) => ({ ...p, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={expForm.amount}
                  onChange={(e) => setExpForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-border bg-background pl-7 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={expForm.description}
                onChange={(e) => setExpForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Describe the expense..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Date</label>
              <input
                type="date"
                value={expForm.date}
                onChange={(e) => setExpForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddExpenseOpen(false)}
                disabled={createExpense.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createExpense.isPending}
                className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
              >
                {createExpense.isPending ? 'Saving…' : 'Add Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════
          ADD TAX RULE DIALOG
      ════════════════════════════════════════════════════════════════ */}
      <Dialog open={addTaxOpen} onOpenChange={setAddTaxOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tax Rule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTax} className="space-y-4">
            {/* Tax Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Tax Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={taxForm.taxName}
                onChange={(e) => setTaxForm((p) => ({ ...p, taxName: e.target.value }))}
                placeholder="e.g. State Sales Tax"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
              />
            </div>

            {/* Tax Rate */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Rate (%) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  value={taxForm.taxRate}
                  onChange={(e) => setTaxForm((p) => ({ ...p, taxRate: e.target.value }))}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-border bg-background px-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>

            {/* Tax Type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Type</label>
              <Select
                value={taxForm.taxType}
                onValueChange={(v) => setTaxForm((p) => ({ ...p, taxType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FLAT">Flat</SelectItem>
                  <SelectItem value="INCLUSIVE">Inclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="taxActive"
                checked={taxForm.isActive}
                onChange={(e) => setTaxForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-[#1B4332]"
              />
              <label htmlFor="taxActive" className="text-sm font-medium text-foreground cursor-pointer">
                Active
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddTaxOpen(false)}
                disabled={createTaxConfig.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTaxConfig.isPending}
                className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
              >
                {createTaxConfig.isPending ? 'Saving…' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
