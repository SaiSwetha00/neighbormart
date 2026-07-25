import api from './api';

export const productsService = {
  getProducts: (params?: Record<string, unknown>) =>
    api.get('/products', { params }),

  getProduct: (id: string) => api.get(`/products/${id}`),

  createProduct: (data: unknown) => api.post('/products', data),

  updateProduct: (id: string, data: unknown) => api.put(`/products/${id}`, data),

  deleteProduct: (id: string) => api.delete(`/products/${id}`),

  updateStatus: (id: string, status: string) =>
    api.patch(`/products/${id}/status`, { status }),

  getBrands: () => api.get('/brands'),
  createBrand: (data: unknown) => api.post('/brands', data),
  updateBrand: (id: string, data: unknown) => api.put(`/brands/${id}`, data),
  deleteBrand: (id: string) => api.delete(`/brands/${id}`),

  getCategories: () => api.get('/categories'),
  createCategory: (data: unknown) => api.post('/categories', data),
  updateCategory: (id: string, data: unknown) => api.put(`/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/categories/${id}`),

  addImage: (productId: string, data: FormData) =>
    api.post(`/products/${productId}/images`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteImage: (productId: string, imageId: string) =>
    api.delete(`/products/${productId}/images/${imageId}`),

  getVariants: (productId: string) => api.get(`/products/${productId}/variants`),
  createVariant: (productId: string, data: unknown) =>
    api.post(`/products/${productId}/variants`, data),
  updateVariant: (productId: string, variantId: string, data: unknown) =>
    api.put(`/products/${productId}/variants/${variantId}`, data),
  deleteVariant: (productId: string, variantId: string) =>
    api.delete(`/products/${productId}/variants/${variantId}`),

  updateNutrition: (productId: string, data: unknown) =>
    api.put(`/products/${productId}/nutrition`, data),
  updateAllergens: (productId: string, allergens: string[]) =>
    api.put(`/products/${productId}/allergens`, { allergens }),
  updateDietaryTags: (productId: string, tags: string[]) =>
    api.put(`/products/${productId}/dietary-tags`, { tags }),

  getPriceHistory: (productId: string) =>
    api.get(`/products/${productId}/price-history`),

  scanBarcode: (barcode: string) => api.get(`/products/scan/${barcode}`),

  bulkPriceUpdate: (data: unknown) => api.patch('/products/bulk-price-update', data),
  bulkStatusUpdate: (data: unknown) => api.patch('/products/bulk-status-update', data),
};
