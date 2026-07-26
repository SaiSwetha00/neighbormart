import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FileBarChart, Play, Sparkles, Download, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import api from '@/services/api';

const QUICK_REPORTS = [
  { type: 'SALES', label: 'Sales Report', icon: '💰', desc: 'Revenue, orders, top products' },
  { type: 'INVENTORY', label: 'Inventory Report', icon: '📦', desc: 'Stock levels, valuation' },
  { type: 'LOW_STOCK', label: 'Low Stock Report', icon: '⚠️', desc: 'Items below threshold' },
  { type: 'WASTE', label: 'Waste & Shrinkage', icon: '🗑️', desc: 'Waste logs, shrinkage value' },
  { type: 'CUSTOMERS', label: 'Customer Report', icon: '👥', desc: 'Customer behavior, loyalty' },
];

function ReportResult({ data, type, onAISummary }: { data: any; type: string; onAISummary: () => void }) {
  if (!data) return null;
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-medium text-sm">Report Results</h3>
        <Button size="sm" variant="outline" onClick={onAISummary} className="ml-auto gap-1 text-xs h-7">
          <Sparkles className="h-3 w-3 text-indigo-500" /> AI Summary
        </Button>
        <Button size="sm" variant="outline" className="gap-1 text-xs h-7">
          <Download className="h-3 w-3" /> Export CSV
        </Button>
      </div>
      <pre className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-xs overflow-auto max-h-64 text-slate-700 dark:text-slate-300">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<{ type: string; result: any } | null>(null);
  const [aiSummary, setAISummary] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [newReport, setNewReport] = useState({ name: '', type: 'SALES' });

  const { data: reportsData, refetch } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.get('/reports').then(r => r.data?.data?.reports || []),
  });

  const createReport = useMutation({
    mutationFn: (data: { name: string; type: string }) => api.post('/reports', data),
    onSuccess: () => refetch(),
  });

  async function runQuickReport(type: string) {
    setLoadingReport(type);
    setAISummary(null);
    try {
      const created = await api.post('/reports', { name: `Quick ${type}`, type, config: {} });
      const reportId = created.data?.data?.id;
      if (reportId) {
        const result = await api.get(`/reports/${reportId}/run`);
        setActiveReport({ type, result: result.data?.data });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReport(null);
    }
  }

  async function getAISummary() {
    if (!activeReport) return;
    setLoadingSummary(true);
    try {
      const res = await api.post('/ai/report-summary', { reportData: activeReport.result, reportType: activeReport.type });
      setAISummary(res.data?.data?.summary || '');
    } catch { setAISummary('Unable to generate summary.'); }
    finally { setLoadingSummary(false); }
  }

  const reports = reportsData || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Generate, analyze and schedule reports</p>
        </div>
      </div>

      <Tabs defaultValue="quick">
        <TabsList>
          <TabsTrigger value="quick">Quick Reports</TabsTrigger>
          <TabsTrigger value="saved">Saved Reports</TabsTrigger>
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK_REPORTS.map(r => (
              <Card key={r.type} className="hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => runQuickReport(r.type)}>
                <CardContent className="p-4 flex items-start gap-3">
                  <span className="text-2xl">{r.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-900 dark:text-white">{r.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                  </div>
                  {loadingReport === r.type ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-indigo-500 mt-0.5" />
                  ) : (
                    <Play className="h-4 w-4 text-indigo-500 mt-0.5" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {activeReport && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{QUICK_REPORTS.find(r => r.type === activeReport.type)?.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportResult data={activeReport.result} type={activeReport.type} onAISummary={getAISummary} />
                {loadingSummary && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-indigo-600">
                    <Sparkles className="h-4 w-4 animate-pulse" /> Generating AI summary…
                  </div>
                )}
                {aiSummary && (
                  <div className="mt-4 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-100 dark:border-indigo-900 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">AI Summary</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{aiSummary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          <div className="space-y-3">
            {reports.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <FileBarChart className="h-10 w-10 mx-auto mb-2" />
                <p>No saved reports yet.</p>
              </div>
            )}
            {reports.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <FileBarChart className="h-5 w-5 text-indigo-400" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-slate-500">{r.type} · Last run: {r.lastRun ? new Date(r.lastRun).toLocaleDateString() : 'Never'}</p>
                  </div>
                  <Badge variant="outline">{r.type}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => api.get(`/reports/${r.id}/run`).then(res => setActiveReport({ type: r.type, result: res.data?.data }))}>
                    <Play className="h-3 w-3 mr-1" /> Run
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="builder" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Build a Custom Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Report Name</label>
                <input
                  value={newReport.name}
                  onChange={e => setNewReport(p => ({ ...p, name: e.target.value }))}
                  placeholder="My Custom Report"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Report Type</label>
                <select
                  value={newReport.type}
                  onChange={e => setNewReport(p => ({ ...p, type: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {QUICK_REPORTS.map(r => <option key={r.type} value={r.type}>{r.label}</option>)}
                </select>
              </div>
              <Button
                onClick={() => createReport.mutate(newReport)}
                disabled={!newReport.name || createReport.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" /> Save Report Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
