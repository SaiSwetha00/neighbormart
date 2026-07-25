import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tag,
  Ticket,
  Plus,
  Copy,
  Trash2,
  Edit,
  Check,
  Zap,
  Calendar,
  AlertCircle,
} from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/utils/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type PromotionType = "PERCENTAGE" | "FIXED" | "BUY_X_GET_Y";
type PromotionStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "DISABLED";
type CouponStatus = "ACTIVE" | "EXPIRED" | "DISABLED";

interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  discountValue: number;
  minOrderAmount: number;
  appliesTo: string;
  startDate: string;
  endDate: string;
  usageLimit: number | null;
  usedCount: number;
  status: PromotionStatus;
}

interface Coupon {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minOrder: number;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  usedCount: number;
  expiryDate: string;
  status: CouponStatus;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDiscount(type: PromotionType | "PERCENTAGE" | "FIXED", value: number): string {
  if (type === "PERCENTAGE") return `${value}% OFF`;
  if (type === "FIXED") return `${formatCurrency(value)} OFF`;
  return `Buy X Get Y`;
}

const PROMO_TYPE_LABELS: Record<PromotionType, string> = {
  PERCENTAGE: "Percentage Off",
  FIXED: "Fixed Amount Off",
  BUY_X_GET_Y: "Buy X Get Y",
};

const PROMO_TYPE_COLORS: Record<PromotionType, string> = {
  PERCENTAGE: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  FIXED: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  BUY_X_GET_Y: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
};

const STATUS_COLORS: Record<PromotionStatus | CouponStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  EXPIRED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  DISABLED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

function StatusBadge({ status }: { status: PromotionStatus | CouponStatus }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

// ─── Promotion Form Dialog ────────────────────────────────────────────────────

interface PromotionFormProps {
  open: boolean;
  onClose: () => void;
  initial?: Promotion;
}

const PROMO_DEFAULTS = {
  name: "",
  type: "PERCENTAGE" as PromotionType,
  discountValue: "",
  minOrderAmount: "",
  appliesTo: "ALL",
  startDate: "",
  endDate: "",
  usageLimit: "",
};

function PromotionFormDialog({ open, onClose, initial }: PromotionFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    ...PROMO_DEFAULTS,
    ...(initial
      ? {
          name: initial.name,
          type: initial.type,
          discountValue: String(initial.discountValue),
          minOrderAmount: String(initial.minOrderAmount),
          appliesTo: initial.appliesTo,
          startDate: initial.startDate?.slice(0, 10) ?? "",
          endDate: initial.endDate?.slice(0, 10) ?? "",
          usageLimit: initial.usageLimit != null ? String(initial.usageLimit) : "",
        }
      : {}),
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        type: form.type,
        discountValue: Number(form.discountValue),
        minOrderAmount: Number(form.minOrderAmount),
        appliesTo: form.appliesTo,
        startDate: form.startDate,
        endDate: form.endDate,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      };
      if (initial?.id) {
        await api.put(`/promotions/${initial.id}`, payload);
      } else {
        await api.post("/promotions", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      onClose();
    },
  });

  const isValid = form.name && form.discountValue && form.startDate && form.endDate;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Promotion" : "Create Promotion"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Promotion Name *</label>
            <Input value={form.name} onChange={set("name")} placeholder="Summer Sale, Weekend Deal..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Type *</label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as PromotionType }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENTAGE">Percentage Off</SelectItem>
                <SelectItem value="FIXED">Fixed Amount Off</SelectItem>
                <SelectItem value="BUY_X_GET_Y">Buy X Get Y</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Discount Value *{" "}
              <span className="text-muted-foreground font-normal">
                {form.type === "PERCENTAGE" ? "(e.g. 20 = 20%)" : form.type === "FIXED" ? "(e.g. 5 = $5.00)" : "(e.g. 1 = get 1 free)"}
              </span>
            </label>
            <Input type="number" min={0} value={form.discountValue} onChange={set("discountValue")} placeholder="20" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Minimum Order Amount ($)</label>
            <Input type="number" min={0} step={0.01} value={form.minOrderAmount} onChange={set("minOrderAmount")} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Start Date *</label>
              <Input type="date" value={form.startDate} onChange={set("startDate")} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">End Date *</label>
              <Input type="date" value={form.endDate} onChange={set("endDate")} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Usage Limit <span className="text-muted-foreground font-normal">(leave blank for unlimited)</span></label>
            <Input type="number" min={1} value={form.usageLimit} onChange={set("usageLimit")} placeholder="Unlimited" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!isValid || save.isPending}>
            {save.isPending ? "Saving..." : initial ? "Update Promotion" : "Create Promotion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Promotion Card ───────────────────────────────────────────────────────────

function PromotionCard({
  promotion,
  onEdit,
  onDelete,
}: {
  promotion: Promotion;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const usagePct =
    promotion.usageLimit && promotion.usageLimit > 0
      ? Math.min(100, Math.round((promotion.usedCount / promotion.usageLimit) * 100))
      : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate">{promotion.name}</h3>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${PROMO_TYPE_COLORS[promotion.type]}`}>
              {PROMO_TYPE_LABELS[promotion.type]}
            </span>
          </div>
          <StatusBadge status={promotion.status} />
        </div>

        {/* Discount */}
        <div className="text-2xl font-bold tracking-tight text-foreground">
          {formatDiscount(promotion.type, promotion.discountValue)}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>
            {promotion.startDate ? formatDate(promotion.startDate) : "—"} &rarr;{" "}
            {promotion.endDate ? formatDate(promotion.endDate) : "—"}
          </span>
        </div>

        {/* Min order */}
        {promotion.minOrderAmount > 0 && (
          <p className="text-xs text-muted-foreground">
            Min. order: {formatCurrency(promotion.minOrderAmount)}
          </p>
        )}

        {/* Usage */}
        {promotion.usageLimit != null && promotion.usageLimit > 0 ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Usage</span>
              <span className="font-medium text-foreground">
                {promotion.usedCount} / {promotion.usageLimit}
              </span>
            </div>
            <Progress value={usagePct ?? 0} className="h-1.5" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Used: {promotion.usedCount} &middot; Unlimited
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1" onClick={onEdit}>
            <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Promotions Tab ───────────────────────────────────────────────────────────

const PROMO_STATUS_FILTERS = ["ALL", "ACTIVE", "SCHEDULED", "EXPIRED"] as const;
type PromoStatusFilter = typeof PROMO_STATUS_FILTERS[number];

function PromotionsTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<PromoStatusFilter>("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editPromo, setEditPromo] = useState<Promotion | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: promotions, isLoading, isError } = useQuery<Promotion[]>({
    queryKey: ["promotions", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const res = await api.get(`/promotions${params}`);
      const raw = res.data?.data ?? res.data;
      return raw?.promotions ?? raw ?? [];
    },
  });

  const deletePromotion = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/promotions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setDeleteId(null);
    },
  });

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-muted/40 border rounded-lg p-1">
          {PROMO_STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <Button onClick={() => { setEditPromo(undefined); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Create Promotion
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/3 mb-4" />
                <Skeleton className="h-8 w-1/2 mb-3" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p>Failed to load promotions. Please try again.</p>
        </div>
      ) : (promotions ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <Tag className="h-10 w-10 opacity-40" />
          <p className="text-sm">No promotions found.</p>
          <Button variant="outline" onClick={() => { setEditPromo(undefined); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Create your first promotion
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(promotions ?? []).map((p) => (
            <PromotionCard
              key={p.id}
              promotion={p}
              onEdit={() => { setEditPromo(p); setFormOpen(true); }}
              onDelete={() => setDeleteId(p.id)}
            />
          ))}
        </div>
      )}

      {/* Form dialog */}
      <PromotionFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditPromo(undefined); }}
        initial={editPromo}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promotion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the promotion. Active orders using it will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && deletePromotion.mutate(deleteId)}
            >
              {deletePromotion.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Create Coupon Dialog ─────────────────────────────────────────────────────

const COUPON_DEFAULTS = {
  code: "",
  type: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
  value: "",
  minOrder: "",
  usageLimit: "",
  expiryDate: "",
};

function CreateCouponDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Coupon }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    ...COUPON_DEFAULTS,
    ...(initial
      ? {
          code: initial.code,
          type: initial.type,
          value: String(initial.value),
          minOrder: String(initial.minOrder),
          usageLimit: initial.usageLimit != null ? String(initial.usageLimit) : "",
          expiryDate: initial.expiryDate?.slice(0, 10) ?? "",
        }
      : {}),
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const autoGenCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const code = Array.from({ length: 8 })
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join("");
    setForm((f) => ({ ...f, code }));
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code || undefined,
        type: form.type,
        value: Number(form.value),
        minOrder: Number(form.minOrder),
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        expiryDate: form.expiryDate,
      };
      if (initial?.id) {
        await api.put(`/coupons/${initial.id}`, {
          value: payload.value,
          minOrder: payload.minOrder,
          status: initial.status,
        });
      } else {
        await api.post("/coupons", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      onClose();
    },
  });

  const isValid = form.value && (initial || true);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!initial && (
            <div>
              <label className="text-sm font-medium mb-1 block">
                Coupon Code <span className="text-muted-foreground font-normal">(leave blank to auto-generate)</span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={set("code")}
                  placeholder="SUMMER20"
                  className="uppercase"
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.value = el.value.toUpperCase();
                  }}
                />
                <Button type="button" variant="outline" onClick={autoGenCode} className="shrink-0">
                  <Zap className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">Discount Type</label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((f) => ({ ...f, type: v as "PERCENTAGE" | "FIXED" }))}
              disabled={!!initial}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENTAGE">Percentage Off</SelectItem>
                <SelectItem value="FIXED">Fixed Amount Off</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Value * <span className="text-muted-foreground font-normal">{form.type === "PERCENTAGE" ? "(e.g. 20 = 20%)" : "(e.g. 5 = $5.00)"}</span>
            </label>
            <Input type="number" min={0} value={form.value} onChange={set("value")} placeholder="20" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Minimum Order ($)</label>
            <Input type="number" min={0} step={0.01} value={form.minOrder} onChange={set("minOrder")} placeholder="0" />
          </div>
          {!initial && (
            <div>
              <label className="text-sm font-medium mb-1 block">Usage Limit <span className="text-muted-foreground font-normal">(leave blank for unlimited)</span></label>
              <Input type="number" min={1} value={form.usageLimit} onChange={set("usageLimit")} placeholder="Unlimited" />
            </div>
          )}
          {!initial && (
            <div>
              <label className="text-sm font-medium mb-1 block">Expiry Date</label>
              <Input type="date" value={form.expiryDate} onChange={set("expiryDate")} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!isValid || save.isPending}>
            {save.isPending ? "Saving..." : initial ? "Update Coupon" : "Create Coupon"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk Generate Dialog ─────────────────────────────────────────────────────

function BulkGenerateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    count: "10",
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    value: "",
    minOrder: "",
    usageLimit: "",
    expiryDate: "",
    prefix: "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const generate = useMutation({
    mutationFn: async () => {
      await api.post("/coupons/bulk-generate", {
        count: Number(form.count),
        type: form.type,
        value: Number(form.value),
        minOrder: form.minOrder ? Number(form.minOrder) : 0,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        expiryDate: form.expiryDate || undefined,
        prefix: form.prefix || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      onClose();
    },
  });

  const isValid = form.count && form.value;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Generate Coupons</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Number of Coupons *</label>
            <Select value={form.count} onValueChange={(v) => setForm((f) => ({ ...f, count: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 coupons</SelectItem>
                <SelectItem value="25">25 coupons</SelectItem>
                <SelectItem value="50">50 coupons</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Code Prefix <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              value={form.prefix}
              onChange={set("prefix")}
              placeholder="SUMMER, PROMO, etc."
              className="uppercase"
              onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toUpperCase(); }}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Discount Type *</label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((f) => ({ ...f, type: v as "PERCENTAGE" | "FIXED" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENTAGE">Percentage Off</SelectItem>
                <SelectItem value="FIXED">Fixed Amount Off</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Discount Value * <span className="text-muted-foreground font-normal">{form.type === "PERCENTAGE" ? "(e.g. 10 = 10%)" : "(e.g. 5 = $5.00)"}</span>
            </label>
            <Input type="number" min={0} value={form.value} onChange={set("value")} placeholder="10" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Minimum Order ($)</label>
            <Input type="number" min={0} step={0.01} value={form.minOrder} onChange={set("minOrder")} placeholder="0" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Usage Limit per Coupon <span className="text-muted-foreground font-normal">(leave blank for unlimited)</span></label>
            <Input type="number" min={1} value={form.usageLimit} onChange={set("usageLimit")} placeholder="1" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Expiry Date</label>
            <Input type="date" value={form.expiryDate} onChange={set("expiryDate")} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => generate.mutate()} disabled={!isValid || generate.isPending}>
            {generate.isPending ? "Generating..." : `Generate ${form.count} Coupons`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Copy Code Button ─────────────────────────────────────────────────────────

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 font-mono text-sm font-medium bg-muted/60 hover:bg-muted px-2 py-1 rounded transition-colors group"
      title="Copy code"
    >
      {code}
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
      )}
    </button>
  );
}

// ─── Coupons Tab ──────────────────────────────────────────────────────────────

const COUPON_STATUS_FILTERS = ["ALL", "ACTIVE", "EXPIRED", "DISABLED"] as const;
type CouponStatusFilter = typeof COUPON_STATUS_FILTERS[number];

function CouponsTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<CouponStatusFilter>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: coupons, isLoading, isError } = useQuery<Coupon[]>({
    queryKey: ["coupons", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const res = await api.get(`/coupons${params}`);
      const raw = res.data?.data ?? res.data;
      return raw?.coupons ?? raw ?? [];
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/coupons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      setDeleteId(null);
    },
  });

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-muted/40 border rounded-lg p-1">
          {COUPON_STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Zap className="h-4 w-4 mr-2" /> Bulk Generate
          </Button>
          <Button onClick={() => { setEditCoupon(undefined); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Create Coupon
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Min. Order</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 7 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full max-w-[100px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-6 w-6" />
                    <p>Failed to load coupons.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (coupons ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Ticket className="h-8 w-8 opacity-40" />
                    <p className="text-sm">No coupons found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              (coupons ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <CopyCodeButton code={c.code} />
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROMO_TYPE_COLORS[c.type]}`}>
                      {c.type === "PERCENTAGE" ? "%" : "$"}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatDiscount(c.type, c.value)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.minOrder > 0 ? formatCurrency(c.minOrder) : "—"}
                  </TableCell>
                  <TableCell>
                    {c.usageLimit != null ? (
                      <div className="space-y-1 min-w-[80px]">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{c.usedCount}</span>
                          <span>{c.usageLimit}</span>
                        </div>
                        <Progress
                          value={Math.min(100, Math.round((c.usedCount / c.usageLimit) * 100))}
                          className="h-1.5"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">{c.usedCount} / ∞</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.expiryDate ? formatDate(c.expiryDate) : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditCoupon(c); setCreateOpen(true); }}
                        title="Edit coupon"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => setDeleteId(c.id)}
                        title="Delete coupon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialogs */}
      <CreateCouponDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); setEditCoupon(undefined); }}
        initial={editCoupon}
      />
      <BulkGenerateDialog open={bulkOpen} onClose={() => setBulkOpen(false)} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the coupon. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && deleteCoupon.mutate(deleteId)}
            >
              {deleteCoupon.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PromotionsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Promotions & Coupons</h1>
        <p className="text-muted-foreground">Manage discount promotions and coupon codes for your store</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="promotions">
        <TabsList>
          <TabsTrigger value="promotions" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Promotions
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Coupons
          </TabsTrigger>
        </TabsList>

        <TabsContent value="promotions" className="mt-6">
          <PromotionsTab />
        </TabsContent>

        <TabsContent value="coupons" className="mt-6">
          <CouponsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
