import { useQuery } from '@tanstack/react-query'
import { Gift, Star, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import Header from '../components/Header'
import api from '../api'

interface LoyaltyTransaction {
  id: string
  type: 'EARNED' | 'REDEEMED' | 'EXPIRED'
  points: number
  description: string
  createdAt: string
}

interface LoyaltyData {
  points: number
  tier: string
  transactions?: LoyaltyTransaction[]
}

const TIER_COLORS: Record<string, string> = {
  SILVER: 'bg-gray-100 text-gray-600 border-gray-300',
  GOLD: 'bg-yellow-50 text-yellow-700 border-yellow-300',
  PLATINUM: 'bg-purple-50 text-purple-700 border-purple-300',
}

const TIER_NEXT: Record<string, { label: string; needed: number }> = {
  SILVER: { label: 'Gold', needed: 1000 },
  GOLD: { label: 'Platinum', needed: 5000 },
  PLATINUM: { label: 'Max tier!', needed: 0 },
}

export default function LoyaltyPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['loyalty'],
    queryFn: async () => {
      const res = await api.get('/customer/loyalty')
      return (res.data?.data ?? res.data) as LoyaltyData
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse space-y-4">
          <div className="card h-40 bg-gray-100" />
          <div className="card h-60 bg-gray-100" />
        </div>
      </div>
    )
  }

  const points = data?.points ?? 0
  const tier = data?.tier ?? 'SILVER'
  const transactions = data?.transactions ?? []
  const tierColor = TIER_COLORS[tier] ?? TIER_COLORS.SILVER
  const next = TIER_NEXT[tier]
  const progress = next?.needed ? Math.min((points / next.needed) * 100, 100) : 100

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Gift size={24} className="text-green-600" /> Loyalty Rewards
        </h1>

        {/* Points Card */}
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-6 text-white mb-5 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Your Balance</p>
              <p className="text-5xl font-bold mt-1">{points.toLocaleString()}</p>
              <p className="text-green-100 text-sm mt-1">points · worth ${(points / 100).toFixed(2)}</p>
            </div>
            <span className={`text-sm font-bold px-3 py-1.5 rounded-full border-2 ${tierColor}`}>
              <Star size={12} className="inline mr-1" />
              {tier}
            </span>
          </div>

          {next && next.needed > 0 && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-green-100 mb-1.5">
                <span>{points.toLocaleString()} pts</span>
                <span>{next.label} at {next.needed.toLocaleString()} pts</span>
              </div>
              <div className="bg-green-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          {tier === 'PLATINUM' && (
            <p className="text-green-100 text-sm mt-4 flex items-center gap-1">
              <Star size={14} /> You've reached the highest tier!
            </p>
          )}
        </div>

        {/* How it works */}
        <div className="card p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-600" /> How Points Work
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="bg-green-50 rounded-lg p-3">
              <p className="font-bold text-green-700 text-lg">1 pt</p>
              <p className="text-gray-500 text-xs mt-0.5">per $1 spent</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="font-bold text-blue-700 text-lg">100 pts</p>
              <p className="text-gray-500 text-xs mt-0.5">= $1 discount</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="font-bold text-purple-700 text-lg">No expiry</p>
              <p className="text-gray-500 text-xs mt-0.5">points never expire</p>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Points History</h2>
          {transactions.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No transactions yet. Start shopping to earn points!</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    tx.type === 'EARNED' ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {tx.type === 'EARNED'
                      ? <ArrowUpRight size={16} className="text-green-600" />
                      : <ArrowDownRight size={16} className="text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`font-bold text-sm ${tx.type === 'EARNED' ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.type === 'EARNED' ? '+' : '−'}{tx.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
