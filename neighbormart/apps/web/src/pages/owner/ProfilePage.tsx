import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  Eye,
  EyeOff,
  Shield,
  QrCode,
  CheckCircle,
  User,
  Mail,
  Phone,
  Lock,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDate, getInitials } from '@/utils/format';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  avatarUrl?: string;
  createdAt: string;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a digit'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

// ─── Password Strength ────────────────────────────────────────────────────────

function getPasswordStrength(pw: string): { label: string; score: number; color: string } {
  if (!pw) return { label: '', score: 0, color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { label: 'Weak', score: 1, color: 'bg-red-500' };
  if (score === 2) return { label: 'Fair', score: 2, color: 'bg-orange-500' };
  if (score === 3) return { label: 'Good', score: 3, color: 'bg-yellow-500' };
  if (score === 4) return { label: 'Strong', score: 4, color: 'bg-green-500' };
  return { label: 'Very Strong', score: 5, color: 'bg-emerald-600' };
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  MANAGER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  STAFF: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

// ─── Section 1: Profile Info ──────────────────────────────────────────────────

function ProfileInfoCard() {
  const qc = useQueryClient();
  const { updateUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadConfirmFile, setUploadConfirmFile] = useState<File | null>(null);

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const res = await api.get('/profile');
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: profile ? { name: profile.name, phone: profile.phone ?? '' } : undefined,
  });

  const mutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await api.put('/profile', data);
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['my-profile'] });
      updateUser({ name: data.name });
    },
  });

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setUploadConfirmFile(file);
  };

  const confirmUpload = async () => {
    if (!uploadConfirmFile) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('photo', uploadConfirmFile);
      const res = await api.post('/profile/photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ avatarUrl: res.data.avatarUrl });
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    } finally {
      setUploading(false);
      setUploadConfirmFile(null);
    }
  };

  const cancelUpload = () => {
    setAvatarPreview(null);
    setUploadConfirmFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex gap-6">
          <Skeleton className="h-24 w-24 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User size={16} />
          Profile Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Avatar + Identity */}
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div
              className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-[var(--border)] cursor-pointer group"
              onClick={() => fileRef.current?.click()}
            >
              <Avatar className="h-full w-full">
                {avatarPreview || profile?.avatarUrl ? (
                  <AvatarImage src={avatarPreview ?? profile?.avatarUrl} alt={profile?.name} />
                ) : null}
                <AvatarFallback className="text-2xl bg-[var(--muted)]">
                  {getInitials(profile?.name ?? '?')}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={20} className="text-white" />
                <span className="text-[10px] text-white mt-1 font-medium">Change</span>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">{profile?.name}</h2>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[profile?.role ?? 'STAFF']}`}
              >
                {profile?.role}
              </span>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5 flex items-center gap-1.5">
              <Mail size={13} />
              {profile?.email}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Member since {profile?.createdAt ? formatDate(profile.createdAt) : '—'}
            </p>
          </div>
        </div>

        {/* Upload confirm bar */}
        {uploadConfirmFile && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 px-3 py-2">
            <img src={avatarPreview!} alt="Preview" className="h-10 w-10 rounded-full object-cover" />
            <p className="text-sm flex-1">Ready to upload new photo?</p>
            <Button size="sm" onClick={confirmUpload} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Confirm'}
            </Button>
            <Button variant="ghost" size="sm" onClick={cancelUpload}>
              Cancel
            </Button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit((d) => mutation.mutateAsync(d))} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
              <User size={13} />
              Full Name
            </label>
            <Input {...register('name')} placeholder="Your name" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <Mail size={13} />
              Email Address
            </label>
            <Input value={profile?.email ?? ''} readOnly disabled className="bg-[var(--muted)]/50" />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Contact support to change your email address.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <Phone size={13} />
              Phone Number
            </label>
            <Input {...register('phone')} placeholder="+1 555 000 0000" type="tel" />
          </div>

          {mutation.isError && <p className="text-sm text-red-500">Failed to save. Try again.</p>}
          {mutation.isSuccess && <p className="text-sm text-green-600">Profile updated successfully.</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Section 2: Change Password ───────────────────────────────────────────────

function ChangePasswordCard() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const newPw = watch('newPassword') ?? '';
  const strength = getPasswordStrength(newPw);

  const mutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      await api.put('/profile/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => reset(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lock size={16} />
          Change Password
        </CardTitle>
        <CardDescription>Use a strong password that you don't use elsewhere</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((d) => mutation.mutateAsync(d))} className="space-y-4">
          {/* Current */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Current Password</label>
            <div className="relative">
              <Input
                {...register('currentPassword')}
                type={showCurrent ? 'text' : 'password'}
                placeholder="Enter current password"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                onClick={() => setShowCurrent((v) => !v)}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.currentPassword.message}</p>
            )}
          </div>

          {/* New */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">New Password</label>
            <div className="relative">
              <Input
                {...register('newPassword')}
                type={showNew ? 'text' : 'password'}
                placeholder="Min 8 chars, 1 uppercase, 1 digit"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                onClick={() => setShowNew((v) => !v)}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>
            )}

            {/* Strength bar */}
            {newPw && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        i <= strength.score ? strength.color : 'bg-[var(--muted)]'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Strength:{' '}
                  <span className="font-medium text-[var(--foreground)]">{strength.label}</span>
                </p>
              </div>
            )}

            {/* Requirements */}
            <ul className="mt-2 space-y-0.5">
              {[
                { label: 'At least 8 characters', met: newPw.length >= 8 },
                { label: 'One uppercase letter', met: /[A-Z]/.test(newPw) },
                { label: 'One digit', met: /[0-9]/.test(newPw) },
              ].map(({ label, met }) => (
                <li
                  key={label}
                  className={`text-[11px] flex items-center gap-1.5 ${met ? 'text-green-600' : 'text-[var(--muted-foreground)]'}`}
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${met ? 'bg-green-500' : 'bg-[var(--muted-foreground)]'}`}
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Confirm */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Confirm New Password</label>
            <div className="relative">
              <Input
                {...register('confirmPassword')}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat new password"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                onClick={() => setShowConfirm((v) => !v)}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-500">
              {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Failed to change password. Check your current password.'}
            </p>
          )}
          {mutation.isSuccess && (
            <p className="text-sm text-green-600">Password changed successfully.</p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Updating…' : 'Update Password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Section 3: MFA ───────────────────────────────────────────────────────────

function MFACard() {
  const qc = useQueryClient();
  const [step, setStep] = useState<'idle' | 'qr' | 'verify' | 'done'>('idle');
  const [code, setCode] = useState('');
  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  const { data: mfaStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ['profile-mfa-status'],
    queryFn: async () => {
      const res = await api.get('/auth/mfa/status');
      return res.data;
    },
  });

  const enableMfa = useMutation({
    mutationFn: async () => {
      await api.post('/auth/mfa/enable', { code });
    },
    onSuccess: () => {
      setStep('done');
      qc.invalidateQueries({ queryKey: ['profile-mfa-status'] });
    },
  });

  const disableMfa = useMutation({
    mutationFn: async () => {
      await api.post('/auth/mfa/disable', { password: disablePassword });
    },
    onSuccess: () => {
      setDisableOpen(false);
      setDisablePassword('');
      qc.invalidateQueries({ queryKey: ['profile-mfa-status'] });
    },
  });

  const enabled = mfaStatus?.enabled;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield size={16} />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription className="mt-1">Add an extra layer of security</CardDescription>
          </div>
          <Badge
            className={
              enabled
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-0'
            }
          >
            {enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!enabled ? (
          <>
            {step === 'idle' && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Use an authenticator app to generate one-time codes.
                </p>
                <Button size="sm" onClick={() => setStep('qr')}>
                  Enable 2FA
                </Button>
              </div>
            )}

            {step === 'qr' && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Scan this QR code with Google Authenticator, Authy, or any TOTP app.
                </p>
                <div className="flex flex-col items-center gap-3">
                  <div className="h-40 w-40 rounded-lg bg-[var(--muted)] flex items-center justify-center border border-[var(--border)]">
                    <QrCode size={72} className="text-[var(--muted-foreground)]" />
                  </div>
                  <div className="rounded-md bg-[var(--muted)] px-3 py-2 font-mono text-xs text-center w-full break-all">
                    JBSWY3DPEHPK3PXP
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setStep('idle')}>Cancel</Button>
                  <Button onClick={() => setStep('verify')}>Next: Verify</Button>
                </div>
              </div>
            )}

            {step === 'verify' && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Enter the 6-digit code from your authenticator app to complete setup.
                </p>
                <Input
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-xl font-mono tracking-[0.4em] w-44 mx-auto block"
                />
                {enableMfa.isError && (
                  <p className="text-xs text-red-500 text-center">Invalid code. Try again.</p>
                )}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setStep('qr')}>Back</Button>
                  <Button
                    onClick={() => enableMfa.mutate()}
                    disabled={code.length !== 6 || enableMfa.isPending}
                  >
                    {enableMfa.isPending ? 'Verifying…' : 'Verify & Enable'}
                  </Button>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle size={44} className="text-green-500" />
                <p className="font-semibold">Two-Factor Authentication Enabled</p>
                <p className="text-sm text-[var(--muted-foreground)] text-center">
                  Your account is now protected. You'll need your authenticator app on each login.
                </p>
                <Button onClick={() => setStep('idle')}>Done</Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted-foreground)]">
              2FA is active. You'll be prompted for a code on each sign-in.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200"
              onClick={() => setDisableOpen(true)}
            >
              Disable 2FA
            </Button>
          </div>
        )}
      </CardContent>

      {/* Disable 2FA Dialog */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your current password to confirm. This will reduce your account security.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Current password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
          />
          {disableMfa.isError && (
            <p className="text-xs text-red-500">Incorrect password. Please try again.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => disableMfa.mutate()}
              disabled={!disablePassword || disableMfa.isPending}
            >
              {disableMfa.isPending ? 'Disabling…' : 'Disable 2FA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">My Profile</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          Manage your personal information and security settings
        </p>
      </div>

      <ProfileInfoCard />
      <ChangePasswordCard />
      <MFACard />
    </div>
  );
}
