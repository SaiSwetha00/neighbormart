import { z } from 'zod';

export const adjustStockSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  type: z.enum(['ADD', 'REMOVE'], {
    errorMap: () => ({ message: "Type must be 'ADD' or 'REMOVE'" }),
  }),
  quantity: z.number().positive('Quantity must be a positive number'),
  reason: z.string().optional(),
});

export const logWasteSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be a positive integer'),
  reason: z.enum(['EXPIRED', 'DAMAGED', 'STOLEN', 'OTHER'], {
    errorMap: () => ({
      message: "Reason must be one of: EXPIRED, DAMAGED, STOLEN, OTHER",
    }),
  }),
  financialValue: z.number().nonnegative().optional(),
});

export const addBatchSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  expiryDate: z.string().optional(),
  quantity: z.number().int('Quantity must be an integer').positive('Quantity must be positive'),
  supplierId: z.string().optional(),
});

export const completeAuditSchema = z.object({
  auditId: z.string().min(1, 'Audit ID is required'),
  counts: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        physicalCount: z
          .number()
          .int('Physical count must be an integer')
          .nonnegative('Physical count cannot be negative'),
      })
    )
    .min(1, 'At least one count entry is required'),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type LogWasteInput = z.infer<typeof logWasteSchema>;
export type AddBatchInput = z.infer<typeof addBatchSchema>;
export type CompleteAuditInput = z.infer<typeof completeAuditSchema>;
