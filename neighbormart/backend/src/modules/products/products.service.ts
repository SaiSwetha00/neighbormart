import prisma from '../../config/database';
import type {
  CreateBrandInput,
  CreateCategoryInput,
  CreateProductInput,
  CreateVariantInput,
  NutritionInput,
  UpdateProductInput,
} from './products.schema';

function generateSKU(): string {
  return `NM-${Date.now()}`;
}

// ── Brands ────────────────────────────────────────────────────────────────────

export async function getBrands(storeId: string) {
  return prisma.brand.findMany({
    where: { storeId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function createBrand(storeId: string, data: CreateBrandInput) {
  return prisma.brand.create({ data: { ...data, storeId } as any });
}

export async function updateBrand(id: string, data: Partial<CreateBrandInput>) {
  return prisma.brand.update({ where: { id }, data });
}

export async function deleteBrand(id: string) {
  return prisma.brand.delete({ where: { id } });
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories(storeId: string) {
  const all = await prisma.category.findMany({
    where: { storeId },
    include: {
      children: {
        include: { _count: { select: { products: true } } },
        orderBy: { sortOrder: 'asc' },
      },
      _count: { select: { products: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });
  return all.filter((c) => c.parentId === null);
}

export async function createCategory(storeId: string, data: CreateCategoryInput) {
  return prisma.category.create({ data: { ...data, storeId } as any });
}

export async function updateCategory(id: string, data: Partial<CreateCategoryInput>) {
  return prisma.category.update({ where: { id }, data });
}

export async function deleteCategory(id: string) {
  return prisma.category.delete({ where: { id } });
}

export async function reorderCategories(storeId: string, orderedIds: string[]) {
  return prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.category.update({ where: { id, storeId }, data: { sortOrder: index } })
    )
  );
}

// ── Products ──────────────────────────────────────────────────────────────────

interface ProductQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
  brandId?: string;
  status?: string;
  storageType?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getProducts(storeId: string, query: ProductQuery) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const { categoryId, brandId, status, storageType, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
  const skip = (page - 1) * limit;
  const take = limit;

  const where: Record<string, unknown> = { storeId };
  if (categoryId) where.categoryId = categoryId;
  if (brandId) where.brandId = brandId;
  if (status) where.status = status;
  if (storageType) where.storageType = storageType;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
      { barcode: { contains: search } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        images: { orderBy: { position: 'asc' }, take: 1 },
        _count: { select: { variants: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  // Compute low stock and out of stock counts in memory
  const allForStats = await prisma.product.findMany({
    where: { storeId },
    select: { stockQty: true, lowStockThreshold: true },
  });
  const lowStockCount = allForStats.filter((p) => p.stockQty > 0 && p.stockQty <= p.lowStockThreshold).length;
  const outOfStockCount = allForStats.filter((p) => p.stockQty <= 0).length;

  return {
    products,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / take),
    meta: { lowStockCount, outOfStockCount },
  };
}

export async function getProduct(id: string) {
  return prisma.product.findUniqueOrThrow({
    where: { id },
    include: {
      category: true,
      brand: true,
      images: { orderBy: { position: 'asc' } },
      variants: true,
      nutrition: true,
      allergens: true,
      dietaryTags: true,
      substitutes: {
        include: {
          substituteProduct: {
            include: { images: { orderBy: { position: 'asc' }, take: 1 } },
          },
        },
      },
      batches: { orderBy: { expiryDate: 'asc' } },
    },
  });
}

export async function createProduct(storeId: string, data: CreateProductInput, userId: string) {
  const sku = data.sku || generateSKU();
  return prisma.product.create({
    data: { ...data, sku, storeId, createdBy: userId } as any,
  });
}

export async function updateProduct(id: string, data: UpdateProductInput, userId: string) {
  const existing = await prisma.product.findUniqueOrThrow({ where: { id } });

  const updated = await prisma.product.update({ where: { id }, data });

  if (data.sellingPrice !== undefined && data.sellingPrice !== existing.sellingPrice) {
    await prisma.priceHistory.create({
      data: { productId: id, oldPrice: existing.sellingPrice, newPrice: data.sellingPrice, changedBy: userId },
    });
  }

  return updated;
}

export async function deleteProduct(id: string) {
  return prisma.product.delete({ where: { id } });
}

export async function updateProductStatus(id: string, status: string) {
  return prisma.product.update({ where: { id }, data: { status: status as any } });
}

// ── Images ────────────────────────────────────────────────────────────────────

export async function addImage(productId: string, url: string, position: number) {
  return prisma.productImage.create({ data: { productId, url, position } });
}

export async function deleteImage(imageId: string) {
  return prisma.productImage.delete({ where: { id: imageId } });
}

export async function reorderImages(productId: string, orderedIds: string[]) {
  return prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.productImage.update({ where: { id, productId }, data: { position: index } })
    )
  );
}

// ── Variants ──────────────────────────────────────────────────────────────────

export async function getVariants(productId: string) {
  return prisma.productVariant.findMany({ where: { productId } });
}

export async function createVariant(productId: string, data: CreateVariantInput) {
  return prisma.productVariant.create({ data: { ...data, productId } as any });
}

export async function updateVariant(variantId: string, data: Partial<CreateVariantInput>) {
  return prisma.productVariant.update({ where: { id: variantId }, data });
}

export async function deleteVariant(variantId: string) {
  return prisma.productVariant.delete({ where: { id: variantId } });
}

// ── Nutrition & Dietary ───────────────────────────────────────────────────────

export async function updateNutrition(productId: string, data: NutritionInput) {
  return prisma.productNutrition.upsert({
    where: { productId },
    create: { ...data, productId },
    update: data,
  });
}

export async function updateAllergens(productId: string, allergens: string[]) {
  await prisma.productAllergen.deleteMany({ where: { productId } });
  if (allergens.length === 0) return [];
  return prisma.productAllergen.createMany({
    data: allergens.map((allergen) => ({ productId, allergen: allergen as never })),
  });
}

export async function updateDietaryTags(productId: string, tags: string[]) {
  await prisma.productDietaryTag.deleteMany({ where: { productId } });
  if (tags.length === 0) return [];
  return prisma.productDietaryTag.createMany({
    data: tags.map((tag) => ({ productId, tag: tag as never })),
  });
}

// ── Substitutes ───────────────────────────────────────────────────────────────

export async function addSubstitute(productId: string, substituteProductId: string) {
  return prisma.productSubstitute.create({ data: { productId, substituteProductId } });
}

export async function removeSubstitute(productId: string, substituteProductId: string) {
  return prisma.productSubstitute.deleteMany({ where: { productId, substituteProductId } });
}

// ── Price History ─────────────────────────────────────────────────────────────

export async function getPriceHistory(productId: string) {
  return prisma.priceHistory.findMany({
    where: { productId },
    orderBy: { changedAt: 'desc' },
    include: { user: { select: { id: true, name: true } } },
  });
}

// ── Barcode Scan ──────────────────────────────────────────────────────────────

export async function getProductByBarcode(barcode: string, storeId: string) {
  return prisma.product.findFirst({
    where: { barcode, storeId },
    include: {
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      images: { orderBy: { position: 'asc' }, take: 1 },
    },
  });
}

// ── Bulk Operations ───────────────────────────────────────────────────────────

export async function bulkPriceUpdate(productIds: string[], newPrice: number, userId: string, reason?: string) {
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, sellingPrice: true },
  });

  await prisma.$transaction([
    prisma.product.updateMany({ where: { id: { in: productIds } }, data: { sellingPrice: newPrice } }),
    prisma.priceHistory.createMany({
      data: products.map((p) => ({
        productId: p.id,
        oldPrice: p.sellingPrice,
        newPrice,
        changedBy: userId,
        reason: reason ?? null,
      })),
    }),
  ]);

  return { updated: productIds.length };
}

export async function bulkStatusUpdate(productIds: string[], status: string) {
  const result = await prisma.product.updateMany({
    where: { id: { in: productIds } },
    data: { status: status as any },
  });
  return { updated: result.count };
}
