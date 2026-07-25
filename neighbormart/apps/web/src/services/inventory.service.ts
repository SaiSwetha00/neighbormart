import api from './api';

export const inventoryService = {
  getOverview: () => api.get('/inventory'),
  getLowStock: (params?: Record<string, unknown>) => api.get('/inventory/low-stock', { params }),
  getOutOfStock: (params?: Record<string, unknown>) => api.get('/inventory/out-of-stock', { params }),
  getExpiring: (days = 7) => api.get('/inventory/expiring', { params: { days } }),
  getValuation: () => api.get('/inventory/valuation'),

  adjustStock: (data: unknown) => api.post('/inventory/adjust', data),
  getAdjustments: (params?: Record<string, unknown>) =>
    api.get('/inventory/adjustments', { params }),

  logWaste: (data: unknown) => api.post('/inventory/waste-log', data),
  getWasteLogs: (params?: Record<string, unknown>) =>
    api.get('/inventory/waste-log', { params }),

  getBatches: (productId: string) => api.get(`/inventory/batches/${productId}`),
  addBatch: (data: unknown) => api.post('/inventory/batches', data),

  getTodayAudit: () => api.get('/inventory/audit/today'),
  completeAudit: (data: unknown) => api.post('/inventory/audit/complete', data),
  getAuditHistory: (params?: Record<string, unknown>) =>
    api.get('/inventory/audit/history', { params }),

  getShrinkageReport: (params?: Record<string, unknown>) =>
    api.get('/inventory/reports/shrinkage', { params }),
};
