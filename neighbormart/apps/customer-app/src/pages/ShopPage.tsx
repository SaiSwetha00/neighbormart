import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Header from '../components/Header'
import ProductCard, { Product } from '../components/ProductCard'
import api, { mapProduct } from '../api'

const STORE_ID = 'demo-store-001'

interface ProductsResponse {
  products: Product[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const category = searchParams.get('category') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get(`/customer/categories?storeId=${STORE_ID}`)
      // API returns {success, data: {categories: [...]}}
      const d = res.data?.data
      return (d?.categories ?? d ?? []) as { id: string; name: string }[]
    },
  })

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', search, category, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        storeId: STORE_ID,
        page: String(page),
        limit: '12',
        ...(search && { search }),
        ...(category && { category }),
      })
      const res = await api.get(`/customer/products?${params}`)
      // API returns {success, data: {products: [...]}, pagination: {...}}
      const rawProducts = res.data?.data?.products ?? res.data?.data ?? []
      const products = (Array.isArray(rawProducts) ? rawProducts : []).map(mapProduct)
      const pagination = res.data?.pagination ?? res.data?.data?.pagination
      return { products, pagination } as ProductsResponse
    },
    placeholderData: (prev) => prev,
  })

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchParams((prev) => {
        if (search) prev.set('search', search)
        else prev.delete('search')
        prev.set('page', '1')
        return prev
      })
    }, 400)
    return () => clearTimeout(handler)
  }, [search, setSearchParams])

  const setCategory = (cat: string) => {
    setSearchParams((prev) => {
      if (cat) prev.set('category', cat)
      else prev.delete('category')
      prev.set('page', '1')
      return prev
    })
  }

  const setPage = (p: number) => {
    setSearchParams((prev) => { prev.set('page', String(p)); return prev })
  }

  const products = productsData?.products ?? []
  const pagination = productsData?.pagination
  const categories = categoriesData ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          <button
            onClick={() => setCategory('')}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !category ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-green-400'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.name)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === cat.name
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-green-400'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-t-xl" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-8 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Search size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No products found</p>
            <p className="text-sm mt-1">Try adjusting your search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="btn-secondary p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-gray-600 px-3">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= pagination.totalPages}
              className="btn-secondary p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
