import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Star } from 'lucide-react';

export default function RatingsPage() {
  const { data: ratings = [], isLoading } = useQuery({
    queryKey: ['driver-ratings'],
    queryFn: () => axios.get('/api/driver/ratings').then(r => r.data.data),
  });

  const avg = ratings.length ? ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length : 0;

  return (
    <div className="p-5 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Ratings</h1>

      {ratings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-center">
          <div className="text-4xl font-bold text-yellow-700">{avg.toFixed(1)}</div>
          <div className="flex items-center justify-center gap-0.5 mt-1">
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={20} className={i <= Math.round(avg) ? 'text-yellow-500 fill-yellow-400' : 'text-gray-300'} />
            ))}
          </div>
          <div className="text-sm text-gray-500 mt-2">Based on {ratings.length} reviews</div>
        </div>
      )}

      {isLoading && <div className="text-center py-8 text-gray-400">Loading…</div>}

      <div className="space-y-3">
        {ratings.map((r: any) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={14} className={i <= r.rating ? 'text-yellow-500 fill-yellow-400' : 'text-gray-300'} />
                ))}
              </div>
              <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
            </div>
            <p className="text-sm text-gray-700">{r.comment || <span className="italic text-gray-400">No comment</span>}</p>
          </div>
        ))}
        {ratings.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-400">
            <Star size={48} className="mx-auto mb-3 opacity-30" />
            <p>No ratings yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
