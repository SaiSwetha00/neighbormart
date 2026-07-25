import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  Bell,
  Shield,
  Database,
  Upload,
  Download,
  Monitor,
  Smartphone,
  Globe,
  Mail,
  AlertCircle,
  Package,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Info,
  Trash2,
  QrCode,
  CheckCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import api from '@/services/api';
import { formatDateTime, formatRelativeTime } from '@/utils/format';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoreProfile {
  name: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  timezone: string;
  logo?: string;
  lowStockThreshold: number;
  salesGoalTarget: number;
  taxRate: number;
  taxInclusive: boolean;
}

interface NotificationPrefs {
  lowStockEmail: boolean;
  lowStockApp: boolean;
  outOfStockEmail: boolean;
  outOfStockApp: boolean;
  expiringEmail: boolean;
  expiringApp: boolean;
  purchaseOrderEmail: boolean;
  purchaseOrderApp: boolean;
  staffClockEmail: boolean;
  staffClockApp: boolean;
  dailySummaryEmail: boolean;
  weeklyReportEmail: boolean;
}

interface Session {
  id: string;
  device: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
  browser?: string;
}

interface LoginHistory {
  id: string;
  date: string;
  ip: string;
  device: string;
  status: 'SUCCESS' | 'FAILED';
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const storeSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().min(1, 'Currency is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  lowStockThreshold: z.coerce.number().min(0),
  salesGoalTarget: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100),
  taxInclusive: z.boolean(),
});

type StoreFormValues = z.infer<typeof storeSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'India', 'Germany', 'France', 'Brazil', 'Nigeria', 'Kenya', 'South Africa'];
const CURRENCIES = ['USD', 'GBP', 'CAD', 'AUD', 'INR', 'EUR', 'BRL', 'NGN', 'KES', 'ZAR'];
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Kolkata', 'Asia/Tokyo',
  'Australia/Sydney', 'Africa/Lagos', 'Africa/Nairobi',
];

const NOTIFICATION_ROWS = [
  { key: 'lowStock', icon: Package, label: 'Low stock alerts', desc: 'When a product falls below the threshold' },
  { key: 'outOfStock', icon: AlertCircle, label: 'Out of stock alerts', desc: 'When a product is fully out of stock' },
  { key: 'expiring', icon: Calendar, label: 'Expiring product alerts', desc: 'Products nearing their expiry date' },
  { key: 'purchaseOrder', icon: TrendingUp, label: 'New purchase orders', desc: 'When a new purchase order is placed' },
  { key: 'staffClock', icon: Clock, label: 'Staff clock-in/out', desc: 'When staff members clock in or out' },
  { key: 'dailySummary', icon: Mail, label: 'Daily summary email', desc: 'A daily digest of store activity', emailOnly: true },
  { key: 'weeklyReport', icon: Mail, label: 'Weekly report email', desc: 'A weekly performance report', emailOnly: true },
] as const;

// ─── Store Tab ────────────────────────────────────────────────────────────────

function StoreTab() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery<StoreProfile>({
    queryKey: ['store-profile'],
    queryFn: async () => {
      const res = await api.get('/store');
      const d = res.data?.data ?? res.data;
      return {
        name: d.name ?? '',
        address: d.address ?? '',
        city: d.city ?? '',
        country: d.country ?? '',
        currency: d.currency ?? 'USD',
        timezone: d.timezone ?? 'America/New_York',
        logo: d.logo,
        lowStockThreshold: d.lowStockThreshold ?? 10,
        salesGoalTarget: d.salesGoal ?? 0,
        taxRate: d.taxRate ?? 0,
        taxInclusive: d.taxInclusive ?? false,
      } as StoreProfile;
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    values: profile
      ? {
          name: profile.name,
          address: profile.address ?? '',
          city: profile.city ?? '',
          country: profile.country ?? '',
          currency: profile.currency,
          timezone: profile.timezone,
          lowStockThreshold: profile.lowStockThreshold,
          salesGoalTarget: profile.salesGoalTarget,
          taxRate: profile.taxRate,
          taxInclusive: profile.taxInclusive,
        }
      : undefined,
  });

  const taxInclusive = watch('taxInclusive');

  const mutation = useMutation({
    mutationFn: async (data: StoreFormValues) => {
      await api.put('/store', { ...data, salesGoal: data.salesGoalTarget });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store-profile'] }),
  });

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const form = new FormData();
      form.append('logo', file);
      await api.put('/profile/logo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['store-profile'] });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutateAsync(d))} className="space-y-6">
      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Store Logo</CardTitle>
          <CardDescription>Displayed in your storefront and receipts</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-5">
          <div
            className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-[var(--border)] cursor-pointer group"
            onClick={() => fileRef.current?.click()}
          >
            {logoPreview || profile?.logo ? (
              <img src={logoPreview ?? profile?.logo} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-[var(--muted)] flex items-center justify-center">
                <Store size={24} className="text-[var(--muted-foreground)]" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload size={18} className="text-white" />
            </div>
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Change Logo'}
            </Button>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">PNG, JPG up to 2MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoChange}
          />
        </CardContent>
      </Card>

      {/* Store Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Store Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-medium mb-1.5 block">
              Store Name <span className="text-red-500">*</span>
            </label>
            <Input {...register('name')} placeholder="NeighborMart" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium mb-1.5 block">Address</label>
            <Input {...register('address')} placeholder="123 Main Street" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">City</label>
            <Input {...register('city')} placeholder="New York" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Country</label>
            <Select
              value={watch('country')}
              onValueChange={(v) => setValue('country', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Currency</label>
            <Select
              value={watch('currency')}
              onValueChange={(v) => setValue('currency', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="USD" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Timezone</label>
            <Select
              value={watch('timezone')}
              onValueChange={(v) => setValue('timezone', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
              Low Stock Threshold
              <span className="group relative inline-flex">
                <Info size={13} className="text-[var(--muted-foreground)] cursor-help" />
                <span className="hidden group-hover:block absolute left-5 -top-1 z-10 bg-[var(--popover)] border border-[var(--border)] rounded px-2 py-1 text-xs w-52 shadow-md">
                  Products with quantity at or below this number will trigger a low stock alert.
                </span>
              </span>
            </label>
            <Input type="number" min="0" {...register('lowStockThreshold')} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Sales Goal Target</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">$</span>
              <Input type="number" min="0" {...register('salesGoalTarget')} className="pl-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tax Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-48">
            <label className="text-sm font-medium mb-1.5 block">Default Tax Rate (%)</label>
            <Input type="number" min="0" max="100" step="0.01" {...register('taxRate')} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
            <div>
              <p className="text-sm font-medium">Tax-Inclusive Pricing</p>
              <p className="text-xs text-[var(--muted-foreground)]">Product prices already include tax</p>
            </div>
            <Switch
              checked={taxInclusive}
              onCheckedChange={(v) => setValue('taxInclusive', v)}
            />
          </div>
        </CardContent>
      </Card>

      {mutation.isError && (
        <p className="text-sm text-red-500">Failed to save. Please try again.</p>
      )}
      {mutation.isSuccess && (
        <p className="text-sm text-green-600">Settings saved successfully.</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<NotificationPrefs>({
    queryKey: ['notification-prefs'],
    queryFn: async () => ({
      lowStockEmail: true, lowStockApp: true,
      outOfStockEmail: true, outOfStockApp: true,
      expiringEmail: true, expiringApp: true,
      purchaseOrderEmail: true, purchaseOrderApp: true,
      staffClockEmail: false, staffClockApp: true,
      dailySummaryEmail: true,
      weeklyReportEmail: true,
    }),
  });

  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  const currentPrefs: NotificationPrefs = prefs ?? data ?? {
    lowStockEmail: true, lowStockApp: true,
    outOfStockEmail: true, outOfStockApp: true,
    expiringEmail: true, expiringApp: true,
    purchaseOrderEmail: true, purchaseOrderApp: true,
    staffClockEmail: false, staffClockApp: true,
    dailySummaryEmail: true,
    weeklyReportEmail: true,
  };

  const toggle = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => ({
      ...(prev ?? currentPrefs),
      [key]: !(prev ?? currentPrefs)[key],
    }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      await api.put('/profile/notifications', currentPrefs);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-prefs'] });
    },
  });

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Preferences</CardTitle>
          <CardDescription>Choose how and where you receive alerts</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--border)]">
          {/* Header row */}
          <div className="flex items-center pb-2">
            <div className="flex-1" />
            <div className="flex gap-6 pr-1">
              <span className="text-xs font-semibold text-[var(--muted-foreground)] w-14 text-center">In-app</span>
              <span className="text-xs font-semibold text-[var(--muted-foreground)] w-14 text-center">Email</span>
            </div>
          </div>

          {NOTIFICATION_ROWS.map(({ key, icon: Icon, label, desc, emailOnly }) => (
            <div key={key} className="flex items-center gap-3 py-3">
              <div className="h-8 w-8 rounded-md bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-[var(--muted-foreground)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{desc}</p>
              </div>
              <div className="flex gap-6 pr-1">
                <div className="w-14 flex justify-center">
                  {!emailOnly ? (
                    <Switch
                      checked={currentPrefs[`${key}App` as keyof NotificationPrefs] as boolean}
                      onCheckedChange={() => toggle(`${key}App` as keyof NotificationPrefs)}
                    />
                  ) : (
                    <span className="text-xs text-[var(--muted-foreground)]">—</span>
                  )}
                </div>
                <div className="w-14 flex justify-center">
                  <Switch
                    checked={currentPrefs[`${key}Email` as keyof NotificationPrefs] as boolean}
                    onCheckedChange={() => toggle(`${key}Email` as keyof NotificationPrefs)}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {mutation.isError && <p className="text-sm text-red-500">Failed to save preferences.</p>}
      {mutation.isSuccess && <p className="text-sm text-green-600">Preferences saved.</p>}

      <div className="flex justify-end">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const qc = useQueryClient();
  const [mfaSetupOpen, setMfaSetupOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaPassword, setMfaPassword] = useState('');
  const [mfaStep, setMfaStep] = useState<'qr' | 'verify' | 'done'>('qr');
  const [mfaDisableOpen, setMfaDisableOpen] = useState(false);

  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ['auth-sessions'],
    queryFn: async () => [],
  });

  const { data: loginHistory, isLoading: historyLoading } = useQuery<LoginHistory[]>({
    queryKey: ['login-history'],
    queryFn: async () => [],
  });

  const { data: mfaStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ['mfa-status'],
    queryFn: async () => ({ enabled: false }),
  });

  const revokeSession = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/auth/sessions/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth-sessions'] }),
  });

  const revokeAll = useMutation({
    mutationFn: async () => { await api.delete('/auth/sessions'); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth-sessions'] }),
  });

  const enableMfa = useMutation({
    mutationFn: async () => {
      await api.post('/auth/mfa/enable', { code: mfaCode });
    },
    onSuccess: () => {
      setMfaStep('done');
      qc.invalidateQueries({ queryKey: ['mfa-status'] });
    },
  });

  const disableMfa = useMutation({
    mutationFn: async () => {
      await api.post('/auth/mfa/disable', { password: mfaPassword });
    },
    onSuccess: () => {
      setMfaDisableOpen(false);
      setMfaPassword('');
      qc.invalidateQueries({ queryKey: ['mfa-status'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Active Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base">Active Sessions</CardTitle>
            <CardDescription>Devices currently signed in to your account</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => revokeAll.mutate()}
            disabled={revokeAll.isPending}
          >
            Revoke All Others
          </Button>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--border)]">
          {sessionsLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full mb-2 rounded" />)
            : (sessions ?? []).map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-3">
                  <div className="h-9 w-9 rounded-full bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                    {s.device.toLowerCase().includes('mobile') ? (
                      <Smartphone size={16} className="text-[var(--muted-foreground)]" />
                    ) : (
                      <Monitor size={16} className="text-[var(--muted-foreground)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{s.device}</p>
                      {s.isCurrent && (
                        <Badge className="text-[10px] h-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {s.ip} · {s.location} · {formatRelativeTime(s.lastActive)}
                    </p>
                  </div>
                  {!s.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 text-xs"
                      onClick={() => revokeSession.mutate(s.id)}
                      disabled={revokeSession.isPending}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
        </CardContent>
      </Card>

      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Login History</CardTitle>
          <CardDescription>Last 10 sign-in attempts</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">IP</th>
                  <th className="pb-2 font-medium">Device</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {(loginHistory ?? []).map((h) => (
                  <tr key={h.id} className="text-sm">
                    <td className="py-2.5 text-xs text-[var(--muted-foreground)]">{formatDateTime(h.date)}</td>
                    <td className="py-2.5 font-mono text-xs">{h.ip}</td>
                    <td className="py-2.5 text-xs">{h.device}</td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                          h.status === 'SUCCESS'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* 2FA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={20} className={mfaStatus?.enabled ? 'text-green-600' : 'text-[var(--muted-foreground)]'} />
            <div>
              <p className="text-sm font-medium">
                Status:{' '}
                <span className={mfaStatus?.enabled ? 'text-green-600' : 'text-[var(--muted-foreground)]'}>
                  {mfaStatus?.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {mfaStatus?.enabled
                  ? 'Your account is protected with 2FA'
                  : 'Enable 2FA to secure your account'}
              </p>
            </div>
          </div>
          {mfaStatus?.enabled ? (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200"
              onClick={() => setMfaDisableOpen(true)}
            >
              Disable 2FA
            </Button>
          ) : (
            <Button size="sm" onClick={() => { setMfaStep('qr'); setMfaSetupOpen(true); }}>
              Enable 2FA
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Enable 2FA Dialog */}
      <Dialog open={mfaSetupOpen} onOpenChange={(v) => { if (!v) { setMfaSetupOpen(false); setMfaStep('qr'); setMfaCode(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set up Two-Factor Authentication</DialogTitle>
          </DialogHeader>
          {mfaStep === 'qr' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              <div className="flex justify-center">
                <div className="h-44 w-44 bg-[var(--muted)] rounded-lg flex items-center justify-center">
                  <QrCode size={80} className="text-[var(--muted-foreground)]" />
                </div>
              </div>
              <div className="rounded-md bg-[var(--muted)] px-3 py-2 font-mono text-xs text-center break-all">
                JBSWY3DPEHPK3PXP (setup key)
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMfaSetupOpen(false)}>Cancel</Button>
                <Button onClick={() => setMfaStep('verify')}>Next</Button>
              </DialogFooter>
            </div>
          )}
          {mfaStep === 'verify' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Enter the 6-digit code from your authenticator app to verify setup.
              </p>
              <Input
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-lg font-mono tracking-widest"
              />
              {enableMfa.isError && <p className="text-xs text-red-500">Invalid code. Please try again.</p>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setMfaStep('qr')}>Back</Button>
                <Button
                  onClick={() => enableMfa.mutate()}
                  disabled={mfaCode.length !== 6 || enableMfa.isPending}
                >
                  {enableMfa.isPending ? 'Verifying…' : 'Verify & Enable'}
                </Button>
              </DialogFooter>
            </div>
          )}
          {mfaStep === 'done' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle size={48} className="text-green-500" />
              <p className="text-base font-semibold">2FA Enabled!</p>
              <p className="text-sm text-[var(--muted-foreground)] text-center">
                Your account is now protected with two-factor authentication.
              </p>
              <Button onClick={() => setMfaSetupOpen(false)}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <Dialog open={mfaDisableOpen} onOpenChange={setMfaDisableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your current password to confirm disabling 2FA.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Current password"
            value={mfaPassword}
            onChange={(e) => setMfaPassword(e.target.value)}
          />
          {disableMfa.isError && <p className="text-xs text-red-500">Incorrect password.</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMfaDisableOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => disableMfa.mutate()}
              disabled={!mfaPassword || disableMfa.isPending}
            >
              {disableMfa.isPending ? 'Disabling…' : 'Disable 2FA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Data Tab ─────────────────────────────────────────────────────────────────

const EXPORTS = [
  { key: 'products', label: 'Export Products', desc: 'All product data including prices and stock', endpoint: '/products/export', filename: 'products.csv' },
  { key: 'inventory', label: 'Export Inventory Report', desc: 'Current inventory levels and values', endpoint: '/inventory/export', filename: 'inventory-report.csv' },
  { key: 'staff', label: 'Export Staff List', desc: 'Staff members and their roles', endpoint: '/staff/export', filename: 'staff-list.csv' },
  { key: 'audit', label: 'Export Audit Log', desc: 'Complete audit trail of store actions', endpoint: '/audit-logs/export', filename: 'audit-log.csv' },
] as const;

function DataTab() {
  const [loading, setLoading] = useState<string | null>(null);

  const doExport = async (endpoint: string, filename: string, key: string) => {
    setLoading(key);
    try {
      const res = await api.get(endpoint, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Data</CardTitle>
          <CardDescription>Download your store data as CSV files</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--border)]">
          {EXPORTS.map(({ key, label, desc, endpoint, filename }) => (
            <div key={key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{desc}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => doExport(endpoint, filename, key)}
                disabled={loading === key}
              >
                <Download size={14} className="mr-1.5" />
                {loading === key ? 'Downloading…' : 'Download'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-base text-amber-700 dark:text-amber-400">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions — proceed with caution</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">Delete All Store Data</p>
            <p className="text-xs text-[var(--muted-foreground)]">Permanently deletes all products, inventory, and records</p>
          </div>
          <Button variant="destructive" size="sm" disabled>
            <Trash2 size={14} className="mr-1.5" />
            Delete All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Settings</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Manage your store configuration</p>
      </div>

      <Tabs defaultValue="store" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="store" className="flex items-center gap-1.5 text-sm">
            <Store size={14} />
            Store
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1.5 text-sm">
            <Bell size={14} />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5 text-sm">
            <Shield size={14} />
            Security
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-1.5 text-sm">
            <Database size={14} />
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          <StoreTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="data">
          <DataTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
