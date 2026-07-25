import api from './api';

export const suppliersService = {
  getSuppliers: (params?: Record<string, unknown>) => api.get('/suppliers', { params }),
  getSupplier: (id: string) => api.get(`/suppliers/${id}`),
  createSupplier: (data: unknown) => api.post('/suppliers', data),
  updateSupplier: (id: string, data: unknown) => api.put(`/suppliers/${id}`, data),
  deleteSupplier: (id: string) => api.delete(`/suppliers/${id}`),
  getPerformance: (id: string) => api.get(`/suppliers/${id}/performance`),
  getPayments: (id: string) => api.get(`/suppliers/${id}/payments`),
  logPayment: (id: string, data: unknown) => api.post(`/suppliers/${id}/payments`, data),

  getPurchaseOrders: (params?: Record<string, unknown>) =>
    api.get('/purchase-orders', { params }),
  getPurchaseOrder: (id: string) => api.get(`/purchase-orders/${id}`),
  createPurchaseOrder: (data: unknown) => api.post('/purchase-orders', data),
  updatePurchaseOrder: (id: string, data: unknown) => api.put(`/purchase-orders/${id}`, data),
  updatePOStatus: (id: string, status: string) =>
    api.patch(`/purchase-orders/${id}/status`, { status }),
  receiveGoods: (id: string, data: unknown) =>
    api.post(`/purchase-orders/${id}/receive`, data),
};
