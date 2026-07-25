import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Sun, Moon, Bell, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { authService } from '@/services/auth.service';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '@/utils/format';

interface TopbarProps {
  notificationCount?: number;
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 2) return 'Dashboard';

  const last = segments[segments.length - 1];
  const map: Record<string, string> = {
    dashboard: 'Dashboard',
    products: 'Products',
    categories: 'Categories & Brands',
    inventory: 'Inventory',
    suppliers: 'Suppliers',
    team: 'Team',
    schedule: 'Schedule',
    'audit-log': 'Audit Log',
    settings: 'Settings',
    attendance: 'My Attendance',
    profile: 'Profile',
  };
  return map[last] ?? last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
}

export function Topbar({ notificationCount = 0 }: TopbarProps) {
  const { user, clearAuth } = useAuthStore();
  const { sidebarOpen, toggleSidebar, darkMode, toggleDarkMode, setNotificationDrawer } =
    useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitle = getPageTitle(location.pathname);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-20 flex h-16 items-center border-b border-gray-200 dark:border-gray-800',
        'bg-white dark:bg-gray-900 shadow-sm transition-all duration-200',
        sidebarOpen ? 'left-[260px]' : 'left-16',
        // On mobile sidebar is overlay, topbar is always full width
        'left-0 lg:left-auto'
      )}
      style={{
        left: undefined,
      }}
    >
      <div className="flex h-full w-full items-center justify-between px-4 gap-4">
        {/* Left: Menu toggle + breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {pageTitle}
          </h1>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Notification bell */}
          <button
            onClick={() => setNotificationDrawer(true)}
            className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photo} alt={user?.name} />
                  <AvatarFallback className="bg-[#1B4332] text-white text-xs font-semibold">
                    {user ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium text-gray-900 dark:text-white max-w-[120px] truncate">
                    {user?.name ?? 'User'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user?.role?.toLowerCase() ?? ''}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {user?.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              {user?.role === 'OWNER' && (
                <DropdownMenuItem onClick={() => navigate('/owner/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
