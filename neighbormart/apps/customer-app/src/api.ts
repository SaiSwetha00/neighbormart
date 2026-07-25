import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only force-redirect on 401 for non-profile endpoints to avoid redirect loops
    // on public pages. Auth guard handles protected route redirects.
    const url: string = error.config?.url ?? ''
    const is401 = error.response?.status === 401
    const isProfileCheck = url.includes('/customer/profile')
    if (is401 && !isProfileCheck) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const extractData = (res: { data?: { data?: unknown } }) =>
  (res.data as { data?: unknown })?.data ?? res.data

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapProduct(p: any) {
  return {
    id: p.id,
    name: p.name,
    price: p.sellingPrice ?? p.price ?? 0,
    category: p.category?.name ?? p.category ?? undefined,
    image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : p.image,
    stockQuantity: p.stockQty ?? p.stockQuantity ?? 0,
    unit: p.unitOfMeasure ?? p.unit,
    description: p.description,
    nutritionInfo: p.nutritionInfo,
    reviews: p.reviews,
  }
}

export default api
