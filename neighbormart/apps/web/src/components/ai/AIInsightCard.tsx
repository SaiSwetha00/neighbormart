import { useState, useEffect } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';
import api from '@/services/api';

interface Props { module: string }

export function AIInsightCard({ module }: Props) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get(`/ai/panel-insight/${module}`)
      .then(res => { if (mounted) setInsight(res.data?.data?.insight || null); })
      .catch(() => { if (mounted) setInsight(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [module]);

  if (dismissed || (!loading && !insight)) return null;

  return (
    <div className="mt-3 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:to-violet-950/30">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" />
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-indigo-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Generating insight…
          </div>
        ) : (
          <p className="flex-1 text-xs leading-relaxed text-indigo-700 dark:text-indigo-300">{insight}</p>
        )}
        {!loading && (
          <button onClick={() => setDismissed(true)} className="text-indigo-400 hover:text-indigo-600">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
