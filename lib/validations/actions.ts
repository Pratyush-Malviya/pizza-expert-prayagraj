import { z } from 'zod'

// ─── Cashier Sessions ───────────────────────────────────────────────────────

export const closeCashierShiftSchema = z.object({
  shiftId: z.string().uuid(),
  actualCash: z.number().min(0, 'Cash cannot be negative'),
  notes: z.string().optional(),
})

// ─── POS Payments ───────────────────────────────────────────────────────────

export const processPOSPaymentSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive('Amount must be positive'),
  tenderType: z.enum(['cash', 'card', 'upi']),
  shiftId: z.string().uuid(),
  changeGiven: z.number().min(0).optional(),
})

export const processPOSRefundSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive('Refund amount must be positive'),
  reason: z.string().min(3, 'Reason is required'),
  shiftId: z.string().uuid(),
})

// ─── POS Orders ─────────────────────────────────────────────────────────────

export const voidPOSOrderSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(3, 'Reason is required'),
})

// ─── Inventory Ledger ───────────────────────────────────────────────────────

export const recordWastageSchema = z.object({
  ingredientId: z.string().uuid(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1),
  reason: z.enum(['expired', 'burnt_damaged', 'spill_prep_loss', 'quality_rejection', 'customer_complaint', 'other']),
  notes: z.string().optional(),
})

export const recordStockAdjustmentSchema = z.object({
  ingredientId: z.string().uuid(),
  countedStock: z.number().min(0, 'Stock cannot be negative'),
  reason: z.string().min(3, 'Reason is required'),
})

// ─── Purchasing ─────────────────────────────────────────────────────────────

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  items: z.array(z.object({
    ingredientId: z.string().uuid(),
    quantityOrdered: z.number().positive(),
    unitPrice: z.number().min(0),
    taxRate: z.number().min(0).optional(),
  })).min(1, 'At least one item is required'),
  notes: z.string().optional(),
})
