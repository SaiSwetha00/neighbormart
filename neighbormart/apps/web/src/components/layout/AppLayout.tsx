import { Outlet } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/ui.store';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { NotificationDrawer } from './NotificationDrawer';
import { AIChatDrawer } from '../ai/AIChatDrawer';

export function AppLayout() {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0F172A]">
      {/* Skip-to-content link (WCAG 2.1) */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-[#1B4332] focus:font-semibold focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
        Skip to main content
      </a>

      {/* Sidebar */}
      <Sidebar />

      {/* Topbar */}
      <Topbar />

      {/* Main content area */}
      <main
        id="main-content"
        role="main"
        aria-label="Main content"
        className={cn(
          'flex min-h-screen flex-col pt-16 transition-all duration-200',
          'lg:pl-16',
          sidebarOpen && 'lg:pl-[260px]'
        )}
      >
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Notification drawer */}
      <NotificationDrawer />

      {/* AI Chat drawer */}
      <AIChatDrawer />
    </div>
  );
}

export default AppLayout;
