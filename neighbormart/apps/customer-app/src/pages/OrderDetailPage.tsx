import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Package, CheckCircle, Clock, XCircle } from 'lucide-react'
import Header from '../components/Header'
import api from '../api'

interface OrderItem {
  id: string
  productName: string
  quantity: number
  price: number
  product?: { name: string; image?: string }
}

interface OrderDetail {
  id: string
  createdAt: string
  status: string
  type: string
  totalAmount: number
  subtotal?: number
  tax?: number
  couponCode?: string
  specialInstructions?: string
  items: OrderItem[]
}

const STEPS = ['PENDING', 'CONFIRMED', 'PACKED', 'DELIVERED']

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'text-yellow-600 bg-yellow-50',
  CONFIRMED: 'text-blue-600 bg-blue-50',
  PACKED: 'text-purple-600 bg-purple-50',
  READY: 'text-indigo-600 bg-indigo-50',
  DELIVERED: 'text-green-600 bg-green-50',
  CANCELLED: 'text-red-600 bg-red-50',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get(`/customer/orders/${id}`)
      const d = res.data?.data ?? res.data
      return (d?.order ?? d) as OrderDetail
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async () => api.patch(`/customer/orders/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', id] }),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse space-y-4">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="card p-6 h-40 bg-gray-100" />
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="text-center py-20 text-gray-400">
          Order not found.
          <Link to="/orders" className="block text-green-600 text-sm mt-2">← Back to orders</Link>
        </div>
      </div>
    )
  }

  const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status)
  const stepIdx = STEPS.indexOf(order.status)
  const isCancelled = order.status === 'CANCELLED'
  const subtotal = order.subtotal ?? order.items.reduce((s, i) => s + i.price * i.quantity, 0)
  const tax = order.tax ?? subtotal * 0.08
  const shortId = order.id.slice(-8).toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-600 mb-6">
          <ArrowLeft size={16} /> Back to Orders
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Order #{shortId}</h1>
            <p className="text-sm text-gray-400 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLOR[order.status] || 'bg-gray-100 text-gray-600'}`}>
            {order.status}
          </span>
        </div>

        {/* Progress Steps */}
        {!isCancelled && (
          <div className="card p-5 mb-5">
            <h2 className="font-semibold text-gray-700 mb-4 text-sm">Order Progress</h2>
            <div className="flex items-center">
              {STEPS.map((step, idx) => {
                const done = idx <= stepIdx
                const active = idx === stepIdx
                return (
                  <div key={step} className="flex-1 flex items-center">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                        done ? 'bg-green-600 border-green-600' : 'bg-white border-gray-200'
                      }`}>
                        {done
                          ? <CheckCircle size={16} className="text-white" />
                          : <Clock size={14} className="text-gray-300" />
                        }
                      </div>
                      <span className={`text-xs mt-1 font-medium ${active ? 'text-green-600' : done ? 'text-gray-600' : 'text-gray-300'}`}>
                        {step.charAt(0) + step.slice(1).toLowerCase()}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mb-5 ${idx < stepIdx ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
            <XCircle size={20} className="text-red-500" />
            <span className="text-sm text-red-700 font-medium">This order has been cancelled.</span>
          </div>
        )}

        {/* Items */}
        <div className="card p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">Items</h2>
          <div className="divide-y divide-gray-50">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  {item.product?.image
                    ? <img src={item.product.image} alt="" className="w-full h-full object-cover rounded-lg" />
                    : <Package size={16} className="text-gray-300" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {item.product?.name ?? item.productName}
                  </p>
                  <p className="text-xs text-gray-400">Qty: {item.quantity} × ${item.price.toFixed(2)}</p>
                </div>
                <span className="font-semibold text-gray-900 text-sm">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4 mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-gray-500"><span>Tax</span><span>${tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
              <span>Total</span><span>${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {order.specialInstructions && (
          <div className="card p-4 mb-4 text-sm text-gray-600">
            <span className="font-medium text-gray-700">Instructions: </span>
            {order.specialInstructions}
          </div>
        )}

        {canCancel && (
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="w-full py-2.5 rounded-lg border border-red-300 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Order'}
          </button>
        )}
      </div>
    </div>
  )
}
