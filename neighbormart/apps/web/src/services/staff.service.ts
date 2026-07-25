import api from './api';

export const staffService = {
  getManagers: (params?: Record<string, unknown>) => api.get('/managers', { params }),
  createManager: (data: unknown) => api.post('/managers', data),
  updateManager: (id: string, data: unknown) => api.put(`/managers/${id}`, data),
  updateManagerStatus: (id: string, status: string) =>
    api.patch(`/managers/${id}/status`, { status }),
  updateManagerPermissions: (id: string, permissions: Record<string, boolean>) =>
    api.patch(`/managers/${id}/permissions`, { permissions }),
  resetManagerPassword: (id: string, password: string) =>
    api.post(`/managers/${id}/reset-password`, { password }),
  deleteManager: (id: string) => api.delete(`/managers/${id}`),

  getStaff: (params?: Record<string, unknown>) => api.get('/staff', { params }),
  getStaffMember: (id: string) => api.get(`/staff/${id}`),
  createStaff: (data: unknown) => api.post('/staff', data),
  updateStaff: (id: string, data: unknown) => api.put(`/staff/${id}`, data),
  updateStaffStatus: (id: string, status: string) =>
    api.patch(`/staff/${id}/status`, { status }),
  deleteStaff: (id: string) => api.delete(`/staff/${id}`),

  getShifts: (params?: Record<string, unknown>) => api.get('/shifts', { params }),
  createShift: (data: unknown) => api.post('/shifts', data),
  updateShift: (id: string, data: unknown) => api.put(`/shifts/${id}`, data),
  deleteShift: (id: string) => api.delete(`/shifts/${id}`),

  clockIn: (data: unknown) => api.post('/attendance/clock-in', data),
  clockOut: (data: unknown) => api.post('/attendance/clock-out', data),
  getTodayAttendance: () => api.get('/attendance/today'),
  getAttendance: (staffId: string, params?: Record<string, unknown>) =>
    api.get(`/attendance/${staffId}`, { params }),

  getLeaveRequests: (params?: Record<string, unknown>) =>
    api.get('/leave-requests', { params }),
  createLeaveRequest: (data: unknown) => api.post('/leave-requests', data),
  updateLeaveStatus: (id: string, status: string, note?: string) =>
    api.patch(`/leave-requests/${id}/status`, { status, note }),
};
