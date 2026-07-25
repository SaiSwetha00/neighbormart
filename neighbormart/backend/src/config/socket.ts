import { io } from '../server';

export function emitToStore(storeId: string, event: string, data: unknown) {
  io.to(`store:${storeId}`).emit(event, data);
}

// Event name constants
export const SOCKET_EVENTS = {
  STOCK_UPDATED: 'stock:updated',
  STOCK_LOW: 'stock:low',
  STOCK_OUT: 'stock:out',
  AUDIT_NEW: 'audit:new',
  LEAVE_REQUEST: 'leave:request',
  LEAVE_STATUS: 'leave:status',
  SHIFT_UPDATED: 'shift:updated',
  PO_UPDATED: 'po:updated',
};
