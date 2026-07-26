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
      {/* Sidebar */}
      <Sidebar />

      {/* Topbar */}
      <Topbar />

      {/* Main content area */}
      <main
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
