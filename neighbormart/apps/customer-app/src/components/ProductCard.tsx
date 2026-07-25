import { Link } from 'react-router-dom'
import { ShoppingCart, Package } from 'lucide-react'
import { useCart } from '../stores/cart'

export interface Product {
  id: string
  name: string
  price: number
  category?: string
  image?: string
  stockQuantity?: number
  unit?: string
}

interface Props {
  product: Product
}

export default function ProductCard({ product }: Props) {
  const { addItem, items } = useCart()
  const inCart = items.find((i) => i.productId === product.id)
  const outOfStock = (product.stockQuantity ?? 1) <= 0

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    if (outOfStock) return
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    })
  }

  return (
    <Link to={`/shop/product/${product.id}`} className="card hover:shadow-md transition-shadow flex flex-col">
      <div className="aspect-square bg-gray-100 rounded-t-xl flex items-center justify-center overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package size={48} className="text-gray-300" />
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        {product.category && (
          <span className="text-xs text-green-600 font-medium uppercase tracking-wide">
            {product.category}
          </span>
        )}
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 flex-1">{product.name}</h3>
        <div className="flex items-center justify-between mt-1">
          <span className="text-base font-bold text-gray-900">
            ${product.price.toFixed(2)}
            {product.unit && <span className="text-xs text-gray-400 font-normal"> /{product.unit}</span>}
          </span>
        </div>
        <button
          onClick={handleAdd}
          disabled={outOfStock}
          className={`mt-2 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
            outOfStock
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : inCart
              ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <ShoppingCart size={14} />
          {outOfStock ? 'Out of Stock' : inCart ? `In Cart (${inCart.quantity})` : 'Add to Cart'}
        </button>
      </div>
    </Link>
  )
}
