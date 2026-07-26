import { useQuery } from '@tanstack/react-query';
import { Sparkles, MessageCircle, CheckCircle2, AlertTriangle, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AIAlertsPanel } from '@/components/ai/AIAlertsPanel';
import api from '@/services/api';

export default function AIDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-dashboard'],
    queryFn: () => api.get('/ai/dashboard').then(r => r.data?.data),
  });

  const { data: insights } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: () => api.get('/ai/insights').then(r => r.data?.data?.insights || []),
  });

  const insightsByPriority = data?.insightsByPriority || [];
  const stats = [
    { label: 'Active Insights', value: insights?.length || 0, icon: <Sparkles className="h-5 w-5 text-indigo-500" />, color: 'text-indigo-600' },
    { label: 'Actions Taken', value: data?.totalActions || 0, icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />, color: 'text-emerald-600' },
    { label: 'Conversations', value: data?.totalConversations || 0, icon: <MessageCircle className="h-5 w-5 text-blue-500" />, color: 'text-blue-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bot className="h-7 w-7 text-indigo-500" /> AI Intelligence Center
        </h1>
        <p className="text-sm text-slate-500 mt-1">Monitor AI insights, actions, and conversations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800">{s.icon}</div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                {isLoading ? <Skeleton className="h-6 w-12 mt-1" /> : <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Priority breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Insights by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => {
                const count = insightsByPriority.find((i: any) => i.priority === p)?._count || 0;
                const colors: Record<string, string> = { CRITICAL: 'bg-red-500', HIGH: 'bg-amber-500', MEDIUM: 'bg-blue-500', LOW: 'bg-slate-300' };
                return (
                  <div key={p} className="flex items-center gap-3">
                    <span className="text-xs w-16 text-slate-600 dark:text-slate-400">{p}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className={`h-2 rounded-full ${colors[p]}`} style={{ width: `${Math.min(100, count * 20)}%` }} />
                    </div>
                    <span className="text-xs font-medium w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <AIAlertsPanel />
      </div>

      {/* API status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            To enable AI features, set your <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">ANTHROPIC_API_KEY</code> in{' '}
            <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">neighbormart/backend/.env</code> and restart the backend server.
          </p>
          <p className="text-xs text-slate-400 mt-2">Model: claude-sonnet-4-6 · Max tokens: 512 per message</p>
        </CardContent>
      </Card>
    </div>
  );
}
