import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye,
  EyeOff,
  Store,
  User,
  Phone,
  Globe,
  Mail,
  Lock,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import AuthLayout from '@/components/layout/AuthLayout';
import { authService } from '@/services/auth.service';
import { cn } from '@/utils/cn';

// ── Constants ──────────────────────────────────────────────────────────────

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'INR', label: 'INR — Indian Rupee' },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const COUNTRIES = [
  'Australia',
  'Canada',
  'France',
  'Germany',
  'India',
  'Japan',
  'New Zealand',
  'Singapore',
  'United Kingdom',
  'United States',
];

const STEPS = [
  { label: 'Store Details', index: 0 },
  { label: 'Owner Account', index: 1 },
  { label: 'Review & Confirm', index: 2 },
];

// ── Zod schemas ─────────────────────────────────────────────────────────────

const step1Schema = z.object({
  storeName: z.string().min(2, 'Store name must be at least 2 characters'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().min(1, 'Please select a country'),
  currency: z.string().min(1, 'Please select a currency'),
  timezone: z.string().min(1, 'Please select a timezone'),
});

const step2Schema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

// ── Step indicator ────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-0">
      {STEPS.map((step, i) => (
        <div key={step.index} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                current > i
                  ? 'border-primary bg-primary text-primary-foreground'
                  : current === i
                  ? 'border-primary bg-background text-primary'
                  : 'border-muted-foreground/30 bg-background text-muted-foreground',
              )}
            >
              {current > i ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={cn(
                'mt-1 text-xs',
                current >= i ? 'text-primary font-medium' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                'mb-5 h-0.5 w-16 transition-colors',
                current > i ? 'bg-primary' : 'bg-muted-foreground/20',
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Collected data across steps
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);

  // Step 1 form
  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      storeName: '',
      address: '',
      city: '',
      country: '',
      currency: 'USD',
      timezone: 'America/New_York',
    },
  });

  // Step 2 form
  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Handlers ──

  const handleStep1Submit = (data: Step1Data) => {
    setStep1Data(data);
    setStep(1);
  };

  const handleStep2Submit = (data: Step2Data) => {
    setStep2Data(data);
    setStep(2);
  };

  const handleLogoChange = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleLogoChange(file);
  };

  const handleFinalSubmit = async () => {
    if (!step1Data || !step2Data) return;
    setServerError(null);
    setIsSubmitting(true);
    try {
      await authService.register({
        storeName: step1Data.storeName,
        address: step1Data.address,
        city: step1Data.city,
        country: step1Data.country,
        currency: step1Data.currency,
        timezone: step1Data.timezone,
        fullName: step2Data.fullName,
        email: step2Data.email,
        phone: step2Data.phone,
        password: step2Data.password,
        logo: logoFile ?? undefined,
      });
      navigate('/login', {
        state: { successMessage: 'Store created! Please sign in.' },
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Password requirement helpers ──

  const watchedPassword = form2.watch('password');
  const passwordRequirements = [
    { label: 'At least 8 characters', met: watchedPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(watchedPassword) },
    { label: 'One number', met: /[0-9]/.test(watchedPassword) },
  ];

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <AuthLayout
      title="Create your store"
      subtitle="Get NeighborMart up and running in minutes"
    >
      <StepIndicator current={step} />

      {/* ── STEP 1: Store Details ── */}
      {step === 0 && (
        <form onSubmit={form1.handleSubmit(handleStep1Submit)} noValidate className="space-y-4">
          {/* Store Name */}
          <div className="space-y-1.5">
            <Label htmlFor="storeName">
              Store Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="storeName"
                placeholder="My Grocery Store"
                className={cn('pl-9', form1.formState.errors.storeName && 'border-destructive')}
                {...form1.register('storeName')}
              />
            </div>
            {form1.formState.errors.storeName && (
              <p className="text-xs text-destructive">{form1.formState.errors.storeName.message}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" placeholder="123 Main St" {...form1.register('address')} />
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" placeholder="New York" {...form1.register('city')} />
          </div>

          {/* Country */}
          <div className="space-y-1.5">
            <Label htmlFor="country">
              Country <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <select
                id="country"
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  form1.formState.errors.country && 'border-destructive',
                )}
                {...form1.register('country')}
              >
                <option value="">Select country…</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {form1.formState.errors.country && (
              <p className="text-xs text-destructive">{form1.formState.errors.country.message}</p>
            )}
          </div>

          {/* Currency + Timezone row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="currency">
                Currency <span className="text-destructive">*</span>
              </Label>
              <select
                id="currency"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...form1.register('currency')}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">
                Timezone <span className="text-destructive">*</span>
              </Label>
              <select
                id="timezone"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...form1.register('timezone')}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>

          <Button type="submit" className="w-full mt-2">
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      )}

      {/* ── STEP 2: Owner Account ── */}
      {step === 1 && (
        <form onSubmit={form2.handleSubmit(handleStep2Submit)} noValidate className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fullName"
                placeholder="Jane Smith"
                className={cn('pl-9', form2.formState.errors.fullName && 'border-destructive')}
                {...form2.register('fullName')}
              />
            </div>
            {form2.formState.errors.fullName && (
              <p className="text-xs text-destructive">{form2.formState.errors.fullName.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="ownerEmail">
              Email <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="ownerEmail"
                type="email"
                placeholder="jane@store.com"
                className={cn('pl-9', form2.formState.errors.email && 'border-destructive')}
                {...form2.register('email')}
              />
            </div>
            {form2.formState.errors.email && (
              <p className="text-xs text-destructive">{form2.formState.errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="+1 555 000 0000"
                className="pl-9"
                {...form2.register('phone')}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="regPassword">
              Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="regPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className={cn('pl-9 pr-10', form2.formState.errors.password && 'border-destructive')}
                {...form2.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Password requirements */}
            <ul className="mt-1 space-y-1">
              {passwordRequirements.map((req) => (
                <li key={req.label} className="flex items-center gap-1.5 text-xs">
                  <Check
                    className={cn('h-3.5 w-3.5', req.met ? 'text-green-500' : 'text-muted-foreground/40')}
                  />
                  <span className={req.met ? 'text-foreground' : 'text-muted-foreground'}>
                    {req.label}
                  </span>
                </li>
              ))}
            </ul>
            {form2.formState.errors.password && (
              <p className="text-xs text-destructive">{form2.formState.errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">
              Confirm Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className={cn('pl-9 pr-10', form2.formState.errors.confirmPassword && 'border-destructive')}
                {...form2.register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form2.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">{form2.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(0)}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="submit" className="flex-1">
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      )}

      {/* ── STEP 3: Review & Confirm ── */}
      {step === 2 && step1Data && step2Data && (
        <div className="space-y-5">
          {serverError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Summary card */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <SummaryRow label="Store Name" value={step1Data.storeName} />
              {step1Data.city && step1Data.country && (
                <SummaryRow label="Location" value={`${step1Data.city}, ${step1Data.country}`} />
              )}
              <SummaryRow label="Currency" value={step1Data.currency} />
              <SummaryRow label="Owner" value={step2Data.fullName} />
              <SummaryRow label="Email" value={step2Data.email} />
              {step2Data.phone && <SummaryRow label="Phone" value={step2Data.phone} />}
            </CardContent>
          </Card>

          {/* Logo upload */}
          <div className="space-y-1.5">
            <Label>Store Logo (optional)</Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50',
              )}
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-20 w-20 rounded-md object-contain"
                />
              ) : (
                <>
                  <Store className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop or <span className="text-primary">click to upload</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, SVG up to 2 MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoChange(file);
              }}
            />
            {logoFile && (
              <p className="text-xs text-muted-foreground">Selected: {logoFile.name}</p>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Create My Store
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
