import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

type Tab = 'live' | 'orders' | 'zones' | 'drivers' | 'performance';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  PICKED_UP: 'bg-purple-100 text-purple-800',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  RETURNED: 'bg-gray-100 text-gray-700',
};
const DRIVER_COLOR: Record<string, string> = {
  ONLINE: 'bg-green-100 text-green-800',
  OFFLINE: 'bg-gray-100 text-gray-600',
  ON_DELIVERY: 'bg-blue-100 text-blue-800',
  BREAK: 'bg-yellow-100 text-yellow-800',
};

export default function DeliveryPage() {
  const [tab, setTab] = useState<Tab>('live');
  const [zoneForm, setZoneForm] = useState({ name: '', baseFee: '', perKmFee: '', maxDistance: '' });
  const [slotForm, setSlotForm] = useState({ zoneId: '', dayOfWeek: '1', startTime: '09:00', endTime: '12:00', maxOrders: '10' });
  const qc = useQueryClient();

  const { data: dashboard } = useQuery({
    queryKey: ['delivery-dashboard'],
    queryFn: () => axios.get('/api/delivery/dashboard').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: () => axios.get('/api/delivery/orders').then(r => r.data.data),
    enabled: tab === 'orders',
    refetchInterval: 15000,
  });

  const { data: liveDeliveries = [] } = useQuery({
    queryKey: ['live-deliveries'],
    queryFn: () => axios.get('/api/delivery/live').then(r => r.data.data),
    enabled: tab === 'live',
    refetchInterval: 10000,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: () => axios.get('/api/delivery/zones').then(r => r.data.data),
    enabled: tab === 'zones',
  });

  const { data: slots = [] } = useQuery({
    queryKey: ['delivery-slots'],
    queryFn: () => axios.get('/api/delivery/slots').then(r => r.data.data),
    enabled: tab === 'zones',
  });

  const { data: performance = [] } = useQuery({
    queryKey: ['driver-performance'],
    queryFn: () => axios.get('/api/delivery/performance').then(r => r.data.data),
    enabled: tab === 'performance',
  });

  const createZone = useMutation({
    mutationFn: (d: object) => axios.post('/api/delivery/zones', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['delivery-zones'] }); setZoneForm({ name: '', baseFee: '', perKmFee: '', maxDistance: '' }); },
  });

  const deleteZone = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/delivery/zones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-zones'] }),
  });

  const createSlot = useMutation({
    mutationFn: (d: object) => axios.post('/api/delivery/slots', d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-slots'] }),
  });

  const deleteSlot = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/delivery/slots/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-slots'] }),
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'live', label: 'Live Map' },
    { key: 'orders', label: 'Orders' },
    { key: 'zones', label: 'Zones & Slots' },
    { key: 'drivers', label: 'Drivers' },
    { key: 'performance', label: 'Performance' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Delivery Management</h1>
        <p className="text-gray-500 text-sm mt-1">Manage drivers, zones, and live deliveries</p>
      </div>

      {/* Stats */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: 'Pending', value: dashboard.pending, color: 'text-yellow-600' },
            { label: 'In Transit', value: dashboard.inTransit, color: 'text-blue-600' },
            { label: 'Delivered Today', value: dashboard.delivered, color: 'text-green-600' },
            { label: 'Failed Today', value: dashboard.failed, color: 'text-red-600' },
            { label: 'Online Drivers', value: dashboard.onlineDrivers, color: 'text-indigo-600' },
            { label: 'Total Drivers', value: dashboard.totalDrivers, color: 'text-gray-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Live Tab */}
      {tab === 'live' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Active Deliveries</h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{liveDeliveries.length} active</span>
            </div>

            {liveDeliveries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-3">🚴</div>
                <p>No active deliveries right now</p>
              </div>
            ) : (
              <div className="space-y-3">
                {liveDeliveries.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <div className="font-medium text-gray-900">{d.order?.customer?.name || 'Unknown Customer'}</div>
                      <div className="text-sm text-gray-500">{d.addressText || 'Address not set'}</div>
                      <div className="text-sm text-gray-500">Driver: {d.driver?.user?.name || 'Unassigned'}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[d.status] || 'bg-gray-100 text-gray-600'}`}>{d.status}</span>
                      {d.estimatedMins && <span className="text-xs text-gray-500">~{d.estimatedMins} min</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Driver locations */}
          {dashboard?.drivers && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Driver Status</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {dashboard.drivers.map((d: any) => (
                  <div key={d.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
                      {d.user?.name?.[0] || 'D'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{d.user?.name}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${DRIVER_COLOR[d.status] || 'bg-gray-100'}`}>{d.status}</span>
                    </div>
                    <div className="ml-auto text-xs text-yellow-600">★ {d.rating?.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Delivery Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Order', 'Customer', 'Driver', 'Slot', 'Status', 'Fee', 'Scheduled'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{o.orderId.slice(-8)}</td>
                    <td className="px-4 py-3">{o.order?.customer?.name || '—'}</td>
                    <td className="px-4 py-3">{o.driver?.user?.name || <span className="text-gray-400 italic">Unassigned</span>}</td>
                    <td className="px-4 py-3">{o.slot ? `${o.slot.startTime}–${o.slot.endTime}` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[o.status] || 'bg-gray-100'}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3">₹{o.deliveryFee?.toFixed(0)}</td>
                    <td className="px-4 py-3 text-gray-500">{o.scheduledAt ? new Date(o.scheduledAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && <div className="text-center py-10 text-gray-400">No delivery orders found</div>}
          </div>
        </div>
      )}

      {/* Zones & Slots Tab */}
      {tab === 'zones' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Zones */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Delivery Zones</h2>
            <div className="space-y-2 mb-4">
              {zones.map((z: any) => (
                <div key={z.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{z.name}</div>
                    <div className="text-xs text-gray-500">Base ₹{z.baseFee} + ₹{z.perKmFee}/km · max {z.maxDistance}km</div>
                  </div>
                  <button onClick={() => deleteZone.mutate(z.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Add Zone</h3>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Zone name" value={zoneForm.name} onChange={e => setZoneForm(f => ({ ...f, name: e.target.value }))} />
              <div className="grid grid-cols-3 gap-2">
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Base fee" type="number" value={zoneForm.baseFee} onChange={e => setZoneForm(f => ({ ...f, baseFee: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Per km" type="number" value={zoneForm.perKmFee} onChange={e => setZoneForm(f => ({ ...f, perKmFee: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Max km" type="number" value={zoneForm.maxDistance} onChange={e => setZoneForm(f => ({ ...f, maxDistance: e.target.value }))} />
              </div>
              <button onClick={() => createZone.mutate({ name: zoneForm.name, polygonJson: {}, baseFee: +zoneForm.baseFee, perKmFee: +zoneForm.perKmFee, maxDistance: +zoneForm.maxDistance })}
                disabled={!zoneForm.name}
                className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                Add Zone
              </button>
            </div>
          </div>

          {/* Slots */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Delivery Slots</h2>
            <div className="space-y-2 mb-4">
              {slots.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{s.zone?.name} · {DAYS[s.dayOfWeek]}</div>
                    <div className="text-xs text-gray-500">{s.startTime}–{s.endTime} · max {s.maxOrders} orders</div>
                  </div>
                  <button onClick={() => deleteSlot.mutate(s.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Add Slot</h3>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={slotForm.zoneId} onChange={e => setSlotForm(f => ({ ...f, zoneId: e.target.value }))}>
                <option value="">Select zone</option>
                {zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select className="border rounded-lg px-3 py-2 text-sm" value={slotForm.dayOfWeek} onChange={e => setSlotForm(f => ({ ...f, dayOfWeek: e.target.value }))}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <input className="border rounded-lg px-3 py-2 text-sm" type="number" placeholder="Max orders" value={slotForm.maxOrders} onChange={e => setSlotForm(f => ({ ...f, maxOrders: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm" type="time" value={slotForm.startTime} onChange={e => setSlotForm(f => ({ ...f, startTime: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm" type="time" value={slotForm.endTime} onChange={e => setSlotForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
              <button onClick={() => createSlot.mutate({ zoneId: slotForm.zoneId, dayOfWeek: +slotForm.dayOfWeek, startTime: slotForm.startTime, endTime: slotForm.endTime, maxOrders: +slotForm.maxOrders })}
                disabled={!slotForm.zoneId}
                className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                Add Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drivers Tab */}
      {tab === 'drivers' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">All Drivers</h2>
          {dashboard?.drivers?.length === 0 && <div className="text-center py-12 text-gray-400">No drivers registered yet</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(dashboard?.drivers || []).map((d: any) => (
              <div key={d.id} className="border rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-700">
                    {d.user?.name?.[0] || 'D'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{d.user?.name}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${DRIVER_COLOR[d.status] || 'bg-gray-100'}`}>{d.status}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">★ {d.rating?.toFixed(2)} rating</div>
                {d.currentLat && <div className="text-xs text-gray-400">📍 {d.currentLat.toFixed(4)}, {d.currentLng?.toFixed(4)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {tab === 'performance' && (
        <div className="space-y-4">
          {performance.map((d: any) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700">
                    {d.name?.[0] || 'D'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{d.name}</div>
                    <div className="text-sm text-gray-500">{d.totalDeliveries} total deliveries</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-yellow-600 font-semibold">★ {d.rating?.toFixed(2)}</div>
                  <div className="text-sm text-green-600">₹{d.recentEarnings?.toFixed(0)} this week</div>
                </div>
              </div>
              {d.recentRatings?.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent Reviews</div>
                  {d.recentRatings.slice(0, 3).map((r: any) => (
                    <div key={r.id} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-yellow-500">{'★'.repeat(r.rating)}</span>
                      <span>{r.comment || 'No comment'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {performance.length === 0 && <div className="text-center py-12 text-gray-400">No driver performance data yet</div>}
        </div>
      )}
    </div>
  );
}
