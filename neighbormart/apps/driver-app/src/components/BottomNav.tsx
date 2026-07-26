import { NavLink } from 'react-router-dom';
import { Home, List, Navigation, DollarSign, Star } from 'lucide-react';

const items = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/queue', icon: List, label: 'Queue' },
  { to: '/active', icon: Navigation, label: 'Active' },
  { to: '/earnings', icon: DollarSign, label: 'Earnings' },
  { to: '/ratings', icon: Star, label: 'Ratings' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`
          }>
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
