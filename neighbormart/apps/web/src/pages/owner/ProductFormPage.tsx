import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Package,
  Plus,
  X,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Barcode,
  DollarSign,
  Thermometer,
  Snowflake,
  Wind,
  Info,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Upload,
  Clock,
  History,
  Save,
  CheckCircle2,
} from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/utils/cn';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format';
import type { Product, Category, Brand, ApiResponse, ProductImage, ProductVariant } from '@/types';

// ── Zod Schema ───────────────────────────────────────────────────────────────

const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name required'),
  sku: z.string().min(1, 'SKU required'),
  sellingPrice: z.coerce.number().min(0),
  stockQty: z.coerce.number().min(0),
  unit: z.string().optional(),
});

const productSchema = z.object({
  // Basic Info
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'DISCONTINUED']).default('ACTIVE'),

  // Pricing
  purchasePrice: z.coerce.number().min(0, 'Required'),
  sellingPrice: z.coerce.number().min(0, 'Required'),
  wholesalePrice: z.coerce.number().min(0).optional().or(z.literal('')),
  taxRate: z.coerce.number().min(0).max(100).default(0),

  // Stock & Storage
  unitOfMeasure: z.string().min(1, 'Required'),
  packSize: z.coerce.number().min(1).default(1),
  packageType: z.string().optional(),
  storageType: z.enum(['AMBIENT', 'REFRIGERATED', 'FROZEN']).default('AMBIENT'),
  isPerishable: z.boolean().default(false),
  isRecyclable: z.boolean().default(false),

  // Location
  countryOfOrigin: z.string().optional(),
  aisle: z.string().optional(),
  shelfNumber: z.string().optional(),
  shelfRow: z.string().optional(),

  // Inventory
  stockQty: z.coerce.number().min(0).default(0),
  lowStockThreshold: z.coerce.number().min(0).default(5),
  reorderQty: z.coerce.number().min(0).default(0),

  // Variants
  hasVariants: z.boolean().default(false),
  variants: z.array(variantSchema).optional(),

  // Nutrition
  hasNutrition: z.boolean().default(false),
  calories: z.coerce.number().optional().or(z.literal('')),
  fat: z.coerce.number().optional().or(z.literal('')),
  protein: z.coerce.number().optional().or(z.literal('')),
  carbs: z.coerce.number().optional().or(z.literal('')),
  sugar: z.coerce.number().optional().or(z.literal('')),
  fiber: z.coerce.number().optional().or(z.literal('')),
  sodium: z.coerce.number().optional().or(z.literal('')),
  servingSize: z.string().optional(),
  servingsPerPack: z.coerce.number().optional().or(z.literal('')),
  ingredients: z.string().optional(),

  // Allergens & Dietary
  allergens: z.array(z.string()).default([]),
  dietaryTags: z.array(z.string()).default([]),

  // Availability
  isSeasonal: z.boolean().default(false),
  seasonalFrom: z.string().optional(),
  seasonalTo: z.string().optional(),
  availableFrom: z.string().optional(),

  // Dietary flags (stored on product)
  isOrganic: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  isHalal: z.boolean().default(false),
  isKosher: z.boolean().default(false),
});

type ProductFormValues = z.infer<typeof productSchema>;

// ── Constants ─────────────────────────────────────────────────────────────────

const UNITS = ['unit', 'kg', 'g', 'L', 'mL', 'dozen', 'pack', 'box', 'bottle', 'can'];
const TAX_RATES = [0, 5, 10, 12, 18, 20, 25];
const ALLERGENS = ['Nuts', 'Dairy', 'Gluten', 'Eggs', 'Soy', 'Shellfish', 'Wheat', 'Peanuts'];
const DIETARY_TAGS = ['Vegan', 'Vegetarian', 'Halal', 'Kosher', 'Organic', 'Sugar-Free', 'Keto', 'Gluten-Free'];
const LS_KEY = 'neighbormart_product_draft';

// ── Section Wrapper ───────────────────────────────────────────────────────────

function FormSection({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          {Icon && <Icon className="h-4 w-4 text-[#1B4332]" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[var(--foreground)] leading-none">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] focus-visible:ring-offset-2 shrink-0',
        checked ? 'bg-[#1B4332]' : 'bg-[var(--muted)]'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}

// ── Pill Checkbox ─────────────────────────────────────────────────────────────

function PillCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-150',
        checked
          ? 'bg-[#1B4332] text-white border-[#1B4332]'
          : 'bg-transparent text-[var(--foreground)] border-[var(--border)] hover:border-[#1B4332]/50'
      )}
    >
      {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

// ── Image Uploader ────────────────────────────────────────────────────────────

function ImageUploader({
  productId,
  images,
  onImagesChange,
  isEditMode,
}: {
  productId?: string;
  images: ProductImage[];
  onImagesChange: (imgs: ProductImage[]) => void;
  isEditMode: boolean;
}) {
  const { toast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    await uploadFiles(files);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    await uploadFiles(files);
    e.target.value = '';
  };

  const uploadFiles = async (files: File[]) => {
    if (!isEditMode || !productId) {
      // In create mode, show a preview with object URLs
      const previews: ProductImage[] = files.slice(0, 5 - images.length).map((f, i) => ({
        id: `preview-${Date.now()}-${i}`,
        productId: 'new',
        url: URL.createObjectURL(f),
        position: images.length + i,
      }));
      onImagesChange([...images, ...previews].slice(0, 5));
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      files.slice(0, 5 - images.length).forEach((f) => formData.append('images', f));
      const res = await api.post<ApiResponse<ProductImage[]>>(
        `/products/${productId}/images`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      onImagesChange([...images, ...res.data.data].slice(0, 5));
      toast({ title: 'Images uploaded', variant: 'success' });
    } catch {
      toast({ title: 'Image upload failed', variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (id: string) => {
    onImagesChange(images.filter((img) => img.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {images.length < 5 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors',
            dragging
              ? 'border-[#1B4332] bg-[#1B4332]/5'
              : 'border-[var(--border)] hover:border-[#1B4332]/50 hover:bg-[var(--muted)]/50'
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-[#1B4332] animate-spin mb-2" />
          ) : (
            <Upload className="h-8 w-8 text-[var(--muted-foreground)] mb-2" />
          )}
          <p className="text-sm font-medium text-[var(--foreground)]">
            Drop images here or click to upload
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            PNG, JPG, WebP up to 5MB · Max 5 images
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {images.map((img, idx) => (
            <div key={img.id} className="relative group">
              <div className="h-24 w-24 rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--muted)]">
                <img src={img.url} alt={`Product ${idx + 1}`} className="h-full w-full object-cover" />
              </div>
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 rounded-md bg-[#1B4332] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  Primary
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                <GripVertical className="h-4 w-4 text-white drop-shadow" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Price History Dialog ───────────────────────────────────────────────────────

function PriceHistoryDialog({
  productId,
  open,
  onClose,
}: {
  productId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['product-price-history', productId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Array<{
        date: string;
        purchasePrice: number;
        sellingPrice: number;
        changedBy: string;
      }>>>(`/products/${productId}/price-history`);
      return res.data.data;
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> Price History
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#1B4332]" />
          </div>
        ) : !data?.length ? (
          <p className="text-sm text-[var(--muted-foreground)] py-6 text-center">
            No price history available.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Date', 'Purchase Price', 'Selling Price', 'Changed By'].map((h) => (
                    <th key={h} className="py-2 pr-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/40"
                  >
                    <td className="py-2.5 pr-4 text-[var(--foreground)]">{formatDateTime(row.date)}</td>
                    <td className="py-2.5 pr-4 text-[var(--foreground)]">{formatCurrency(row.purchasePrice)}</td>
                    <td className="py-2.5 pr-4 text-[var(--foreground)]">{formatCurrency(row.sellingPrice)}</td>
                    <td className="py-2.5 text-[var(--muted-foreground)]">{row.changedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Form Page ────────────────────────────────────────────────────────────

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [images, setImages] = useState<ProductImage[]>([]);
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // ── Fetch existing product (edit mode) ───────────────────────────────────
  const { data: existingProduct, isLoading: loadingProduct } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Product>>(`/products/${id}`);
      return res.data.data;
    },
    enabled: isEditMode,
  });

  // ── Fetch categories & brands ────────────────────────────────────────────
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () =>
      (await api.get<ApiResponse<Category[]>>('/categories')).data.data,
  });

  const { data: brands = [], refetch: refetchBrands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () =>
      (await api.get<ApiResponse<Brand[]>>('/brands')).data.data,
  });

  // ── Form setup ───────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    getValues,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      barcode: '',
      categoryId: '',
      brandId: '',
      description: '',
      status: 'ACTIVE',
      purchasePrice: 0,
      sellingPrice: 0,
      wholesalePrice: '',
      taxRate: 0,
      unitOfMeasure: 'unit',
      packSize: 1,
      packageType: '',
      storageType: 'AMBIENT',
      isPerishable: false,
      isRecyclable: false,
      countryOfOrigin: '',
      aisle: '',
      shelfNumber: '',
      shelfRow: '',
      stockQty: 0,
      lowStockThreshold: 5,
      reorderQty: 0,
      hasVariants: false,
      variants: [],
      hasNutrition: false,
      calories: '',
      fat: '',
      protein: '',
      carbs: '',
      sugar: '',
      fiber: '',
      sodium: '',
      servingSize: '',
      servingsPerPack: '',
      ingredients: '',
      allergens: [],
      dietaryTags: [],
      isSeasonal: false,
      seasonalFrom: '',
      seasonalTo: '',
      availableFrom: '',
      isOrganic: false,
      isVegan: false,
      isGlutenFree: false,
      isHalal: false,
      isKosher: false,
    },
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: 'variants',
  });

  // Watched values for derived calculations
  const purchasePrice = watch('purchasePrice');
  const sellingPrice = watch('sellingPrice');
  const hasVariants = watch('hasVariants');
  const hasNutrition = watch('hasNutrition');
  const isSeasonal = watch('isSeasonal');
  const storageType = watch('storageType');
  const status = watch('status');
  const allergens = watch('allergens');
  const dietaryTags = watch('dietaryTags');

  const profitMargin =
    Number(purchasePrice) > 0
      ? (
          ((Number(sellingPrice) - Number(purchasePrice)) / Number(purchasePrice)) *
          100
        ).toFixed(1)
      : '0.0';

  // ── Pre-fill form when product loads ────────────────────────────────────
  useEffect(() => {
    if (existingProduct) {
      reset({
        name: existingProduct.name,
        sku: existingProduct.sku,
        barcode: existingProduct.barcode ?? '',
        categoryId: existingProduct.categoryId ?? '',
        brandId: existingProduct.brandId ?? '',
        description: existingProduct.description ?? '',
        status: existingProduct.status,
        purchasePrice: existingProduct.purchasePrice,
        sellingPrice: existingProduct.sellingPrice,
        wholesalePrice: existingProduct.wholesalePrice ?? '',
        taxRate: existingProduct.taxRate,
        unitOfMeasure: existingProduct.unitOfMeasure,
        packSize: existingProduct.packSize,
        packageType: existingProduct.packageType ?? '',
        storageType: existingProduct.storageType,
        isPerishable: existingProduct.isPerishable,
        isRecyclable: existingProduct.isRecyclable,
        countryOfOrigin: existingProduct.countryOfOrigin ?? '',
        aisle: existingProduct.aisle ?? '',
        shelfNumber: existingProduct.shelfNumber ?? '',
        shelfRow: existingProduct.shelfRow ?? '',
        stockQty: existingProduct.stockQty,
        lowStockThreshold: existingProduct.lowStockThreshold,
        reorderQty: 0,
        hasVariants: (existingProduct.variants?.length ?? 0) > 0,
        variants: existingProduct.variants ?? [],
        hasNutrition: !!existingProduct.nutrition,
        calories: existingProduct.nutrition?.calories ?? '',
        fat: existingProduct.nutrition?.fat ?? '',
        protein: existingProduct.nutrition?.protein ?? '',
        carbs: existingProduct.nutrition?.carbs ?? '',
        sugar: existingProduct.nutrition?.sugar ?? '',
        fiber: existingProduct.nutrition?.fiber ?? '',
        sodium: existingProduct.nutrition?.sodium ?? '',
        servingSize: existingProduct.nutrition?.servingSize ?? '',
        servingsPerPack: existingProduct.nutrition?.servingsPerPack ?? '',
        ingredients: existingProduct.nutrition?.ingredients ?? '',
        allergens: existingProduct.allergens?.map((a) => a.allergen) ?? [],
        dietaryTags: existingProduct.dietaryTags?.map((t) => t.tag) ?? [],
        isSeasonal: false,
        seasonalFrom: '',
        seasonalTo: '',
        availableFrom: '',
        isOrganic: existingProduct.isOrganic,
        isVegan: existingProduct.isVegan,
        isGlutenFree: existingProduct.isGlutenFree,
        isHalal: existingProduct.isHalal,
        isKosher: existingProduct.isKosher,
      });
      setImages(existingProduct.images ?? []);
    }
  }, [existingProduct, reset]);

  // ── Auto-save to localStorage every 30s ─────────────────────────────────
  useEffect(() => {
    if (!isDirty) return;
    const timer = setInterval(() => {
      const values = getValues();
      localStorage.setItem(LS_KEY, JSON.stringify({ values, id, savedAt: new Date().toISOString() }));
      setLastSaved(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, [isDirty, id, getValues]);

  // ── Unsaved changes warning ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Submit mutation ──────────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const payload = {
        ...data,
        wholesalePrice: data.wholesalePrice === '' ? undefined : data.wholesalePrice,
        categoryId: data.categoryId || undefined,
        brandId: data.brandId || undefined,
      };
      if (isEditMode) {
        return api.put<ApiResponse<Product>>(`/products/${id}`, payload);
      }
      return api.post<ApiResponse<Product>>('/products', payload);
    },
    onSuccess: () => {
      localStorage.removeItem(LS_KEY);
      toast({ title: isEditMode ? 'Product updated' : 'Product created', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/owner/products');
    },
    onError: () => {
      toast({ title: 'Failed to save product', variant: 'error' });
    },
  });

  const onSubmit = handleSubmit((data) => submitMutation.mutate(data));

  const handleSaveDraft = () => {
    const values = getValues();
    localStorage.setItem(LS_KEY, JSON.stringify({ values, id, savedAt: new Date().toISOString() }));
    setLastSaved(new Date());
    toast({ title: 'Draft saved locally', variant: 'default' });
  };

  const generateSKU = () => {
    const name = getValues('name');
    const prefix = name.trim().toUpperCase().replace(/\s+/g, '-').slice(0, 6);
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setValue('sku', `${prefix}-${rand}`, { shouldDirty: true });
  };

  const generateBarcode = () => {
    const code = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('');
    setValue('barcode', code, { shouldDirty: true });
  };

  const toggleAllergen = (allergen: string) => {
    const current = allergens ?? [];
    setValue(
      'allergens',
      current.includes(allergen)
        ? current.filter((a) => a !== allergen)
        : [...current, allergen],
      { shouldDirty: true }
    );
  };

  const toggleDietaryTag = (tag: string) => {
    const current = dietaryTags ?? [];
    setValue(
      'dietaryTags',
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
      { shouldDirty: true }
    );
  };

  if (loadingProduct) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1B4332]" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col min-h-screen">
      {/* Page header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[var(--background)] border-b border-[var(--border)]">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/owner/products"
            className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-[var(--muted-foreground)] shrink-0">/</span>
          <h1 className="text-lg font-semibold text-[var(--foreground)] truncate">
            {isEditMode ? `Edit: ${existingProduct?.name ?? '…'}` : 'New Product'}
          </h1>
          {lastSaved && (
            <span className="hidden sm:flex text-xs text-[var(--muted-foreground)] items-center gap-1 shrink-0">
              <Save className="h-3 w-3" />
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/owner/products')}>
            Cancel
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleSaveDraft}>
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save Draft</span>
          </Button>
          <Button type="submit" size="sm" loading={isSubmitting || submitMutation.isPending}>
            <CheckCircle2 className="h-4 w-4" />
            {isEditMode ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full">

        {/* ── SECTION 1: Basic Info ──────────────────────────────────── */}
        <FormSection title="Basic Information" icon={Package}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div className="md:col-span-2">
              <Field label="Product Name" required error={errors.name?.message}>
                <input
                  {...register('name')}
                  placeholder="e.g. Organic Whole Milk 1L"
                  className={cn(
                    'w-full h-10 rounded-lg border bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors',
                    errors.name ? 'border-red-500' : 'border-[var(--border)]'
                  )}
                />
              </Field>
            </div>

            {/* SKU */}
            <Field label="SKU" error={errors.sku?.message}>
              <div className="flex gap-2">
                <input
                  {...register('sku')}
                  placeholder="e.g. MILK-001"
                  className="flex-1 h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors"
                />
                <Button type="button" variant="outline" size="sm" onClick={generateSKU} className="shrink-0">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Auto
                </Button>
              </div>
            </Field>

            {/* Barcode */}
            <Field label="Barcode" error={errors.barcode?.message}>
              <div className="flex gap-2">
                <input
                  {...register('barcode')}
                  placeholder="e.g. 1234567890123"
                  className="flex-1 h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors"
                />
                <Button type="button" variant="outline" size="sm" onClick={generateBarcode} className="shrink-0">
                  <Barcode className="h-3.5 w-3.5" />
                  Generate
                </Button>
              </div>
            </Field>

            {/* Category */}
            <Field label="Category" error={errors.categoryId?.message}>
              <select
                {...register('categoryId')}
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors"
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            {/* Brand */}
            <Field label="Brand" error={errors.brandId?.message}>
              <select
                {...register('brandId')}
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors"
              >
                <option value="">Select brand…</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>

            {/* Description */}
            <div className="md:col-span-2">
              <Field label="Description" error={errors.description?.message}>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Short product description…"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors resize-none"
                />
              </Field>
            </div>

            {/* Status */}
            <div>
              <Field label="Status">
                <div className="flex items-center gap-3">
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Toggle
                        checked={field.value === 'ACTIVE'}
                        onChange={(v) => field.onChange(v ? 'ACTIVE' : 'DISCONTINUED')}
                      />
                    )}
                  />
                  <Badge variant={status === 'ACTIVE' ? 'success' : 'error'}>
                    {status === 'ACTIVE' ? 'Active' : 'Discontinued'}
                  </Badge>
                </div>
              </Field>
            </div>
          </div>
        </FormSection>

        {/* ── SECTION 2: Pricing ─────────────────────────────────────── */}
        <FormSection title="Pricing" icon={DollarSign}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Field label="Purchase Price" required error={errors.purchasePrice?.message}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">$</span>
                <input
                  {...register('purchasePrice')}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={cn(
                    'w-full h-10 rounded-lg border bg-[var(--background)] pl-7 pr-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors',
                    errors.purchasePrice ? 'border-red-500' : 'border-[var(--border)]'
                  )}
                />
              </div>
            </Field>

            <Field label="Selling Price" required error={errors.sellingPrice?.message}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">$</span>
                <input
                  {...register('sellingPrice')}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={cn(
                    'w-full h-10 rounded-lg border bg-[var(--background)] pl-7 pr-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors',
                    errors.sellingPrice ? 'border-red-500' : 'border-[var(--border)]'
                  )}
                />
              </div>
            </Field>

            <Field label="Wholesale Price" error={errors.wholesalePrice?.message}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">$</span>
                <input
                  {...register('wholesalePrice')}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] pl-7 pr-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors"
                />
              </div>
            </Field>

            <Field label="Tax Rate %">
              <select
                {...register('taxRate')}
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors"
              >
                {TAX_RATES.map((r) => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
            </Field>

            {/* Profit margin (read-only) */}
            <div className="sm:col-span-2 lg:col-span-2">
              <Field label="Profit Margin (auto-calculated)">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-10 rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 px-3 flex items-center">
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        Number(profitMargin) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {profitMargin}%
                    </span>
                  </div>
                  {isEditMode && id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPriceHistoryOpen(true)}
                    >
                      <History className="h-3.5 w-3.5" />
                      Price History
                    </Button>
                  )}
                </div>
              </Field>
            </div>
          </div>
        </FormSection>

        {/* ── SECTION 3: Stock & Storage ─────────────────────────────── */}
        <FormSection title="Stock & Storage" icon={Package}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Field label="Unit of Measure" required error={errors.unitOfMeasure?.message}>
              <select
                {...register('unitOfMeasure')}
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </Field>

            <Field label="Pack Size" error={errors.packSize?.message}>
              <input
                {...register('packSize')}
                type="number"
                min="1"
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
              />
            </Field>

            <Field label="Package Type">
              <input
                {...register('packageType')}
                placeholder="e.g. Bottle, Bag, Carton"
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
              />
            </Field>

            {/* Storage type */}
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Storage Type">
                <div className="flex items-center gap-3 flex-wrap">
                  {(
                    [
                      { value: 'AMBIENT', label: 'Ambient', icon: '☁️' },
                      { value: 'REFRIGERATED', label: 'Refrigerated', icon: '❄️' },
                      { value: 'FROZEN', label: 'Frozen', icon: '🧊' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('storageType', opt.value, { shouldDirty: true })}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all',
                        storageType === opt.value
                          ? 'border-[#1B4332] bg-[#1B4332]/10 text-[#1B4332]'
                          : 'border-[var(--border)] text-[var(--foreground)] hover:border-[#1B4332]/40'
                      )}
                    >
                      <span>{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Perishable</p>
                <p className="text-xs text-[var(--muted-foreground)]">Has an expiry date</p>
              </div>
              <Controller
                control={control}
                name="isPerishable"
                render={({ field }) => (
                  <Toggle checked={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Recyclable</p>
                <p className="text-xs text-[var(--muted-foreground)]">Packaging is recyclable</p>
              </div>
              <Controller
                control={control}
                name="isRecyclable"
                render={({ field }) => (
                  <Toggle checked={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>
        </FormSection>

        {/* ── SECTION 4: Location ────────────────────────────────────── */}
        <FormSection title="Location">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Field label="Country of Origin">
              <input
                {...register('countryOfOrigin')}
                placeholder="e.g. USA"
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
              />
            </Field>
            <Field label="Aisle Number">
              <input
                {...register('aisle')}
                placeholder="e.g. A3"
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
              />
            </Field>
            <Field label="Shelf Number">
              <input
                {...register('shelfNumber')}
                placeholder="e.g. S2"
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
              />
            </Field>
            <Field label="Shelf Row">
              <input
                {...register('shelfRow')}
                placeholder="e.g. R1"
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
              />
            </Field>
          </div>
        </FormSection>

        {/* ── SECTION 5: Inventory Thresholds ───────────────────────── */}
        <FormSection title="Inventory Thresholds">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Field
              label="Current Stock"
              hint={isEditMode ? 'Managed via inventory adjustments in edit mode' : undefined}
            >
              <input
                {...register('stockQty')}
                type="number"
                min="0"
                readOnly={isEditMode}
                className={cn(
                  'w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent',
                  isEditMode && 'bg-[var(--muted)]/50 cursor-not-allowed opacity-70'
                )}
              />
            </Field>
            <Field label="Low Stock Threshold" error={errors.lowStockThreshold?.message}>
              <input
                {...register('lowStockThreshold')}
                type="number"
                min="0"
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
              />
            </Field>
            <Field label="Reorder Quantity Suggestion">
              <input
                {...register('reorderQty')}
                type="number"
                min="0"
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
              />
            </Field>
          </div>
        </FormSection>

        {/* ── SECTION 6: Images ──────────────────────────────────────── */}
        <FormSection title="Product Images" icon={ImageIcon}>
          <ImageUploader
            productId={id}
            images={images}
            onImagesChange={setImages}
            isEditMode={isEditMode}
          />
          {!isEditMode && images.length > 0 && (
            <p className="text-xs text-[var(--muted-foreground)] mt-2 flex items-center gap-1">
              <Info className="h-3.5 w-3.5" />
              Images will be uploaded after the product is created.
            </p>
          )}
        </FormSection>

        {/* ── SECTION 7: Variants ────────────────────────────────────── */}
        <FormSection title="Variants">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">This product has variants</p>
                <p className="text-xs text-[var(--muted-foreground)]">e.g. different sizes, flavors, or colors</p>
              </div>
              <Controller
                control={control}
                name="hasVariants"
                render={({ field }) => (
                  <Toggle checked={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            {hasVariants && (
              <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                        {['Name', 'SKU', 'Price ($)', 'Stock', 'Unit', ''].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {variantFields.map((field, idx) => (
                        <tr key={field.id} className="border-b border-[var(--border)] last:border-0">
                          <td className="px-3 py-2">
                            <input
                              {...register(`variants.${idx}.name`)}
                              placeholder="e.g. Small"
                              className="w-full h-8 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              {...register(`variants.${idx}.sku`)}
                              placeholder="SKU"
                              className="w-full h-8 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              {...register(`variants.${idx}.sellingPrice`)}
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="w-24 h-8 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              {...register(`variants.${idx}.stockQty`)}
                              type="number"
                              min="0"
                              placeholder="0"
                              className="w-20 h-8 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              {...register(`variants.${idx}.unit`)}
                              placeholder="unit"
                              className="w-20 h-8 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => removeVariant(idx)}
                              className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 border-t border-[var(--border)]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      appendVariant({ name: '', sku: '', sellingPrice: 0, stockQty: 0, unit: '' })
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add Row
                  </Button>
                </div>
              </div>
            )}
          </div>
        </FormSection>

        {/* ── SECTION 8: Nutritional Info ────────────────────────────── */}
        <FormSection title="Nutritional Information">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Has nutritional information</p>
                <p className="text-xs text-[var(--muted-foreground)]">Calories, macros, serving size</p>
              </div>
              <Controller
                control={control}
                name="hasNutrition"
                render={({ field }) => (
                  <Toggle checked={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            {hasNutrition && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(
                    [
                      { key: 'calories', label: 'Calories', unit: 'kcal' },
                      { key: 'fat', label: 'Fat', unit: 'g' },
                      { key: 'protein', label: 'Protein', unit: 'g' },
                      { key: 'carbs', label: 'Carbs', unit: 'g' },
                      { key: 'sugar', label: 'Sugar', unit: 'g' },
                      { key: 'fiber', label: 'Fiber', unit: 'g' },
                      { key: 'sodium', label: 'Sodium', unit: 'mg' },
                    ] as const
                  ).map(({ key, label, unit }) => (
                    <Field key={key} label={`${label} (${unit})`}>
                      <input
                        {...register(key)}
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0"
                        className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
                      />
                    </Field>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Serving Size">
                    <input
                      {...register('servingSize')}
                      placeholder="e.g. 240 mL"
                      className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
                    />
                  </Field>
                  <Field label="Servings Per Pack">
                    <input
                      {...register('servingsPerPack')}
                      type="number"
                      min="0"
                      placeholder="e.g. 4"
                      className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Ingredients">
                      <textarea
                        {...register('ingredients')}
                        rows={3}
                        placeholder="e.g. Whole milk, Vitamin D3…"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent resize-none"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            )}
          </div>
        </FormSection>

        {/* ── SECTION 9: Dietary & Allergens ─────────────────────────── */}
        <FormSection title="Dietary & Allergens">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)] mb-3">Allergens</p>
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.map((a) => (
                  <PillCheckbox
                    key={a}
                    label={a}
                    checked={(allergens ?? []).includes(a)}
                    onChange={() => toggleAllergen(a)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)] mb-3">Dietary Tags</p>
              <div className="flex flex-wrap gap-2">
                {DIETARY_TAGS.map((tag) => (
                  <PillCheckbox
                    key={tag}
                    label={tag}
                    checked={(dietaryTags ?? []).includes(tag)}
                    onChange={() => toggleDietaryTag(tag)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)] mb-3">Product Dietary Flags</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {(
                  [
                    { key: 'isOrganic' as const, label: '🌿 Organic' },
                    { key: 'isVegan' as const, label: '🌱 Vegan' },
                    { key: 'isGlutenFree' as const, label: 'Gluten-Free' },
                    { key: 'isHalal' as const, label: 'Halal' },
                    { key: 'isKosher' as const, label: 'Kosher' },
                  ]
                ).map(({ key, label }) => (
                  <Controller
                    key={key}
                    control={control}
                    name={key}
                    render={({ field }) => (
                      <button
                        type="button"
                        onClick={() => field.onChange(!field.value)}
                        className={cn(
                          'flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                          field.value
                            ? 'border-[#1B4332] bg-[#1B4332]/10 text-[#1B4332]'
                            : 'border-[var(--border)] text-[var(--foreground)] hover:border-[#1B4332]/40'
                        )}
                      >
                        {field.value && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {label}
                      </button>
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </FormSection>

        {/* ── SECTION 10: Availability ───────────────────────────────── */}
        <FormSection title="Availability" icon={Clock}>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Seasonal product</p>
                <p className="text-xs text-[var(--muted-foreground)]">Available only during certain dates</p>
              </div>
              <Controller
                control={control}
                name="isSeasonal"
                render={({ field }) => (
                  <Toggle checked={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            {isSeasonal && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Available From">
                  <input
                    {...register('seasonalFrom')}
                    type="date"
                    className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
                  />
                </Field>
                <Field label="Available To">
                  <input
                    {...register('seasonalTo')}
                    type="date"
                    className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
                  />
                </Field>
              </div>
            )}

            <Field label="Daily Available From Time">
              <input
                {...register('availableFrom')}
                type="time"
                className="w-full sm:w-48 h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
              />
            </Field>
          </div>
        </FormSection>

        {/* Bottom padding so sticky bar doesn't cover last section */}
        <div className="h-4" />
      </div>

      {/* ── Sticky Bottom Bar ──────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-[var(--background)] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <Link
            to="/owner/products"
            className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Products
          </Link>
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1 mr-2">
                <Info className="h-3.5 w-3.5" />
                Unsaved changes
              </span>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/owner/products')}>
              Cancel
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleSaveDraft}>
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            <Button type="submit" size="sm" loading={isSubmitting || submitMutation.isPending}>
              <CheckCircle2 className="h-4 w-4" />
              {isEditMode ? 'Update Product' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>

      {/* Price history dialog */}
      {isEditMode && id && (
        <PriceHistoryDialog
          productId={id}
          open={priceHistoryOpen}
          onClose={() => setPriceHistoryOpen(false)}
        />
      )}
    </form>
  );
}
