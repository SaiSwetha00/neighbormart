import { z } from 'zod';

// ── Supplier CRUD ─────────────────────────────────────────────────────────────

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
  leadTimeDays: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

// ── Purchase Orders ───────────────────────────────────────────────────────────

export const createPOSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: z.number().positive('Quantity must be a positive number'),
        unitPrice: z.number().nonnegative('Unit price cannot be negative'),
      })
    )
    .min(1, 'At least one item is required'),
});

export const updatePOSchema = z.object({
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  status: z
    .enum(['DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'PARTIAL', 'CANCELLED'])
    .optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: z.number().positive('Quantity must be a positive number'),
        unitPrice: z.number().nonnegative('Unit price cannot be negative'),
      })
    )
    .optional(),
});

// ── Receive Goods ─────────────────────────────────────────────────────────────

export const receiveGoodsSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        orderedQty: z.number().nonnegative('Ordered quantity cannot be negative'),
        receivedQty: z.number().nonnegative('Received quantity cannot be negative'),
        batchNumber: z.string().optional(),
        expiryDate: z.string().optional(),
      })
    )
    .min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

// ── Payments ──────────────────────────────────────────────────────────────────

export const logPaymentSchema = z.object({
  amount: z.number().positive('Amount must be a positive number'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type CreatePOInput = z.infer<typeof createPOSchema>;
export type UpdatePOInput = z.infer<typeof updatePOSchema>;
export type ReceiveGoodsInput = z.infer<typeof receiveGoodsSchema>;
export type LogPaymentInput = z.infer<typeof logPaymentSchema>;
