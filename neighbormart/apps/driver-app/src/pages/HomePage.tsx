import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Power, PowerOff, Package, Star, DollarSign } from 'lucide-react';

export default function HomePage() {
  const qc = useQueryClient();
  const [online, setOnline] = useState(false);

  const { data: perf } = useQuery({
    queryKey: ['driver-perf'],
    queryFn: () => axios.get('/api/driver/performance').then(r => r.data.data),
    onSuccess: (d: any) => setOnline(d?.driver?.status !== 'OFFLINE'),
  } as any);

  const goOnline = useMutation({
    mutationFn: () => axios.post('/api/driver/go-online'),
    onSuccess: () => { setOnline(true); qc.invalidateQueries({ queryKey: ['driver-perf'] }); },
  });

  const goOffline = useMutation({
    mutationFn: () => axios.post('/api/driver/go-offline'),
    onSuccess: () => { setOnline(false); qc.invalidateQueries({ queryKey: ['driver-perf'] }); },
  });

  const driver = perf?.driver;

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hello, {driver?.name?.split(' ')[0] || 'Driver'} 👋</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${online ? 'bg-green-500' : 'bg-gray-400'}`} />
      </div>

      {/* Online/Offline Toggle */}
      <div className={`rounded-2xl p-6 text-center ${online ? 'bg-green-50 border border-green-200' : 'bg-gray-100'}`}>
        <div className={`text-lg font-bold mb-1 ${online ? 'text-green-700' : 'text-gray-600'}`}>
          {online ? 'You are ONLINE' : 'You are OFFLINE'}
        </div>
        <p className="text-sm text-gray-500 mb-4">{online ? 'Ready to receive deliveries' : 'Go online to start earning'}</p>
        <button
          onClick={() => online ? goOffline.mutate() : goOnline.mutate()}
          disabled={goOnline.isPending || goOffline.isPending}
          className={`flex items-center gap-2 mx-auto px-8 py-3 rounded-xl font-semibold transition-colors ${online ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
          {online ? <PowerOff size={18} /> : <Power size={18} />}
          {online ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      {/* Stats */}
      {driver && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Package, label: 'Total', value: driver.totalDeliveries, color: 'text-blue-600 bg-blue-50' },
            { icon: Star, label: 'Rating', value: driver.rating?.toFixed(1), color: 'text-yellow-600 bg-yellow-50' },
            { icon: DollarSign, label: 'This week', value: `₹${perf?.totalEarned?.toFixed(0) || 0}`, color: 'text-green-600 bg-green-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 ${s.color}`}>
                <s.icon size={16} />
              </div>
              <div className="font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recent ratings */}
      {perf?.recentRatings?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Recent Reviews</h3>
          <div className="space-y-2">
            {perf.recentRatings.slice(0, 3).map((r: any) => (
              <div key={r.id} className="flex items-start gap-3 text-sm">
                <span className="text-yellow-500 text-base">{'★'.repeat(r.rating)}</span>
                <span className="text-gray-600">{r.comment || 'No comment'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
