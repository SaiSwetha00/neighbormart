import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Package, ChevronRight, Clock } from 'lucide-react'
import Header from '../components/Header'
import api from '../api'

interface Order {
  id: string
  createdAt: string
  status: string
  totalAmount: number
  items?: { id: string }[]
  itemCount?: number
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PACKED: 'bg-purple-100 text-purple-700',
  READY: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function OrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get('/customer/orders')
      const d = res.data?.data ?? res.data
      return (d?.orders ?? d) as Order[]
    },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-20">
            <Package size={50} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">No orders yet</p>
            <Link to="/shop" className="btn-primary inline-block mt-4 text-sm">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const shortId = order.id.slice(-8).toUpperCase()
              const itemCount = order.itemCount ?? order.items?.length ?? 0
              const statusColor = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'

              return (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Package size={20} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-gray-800 text-sm">#{shortId}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                      {itemCount > 0 && <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900">${order.totalAmount?.toFixed(2) ?? '—'}</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
