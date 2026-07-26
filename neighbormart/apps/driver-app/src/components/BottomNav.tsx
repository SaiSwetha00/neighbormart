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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 flex">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`
          }>
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
