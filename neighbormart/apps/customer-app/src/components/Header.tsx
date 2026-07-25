import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, LogIn, Package, Gift, Store } from 'lucide-react'
import { useAuth } from '../stores/auth'
import { useCart } from '../stores/cart'

export default function Header() {
  const { user, logout } = useAuth()
  const { totalItems } = useCart()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-green-600">
          <Store size={24} />
          NeighborMart
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link to="/shop" className="hover:text-green-600 transition-colors">Shop</Link>
          {user && (
            <>
              <Link to="/orders" className="hover:text-green-600 transition-colors flex items-center gap-1">
                <Package size={16} /> Orders
              </Link>
              <Link to="/loyalty" className="hover:text-green-600 transition-colors flex items-center gap-1">
                <Gift size={16} /> Loyalty
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ShoppingCart size={22} className="text-gray-700" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-green-600 transition-colors"
              >
                <User size={18} />
                <span className="hidden sm:inline">{user.name.split(' ')[0]}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-red-500 transition-colors px-2 py-1 rounded"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
            >
              <LogIn size={18} />
              Login
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-gray-100 px-4 py-2 flex gap-4 text-xs font-medium text-gray-600">
        <Link to="/shop" className="hover:text-green-600">Shop</Link>
        {user && (
          <>
            <Link to="/orders" className="hover:text-green-600">Orders</Link>
            <Link to="/loyalty" className="hover:text-green-600">Loyalty</Link>
            <Link to="/profile" className="hover:text-green-600">Profile</Link>
          </>
        )}
      </div>
    </header>
  )
}
