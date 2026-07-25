import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  BarChart3,
  AlertTriangle,
  XCircle,
  Tag,
  Star,
  X,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  RefreshCw,
} from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/utils/format';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/utils/cn';
import type { Product, Category, Brand, ApiResponse } from '@/types';

// ── Types ────────────────────────────────────────────────────────────────────

interface ProductFilters {
  search: string;
  categories: string[];
  brands: string[];
  status: 'all' | 'ACTIVE' | 'DISCONTINUED';
  storageType: 'all' | 'AMBIENT' | 'REFRIGERATED' | 'FROZEN';
  minPrice: string;
  maxPrice: string;
  isOrganic: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isHalal: boolean;
}

interface ProductStats {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;
}

interface ProductsApiResponse {
  products: Product[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: ProductStats;
}

type ViewMode = 'grid' | 'list';

const DEFAULT_FILTERS: ProductFilters = {
  search: '',
  categories: [],
  brands: [],
  status: 'all',
  storageType: 'all',
  minPrice: '',
  maxPrice: '',
  isOrganic: false,
  isVegan: false,
  isGlutenFree: false,
  isHalal: false,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function isNewProduct(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function isExpiringSoon(product: Product) {
  // Placeholder: real logic would check batch expiry dates
  return false;
}

function getStockColor(product: Product): string {
  if (product.stockQty === 0) return 'text-red-600 dark:text-red-400';
  if (product.stockQty <= product.lowStockThreshold) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

function getStockBadgeVariant(product: Product): 'success' | 'warning' | 'error' {
  if (product.stockQty === 0) return 'error';
  if (product.stockQty <= product.lowStockThreshold) return 'warning';
  return 'success';
}

function storageLabel(type: string): string {
  switch (type) {
    case 'REFRIGERATED': return 'Refrigerated';
    case 'FROZEN': return 'Frozen';
    default: return 'Ambient';
  }
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  loading: boolean;
}) {
  return (
    <Card className="flex-1 min-w-0">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg shrink-0', color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          {loading ? (
            <>
              <Skeleton className="h-5 w-12 mb-1" />
              <Skeleton className="h-3 w-20" />
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-[var(--foreground)] leading-tight">{value}</p>
              <p className="text-xs text-[var(--muted-foreground)] truncate">{label}</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Product Card (Grid View) ─────────────────────────────────────────────────

function ProductCard({
  product,
  selected,
  onSelect,
  onEdit,
  onView,
  onDelete,
}: {
  product: Product;
  selected: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onDelete: (product: Product) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const primaryImage = product.images?.[0]?.url;

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl border bg-[var(--card)] overflow-hidden transition-all duration-200 cursor-pointer',
        'hover:shadow-md hover:border-[#1B4332]/30',
        selected && 'ring-2 ring-[#1B4332] border-transparent'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Selection checkbox */}
      <button
        className="absolute top-2 left-2 z-10"
        onClick={(e) => { e.stopPropagation(); onSelect(product.id); }}
        aria-label={selected ? 'Deselect' : 'Select'}
      >
        {selected ? (
          <CheckSquare className="h-5 w-5 text-[#1B4332]" />
        ) : (
          <Square className="h-5 w-5 text-white drop-shadow opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>

      {/* Image */}
      <div className="relative h-40 bg-[var(--muted)] flex items-center justify-center overflow-hidden">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <Package className="h-12 w-12 text-[var(--muted-foreground)] opacity-40" />
        )}

        {/* New badge */}
        {isNewProduct(product.createdAt) && (
          <span className="absolute top-2 right-2 rounded-full bg-[#1B4332] px-2 py-0.5 text-[10px] font-semibold text-white">
            NEW
          </span>
        )}

        {/* Hover actions */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center gap-2 bg-black/50 transition-opacity duration-200',
            hovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onView(product.id); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-gray-700 hover:bg-white transition-colors"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(product.id); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1B4332] text-white hover:bg-[#15362a] transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(product); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)] line-clamp-2 leading-snug">
            {product.name}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{product.sku}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {product.category && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto">
              {product.category.name}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Badge variant={getStockBadgeVariant(product)} className="text-[10px] px-1.5 py-0.5 h-auto">
            {product.stockQty === 0 ? 'Out of Stock' : `${product.stockQty} in stock`}
          </Badge>
          <p className="text-sm font-bold text-[var(--foreground)]">
            {formatCurrency(product.sellingPrice)}
          </p>
        </div>

        {/* Flags */}
        <div className="flex items-center gap-1 flex-wrap min-h-[18px]">
          {product.isOrganic && <span title="Organic" className="text-sm">🌿</span>}
          {product.isVegan && <span title="Vegan" className="text-sm">🌱</span>}
          {product.stockQty > 0 && product.stockQty <= product.lowStockThreshold && (
            <span title="Low Stock" className="text-sm">🔴</span>
          )}
          {product.status === 'DISCONTINUED' && (
            <span title="Discontinued" className="text-sm">🚫</span>
          )}
          {isNewProduct(product.createdAt) && (
            <span title="New" className="text-sm">🆕</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Product Table Row ────────────────────────────────────────────────────────

function ProductTableRow({
  product,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  product: Product;
  selected: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (product: Product) => void;
}) {
  const primaryImage = product.images?.[0]?.url;

  return (
    <tr
      className={cn(
        'border-b border-[var(--border)] hover:bg-[var(--muted)]/40 transition-colors',
        selected && 'bg-[#1B4332]/5'
      )}
    >
      <td className="pl-4 py-3 w-10">
        <button onClick={() => onSelect(product.id)} aria-label={selected ? 'Deselect' : 'Select'}>
          {selected ? (
            <CheckSquare className="h-4 w-4 text-[#1B4332]" />
          ) : (
            <Square className="h-4 w-4 text-[var(--muted-foreground)]" />
          )}
        </button>
      </td>
      <td className="py-3 w-12">
        <div className="h-9 w-9 rounded-md bg-[var(--muted)] flex items-center justify-center overflow-hidden shrink-0">
          {primaryImage ? (
            <img src={primaryImage} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <Package className="h-4 w-4 text-[var(--muted-foreground)] opacity-50" />
          )}
        </div>
      </td>
      <td className="py-3 pr-4">
        <p className="text-sm font-medium text-[var(--foreground)] line-clamp-1">{product.name}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{product.sku}</p>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-[var(--muted-foreground)]">
          {product.category?.name ?? '—'}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-[var(--muted-foreground)]">
          {product.brand?.name ?? '—'}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className={cn('text-sm font-medium', getStockColor(product))}>
          {product.stockQty}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm font-semibold text-[var(--foreground)]">
          {formatCurrency(product.sellingPrice)}
        </span>
      </td>
      <td className="py-3 px-4">
        <Badge
          variant={product.status === 'ACTIVE' ? 'success' : 'error'}
          className="text-[10px]"
        >
          {product.status === 'ACTIVE' ? 'Active' : 'Discontinued'}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <span className="text-xs text-[var(--muted-foreground)]">{storageLabel(product.storageType)}</span>
      </td>
      <td className="py-3 pl-4 pr-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(product.id)}
            className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[#1B4332]/10 hover:text-[#1B4332] transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(product)}
            className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Filter Panel ─────────────────────────────────────────────────────────────

function FilterPanel({
  filters,
  onChange,
  onClear,
  categories,
  brands,
}: {
  filters: ProductFilters;
  onChange: (f: Partial<ProductFilters>) => void;
  onClear: () => void;
  categories: Category[];
  brands: Brand[];
}) {
  const toggleArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Categories */}
        <div>
          <p className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-2">Category</p>
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(c.id)}
                  onChange={() => onChange({ categories: toggleArray(filters.categories, c.id) })}
                  className="rounded border-[var(--border)] accent-[#1B4332]"
                />
                <span className="text-sm text-[var(--foreground)] group-hover:text-[#1B4332] transition-colors">
                  {c.name}
                </span>
              </label>
            ))}
            {categories.length === 0 && (
              <span className="text-xs text-[var(--muted-foreground)]">No categories</span>
            )}
          </div>
        </div>

        {/* Brands */}
        <div>
          <p className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-2">Brand</p>
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
            {brands.map((b) => (
              <label key={b.id} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.brands.includes(b.id)}
                  onChange={() => onChange({ brands: toggleArray(filters.brands, b.id) })}
                  className="rounded border-[var(--border)] accent-[#1B4332]"
                />
                <span className="text-sm text-[var(--foreground)] group-hover:text-[#1B4332] transition-colors">
                  {b.name}
                </span>
              </label>
            ))}
            {brands.length === 0 && (
              <span className="text-xs text-[var(--muted-foreground)]">No brands</span>
            )}
          </div>
        </div>

        {/* Status & Storage */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-2">Status</p>
            <div className="flex flex-col gap-1">
              {(['all', 'ACTIVE', 'DISCONTINUED'] as const).map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={filters.status === s}
                    onChange={() => onChange({ status: s })}
                    className="accent-[#1B4332]"
                  />
                  <span className="text-sm text-[var(--foreground)] capitalize">
                    {s === 'all' ? 'All' : s === 'ACTIVE' ? 'Active' : 'Discontinued'}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-2">Storage</p>
            <div className="flex flex-col gap-1">
              {(['all', 'AMBIENT', 'REFRIGERATED', 'FROZEN'] as const).map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="storage"
                    checked={filters.storageType === s}
                    onChange={() => onChange({ storageType: s })}
                    className="accent-[#1B4332]"
                  />
                  <span className="text-sm text-[var(--foreground)]">
                    {s === 'all' ? 'All' : storageLabel(s)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Price & Dietary */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-2">Price Range</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice}
                onChange={(e) => onChange({ minPrice: e.target.value })}
                className="w-full h-8 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
              />
              <span className="text-[var(--muted-foreground)] text-sm">–</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={(e) => onChange({ maxPrice: e.target.value })}
                className="w-full h-8 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-2">Dietary</p>
            <div className="flex flex-col gap-1">
              {[
                { key: 'isOrganic' as const, label: '🌿 Organic' },
                { key: 'isVegan' as const, label: '🌱 Vegan' },
                { key: 'isGlutenFree' as const, label: 'Gluten-Free' },
                { key: 'isHalal' as const, label: 'Halal' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters[key]}
                    onChange={(e) => onChange({ [key]: e.target.checked })}
                    className="rounded border-[var(--border)] accent-[#1B4332]"
                  />
                  <span className="text-sm text-[var(--foreground)]">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Clear */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-3.5 w-3.5" />
          Clear filters
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  const LIMIT = 25;

  // Build query params
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(LIMIT),
    ...(filters.search && { search: filters.search }),
    ...(filters.categories.length > 0 && { category: filters.categories.join(',') }),
    ...(filters.brands.length > 0 && { brand: filters.brands.join(',') }),
    ...(filters.status !== 'all' && { status: filters.status }),
    ...(filters.storageType !== 'all' && { storageType: filters.storageType }),
    ...(filters.minPrice && { minPrice: filters.minPrice }),
    ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
    ...(filters.isOrganic && { isOrganic: 'true' }),
    ...(filters.isVegan && { isVegan: 'true' }),
    ...(filters.isGlutenFree && { isGlutenFree: 'true' }),
    ...(filters.isHalal && { isHalal: 'true' }),
  });

  // Products query
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', queryParams.toString()],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ProductsApiResponse>>(`/products?${queryParams}`);
      const raw = res.data?.data ?? res.data;
      const inStock = (raw.products ?? []).filter((p: any) => p.stockQty > p.lowStockThreshold).length;
      return {
        products: raw.products ?? [],
        pagination: {
          page: raw.page ?? 1,
          limit: raw.limit ?? 20,
          total: raw.total ?? 0,
          totalPages: raw.totalPages ?? 1,
        },
        stats: {
          total: raw.total ?? 0,
          inStock,
          lowStock: raw.meta?.lowStockCount ?? 0,
          outOfStock: raw.meta?.outOfStockCount ?? 0,
          expiringSoon: 0,
        },
      } as ProductsApiResponse;
    },
    placeholderData: (prev) => prev,
  });

  // Categories & Brands for filter
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Category[]>>('/categories');
      return res.data.data;
    },
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Brand[]>>('/brands');
      return res.data.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      toast({ title: 'Product deleted', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: 'Failed to delete product', variant: 'error' });
    },
  });

  // Bulk status update mutation
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      await api.patch('/products/bulk-status-update', { ids, status });
    },
    onSuccess: () => {
      toast({ title: 'Products updated', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedIds(new Set());
      setBulkMenuOpen(false);
    },
    onError: () => {
      toast({ title: 'Bulk update failed', variant: 'error' });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(`/products/${id}`)));
    },
    onSuccess: () => {
      toast({ title: `${selectedIds.size} products deleted`, variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedIds(new Set());
      setBulkMenuOpen(false);
    },
    onError: () => {
      toast({ title: 'Bulk delete failed', variant: 'error' });
    },
  });

  const products = data?.products ?? [];
  const pagination = data?.pagination;
  const stats = data?.stats;
  const categories = categoriesData ?? [];
  const brands = brandsData ?? [];

  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const updateFilter = (partial: Partial<ProductFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const activeFilterCount = [
    filters.categories.length > 0,
    filters.brands.length > 0,
    filters.status !== 'all',
    filters.storageType !== 'all',
    filters.minPrice !== '',
    filters.maxPrice !== '',
    filters.isOrganic,
    filters.isVegan,
    filters.isGlutenFree,
    filters.isHalal,
  ].filter(Boolean).length;

  // Export CSV (basic)
  const handleExport = () => {
    const rows = [
      ['Name', 'SKU', 'Barcode', 'Category', 'Brand', 'Stock', 'Selling Price', 'Status'].join(','),
      ...products.map((p) =>
        [
          `"${p.name}"`,
          p.sku,
          p.barcode ?? '',
          p.category?.name ?? '',
          p.brand?.name ?? '',
          p.stockQty,
          p.sellingPrice,
          p.status,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV exported', variant: 'success' });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Products</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Manage your product catalog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" onClick={() => navigate('/owner/products/new')}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 flex-wrap">
        <StatCard
          icon={Package}
          label="Total Products"
          value={stats?.total ?? 0}
          color="bg-[#1B4332]"
          loading={isLoading}
        />
        <StatCard
          icon={Tag}
          label="In Stock"
          value={stats?.inStock ?? 0}
          color="bg-green-500"
          loading={isLoading}
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock"
          value={stats?.lowStock ?? 0}
          color="bg-yellow-500"
          loading={isLoading}
        />
        <StatCard
          icon={XCircle}
          label="Out of Stock"
          value={stats?.outOfStock ?? 0}
          color="bg-red-500"
          loading={isLoading}
        />
        <StatCard
          icon={Star}
          label="Expiring (7 days)"
          value={stats?.expiringSoon ?? 0}
          color="bg-orange-500"
          loading={isLoading}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Left: Search + Filter */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Search by name, SKU, barcode…"
                value={filters.search}
                onChange={(e) => updateFilter({ search: e.target.value })}
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
              />
            </div>
            <Button
              variant={filterOpen ? 'default' : 'outline'}
              size="md"
              onClick={() => setFilterOpen((o) => !o)}
              className="relative shrink-0"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Right: View toggle + Bulk + Add */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Grid/List toggle */}
            <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex h-9 w-9 items-center justify-center transition-colors',
                  viewMode === 'grid'
                    ? 'bg-[#1B4332] text-white'
                    : 'bg-[var(--background)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                )}
                title="Grid view"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex h-9 w-9 items-center justify-center transition-colors',
                  viewMode === 'list'
                    ? 'bg-[#1B4332] text-white'
                    : 'bg-[var(--background)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                )}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Bulk actions */}
            {selectedIds.size > 0 && (
              <div className="relative" ref={bulkMenuRef}>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setBulkMenuOpen((o) => !o)}
                >
                  {selectedIds.size} selected
                  <svg className="h-3.5 w-3.5 ml-1" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 8L1 3h10z" />
                  </svg>
                </Button>
                {bulkMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg overflow-hidden">
                    <button
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                      onClick={() =>
                        bulkStatusMutation.mutate({ ids: [...selectedIds], status: 'ACTIVE' })
                      }
                    >
                      <Tag className="h-4 w-4 text-green-500" />
                      Mark as Active
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                      onClick={() =>
                        bulkStatusMutation.mutate({ ids: [...selectedIds], status: 'DISCONTINUED' })
                      }
                    >
                      <XCircle className="h-4 w-4 text-orange-500" />
                      Mark as Discontinued
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                      onClick={handleExport}
                    >
                      <Download className="h-4 w-4 text-blue-500" />
                      Export Selected
                    </button>
                    <div className="border-t border-[var(--border)]" />
                    <button
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      onClick={() => bulkDeleteMutation.mutate([...selectedIds])}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Selected
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filter panel */}
        {filterOpen && (
          <FilterPanel
            filters={filters}
            onChange={updateFilter}
            onClear={clearFilters}
            categories={categories}
            brands={brands}
          />
        )}
      </div>

      {/* Loading spinner for refetch */}
      {isFetching && !isLoading && (
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Refreshing…
        </div>
      )}

      {/* ── Grid View ─────────────────────────────────────────── */}
      {viewMode === 'grid' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                  <Skeleton className="h-40 w-full rounded-none" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Package className="h-16 w-16 text-[var(--muted-foreground)] opacity-30 mb-4" />
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">No products yet</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-6">
                {filters.search || activeFilterCount > 0
                  ? 'No products match your filters. Try adjusting them.'
                  : 'Add your first product to get started.'}
              </p>
              {filters.search || activeFilterCount > 0 ? (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => navigate('/owner/products/new')}>
                  <Plus className="h-4 w-4" />
                  Add your first product
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  selected={selectedIds.has(product.id)}
                  onSelect={toggleSelect}
                  onEdit={(id) => navigate(`/owner/products/${id}/edit`)}
                  onView={(id) => navigate(`/owner/products/${id}/edit`)}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── List / Table View ──────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--card)]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-md shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Package className="h-16 w-16 text-[var(--muted-foreground)] opacity-30 mb-4" />
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">No products yet</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-6">
                {filters.search || activeFilterCount > 0
                  ? 'No products match your filters.'
                  : 'Add your first product to get started.'}
              </p>
              {!(filters.search || activeFilterCount > 0) && (
                <Button onClick={() => navigate('/owner/products/new')}>
                  <Plus className="h-4 w-4" />
                  Add your first product
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                    <th className="pl-4 py-3 w-10">
                      <button onClick={toggleSelectAll} aria-label="Select all">
                        {allSelected ? (
                          <CheckSquare className="h-4 w-4 text-[#1B4332]" />
                        ) : (
                          <Square className="h-4 w-4 text-[var(--muted-foreground)]" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 w-12"></th>
                    <th className="py-3 pr-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Product
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Category
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Price
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Storage
                    </th>
                    <th className="py-3 pl-4 pr-4 text-right text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <ProductTableRow
                      key={product.id}
                      product={product}
                      selected={selectedIds.has(product.id)}
                      onSelect={toggleSelect}
                      onEdit={(id) => navigate(`/owner/products/${id}/edit`)}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--muted-foreground)]">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, pagination.total)} of{' '}
            {pagination.total} products
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors',
                    pageNum === page
                      ? 'bg-[#1B4332] text-white'
                      : 'border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={page === pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong className="text-[var(--foreground)]">{deleteTarget?.name}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
