import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import AuthLayout from '@/components/layout/AuthLayout';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { cn } from '@/utils/cn';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

// ── Component ──────────────────────────────────────────────────────────────

export default function MfaVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  // Email may be passed through router state from LoginPage
  const email: string = (location.state as { email?: string })?.email ?? '';

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Countdown for resend button
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(CODE_LENGTH).fill(null));

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(RESEND_COOLDOWN);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── Input handlers ─────────────────────────────────────────────────────

  const handleDigitChange = (index: number, value: string) => {
    // Allow only single digits
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);

    if (cleaned && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        // Clear current
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        // Move back
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    // Focus the next empty slot or the last one
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  // ── Submit ─────────────────────────────────────────────────────────────

  const code = digits.join('');
  const isComplete = code.length === CODE_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete || isSubmitting) return;
    setServerError(null);
    setIsSubmitting(true);
    try {
      const response = await authService.verifyMfa(code, email);
      setAuth(response.user, response.token);
      navigate(response.redirectTo ?? '/owner/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Verification failed. Please check the code and try again.');
      }
      // Clear digits on error so user can re-enter
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Resend ─────────────────────────────────────────────────────────────

  const handleResend = async () => {
    if (countdown > 0) return;
    setServerError(null);
    try {
      await authService.resendMfa(email);
      startCountdown();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Failed to resend code. Please try again.');
      }
    }
  };

  return (
    <AuthLayout
      title="Two-Factor Authentication"
      subtitle={
        email
          ? `Enter the 6-digit code sent to ${email}`
          : 'Enter the 6-digit code from your authenticator'
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {serverError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* 6-digit input boxes */}
        <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              aria-label={`Digit ${i + 1}`}
              className={cn(
                'h-12 w-10 rounded-md border bg-background text-center text-lg font-semibold tracking-widest',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
                'transition-colors',
                digit ? 'border-primary' : 'border-input',
              )}
            />
          ))}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          disabled={!isComplete || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying…
            </>
          ) : (
            'Verify code'
          )}
        </Button>
      </form>

      {/* Resend */}
      <div className="mt-5 text-center text-sm text-muted-foreground">
        Didn&apos;t receive a code?{' '}
        {countdown > 0 ? (
          <span className="text-foreground">Resend in {countdown}s</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="font-medium text-primary hover:underline"
          >
            Resend code
          </button>
        )}
      </div>
    </AuthLayout>
  );
}
