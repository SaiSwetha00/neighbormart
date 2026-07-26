import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { MapPin, Phone, CheckCircle, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export default function ActiveDeliveryPage() {
  const qc = useQueryClient();
  const [failureReason, setFailureReason] = useState('');
  const [showFail, setShowFail] = useState(false);

  const { data: deliveries = [] } = useQuery({
    queryKey: ['today-deliveries'],
    queryFn: () => axios.get('/api/driver/deliveries/today').then(r => r.data.data),
    refetchInterval: 10000,
  });

  const active = deliveries.find((d: any) => d.status === 'PICKED_UP' || d.status === 'IN_TRANSIT');

  const delivered = useMutation({
    mutationFn: (id: string) => axios.post(`/api/driver/deliveries/${id}/delivered`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['today-deliveries'] }); },
  });

  const failed = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      axios.post(`/api/driver/deliveries/${id}/failed`, { failureReason: reason }),
    onSuccess: () => { setShowFail(false); setFailureReason(''); qc.invalidateQueries({ queryKey: ['today-deliveries'] }); },
  });

  const updateLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      axios.post('/api/driver/location', { lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  };

  if (!active) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-5 text-center text-gray-400">
        <div className="text-5xl mb-4">🛵</div>
        <p className="font-medium">No active delivery</p>
        <p className="text-sm mt-1">Accept an order from your queue</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Active Delivery</h1>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-900 dark:text-white">{active.order?.customer?.user?.name}</span>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium">{active.status}</span>
        </div>

        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <MapPin className="text-red-500 mt-0.5 shrink-0" size={18} />
          <div>
            <div className="font-medium text-gray-900 dark:text-white text-sm">{active.addressText || 'Delivery address'}</div>
            {active.addressLat && (
              <a href={`https://maps.google.com/?q=${active.addressLat},${active.addressLng}`} target="_blank" rel="noreferrer"
                className="text-xs text-blue-600 mt-1 block">Open in Maps →</a>
            )}
          </div>
        </div>

        {active.order?.customer?.user?.phone && (
          <a href={`tel:${active.order.customer.user.phone}`}
            className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl text-blue-700">
            <Phone size={18} />
            <span className="font-medium text-sm">{active.order.customer.user.phone}</span>
          </a>
        )}

        {active.notes && (
          <div className="p-3 bg-yellow-50 rounded-xl text-sm text-yellow-800">
            📝 {active.notes}
          </div>
        )}

        <button onClick={updateLocation}
          className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl py-2 text-sm font-medium">
          📍 Update My Location
        </button>

        <button onClick={() => delivered.mutate(active.id)}
          disabled={delivered.isPending}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-green-700 disabled:opacity-50">
          <CheckCircle size={18} />
          Mark as Delivered
        </button>

        <button onClick={() => setShowFail(true)}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 rounded-xl py-3 font-medium text-sm hover:bg-red-100">
          <AlertTriangle size={16} />
          Report Failed Delivery
        </button>
      </div>

      {showFail && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl p-5 w-full max-w-md space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white">Report Failed Delivery</h3>
            <textarea
              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl p-3 text-sm resize-none"
              rows={3}
              placeholder="Reason for failure (e.g., customer not home, wrong address)"
              value={failureReason}
              onChange={e => setFailureReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowFail(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl py-3 font-medium text-sm">Cancel</button>
              <button onClick={() => failed.mutate({ id: active.id, reason: failureReason })}
                disabled={!failureReason || failed.isPending}
                className="flex-1 bg-red-600 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
