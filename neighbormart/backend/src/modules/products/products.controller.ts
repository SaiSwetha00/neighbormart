import { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/response";
import type { AuthRequest } from "../../middleware/auth.middleware";
import * as ProductService from "./products.service";

// â”€â”€â”€ BRANDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getBrands(req: AuthRequest, res: Response) {
  try {
    const brands = await ProductService.getBrands(req.user!.storeId);
    return sendSuccess(res, brands, "Brands fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

export async function createBrand(req: AuthRequest, res: Response) {
  try {
    const brand = await ProductService.createBrand(req.user!.storeId, req.body);
    return sendSuccess(res, brand, "Brand created successfully", 201);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function updateBrand(req: AuthRequest, res: Response) {
  try {
    const brand = await ProductService.updateBrand(req.params.id, req.body);
    return sendSuccess(res, brand, "Brand updated successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

export async function deleteBrand(req: AuthRequest, res: Response) {
  try {
    await ProductService.deleteBrand(req.params.id);
    return sendSuccess(res, null, "Brand deleted successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

// â”€â”€â”€ CATEGORIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getCategories(req: AuthRequest, res: Response) {
  try {
    const categories = await ProductService.getCategories(req.user!.storeId);
    return sendSuccess(res, categories, "Categories fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

export async function createCategory(req: AuthRequest, res: Response) {
  try {
    const category = await ProductService.createCategory(
      req.user!.storeId,
      req.body
    );
    return sendSuccess(res, category, "Category created successfully", 201);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function updateCategory(req: AuthRequest, res: Response) {
  try {
    const category = await ProductService.updateCategory(
      req.params.id,
      req.body
    );
    return sendSuccess(res, category, "Category updated successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

export async function deleteCategory(req: AuthRequest, res: Response) {
  try {
    await ProductService.deleteCategory(req.params.id);
    return sendSuccess(res, null, "Category deleted successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

export async function reorderCategories(req: AuthRequest, res: Response) {
  try {
    const { orderedIds } = req.body as { orderedIds: string[] };
    await ProductService.reorderCategories(req.user!.storeId, orderedIds);
    return sendSuccess(res, null, "Categories reordered successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

// â”€â”€â”€ PRODUCTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getProducts(req: AuthRequest, res: Response) {
  try {
    const result = await ProductService.getProducts(
      req.user!.storeId,
      req.query as Record<string, string>
    );
    return sendSuccess(res, result, "Products fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getProduct(req: AuthRequest, res: Response) {
  try {
    const product = await ProductService.getProduct(req.params.id);
    return sendSuccess(res, product, "Product fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

export async function createProduct(req: AuthRequest, res: Response) {
  try {
    const product = await ProductService.createProduct(
      req.user!.storeId,
      req.body,
      req.user!.userId
    );
    return sendSuccess(res, product, "Product created successfully", 201);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function updateProduct(req: AuthRequest, res: Response) {
  try {
    const product = await ProductService.updateProduct(
      req.params.id,
      req.body,
      req.user!.userId
    );
    return sendSuccess(res, product, "Product updated successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

export async function deleteProduct(req: AuthRequest, res: Response) {
  try {
    await ProductService.deleteProduct(req.params.id);
    return sendSuccess(res, null, "Product deleted successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

export async function updateProductStatus(req: AuthRequest, res: Response) {
  try {
    const { status } = req.body as { status: string };
    const product = await ProductService.updateProductStatus(
      req.params.id,
      status
    );
    return sendSuccess(res, product, "Product status updated successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

// â”€â”€â”€ IMAGES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function addImage(req: AuthRequest, res: Response) {
  try {
    const { url, position } = req.body as { url: string; position: number };
    const image = await ProductService.addImage(req.params.id, url, position);
    return sendSuccess(res, image, "Image added successfully", 201);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function deleteImage(req: AuthRequest, res: Response) {
  try {
    await ProductService.deleteImage(req.params.imageId);
    return sendSuccess(res, null, "Image deleted successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

export async function reorderImages(req: AuthRequest, res: Response) {
  try {
    const { orderedIds } = req.body as { orderedIds: string[] };
    await ProductService.reorderImages(req.params.id, orderedIds);
    return sendSuccess(res, null, "Images reordered successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

// â”€â”€â”€ VARIANTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getVariants(req: AuthRequest, res: Response) {
  try {
    const variants = await ProductService.getVariants(req.params.id);
    return sendSuccess(res, variants, "Variants fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

export async function createVariant(req: AuthRequest, res: Response) {
  try {
    const variant = await ProductService.createVariant(req.params.id, req.body);
    return sendSuccess(res, variant, "Variant created successfully", 201);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function updateVariant(req: AuthRequest, res: Response) {
  try {
    const variant = await ProductService.updateVariant(
      req.params.variantId,
      req.body
    );
    return sendSuccess(res, variant, "Variant updated successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

export async function deleteVariant(req: AuthRequest, res: Response) {
  try {
    await ProductService.deleteVariant(req.params.variantId);
    return sendSuccess(res, null, "Variant deleted successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

// â”€â”€â”€ NUTRITION & DIETARY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function updateNutrition(req: AuthRequest, res: Response) {
  try {
    const nutrition = await ProductService.updateNutrition(
      req.params.id,
      req.body
    );
    return sendSuccess(res, nutrition, "Nutrition updated successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

export async function updateAllergens(req: AuthRequest, res: Response) {
  try {
    const { allergens } = req.body as { allergens: string[] };
    await ProductService.updateAllergens(req.params.id, allergens);
    return sendSuccess(res, null, "Allergens updated successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

export async function updateDietaryTags(req: AuthRequest, res: Response) {
  try {
    const { tags } = req.body as { tags: string[] };
    await ProductService.updateDietaryTags(req.params.id, tags);
    return sendSuccess(res, null, "Dietary tags updated successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

// â”€â”€â”€ SUBSTITUTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function addSubstitute(req: AuthRequest, res: Response) {
  try {
    const { substituteId } = req.body as { substituteId: string };
    const sub = await ProductService.addSubstitute(req.params.id, substituteId);
    return sendSuccess(res, sub, "Substitute added successfully", 201);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function removeSubstitute(req: AuthRequest, res: Response) {
  try {
    const { substituteId } = req.body as { substituteId: string };
    await ProductService.removeSubstitute(req.params.id, substituteId);
    return sendSuccess(res, null, "Substitute removed successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

// â”€â”€â”€ PRICE HISTORY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getPriceHistory(req: AuthRequest, res: Response) {
  try {
    const history = await ProductService.getPriceHistory(req.params.id);
    return sendSuccess(res, history, "Price history fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
}

// â”€â”€â”€ SCAN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function scanBarcode(req: AuthRequest, res: Response) {
  try {
    const product = await ProductService.getProductByBarcode(
      req.params.barcode,
      req.user!.storeId
    );
    if (!product) {
      return sendError(res, new Error("Product not found"), 404);
    }
    return sendSuccess(res, product, "Product found");
  } catch (error) {
    return sendError(res, error);
  }
}

// â”€â”€â”€ BULK OPERATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function bulkPriceUpdate(req: AuthRequest, res: Response) {
  try {
    const { productIds, newPrice, reason } = req.body as {
      productIds: string[];
      newPrice: number;
      reason?: string;
    };
    const result = await ProductService.bulkPriceUpdate(
      productIds,
      newPrice,
      req.user!.userId,
      reason
    );
    return sendSuccess(res, result, "Bulk price update successful");
  } catch (error) {
    return sendError(res, error);
  }
}

export async function bulkStatusUpdate(req: AuthRequest, res: Response) {
  try {
    const { productIds, status } = req.body as {
      productIds: string[];
      status: string;
    };
    const result = await ProductService.bulkStatusUpdate(productIds, status);
    return sendSuccess(res, result, "Bulk status update successful");
  } catch (error) {
    return sendError(res, error);
  }
}
