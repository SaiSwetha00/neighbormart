import { useState } from 'react';
import { X, AlertTriangle, XCircle, Clock, ClipboardCheck, Info, Bell } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/ui.store';
import { formatRelativeTime } from '@/utils/format';
import { Button } from '@/components/ui/button';

type NotificationType = 'STOCK_LOW' | 'OUT_OF_STOCK' | 'EXPIRING' | 'AUDIT' | 'SYSTEM';
type NotificationTab = 'all' | 'alerts' | 'activity' | 'system';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'OUT_OF_STOCK',
    title: 'Out of Stock: Whole Milk 1L',
    description: 'Whole Milk 1L has reached 0 units. Restock required immediately.',
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    read: false,
  },
  {
    id: '2',
    type: 'STOCK_LOW',
    title: 'Low Stock: Organic Eggs (12-pack)',
    description: 'Only 4 units remaining. Threshold is 10.',
    createdAt: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
    read: false,
  },
  {
    id: '3',
    type: 'EXPIRING',
    title: 'Expiring Soon: Greek Yogurt 500g',
    description: '12 units expire within 3 days. Consider markdown pricing.',
    createdAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    read: false,
  },
  {
    id: '4',
    type: 'AUDIT',
    title: 'Inventory adjusted by Manager',
    description: 'Sarah Johnson adjusted stock for 5 products in Dairy category.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    read: true,
  },
  {
    id: '5',
    type: 'AUDIT',
    title: 'New supplier added',
    description: 'Fresh Farms Co. was added as a new supplier by store owner.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    read: true,
  },
  {
    id: '6',
    type: 'SYSTEM',
    title: 'System maintenance scheduled',
    description: 'Planned maintenance window: Sunday 2:00 AM – 4:00 AM UTC.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true,
  },
];

const typeIconMap: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  STOCK_LOW: {
    icon: AlertTriangle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  OUT_OF_STOCK: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
  },
  EXPIRING: {
    icon: Clock,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  AUDIT: {
    icon: ClipboardCheck,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  SYSTEM: {
    icon: Info,
    color: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
  },
};

const tabs: { id: NotificationTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'activity', label: 'Activity' },
  { id: 'system', label: 'System' },
];

function filterByTab(notifications: Notification[], tab: NotificationTab): Notification[] {
  switch (tab) {
    case 'alerts':
      return notifications.filter((n) =>
        ['STOCK_LOW', 'OUT_OF_STOCK', 'EXPIRING'].includes(n.type)
      );
    case 'activity':
      return notifications.filter((n) => n.type === 'AUDIT');
    case 'system':
      return notifications.filter((n) => n.type === 'SYSTEM');
    default:
      return notifications;
  }
}

export function NotificationDrawer() {
  const { notificationDrawerOpen, setNotificationDrawer } = useUIStore();
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');

  const filtered = filterByTab(notifications, activeTab);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <>
      {/* Backdrop */}
      {notificationDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setNotificationDrawer(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          'fixed top-0 right-0 z-50 flex h-full flex-col bg-white dark:bg-gray-900 shadow-xl',
          'transition-transform duration-300 ease-in-out',
          'w-full sm:w-[380px]',
          notificationDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-label="Notifications"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#1B4332]" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-[#1B4332] hover:underline dark:text-green-400"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={() => setNotificationDrawer(false)}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close notifications"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-4 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'mr-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-[#1B4332] text-[#1B4332] dark:border-green-400 dark:text-green-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <Bell className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                No notifications
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                You're all caught up! Check back later.
              </p>
            </div>
          ) : (
            <ul>
              {filtered.map((notification) => {
                const { icon: Icon, color, bg } = typeIconMap[notification.type];
                return (
                  <li key={notification.id}>
                    <button
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-4 text-left transition-colors',
                        'hover:bg-gray-50 dark:hover:bg-gray-800/60',
                        !notification.read && 'bg-green-50/50 dark:bg-green-900/5'
                      )}
                      onClick={() => markRead(notification.id)}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
                          bg
                        )}
                      >
                        <Icon className={cn('h-4 w-4', color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-sm leading-snug',
                            notification.read
                              ? 'font-normal text-gray-700 dark:text-gray-300'
                              : 'font-semibold text-gray-900 dark:text-white'
                          )}
                        >
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {notification.description}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!notification.read && (
                        <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#1B4332]" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}

export default NotificationDrawer;
