import { Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as suppliersService from './suppliers.service';

type Req = AuthRequest;
type Res = Response;

// ── Suppliers ─────────────────────────────────────────────────────────────────

export async function getSuppliers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const result = await suppliersService.getSuppliers(storeId, req.query as Record<string, string>);
    sendSuccess(res, result.data, 'Suppliers retrieved successfully', 200, result.pagination);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve suppliers';
    sendError(res, message, 500);
  }
}

export async function createSupplier(req: AuthRequest, res: Response): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const supplier = await suppliersService.createSupplier(storeId, req.body);
    sendSuccess(res, supplier, 'Supplier created successfully', 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create supplier';
    sendError(res, message, 400);
  }
}

export async function getSupplier(req: AuthRequest, res: Response): Promise<void> {
  try {
    const supplier = await suppliersService.getSupplier(req.params.id);
    sendSuccess(res, supplier, 'Supplier retrieved successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve supplier';
    const statusCode = message === 'Supplier not found' ? 404 : 500;
    sendError(res, message, statusCode);
  }
}

export async function updateSupplier(req: AuthRequest, res: Response): Promise<void> {
  try {
    const supplier = await suppliersService.updateSupplier(req.params.id, req.body);
    sendSuccess(res, supplier, 'Supplier updated successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update supplier';
    const statusCode = message === 'Supplier not found' ? 404 : 400;
    sendError(res, message, statusCode);
  }
}

export async function deleteSupplier(req: AuthRequest, res: Response): Promise<void> {
  try {
    await suppliersService.deleteSupplier(req.params.id);
    sendSuccess(res, null, 'Supplier deleted successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete supplier';
    const statusCode = message === 'Supplier not found' ? 404 : 500;
    sendError(res, message, statusCode);
  }
}

// ── Purchase Orders ───────────────────────────────────────────────────────────

export async function getPurchaseOrders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const result = await suppliersService.getPurchaseOrders(storeId, req.query as Record<string, string>);
    sendSuccess(res, result.data, 'Purchase orders retrieved successfully', 200, result.pagination);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve purchase orders';
    sendError(res, message, 500);
  }
}

export async function createPurchaseOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const userId = req.user!.userId;
    const po = await suppliersService.createPurchaseOrder(storeId, req.body, userId);
    sendSuccess(res, po, 'Purchase order created successfully', 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create purchase order';
    sendError(res, message, 400);
  }
}

export async function getPurchaseOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const po = await suppliersService.getPurchaseOrder(req.params.id);
    sendSuccess(res, po, 'Purchase order retrieved successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve purchase order';
    const statusCode = message === 'Purchase order not found' ? 404 : 500;
    sendError(res, message, statusCode);
  }
}

export async function updatePurchaseOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const po = await suppliersService.updatePurchaseOrder(req.params.id, req.body);
    sendSuccess(res, po, 'Purchase order updated successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update purchase order';
    const statusCode = message === 'Purchase order not found' ? 404 : 400;
    sendError(res, message, statusCode);
  }
}

export async function updatePOStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status } = req.body as { status: string };
    const validStatuses = ['DRAFT', 'SENT', 'RECEIVED', 'PARTIAL', 'CANCELLED'];
    if (!status) { sendError(res, 'Status is required', 400); return; }
    if (!validStatuses.includes(status)) { sendError(res, `Status must be one of: ${validStatuses.join(', ')}`, 400); return; }
    const po = await suppliersService.updatePOStatus(req.params.id, status);
    sendSuccess(res, po, 'Purchase order status updated successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update status';
    const statusCode = message === 'Purchase order not found' ? 404 : 400;
    sendError(res, message, statusCode);
  }
}

export async function receiveGoods(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const grn = await suppliersService.receiveGoods(req.params.id, req.body, userId);
    sendSuccess(res, grn, 'Goods received successfully', 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to receive goods';
    const statusCode = message === 'Purchase order not found' ? 404 : 400;
    sendError(res, message, statusCode);
  }
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function getSupplierPayments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await suppliersService.getSupplierPayments(req.params.id);
    sendSuccess(res, result, 'Payments retrieved successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve payments';
    const statusCode = message === 'Supplier not found' ? 404 : 500;
    sendError(res, message, statusCode);
  }
}

export async function logPayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const userId = req.user!.userId;
    const payment = await suppliersService.logPayment(req.params.id, storeId, req.body, userId);
    sendSuccess(res, payment, 'Payment logged successfully', 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to log payment';
    const statusCode = message === 'Supplier not found in this store' ? 404 : 400;
    sendError(res, message, statusCode);
  }
}

// ── Performance ───────────────────────────────────────────────────────────────

export async function getSupplierPerformance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const performance = await suppliersService.getSupplierPerformance(req.params.id);
    sendSuccess(res, performance, 'Supplier performance retrieved successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve performance';
    const statusCode = message === 'Supplier not found' ? 404 : 500;
    sendError(res, message, statusCode);
  }
}
