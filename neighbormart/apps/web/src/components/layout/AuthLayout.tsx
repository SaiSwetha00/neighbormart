import { type ReactNode } from 'react';
import { Store, Leaf } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand / hero */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col items-center justify-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 40%, #40916C 75%, #52B788 100%)',
        }}
      >
        {/* Background pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, #ffffff 1px, transparent 1px),
                              radial-gradient(circle at 80% 20%, #ffffff 1px, transparent 1px),
                              radial-gradient(circle at 40% 40%, #ffffff 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-white/5" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-lg">
          {/* Logo mark */}
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm shadow-lg border border-white/20">
            <Store className="h-10 w-10 text-white" />
          </div>

          {/* Brand name */}
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            NeighborMart
          </h1>

          {/* Tagline */}
          <p className="text-lg text-green-100 font-medium mb-6">
            Neighborhood store, enterprise power.
          </p>

          <p className="text-sm text-green-200/80 leading-relaxed">
            Manage your grocery store inventory, team schedules, suppliers, and sales — all from one powerful dashboard built for local businesses.
          </p>

          {/* Feature bullets */}
          <div className="mt-10 flex flex-col gap-3 text-left w-full">
            {[
              'Real-time inventory tracking',
              'Team scheduling & attendance',
              'Supplier & purchase order management',
              'Multi-role access control',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Leaf className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm text-green-100">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer text */}
        <p className="absolute bottom-6 text-xs text-green-200/50">
          &copy; {new Date().getFullYear()} NeighborMart. All rights reserved.
        </p>
      </div>

      {/* Right panel — form content */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white dark:bg-[#0F172A] px-6 py-12 sm:px-12">
        {/* Mobile logo (shown only on small screens) */}
        <div className="mb-8 flex flex-col items-center lg:hidden">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[#1B4332]">
            <Store className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">NeighborMart</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Neighborhood store, enterprise power.
          </p>
        </div>

        {/* Form content */}
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
