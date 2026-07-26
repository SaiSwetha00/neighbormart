import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { TrendingUp } from 'lucide-react';

export default function EarningsPage() {
  const { data: earnings = [], isLoading } = useQuery({
    queryKey: ['driver-earnings'],
    queryFn: () => axios.get('/api/driver/earnings').then(r => r.data.data),
  });

  const total = earnings.reduce((s: number, e: any) => s + e.totalEarning, 0);
  const thisWeek = earnings.slice(0, 7).reduce((s: number, e: any) => s + e.totalEarning, 0);

  return (
    <div className="p-5 space-y-5">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Earnings</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-700">₹{thisWeek.toFixed(0)}</div>
          <div className="text-xs text-green-600 mt-1">This week</div>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-700">₹{total.toFixed(0)}</div>
          <div className="text-xs text-blue-600 mt-1">Total earned</div>
        </div>
      </div>

      {isLoading && <div className="text-center py-8 text-gray-400">Loading…</div>}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center gap-2">
          <TrendingUp size={16} className="text-gray-500 dark:text-gray-400" />
          <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Daily Breakdown</span>
        </div>
        <div className="divide-y dark:divide-gray-700">
          {earnings.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{new Date(e.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{e.deliveries} deliveries</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-700">₹{e.totalEarning.toFixed(0)}</div>
                {e.bonus > 0 && <div className="text-xs text-blue-600">+₹{e.bonus} bonus</div>}
              </div>
            </div>
          ))}
          {earnings.length === 0 && !isLoading && (
            <div className="text-center py-10 text-gray-400 text-sm">No earnings yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
