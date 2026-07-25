import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './stores/auth'
import { CartProvider } from './stores/cart'
import AuthGuard from './components/AuthGuard'

import CustomerLoginPage from './pages/CustomerLoginPage'
import CustomerRegisterPage from './pages/CustomerRegisterPage'
import ShopPage from './pages/ShopPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import ProfilePage from './pages/ProfilePage'
import LoyaltyPage from './pages/LoyaltyPage'

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    )
  }
  return <Navigate to={user ? '/shop' : '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<CustomerLoginPage />} />
          <Route path="/register" element={<CustomerRegisterPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/shop/product/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />

          {/* Authenticated routes */}
          <Route path="/checkout" element={
            <AuthGuard><CheckoutPage /></AuthGuard>
          } />
          <Route path="/orders" element={
            <AuthGuard><OrdersPage /></AuthGuard>
          } />
          <Route path="/orders/:id" element={
            <AuthGuard><OrderDetailPage /></AuthGuard>
          } />
          <Route path="/profile" element={
            <AuthGuard><ProfilePage /></AuthGuard>
          } />
          <Route path="/loyalty" element={
            <AuthGuard><LoyaltyPage /></AuthGuard>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CartProvider>
    </AuthProvider>
  )
}
