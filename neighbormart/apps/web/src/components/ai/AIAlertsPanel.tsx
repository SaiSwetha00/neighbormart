import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Info, Sparkles, Zap } from 'lucide-react';
import api from '@/services/api';

const PRIORITY_CONFIG = {
  CRITICAL: { color: 'bg-red-100 border-red-200 dark:bg-red-950/30 dark:border-red-800', badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: <AlertTriangle className="h-4 w-4 text-red-500" />, label: 'Critical' },
  HIGH: { color: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', icon: <Zap className="h-4 w-4 text-amber-500" />, label: 'High' },
  MEDIUM: { color: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: <Info className="h-4 w-4 text-blue-500" />, label: 'Medium' },
  LOW: { color: 'bg-slate-50 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: <CheckCircle2 className="h-4 w-4 text-slate-400" />, label: 'Low' },
};

export function AIAlertsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: () => api.get('/ai/insights').then(r => r.data?.data?.insights || []),
    refetchInterval: 5 * 60 * 1000,
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => api.post(`/ai/insights/${id}/dismiss`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-insights'] }),
  });

  const act = useMutation({
    mutationFn: (id: string) => api.post(`/ai/insights/${id}/act`, { actionTaken: 'Reviewed' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-insights'] }),
  });

  const insights = data || [];

  return (
    <div className="rounded-2xl border bg-white p-5 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-indigo-500" />
        <h2 className="font-semibold text-slate-900 dark:text-white">AI Alerts</h2>
        {insights.length > 0 && (
          <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
            {insights.length}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
        </div>
      )}

      {!isLoading && insights.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center text-slate-400">
          <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-400" />
          <p className="text-sm">All clear! No alerts right now.</p>
        </div>
      )}

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {insights.map((insight: any) => {
          const cfg = PRIORITY_CONFIG[insight.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.MEDIUM;
          return (
            <div key={insight.id} className={`rounded-xl border p-3 ${cfg.color}`}>
              <div className="flex items-start gap-2">
                {cfg.icon}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-800 dark:text-white truncate">{insight.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${cfg.badge}`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{insight.content}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => act.mutate(insight.id)} className="text-[10px] font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                      Mark resolved
                    </button>
                    <button onClick={() => dismiss.mutate(insight.id)} className="text-[10px] text-slate-400 hover:text-slate-600">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
