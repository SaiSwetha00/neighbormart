import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Tag,
  BarChart3,
  Truck,
  Users,
  Calendar,
  ClipboardList,
  Settings,
  CheckSquare,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Store,
  TrendingUp,
  Wallet,
  Gift,
  UserCheck,
  ShoppingCart,
  FileBarChart,
  Bot,
  MapPin,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { authService } from '@/services/auth.service';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/utils/format';
import { UserRole } from '@/types';

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
}

const ownerNav: NavItem[] = [
  { path: '/owner/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/owner/products', icon: Package, label: 'Products' },
  { path: '/owner/categories', icon: Tag, label: 'Categories & Brands' },
  { path: '/owner/inventory', icon: BarChart3, label: 'Inventory' },
  { path: '/owner/suppliers', icon: Truck, label: 'Suppliers' },
  { path: '/owner/sales', icon: TrendingUp, label: 'Sales' },
  { path: '/owner/finance', icon: Wallet, label: 'Finance' },
  { path: '/owner/promotions', icon: Gift, label: 'Promotions' },
  { path: '/owner/customers', icon: UserCheck, label: 'Customers (CRM)' },
  { path: '/owner/team', icon: Users, label: 'Team' },
  { path: '/owner/schedule', icon: Calendar, label: 'Schedule' },
  { path: '/owner/audit-log', icon: ClipboardList, label: 'Audit Log' },
  { path: '/owner/reports', icon: FileBarChart, label: 'Reports' },
  { path: '/owner/ai', icon: Bot, label: 'AI Center' },
  { path: '/owner/delivery', icon: MapPin, label: 'Delivery' },
  { path: '/owner/settings', icon: Settings, label: 'Settings' },
];

const managerNav: NavItem[] = [
  { path: '/manager/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/manager/products', icon: Package, label: 'Products' },
  { path: '/manager/inventory', icon: BarChart3, label: 'Inventory' },
  { path: '/manager/suppliers', icon: Truck, label: 'Suppliers' },
  { path: '/manager/team', icon: Users, label: 'Team' },
  { path: '/manager/schedule', icon: Calendar, label: 'Schedule' },
];

const staffNav: NavItem[] = [
  { path: '/staff/dashboard', icon: LayoutDashboard, label: 'My Dashboard' },
  { path: '/staff/pos', icon: ShoppingCart, label: 'POS Register' },
  { path: '/staff/schedule', icon: Calendar, label: 'My Schedule' },
  { path: '/staff/attendance', icon: CheckSquare, label: 'My Attendance' },
];

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case 'OWNER':
      return ownerNav;
    case 'MANAGER':
      return managerNav;
    case 'STAFF':
      return staffNav;
    default:
      return [];
  }
}

function getRoleBadgeColor(role: UserRole): string {
  switch (role) {
    case 'OWNER':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'MANAGER':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'STAFF':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
}

export function Sidebar() {
  const { user, store, clearAuth } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useUIStore();
  const navigate = useNavigate();

  const isCollapsed = !sidebarOpen;
  const navItems = user ? getNavItems(user.role as UserRole) : [];

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
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-30 flex h-full flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-sm',
          'transition-all duration-200 ease-in-out',
          isCollapsed ? 'w-16' : 'w-[260px]',
          // Mobile: hidden by default, shown as overlay when open
          'hidden lg:flex',
          sidebarOpen && '!flex'
        )}
      >
        {/* Header: Logo + Store name */}
        <div
          className={cn(
            'flex h-16 items-center border-b border-gray-200 dark:border-gray-800 px-3 flex-shrink-0',
            isCollapsed ? 'justify-center' : 'justify-between px-4'
          )}
        >
          <div className={cn('flex items-center gap-3', isCollapsed && 'justify-center')}>
            {store?.logo ? (
              <img
                src={store.logo}
                alt={store.name}
                className="h-8 w-8 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1B4332]">
                <Store className="h-4 w-4 text-white" />
              </div>
            )}
            {!isCollapsed && (
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[160px]">
                {store?.name ?? 'NeighborMart'}
              </span>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={toggleSidebar}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center py-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#1B4332] text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
                      isCollapsed && 'justify-center px-2'
                    )
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={cn(
                          'h-5 w-5 flex-shrink-0',
                          isActive
                            ? 'text-white'
                            : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                        )}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer: User info + logout */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 p-3">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.photo} alt={user?.name} />
                <AvatarFallback className="bg-[#1B4332] text-white text-xs">
                  {user ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handleLogout}
                className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarImage src={user?.photo} alt={user?.name} />
                <AvatarFallback className="bg-[#1B4332] text-white text-sm">
                  {user ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.name ?? 'User'}
                </p>
                <span
                  className={cn(
                    'inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                    user ? getRoleBadgeColor(user.role as UserRole) : ''
                  )}
                >
                  {user?.role ?? ''}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
