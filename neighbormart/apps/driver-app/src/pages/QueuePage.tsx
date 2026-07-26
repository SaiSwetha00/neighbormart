import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { MapPin, Phone, CheckCircle, XCircle } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'border-yellow-400 bg-yellow-50',
  ASSIGNED: 'border-blue-400 bg-blue-50',
  IN_TRANSIT: 'border-indigo-400 bg-indigo-50',
  PICKED_UP: 'border-purple-400 bg-purple-50',
  DELIVERED: 'border-green-400 bg-green-50',
};

export default function QueuePage() {
  const qc = useQueryClient();

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['today-deliveries'],
    queryFn: () => axios.get('/api/driver/deliveries/today').then(r => r.data.data),
    refetchInterval: 15000,
  });

  const accept = useMutation({
    mutationFn: (id: string) => axios.post(`/api/driver/deliveries/${id}/accept`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['today-deliveries'] }),
  });

  const reject = useMutation({
    mutationFn: (id: string) => axios.post(`/api/driver/deliveries/${id}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['today-deliveries'] }),
  });

  const pickedUp = useMutation({
    mutationFn: (id: string) => axios.post(`/api/driver/deliveries/${id}/picked-up`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['today-deliveries'] }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Today's Queue</h1>
        <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{deliveries.length} orders</span>
      </div>

      {deliveries.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">📭</div>
          <p className="font-medium">No deliveries assigned yet</p>
          <p className="text-sm mt-1">Go online to receive orders</p>
        </div>
      )}

      {deliveries.map((d: any) => (
        <div key={d.id} className={`rounded-xl border-l-4 p-4 space-y-3 bg-white dark:bg-gray-800 shadow-sm ${STATUS_COLOR[d.status] || 'border-gray-300'}`}>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900">{d.order?.customer?.user?.name || 'Customer'}</span>
            <span className="text-xs bg-white border px-2 py-0.5 rounded-full text-gray-600">{d.status}</span>
          </div>

          <div className="flex items-start gap-2 text-sm text-gray-600">
            <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
            <span>{d.addressText || 'Address not set'}</span>
          </div>

          {d.order?.customer?.user?.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone size={14} className="text-gray-400" />
              <a href={`tel:${d.order.customer.user.phone}`} className="text-blue-600">{d.order.customer.user.phone}</a>
            </div>
          )}

          {d.order?.items && (
            <div className="text-xs text-gray-500">
              {d.order.items.slice(0, 3).map((i: any) => i.product?.name).filter(Boolean).join(', ')}
              {d.order.items.length > 3 && ` +${d.order.items.length - 3} more`}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {d.status === 'ASSIGNED' && (
              <>
                <button onClick={() => accept.mutate(d.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl py-2 text-sm font-medium">
                  <CheckCircle size={16} /> Accept
                </button>
                <button onClick={() => reject.mutate(d.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-700 rounded-xl py-2 text-sm font-medium">
                  <XCircle size={16} /> Reject
                </button>
              </>
            )}
            {d.status === 'IN_TRANSIT' && (
              <button onClick={() => pickedUp.mutate(d.id)}
                className="flex-1 bg-purple-600 text-white rounded-xl py-2 text-sm font-medium">
                Mark Picked Up
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
