import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireOwner, requireManager } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createBrandSchema,
  createCategorySchema,
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  nutritionSchema,
  bulkPriceUpdateSchema,
  bulkStatusUpdateSchema,
} from "./products.schema";
import * as ProductController from "./products.controller";

const router = Router();

// ─── BRANDS ──────────────────────────────────────────────────────────────────

router
  .route("/brands")
  .get(authenticate, requireManager, ProductController.getBrands)
  .post(
    authenticate,
    requireManager,
    validate(createBrandSchema),
    ProductController.createBrand
  );

router
  .route("/brands/:id")
  .put(
    authenticate,
    requireManager,
    validate(createBrandSchema.partial()),
    ProductController.updateBrand
  )
  .delete(authenticate, requireManager, ProductController.deleteBrand);

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

router
  .route("/categories")
  .get(authenticate, requireManager, ProductController.getCategories)
  .post(
    authenticate,
    requireManager,
    validate(createCategorySchema),
    ProductController.createCategory
  );

router.patch(
  "/categories/reorder",
  authenticate,
  requireManager,
  ProductController.reorderCategories
);

router
  .route("/categories/:id")
  .put(
    authenticate,
    requireManager,
    validate(createCategorySchema.partial()),
    ProductController.updateCategory
  )
  .delete(authenticate, requireManager, ProductController.deleteCategory);

// ─── BULK OPERATIONS (before /:id routes to avoid param collision) ────────────

router.patch(
  "/products/bulk-price-update",
  authenticate,
  requireOwner,
  validate(bulkPriceUpdateSchema),
  ProductController.bulkPriceUpdate
);

router.patch(
  "/products/bulk-status-update",
  authenticate,
  requireManager,
  validate(bulkStatusUpdateSchema),
  ProductController.bulkStatusUpdate
);

// ─── SCAN ────────────────────────────────────────────────────────────────────

router.get(
  "/products/scan/:barcode",
  authenticate,
  ProductController.scanBarcode
);

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

router
  .route("/products")
  .get(authenticate, requireManager, ProductController.getProducts)
  .post(
    authenticate,
    requireManager,
    validate(createProductSchema),
    ProductController.createProduct
  );

router
  .route("/products/:id")
  .get(authenticate, requireManager, ProductController.getProduct)
  .put(
    authenticate,
    requireManager,
    validate(updateProductSchema),
    ProductController.updateProduct
  )
  .delete(authenticate, requireManager, ProductController.deleteProduct)
  .patch(authenticate, requireManager, ProductController.updateProductStatus);

// ─── IMAGES ──────────────────────────────────────────────────────────────────

router.post(
  "/products/:id/images",
  authenticate,
  requireManager,
  ProductController.addImage
);

router.delete(
  "/products/:id/images/:imageId",
  authenticate,
  requireManager,
  ProductController.deleteImage
);

router.patch(
  "/products/:id/images/reorder",
  authenticate,
  requireManager,
  ProductController.reorderImages
);

// ─── VARIANTS ────────────────────────────────────────────────────────────────

router
  .route("/products/:id/variants")
  .get(authenticate, requireManager, ProductController.getVariants)
  .post(
    authenticate,
    requireManager,
    validate(createVariantSchema),
    ProductController.createVariant
  );

router
  .route("/products/:id/variants/:variantId")
  .put(
    authenticate,
    requireManager,
    validate(createVariantSchema.partial()),
    ProductController.updateVariant
  )
  .delete(authenticate, requireManager, ProductController.deleteVariant);

// ─── NUTRITION & DIETARY ─────────────────────────────────────────────────────

router.put(
  "/products/:id/nutrition",
  authenticate,
  requireManager,
  validate(nutritionSchema),
  ProductController.updateNutrition
);

router.put(
  "/products/:id/allergens",
  authenticate,
  requireManager,
  ProductController.updateAllergens
);

router.put(
  "/products/:id/dietary-tags",
  authenticate,
  requireManager,
  ProductController.updateDietaryTags
);

// ─── SUBSTITUTES ─────────────────────────────────────────────────────────────

router
  .route("/products/:id/substitutes")
  .post(authenticate, requireManager, ProductController.addSubstitute)
  .delete(authenticate, requireManager, ProductController.removeSubstitute);

// ─── PRICE HISTORY ───────────────────────────────────────────────────────────

router.get(
  "/products/:id/price-history",
  authenticate,
  requireManager,
  ProductController.getPriceHistory
);

export default router;
