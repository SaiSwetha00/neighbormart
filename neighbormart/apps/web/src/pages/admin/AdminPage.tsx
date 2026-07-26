import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Shield, Store, Users, DollarSign, Cpu, Settings, CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';

type StoreItem = { id: string; name: string; status: string; createdAt: string; _count: { users: number; orders: number; products: number } };
type UserItem = { id: string; name: string; email: string; role: string; status: string; store: { name: string } };

const ROLE_COLOR: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  STAFF: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  CUSTOMER: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  DRIVER: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  SUPER_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export default function AdminPage() {
  const [tab, setTab] = useState<'stores' | 'users' | 'revenue' | 'ai' | 'settings'>('stores');
  const qc = useQueryClient();

  const { data: stores = [], isLoading: storesLoading } = useQuery<StoreItem[]>({
    queryKey: ['admin-stores'],
    queryFn: () => axios.get('/api/admin/stores').then(r => r.data.data),
    enabled: tab === 'stores',
  });

  const { data: usersData } = useQuery<{ users: UserItem[]; total: number }>({
    queryKey: ['admin-users'],
    queryFn: () => axios.get('/api/admin/users').then(r => r.data.data),
    enabled: tab === 'users',
  });

  const { data: revenue } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: () => axios.get('/api/admin/revenue').then(r => r.data.data),
    enabled: tab === 'revenue',
  });

  const { data: aiUsage } = useQuery({
    queryKey: ['admin-ai'],
    queryFn: () => axios.get('/api/admin/ai-usage').then(r => r.data.data),
    enabled: tab === 'ai',
  });

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => axios.get('/api/admin/settings').then(r => r.data.data),
    enabled: tab === 'settings',
  });

  const updateStoreMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => axios.patch(`/api/admin/stores/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-stores'] }),
  });

  const gdprDeleteMutation = useMutation({
    mutationFn: (userId: string) => axios.delete(`/api/admin/gdpr/delete/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const tabs = [
    { key: 'stores', label: 'All Stores', icon: Store },
    { key: 'users', label: 'All Users', icon: Users },
    { key: 'revenue', label: 'Platform Revenue', icon: DollarSign },
    { key: 'ai', label: 'AI Usage', icon: Cpu },
    { key: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-[#1B4332] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Shield size={24} className="text-green-300" />
          <div>
            <h1 className="text-xl font-bold">Super Admin Dashboard</h1>
            <p className="text-green-200 text-sm">Platform-wide management</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === key ? 'border-[#1B4332] text-[#1B4332] dark:text-green-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Stores Tab */}
        {tab === 'stores' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stores.length}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Stores</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stores.filter(s => s.status === 'ACTIVE').length}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{stores.filter(s => s.status === 'SUSPENDED').length}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Suspended</p>
              </div>
            </div>
            {storesLoading && <div className="text-center py-8 text-gray-400">Loading…</div>}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Store</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Users</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Orders</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Products</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {stores.map(s => (
                    <tr key={s.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
                        <p className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s._count.users}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s._count.orders}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s._count.products}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.status === 'ACTIVE' ? (
                          <button onClick={() => updateStoreMutation.mutate({ id: s.id, status: 'SUSPENDED' })}
                            className="flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded">
                            <XCircle size={12} /> Suspend
                          </button>
                        ) : (
                          <button onClick={() => updateStoreMutation.mutate({ id: s.id, status: 'ACTIVE' })}
                            className="flex items-center gap-1 text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 px-2 py-1 rounded">
                            <CheckCircle size={12} /> Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total users: <span className="font-bold text-gray-900 dark:text-white">{usersData?.total ?? 0}</span></p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">User</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Store</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">GDPR</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {(usersData?.users ?? []).map((u: UserItem) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[u.role] ?? ROLE_COLOR.STAFF}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{u.store?.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>{u.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { if (confirm('Anonymize this user? This cannot be undone.')) gdprDeleteMutation.mutate(u.id); }}
                          className="flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded">
                          <AlertTriangle size={12} /> Erase
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Revenue Tab */}
        {tab === 'revenue' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Platform Revenue', value: revenue ? `$${Number(revenue.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-', icon: DollarSign, color: 'text-green-600' },
                { label: 'Monthly Orders', value: revenue?.monthlyOrders ?? '-', icon: TrendingUp, color: 'text-blue-600' },
                { label: 'Top Stores', value: revenue?.topStores?.length ?? 0, icon: Store, color: 'text-purple-600' },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <s.icon size={20} className={s.color} />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {revenue?.topStores && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Top Stores by Orders</h3>
                <div className="space-y-3">
                  {revenue.topStores.map((s: any, i: number) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400">#{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</p>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{s._count.orders} orders</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Usage Tab */}
        {tab === 'ai' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total Conversations', value: aiUsage?.totalConversations ?? 0 },
                { label: 'Total Insights', value: aiUsage?.totalInsights ?? 0 },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Recent AI Conversations</h3>
              </div>
              <div className="divide-y dark:divide-gray-700">
                {(aiUsage?.recentConversations ?? []).map((c: any) => (
                  <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{c.store?.name}</p>
                      <p className="text-xs text-gray-400">Role: {c.role}</p>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(c.updatedAt).toLocaleDateString()}</span>
                  </div>
                ))}
                {(aiUsage?.recentConversations ?? []).length === 0 && (
                  <div className="text-center py-8 text-gray-400"><Cpu size={40} className="mx-auto mb-2 opacity-30" /><p>No conversations yet</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && settings && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Stores', value: settings.storeCount },
                { label: 'Total Users', value: settings.userCount },
                { label: 'Total Orders', value: settings.orderCount },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value?.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Platform Features</h3>
              <div className="space-y-3">
                {Object.entries(settings.features ?? {}).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b last:border-0 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{key}</span>
                    <span className={`flex items-center gap-1 text-xs font-medium ${val ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      {val ? <CheckCircle size={14} /> : <XCircle size={14} />}{val ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Platform Version</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">NeighborMart v{settings.version}</p>
                </div>
                <span className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs px-3 py-1 rounded-full font-medium">Phase 5 Complete</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
