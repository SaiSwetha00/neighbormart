import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { CheckCircle, Tag, Gift, ShoppingBag } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Header from '../components/Header'
import { useCart } from '../stores/cart'
import { useAuth } from '../stores/auth'
import api from '../api'

const TAX_RATE = 0.08

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [coupon, setCoupon] = useState('')
  const [loyaltyPts, setLoyaltyPts] = useState(0)
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ orderId: string } | null>(null)

  const { data: loyalty } = useQuery({
    queryKey: ['loyalty-balance'],
    queryFn: async () => {
      const res = await api.get('/customer/loyalty')
      return (res.data?.data ?? res.data) as { points: number; tier: string }
    },
    enabled: !!user,
  })

  const tax = subtotal * TAX_RATE
  const loyaltyDiscount = Math.min(loyaltyPts / 100, subtotal)
  const total = Math.max(0, subtotal + tax - loyaltyDiscount)

  const handlePlaceOrder = async () => {
    if (items.length === 0) return
    setError('')
    setLoading(true)
    try {
      const payload = {
        type: 'PICKUP',
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        ...(coupon && { couponCode: coupon }),
        ...(loyaltyPts > 0 && { loyaltyPointsUsed: loyaltyPts }),
        ...(instructions && { specialInstructions: instructions }),
      }
      const res = await api.post('/customer/orders', payload)
      const data = res.data?.data ?? res.data
      const orderId = data?.order?.id ?? data?.id ?? 'N/A'
      clearCart()
      setSuccess({ orderId })
      setTimeout(() => navigate('/orders'), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0 && !success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="text-center py-20">
          <ShoppingBag size={50} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500">Your cart is empty.</p>
          <Link to="/shop" className="text-green-600 text-sm mt-2 inline-block">Go Shopping</Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
          <p className="text-gray-500 mb-2">Your order has been confirmed.</p>
          <p className="text-sm text-gray-400 bg-gray-100 rounded-lg px-4 py-2 inline-block mb-6">
            Order ID: <span className="font-mono font-semibold text-gray-700">{success.orderId}</span>
          </p>
          <p className="text-sm text-gray-400">Redirecting to your orders…</p>
          <Link to="/orders" className="btn-primary inline-block mt-4">View Orders</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left */}
          <div className="space-y-4">
            {/* Pickup info */}
            <div className="card p-4">
              <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" /> Pickup Order
              </h2>
              <p className="text-sm text-gray-500">Pay at the store when you pick up your order.</p>
            </div>

            {/* Coupon */}
            <div className="card p-4">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Tag size={16} /> Coupon Code
              </h2>
              <div className="flex gap-2">
                <input
                  className="input-field"
                  placeholder="Enter coupon code"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                />
              </div>
            </div>

            {/* Loyalty */}
            {user && loyalty && loyalty.points > 0 && (
              <div className="card p-4">
                <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Gift size={16} /> Use Loyalty Points
                </h2>
                <p className="text-sm text-gray-500 mb-2">Available: {loyalty.points} pts (100 pts = $1)</p>
                <input
                  type="number"
                  min={0}
                  max={loyalty.points}
                  step={100}
                  className="input-field"
                  value={loyaltyPts}
                  onChange={(e) => setLoyaltyPts(Math.min(parseInt(e.target.value) || 0, loyalty.points))}
                />
                {loyaltyPts > 0 && (
                  <p className="text-xs text-green-600 mt-1">Discount: −${loyaltyDiscount.toFixed(2)}</p>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="card p-4">
              <h2 className="font-semibold text-gray-800 mb-3">Special Instructions</h2>
              <textarea
                className="input-field resize-none"
                rows={3}
                placeholder="Any special requests…"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>
          </div>

          {/* Right: Summary */}
          <div>
            <div className="card p-5 sticky top-20">
              <h2 className="font-semibold text-gray-800 mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm text-gray-600">
                    <span className="truncate pr-2">{item.name} ×{item.quantity}</span>
                    <span className="flex-shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (8%)</span><span>${tax.toFixed(2)}</span>
                </div>
                {loyaltyPts > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Loyalty Discount</span><span>−${loyaltyDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                  <span>Total</span><span>${total.toFixed(2)}</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg mt-4">
                  {error}
                </div>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="btn-primary w-full py-3 mt-5 text-base"
              >
                {loading ? 'Placing Order…' : 'Place Order (Pay at Pickup)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
