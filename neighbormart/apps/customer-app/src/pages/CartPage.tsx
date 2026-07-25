import { Link } from 'react-router-dom'
import { Trash2, ShoppingBag, ArrowRight, Package } from 'lucide-react'
import Header from '../components/Header'
import { useCart } from '../stores/cart'

const TAX_RATE = 0.08

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal } = useCart()

  const tax = subtotal * TAX_RATE
  const total = subtotal + tax

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <ShoppingBag size={60} className="mx-auto text-gray-200 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Your cart is empty</h2>
          <p className="text-gray-400 text-sm mb-6">Add some products to get started</p>
          <Link to="/shop" className="btn-primary inline-block">Browse Products</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Cart</h1>

        <div className="space-y-3 mb-6">
          {items.map((item) => (
            <div key={item.productId} className="card p-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                {item.image
                  ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  : <Package size={24} className="text-gray-300" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-800 text-sm truncate">{item.name}</h3>
                <p className="text-green-600 font-semibold text-sm mt-0.5">${item.price.toFixed(2)}</p>
              </div>

              <div className="flex items-center border border-gray-200 rounded-lg">
                <button
                  onClick={() => updateQty(item.productId, item.quantity - 1)}
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-lg"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateQty(item.productId, item.quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-lg"
                >
                  +
                </button>
              </div>

              <div className="text-right w-20 flex-shrink-0">
                <p className="font-semibold text-gray-900 text-sm">${(item.price * item.quantity).toFixed(2)}</p>
              </div>

              <button
                onClick={() => removeItem(item.productId)}
                className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between font-bold text-gray-900 text-base">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <Link to="/checkout" className="btn-primary w-full flex items-center justify-center gap-2 mt-5 py-3">
            Proceed to Checkout <ArrowRight size={18} />
          </Link>
          <Link to="/shop" className="block text-center text-sm text-gray-500 hover:text-green-600 mt-3">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
