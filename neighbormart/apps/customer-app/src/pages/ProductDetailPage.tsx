import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ShoppingCart, Star, Package } from 'lucide-react'
import Header from '../components/Header'
import { useCart } from '../stores/cart'
import api, { mapProduct } from '../api'

interface Review {
  id: string
  rating: number
  comment: string
  customerName: string
  createdAt: string
}

interface ProductDetail {
  id: string
  name: string
  price: number
  category?: string
  image?: string
  stockQuantity?: number
  unit?: string
  description?: string
  nutritionInfo?: Record<string, string>
  reviews?: Review[]
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { addItem, items } = useCart()
  const [qty, setQty] = useState(1)

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await api.get(`/customer/products/${id}`)
      const raw = res.data?.data?.product ?? res.data?.data ?? res.data
      return mapProduct(raw) as ProductDetail
    },
  })

  const inCart = items.find((i) => i.productId === id)

  const handleAdd = () => {
    if (!product) return
    addItem({ productId: product.id, name: product.name, price: product.price, image: product.image, quantity: qty })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
          <div className="h-4 w-24 bg-gray-200 rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded-xl" />
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
              <div className="h-16 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="text-center py-20 text-gray-400">
          <p>Product not found.</p>
          <Link to="/shop" className="text-green-600 text-sm mt-2 inline-block">← Back to shop</Link>
        </div>
      </div>
    )
  }

  const avgRating = product.reviews?.length
    ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
    : null

  const outOfStock = (product.stockQuantity ?? 1) <= 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-600 mb-6">
          <ArrowLeft size={16} /> Back to Shop
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image */}
          <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
            {product.image
              ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              : <Package size={80} className="text-gray-300" />
            }
          </div>

          {/* Info */}
          <div className="flex flex-col gap-4">
            {product.category && (
              <span className="text-xs font-semibold text-green-600 uppercase tracking-widest">{product.category}</span>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">${product.price.toFixed(2)}</span>
              {product.unit && <span className="text-gray-400 text-sm">/ {product.unit}</span>}
            </div>

            {avgRating !== null && (
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} size={16} className={s <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                ))}
                <span className="text-sm text-gray-500 ml-1">({product.reviews!.length} reviews)</span>
              </div>
            )}

            <div className="text-sm text-gray-500">
              {outOfStock
                ? <span className="text-red-500 font-medium">Out of stock</span>
                : <span className="text-green-600 font-medium">{product.stockQuantity} in stock</span>
              }
            </div>

            {product.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            )}

            {!outOfStock && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center border border-gray-200 rounded-lg">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-gray-600 hover:bg-gray-50">−</button>
                  <span className="px-4 py-2 text-sm font-medium">{qty}</span>
                  <button onClick={() => setQty(Math.min(product.stockQuantity ?? 99, qty + 1))} className="px-3 py-2 text-gray-600 hover:bg-gray-50">+</button>
                </div>
                <button onClick={handleAdd} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <ShoppingCart size={18} />
                  {inCart ? 'Add More' : 'Add to Cart'}
                </button>
              </div>
            )}
            {inCart && (
              <p className="text-xs text-green-600">Already {inCart.quantity} in your cart</p>
            )}
          </div>
        </div>

        {/* Nutrition */}
        {product.nutritionInfo && Object.keys(product.nutritionInfo).length > 0 && (
          <div className="card p-5 mt-8">
            <h2 className="font-semibold text-gray-800 mb-3">Nutrition Info</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(product.nutritionInfo).map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="text-xs text-gray-400 capitalize">{k}</div>
                  <div className="text-sm font-semibold text-gray-700">{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {product.reviews && product.reviews.length > 0 && (
          <div className="mt-8">
            <h2 className="font-semibold text-gray-800 mb-4">Customer Reviews</h2>
            <div className="space-y-3">
              {product.reviews.map((r) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-800">{r.customerName}</span>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} size={13} className={s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-gray-500">{r.comment}</p>}
                  <p className="text-xs text-gray-300 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
