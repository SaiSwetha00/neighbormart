import { z } from "zod";

// ─── BRAND ───────────────────────────────────────────────────────────────────

export const createBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  logo: z.string().url("Logo must be a valid URL").optional(),
});

// ─── CATEGORY ────────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  icon: z.string().optional(),
  image: z.string().url("Image must be a valid URL").optional(),
  parentId: z.string().cuid("Invalid parent category ID").optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

// ─── PRODUCT ─────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().cuid("Invalid category ID").optional(),
  brandId: z.string().cuid("Invalid brand ID").optional(),
  description: z.string().optional(),

  // Pricing
  purchasePrice: z.number().nonnegative("Purchase price must be non-negative"),
  sellingPrice: z.number().nonnegative("Selling price must be non-negative"),
  wholesalePrice: z.number().nonnegative().optional(),
  taxRate: z.number().min(0).max(100).optional(),

  // Stock
  stockQty: z.number().int().nonnegative("Stock quantity must be non-negative"),
  lowStockThreshold: z.number().int().nonnegative().optional(),

  // Storage
  storageType: z.enum(["AMBIENT", "REFRIGERATED", "FROZEN"]),
  aisle: z.string().optional(),
  shelfNumber: z.string().optional(),
  shelfRow: z.string().optional(),

  // Origin
  countryOfOrigin: z.string().optional(),

  // Dietary flags
  isPerishable: z.boolean().optional(),
  isOrganic: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  isHalal: z.boolean().optional(),
  isKosher: z.boolean().optional(),

  // Packaging
  unitOfMeasure: z.string().min(1, "Unit of measure is required"),
  packSize: z.number().positive().optional(),
  packageType: z.string().optional(),
  isRecyclable: z.boolean().optional(),

  // Availability
  status: z.enum(["ACTIVE", "DISCONTINUED"]).optional(),
  seasonalStart: z
    .string()
    .regex(/^\d{2}-\d{2}$/, "seasonalStart must be MM-DD")
    .optional(),
  seasonalEnd: z
    .string()
    .regex(/^\d{2}-\d{2}$/, "seasonalEnd must be MM-DD")
    .optional(),
  availableFromTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "availableFromTime must be HH:MM")
    .optional(),
});

export const updateProductSchema = createProductSchema.partial();

// ─── VARIANT ─────────────────────────────────────────────────────────────────

export const createVariantSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  sku: z.string().min(1, "Variant SKU is required"),
  barcode: z.string().optional(),
  sellingPrice: z.number().nonnegative("Selling price must be non-negative"),
  stockQty: z.number().int().nonnegative("Stock quantity must be non-negative"),
  unit: z.string().optional(),
});

// ─── NUTRITION ───────────────────────────────────────────────────────────────

export const nutritionSchema = z.object({
  calories: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  sugar: z.number().nonnegative().optional(),
  fiber: z.number().nonnegative().optional(),
  sodium: z.number().nonnegative().optional(),
  servingSize: z.string().optional(),
  servingsPerPack: z.number().positive().optional(),
  ingredients: z.string().optional(),
});

// ─── BULK OPERATIONS ─────────────────────────────────────────────────────────

export const bulkPriceUpdateSchema = z.object({
  productIds: z
    .array(z.string().cuid("Invalid product ID"))
    .min(1, "At least one product ID is required"),
  newPrice: z.number().nonnegative("New price must be non-negative"),
  reason: z.string().optional(),
});

export const bulkStatusUpdateSchema = z.object({
  productIds: z
    .array(z.string().cuid("Invalid product ID"))
    .min(1, "At least one product ID is required"),
  status: z.string().min(1, "Status is required"),
});

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type NutritionInput = z.infer<typeof nutritionSchema>;
export type BulkPriceUpdateInput = z.infer<typeof bulkPriceUpdateSchema>;
export type BulkStatusUpdateInput = z.infer<typeof bulkStatusUpdateSchema>;
