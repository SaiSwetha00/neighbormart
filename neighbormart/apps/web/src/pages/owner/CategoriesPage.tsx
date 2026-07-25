import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  GripVertical,
  Layers,
  Tag,
  Package,
  Image,
  X,
  Check,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import api from '@/services/api';
import { getInitials } from '@/utils/format';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  icon?: string;
  parentId?: string | null;
  sortOrder: number;
  productCount: number;
  children?: Category[];
}

interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  productCount: number;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  icon: z.string().optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.coerce.number().min(0).optional(),
});

const brandSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
});

type CategoryFormValues = z.infer<typeof categorySchema>;
type BrandFormValues = z.infer<typeof brandSchema>;

// ─── Category Form Dialog ─────────────────────────────────────────────────────

interface CategoryDialogProps {
  open: boolean;
  onClose: () => void;
  existing?: Category | null;
  categories: Category[];
}

function CategoryDialog({ open, onClose, existing, categories }: CategoryDialogProps) {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    values: existing
      ? {
          name: existing.name,
          icon: existing.icon ?? '',
          parentId: existing.parentId ?? null,
          sortOrder: existing.sortOrder,
        }
      : { name: '', icon: '', parentId: null, sortOrder: 0 },
  });

  const mutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const payload = {
        ...data,
        parentId: data.parentId === 'none' || !data.parentId ? null : data.parentId,
      };
      if (existing) {
        await api.put(`/categories/${existing.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      reset();
      onClose();
    },
  });

  // Root categories only (no children) for parent select
  const rootCats = categories.filter((c) => !c.parentId && (!existing || c.id !== existing.id));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Category' : 'Add Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutateAsync(d))} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Name *</label>
            <Input {...register('name')} placeholder="e.g. Dairy & Eggs" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Icon (emoji)</label>
            <Input {...register('icon')} placeholder="🥛" maxLength={4} className="w-24" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Parent Category</label>
            <Select
              value={watch('parentId') ?? 'none'}
              onValueChange={(v) => setValue('parentId', v === 'none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="None (top-level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (top-level)</SelectItem>
                {rootCats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Sort Order</label>
            <Input type="number" min="0" {...register('sortOrder')} className="w-28" />
          </div>

          {mutation.isError && <p className="text-sm text-red-500">Failed to save category.</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Saving…' : existing ? 'Save Changes' : 'Add Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Category Dialog ───────────────────────────────────────────────────

interface DeleteCategoryDialogProps {
  category: Category | null;
  open: boolean;
  onClose: () => void;
}

function DeleteCategoryDialog({ category, open, onClose }: DeleteCategoryDialogProps) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/categories/${category!.id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      onClose();
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Category</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <strong>"{category?.name}"</strong>?
            {(category?.productCount ?? 0) > 0 && (
              <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                Warning: This category has {category?.productCount} product(s). Deleting it may affect those products.
              </span>
            )}
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {mutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Category Tree Row ────────────────────────────────────────────────────────

interface CategoryRowProps {
  category: Category;
  allCategories: Category[];
  depth?: number;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
}

function CategoryRow({ category, allCategories, depth = 0, onEdit, onDelete }: CategoryRowProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (category.children?.length ?? 0) > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/30 transition-colors ${
          depth > 0 ? 'ml-8 mt-1.5' : ''
        }`}
      >
        {/* Drag handle */}
        <GripVertical size={14} className="text-[var(--muted-foreground)] flex-shrink-0 cursor-grab" />

        {/* Expand toggle */}
        <button
          className="flex-shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          onClick={() => setExpanded((v) => !v)}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />
          ) : (
            <div className="w-4" />
          )}
        </button>

        {/* Icon */}
        <span className="text-lg leading-none flex-shrink-0 w-6 text-center">
          {category.icon ?? '📦'}
        </span>

        {/* Name */}
        <span className="flex-1 text-sm font-medium">{category.name}</span>

        {/* Product count */}
        <Badge variant="outline" className="text-[11px] h-5">
          <Package size={10} className="mr-1" />
          {category.productCount}
        </Badge>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-[var(--muted-foreground)]"
            onClick={() => onEdit(category)}
          >
            <Pencil size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={() => onDelete(category)}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="mt-1">
          {category.children!.map((child) => (
            <CategoryRow
              key={child.id}
              category={child}
              allCategories={allCategories}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────

function CategoriesTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: rawCategories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data?.data ?? res.data ?? [];
    },
  });

  // Build tree
  const buildTree = (cats: Category[]): Category[] => {
    const map = new Map<string, Category>();
    const roots: Category[] = [];
    cats.forEach((c) => map.set(c.id, { ...c, children: [] }));
    map.forEach((c) => {
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children!.push(c);
      } else {
        roots.push(c);
      }
    });
    return roots.sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const tree = buildTree(rawCategories);

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setDialogOpen(true);
  };

  const openDelete = (cat: Category) => {
    setDeleteTarget(cat);
    setDeleteOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">
          {rawCategories.length} {rawCategories.length === 1 ? 'category' : 'categories'}
        </p>
        <Button
          size="sm"
          onClick={() => { setEditTarget(null); setDialogOpen(true); }}
        >
          <Plus size={14} className="mr-1.5" />
          Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : tree.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-[var(--muted-foreground)]">
          <Layers size={40} strokeWidth={1.2} />
          <p className="text-sm font-medium">No categories yet</p>
          <p className="text-xs">Add your first category to organize products.</p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus size={14} className="mr-1" />
            Add Category
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {tree.map((cat) => (
            <CategoryRow
              key={cat.id}
              category={cat}
              allCategories={rawCategories}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          ))}
        </div>
      )}

      <CategoryDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        existing={editTarget}
        categories={rawCategories}
      />

      <DeleteCategoryDialog
        category={deleteTarget}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}

// ─── Brand Form Dialog ────────────────────────────────────────────────────────

interface BrandDialogProps {
  open: boolean;
  onClose: () => void;
  existing?: Brand | null;
}

function BrandDialog({ open, onClose, existing }: BrandDialogProps) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    values: existing ? { name: existing.name } : { name: '' },
  });

  const mutation = useMutation({
    mutationFn: async (data: BrandFormValues) => {
      if (logoFile) {
        const form = new FormData();
        form.append('name', data.name);
        form.append('logo', logoFile);
        if (existing) {
          await api.put(`/brands/${existing.id}`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          await api.post('/brands', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      } else {
        if (existing) {
          await api.put(`/brands/${existing.id}`, data);
        } else {
          await api.post('/brands', data);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands'] });
      reset();
      setLogoPreview(null);
      setLogoFile(null);
      onClose();
    },
  });

  const handleClose = () => {
    reset();
    setLogoPreview(null);
    setLogoFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutateAsync(d))} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Brand Name *</label>
            <Input {...register('name')} placeholder="e.g. Nestlé" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Logo (optional)</label>
            <div className="flex items-center gap-3">
              <div
                className="h-16 w-16 rounded-lg border border-[var(--border)] overflow-hidden flex items-center justify-center bg-[var(--muted)] cursor-pointer flex-shrink-0"
                onClick={() => fileRef.current?.click()}
              >
                {logoPreview || existing?.logoUrl ? (
                  <img src={logoPreview ?? existing?.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <Image size={20} className="text-[var(--muted-foreground)]" />
                )}
              </div>
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  Choose Logo
                </Button>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">PNG, JPG, SVG up to 1MB</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogoFile(file);
                    setLogoPreview(URL.createObjectURL(file));
                  }
                }}
              />
              {(logoPreview || logoFile) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => { setLogoPreview(null); setLogoFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                >
                  <X size={14} />
                </Button>
              )}
            </div>
          </div>

          {mutation.isError && <p className="text-sm text-red-500">Failed to save brand.</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Saving…' : existing ? 'Save Changes' : 'Add Brand'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Brand Card ───────────────────────────────────────────────────────────────

interface BrandCardProps {
  brand: Brand;
  onEdit: (brand: Brand) => void;
  onDelete: (brand: Brand) => void;
}

function BrandCard({ brand, onEdit, onDelete }: BrandCardProps) {
  return (
    <Card className="overflow-hidden group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-lg border border-[var(--border)] overflow-hidden flex items-center justify-center bg-[var(--muted)] flex-shrink-0">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.name} className="h-full w-full object-contain" />
            ) : (
              <span className="text-lg font-bold text-[var(--muted-foreground)]">
                {brand.name[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{brand.name}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {brand.productCount} {brand.productCount === 1 ? 'product' : 'products'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[var(--border)]">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => onEdit(brand)}
          >
            <Pencil size={12} className="mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={() => onDelete(brand)}
          >
            <Trash2 size={12} className="mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Brands Tab ───────────────────────────────────────────────────────────────

function BrandsTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Brand | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: brands = [], isLoading } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await api.get('/brands');
      return res.data?.data ?? res.data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/brands/${deleteTarget!.id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands'] });
      setDeleteOpen(false);
    },
  });

  const openEdit = (brand: Brand) => {
    setEditTarget(brand);
    setDialogOpen(true);
  };

  const openDelete = (brand: Brand) => {
    setDeleteTarget(brand);
    setDeleteOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">
          {brands.length} {brands.length === 1 ? 'brand' : 'brands'}
        </p>
        <Button size="sm" onClick={() => { setEditTarget(null); setDialogOpen(true); }}>
          <Plus size={14} className="mr-1.5" />
          Add Brand
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-[var(--muted-foreground)]">
          <Tag size={40} strokeWidth={1.2} />
          <p className="text-sm font-medium">No brands yet</p>
          <p className="text-xs">Add brands to associate them with your products.</p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus size={14} className="mr-1" />
            Add Brand
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <BrandCard
              key={brand.id}
              brand={brand}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          ))}
        </div>
      )}

      <BrandDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        existing={editTarget}
      />

      <AlertDialog open={deleteOpen} onOpenChange={(v) => !v && setDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Brand</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteTarget?.name}"</strong>?
              {(deleteTarget?.productCount ?? 0) > 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                  Warning: This brand has {deleteTarget?.productCount} product(s) associated with it.
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Categories & Brands</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          Organize your products with categories and brands
        </p>
      </div>

      <Tabs defaultValue="categories" className="space-y-5">
        <TabsList className="w-fit">
          <TabsTrigger value="categories" className="flex items-center gap-1.5 text-sm">
            <Layers size={14} />
            Categories
          </TabsTrigger>
          <TabsTrigger value="brands" className="flex items-center gap-1.5 text-sm">
            <Tag size={14} />
            Brands
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="brands">
          <BrandsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
