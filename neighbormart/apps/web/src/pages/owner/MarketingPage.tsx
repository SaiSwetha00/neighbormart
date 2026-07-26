import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Megaphone, Plus, Play, Pause, Trash2, BarChart2, Users, Zap, FlaskConical, TrendingUp, Gift } from 'lucide-react';

type Campaign = {
  id: string;
  name: string;
  type: string;
  status: string;
  targetTier: string | null;
  sentCount: number;
  openCount: number;
  clickCount: number;
  content: string;
  discountPct: number | null;
  startAt: string | null;
  endAt: string | null;
};

type ABTest = { id: string; name: string; variantA: string; variantB: string; trafficSplit: number; status: string; winnerVariant: string | null };

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  PAUSED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  ENDED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export default function MarketingPage() {
  const [tab, setTab] = useState<'campaigns' | 'abtest' | 'referral' | 'flash'>('campaigns');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'EMAIL', targetTier: 'ALL', subject: '', content: '', discountPct: '', startAt: '', endAt: '' });
  const [abForm, setAbForm] = useState({ name: '', variantA: '', variantB: '', trafficSplit: 50 });
  const qc = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: () => axios.get('/api/campaigns').then(r => r.data.data),
  });

  const { data: abTests = [] } = useQuery<ABTest[]>({
    queryKey: ['ab-tests'],
    queryFn: () => axios.get('/api/ab-tests').then(r => r.data.data),
    enabled: tab === 'abtest',
  });

  const { data: referralStats } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: () => axios.get('/api/referrals/stats').then(r => r.data.data),
    enabled: tab === 'referral',
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => axios.post('/api/campaigns', { ...data, discountPct: data.discountPct ? Number(data.discountPct) : null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); setShowCreate(false); setForm({ name: '', type: 'EMAIL', targetTier: 'ALL', subject: '', content: '', discountPct: '', startAt: '', endAt: '' }); },
  });

  const launchMutation = useMutation({
    mutationFn: (id: string) => axios.post(`/api/campaigns/${id}/launch`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => axios.put(`/api/campaigns/${id}`, { status: 'PAUSED' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const createABMutation = useMutation({
    mutationFn: (data: typeof abForm) => axios.post('/api/ab-tests', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ab-tests'] }); setAbForm({ name: '', variantA: '', variantB: '', trafficSplit: 50 }); },
  });

  const tabs = [
    { key: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { key: 'abtest', label: 'A/B Testing', icon: FlaskConical },
    { key: 'referral', label: 'Referral', icon: Gift },
    { key: 'flash', label: 'Flash Sales', icon: Zap },
  ] as const;

  const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0);
  const totalOpen = campaigns.reduce((s, c) => s + c.openCount, 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marketing & Campaigns</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage campaigns, A/B tests, referrals, and flash sales</p>
        </div>
        {tab === 'campaigns' && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-[#1B4332] text-white px-4 py-2 rounded-lg hover:bg-[#1B4332]/90 text-sm font-medium">
            <Plus size={16} /> New Campaign
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Campaigns', value: campaigns.length, icon: Megaphone, color: 'text-blue-600' },
          { label: 'Active', value: activeCampaigns, icon: Play, color: 'text-green-600' },
          { label: 'Total Sent', value: totalSent.toLocaleString(), icon: Users, color: 'text-purple-600' },
          { label: 'Open Rate', value: totalSent > 0 ? `${((totalOpen / totalSent) * 100).toFixed(1)}%` : '0%', icon: TrendingUp, color: 'text-orange-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <stat.icon size={20} className={stat.color} />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-[#1B4332] text-[#1B4332] dark:text-green-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Tab */}
      {tab === 'campaigns' && (
        <div className="space-y-4">
          {isLoading && <div className="text-center py-12 text-gray-400">Loading…</div>}
          {!isLoading && campaigns.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Megaphone size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No campaigns yet</p>
              <p className="text-sm">Create your first campaign to engage customers</p>
            </div>
          )}
          {campaigns.map(c => (
            <div key={c.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{c.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status]}`}>{c.status}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">{c.type}</span>
                    {c.targetTier && c.targetTier !== 'ALL' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">{c.targetTier}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{c.content}</p>
                  {c.discountPct && <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">{c.discountPct}% discount</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.status === 'DRAFT' && (
                    <button onClick={() => launchMutation.mutate(c.id)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700">
                      <Play size={12} /> Launch
                    </button>
                  )}
                  {c.status === 'ACTIVE' && (
                    <button onClick={() => pauseMutation.mutate(c.id)} className="flex items-center gap-1 bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-yellow-700">
                      <Pause size={12} /> Pause
                    </button>
                  )}
                  <button onClick={() => deleteMutation.mutate(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{c.sentCount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sent</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{c.openCount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Opened</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{c.clickCount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Clicked</p>
                </div>
                {c.sentCount > 0 && (
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">{((c.openCount / c.sentCount) * 100).toFixed(1)}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Open Rate</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* A/B Testing Tab */}
      {tab === 'abtest' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><FlaskConical size={16} /> Create A/B Test</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Test Name</label>
                <input value={abForm.name} onChange={e => setAbForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Subject line test"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Traffic Split (% Variant A)</label>
                <input type="number" min={10} max={90} value={abForm.trafficSplit} onChange={e => setAbForm(p => ({ ...p, trafficSplit: Number(e.target.value) }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Variant A</label>
                <textarea value={abForm.variantA} onChange={e => setAbForm(p => ({ ...p, variantA: e.target.value }))} rows={3} placeholder="Original content"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Variant B</label>
                <textarea value={abForm.variantB} onChange={e => setAbForm(p => ({ ...p, variantB: e.target.value }))} rows={3} placeholder="Test content"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <button onClick={() => createABMutation.mutate(abForm)} disabled={!abForm.name || !abForm.variantA || !abForm.variantB || createABMutation.isPending}
              className="mt-4 bg-[#1B4332] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1B4332]/90 disabled:opacity-50">
              {createABMutation.isPending ? 'Creating…' : 'Create Test'}
            </button>
          </div>
          <div className="space-y-3">
            {abTests.map(t => (
              <div key={t.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{t.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status] ?? STATUS_COLOR.DRAFT}`}>{t.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Variant A ({t.trafficSplit}%)</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{t.variantA}</p>
                    {t.winnerVariant === 'A' && <p className="text-xs text-green-600 font-medium mt-1">🏆 Winner</p>}
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                    <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">Variant B ({100 - t.trafficSplit}%)</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{t.variantB}</p>
                    {t.winnerVariant === 'B' && <p className="text-xs text-green-600 font-medium mt-1">🏆 Winner</p>}
                  </div>
                </div>
              </div>
            ))}
            {abTests.length === 0 && <div className="text-center py-8 text-gray-400"><FlaskConical size={40} className="mx-auto mb-2 opacity-30" /><p>No A/B tests yet</p></div>}
          </div>
        </div>
      )}

      {/* Referral Tab */}
      {tab === 'referral' && (
        <div className="space-y-4">
          {referralStats && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Customers', value: referralStats.total },
                { label: 'Referrals', value: referralStats.referrals?.length ?? 0 },
                { label: 'Conversion Rate', value: `${referralStats.conversionRate}%` },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          )}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Referral Program Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Referrer Reward (points)</label>
                <input type="number" defaultValue={100} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Referee Discount (%)</label>
                <input type="number" defaultValue={10} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <button className="mt-4 bg-[#1B4332] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1B4332]/90">Save Settings</button>
          </div>
        </div>
      )}

      {/* Flash Sales Tab */}
      {tab === 'flash' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white">
            <div className="flex items-center gap-3 mb-2"><Zap size={24} className="text-yellow-300" /><h3 className="text-xl font-bold">Flash Sale Creator</h3></div>
            <p className="text-sm text-white/80">Create time-limited deals that drive urgency and boost revenue</p>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Flash Sale</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Sale Name</label>
                <input placeholder="Weekend Flash Deal" className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Discount %</label>
                <input type="number" placeholder="20" className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                <input type="datetime-local" className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                <input type="datetime-local" className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <button
              onClick={() => createMutation.mutate({ ...form, name: 'Flash Sale', type: 'FLASH_SALE', targetTier: 'ALL', content: 'Limited time flash sale!' })}
              className="mt-4 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600">
              Launch Flash Sale
            </button>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Campaign</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" placeholder="Summer Promo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
                    {['EMAIL', 'SMS', 'PUSH', 'FLASH_SALE'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Target Tier</label>
                  <select value={form.targetTier} onChange={e => setForm(p => ({ ...p, targetTier: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
                    {['ALL', 'SILVER', 'GOLD', 'PLATINUM'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Subject (email only)</label>
                <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" placeholder="Exclusive offer for you!" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Content *</label>
                <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={4}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                  placeholder="Write your campaign message here…" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Discount % (optional)</label>
                <input type="number" value={form.discountPct} onChange={e => setForm(p => ({ ...p, discountPct: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" placeholder="10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input type="date" value={form.startAt} onChange={e => setForm(p => ({ ...p, startAt: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input type="date" value={form.endAt} onChange={e => setForm(p => ({ ...p, endAt: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.content || createMutation.isPending}
                className="px-4 py-2 text-sm bg-[#1B4332] text-white rounded-lg hover:bg-[#1B4332]/90 disabled:opacity-50">
                {createMutation.isPending ? 'Creating…' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
