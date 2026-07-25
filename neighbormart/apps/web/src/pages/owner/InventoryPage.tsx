import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Calendar,
  Trash2,
  Plus,
  Search,
  Filter,
  ClipboardList,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { formatCurrency, formatDate, formatNumber } from "@/utils/format";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InventoryOverview {
  totalSKUs: number;
  stockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringThisWeek: number;
  wasteThisMonth: number;
  stockHealth: { inStock: number; lowStock: number; outOfStock: number };
  categoryStock: { category: string; totalQty: number }[];
}

interface LowStockItem {
  id: string;
  productName: string;
  sku: string;
  currentStock: number;
  threshold: number;
  suggestedReorderQty: number;
}

interface ExpiringItem {
  id: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  qty: number;
  daysRemaining: number;
}

interface WasteLogEntry {
  id: string;
  date: string;
  productName: string;
  qty: number;
  reason: "EXPIRED" | "DAMAGED" | "STOLEN" | "OTHER";
  financialValue: number;
}

interface WasteSummary {
  totalValue: number;
  totalCount: number;
  items: WasteLogEntry[];
}

interface AdjustmentEntry {
  id: string;
  date: string;
  productName: string;
  type: "ADD" | "REMOVE";
  qty: number;
  reason: string;
  user: string;
}

interface AuditProduct {
  productId: string;
  productName: string;
  sku: string;
  systemCount: number;
  physicalCount?: number;
}

interface AuditHistory {
  id: string;
  date: string;
  status: string;
  completedBy: string;
  discrepanciesCount: number;
}

interface AuditData {
  products: AuditProduct[];
  history: AuditHistory[];
}

interface BatchEntry {
  id: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  qty: number;
  receivedDate: string;
  supplier: string;
  productId: string;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{value}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data, isLoading } = useQuery<InventoryOverview>({
    queryKey: ["inventory-overview"],
    queryFn: async () => {
      const res = await api.get("/inventory");
      const d = res.data?.data ?? res.data;
      return {
        ...d,
        stockHealth: {
          inStock: d.inStockCount ?? 0,
          lowStock: d.lowStockCount ?? 0,
          outOfStock: d.outOfStockCount ?? 0,
        },
        categoryStock: d.categoryStockChart ?? d.categoryStock ?? [],
      };
    },
  });

  const pieData = data
    ? [
        { name: "In Stock", value: data.stockHealth.inStock, color: "#22c55e" },
        { name: "Low Stock", value: data.stockHealth.lowStock, color: "#eab308" },
        { name: "Out of Stock", value: data.stockHealth.outOfStock, color: "#ef4444" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Total SKUs" value={data?.totalSKUs ?? 0} icon={Package} color="bg-blue-500" loading={isLoading} />
        <KpiCard title="Stock Value" value={data ? formatCurrency(data.stockValue) : "$0"} icon={TrendingDown} color="bg-green-500" loading={isLoading} />
        <KpiCard title="Low Stock" value={data?.lowStockCount ?? 0} icon={AlertTriangle} color="bg-yellow-500" loading={isLoading} />
        <KpiCard title="Out of Stock" value={data?.outOfStockCount ?? 0} icon={Package} color="bg-red-500" loading={isLoading} />
        <KpiCard title="Expiring This Week" value={data?.expiringThisWeek ?? 0} icon={Calendar} color="bg-orange-500" loading={isLoading} />
        <KpiCard title="Waste This Month" value={data ? formatCurrency(data.wasteThisMonth) : "$0"} icon={Trash2} color="bg-purple-500" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock Health</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data?.categoryStock ?? []} margin={{ left: -20 }}>
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="totalQty" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Low Stock Tab ─────────────────────────────────────────────────────────────

function LowStockTab() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);

  const { data, isLoading } = useQuery<LowStockItem[]>({
    queryKey: ["inventory-low-stock"],
    queryFn: async () => {
      const res = await api.get("/inventory/low-stock");
      const raw: any[] = res.data?.data ?? [];
      return raw.map((p) => ({
        id: p.id,
        productName: p.name,
        sku: p.sku,
        currentStock: p.stockQty,
        threshold: p.lowStockThreshold,
        suggestedReorderQty: Math.max(p.lowStockThreshold * 2 - p.stockQty, 0),
      })) as LowStockItem[];
    },
  });

  const handleCreatePO = (productId: string) => {
    navigate(`/owner/suppliers?tab=purchase-orders&productId=${productId}`);
  };

  const handleBulkCreatePO = () => {
    const ids = selected.join(",");
    navigate(`/owner/suppliers?tab=purchase-orders&productIds=${ids}`);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} items need restocking</p>
        <Button onClick={handleBulkCreatePO} disabled={selected.length === 0} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Bulk Create PO ({selected.length})
        </Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  onChange={(e) => setSelected(e.target.checked ? (data ?? []).map((i) => i.id) : [])}
                  checked={selected.length === (data?.length ?? 0) && selected.length > 0}
                />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead>Days Remaining</TableHead>
              <TableHead>Suggested Reorder</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              (data ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                  </TableCell>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                  <TableCell>
                    <span className={item.currentStock === 0 ? "text-red-600 font-bold" : "text-yellow-600 font-medium"}>
                      {formatNumber(item.currentStock)}
                    </span>
                  </TableCell>
                  <TableCell>{formatNumber(item.threshold)}</TableCell>
                  <TableCell>{item.currentStock > 0 ? `~${item.currentStock} days` : "—"}</TableCell>
                  <TableCell>{formatNumber(item.suggestedReorderQty)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => handleCreatePO(item.id)}>
                      Create PO
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ─── Expiring Tab ─────────────────────────────────────────────────────────────

function ExpiringTab() {
  const [days, setDays] = useState(7);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<ExpiringItem[]>({
    queryKey: ["inventory-expiring", days],
    queryFn: async () => {
      const res = await api.get(`/inventory/expiring?days=${days}`);
      const raw: any[] = res.data?.data ?? [];
      const now = Date.now();
      return raw.map((b) => ({
        id: b.id,
        productName: b.product?.name ?? "Unknown",
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        qty: b.quantity,
        daysRemaining: Math.ceil((new Date(b.expiryDate).getTime() - now) / 86400000),
      })) as ExpiringItem[];
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      await api.post(`/inventory/expiring/${id}/action`, { action });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-expiring"] }),
  });

  const expiryColor = (d: number) => {
    if (d <= 3) return "text-red-600 font-bold";
    if (d <= 7) return "text-orange-500 font-medium";
    return "text-foreground";
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[3, 7, 30].map((d) => (
          <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>
            {d} Days
          </Button>
        ))}
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Batch #</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Days Remaining</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              (data ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-muted-foreground">{item.batchNumber}</TableCell>
                  <TableCell>{formatDate(item.expiryDate)}</TableCell>
                  <TableCell>{formatNumber(item.qty)}</TableCell>
                  <TableCell className={expiryColor(item.daysRemaining)}>{item.daysRemaining} days</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => actionMutation.mutate({ id: item.id, action: "MARKD_DOWN" })}>Mark Down</Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => actionMutation.mutate({ id: item.id, action: "WRITE_OFF" })}>Write Off</Button>
                      <Button size="sm" variant="outline" onClick={() => actionMutation.mutate({ id: item.id, action: "RETURN" })}>Return</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ─── Waste Log Tab ─────────────────────────────────────────────────────────────

const WASTE_REASONS = ["EXPIRED", "DAMAGED", "STOLEN", "OTHER"] as const;
type WasteReason = typeof WASTE_REASONS[number];

const REASON_COLORS: Record<WasteReason, string> = {
  EXPIRED: "destructive",
  DAMAGED: "secondary",
  STOLEN: "outline",
  OTHER: "outline",
};

function WasteLogTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [form, setForm] = useState({ productId: "", qty: "", reason: "EXPIRED" as WasteReason, financialValue: "" });

  const { data, isLoading } = useQuery<WasteSummary>({
    queryKey: ["inventory-waste-log"],
    queryFn: async () => {
      const raw: any[] = (await api.get("/inventory/waste-log")).data?.data ?? [];
      const items: WasteLogEntry[] = raw.map((w) => ({
        id: w.id,
        date: w.createdAt,
        productName: w.product?.name ?? "Unknown",
        qty: w.quantity,
        reason: w.reason as WasteLogEntry["reason"],
        financialValue: w.financialValue ?? 0,
      }));
      return {
        totalValue: items.reduce((s, i) => s + i.financialValue, 0),
        totalCount: items.length,
        items,
      } as WasteSummary;
    },
  });

  const logWaste = useMutation({
    mutationFn: async () => {
      await api.post("/inventory/waste-log", { ...form, qty: Number(form.qty), financialValue: Number(form.financialValue) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-waste-log"] });
      setOpen(false);
      setForm({ productId: "", qty: "", reason: "EXPIRED", financialValue: "" });
    },
  });

  useEffect(() => {
    if (open) {
      api.get("/products?limit=200").then((r) => setProducts(r.data?.data?.products ?? [])).catch(() => {});
    }
  }, [open]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Month Total Value</p>
            <p className="text-xl font-bold text-red-600">{data ? formatCurrency(data.totalValue) : "—"}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Month Total Count</p>
            <p className="text-xl font-bold">{data?.totalCount ?? "—"}</p>
          </Card>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Log Waste
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              (data?.items ?? []).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell className="font-medium">{entry.productName}</TableCell>
                  <TableCell>{formatNumber(entry.qty)}</TableCell>
                  <TableCell>
                    <Badge variant={REASON_COLORS[entry.reason] as any}>{entry.reason}</Badge>
                  </TableCell>
                  <TableCell className="text-red-600">{formatCurrency(entry.financialValue)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Waste</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Product</label>
              <Select value={form.productId} onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Quantity</label>
              <Input type="number" min={1} value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Reason</label>
              <Select value={form.reason} onValueChange={(v) => setForm((f) => ({ ...f, reason: v as WasteReason }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WASTE_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Financial Value ($)</label>
              <Input type="number" min={0} step={0.01} value={form.financialValue} onChange={(e) => setForm((f) => ({ ...f, financialValue: e.target.value }))} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => logWaste.mutate()} disabled={!form.productId || !form.qty || logWaste.isPending}>
              {logWaste.isPending ? "Saving..." : "Log Waste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Adjustments Tab ──────────────────────────────────────────────────────────

function AdjustmentsTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [form, setForm] = useState({ productId: "", type: "ADD" as "ADD" | "REMOVE", qty: "", reason: "" });

  const { data, isLoading } = useQuery<AdjustmentEntry[]>({
    queryKey: ["inventory-adjustments"],
    queryFn: async () => {
      const raw: any[] = (await api.get("/inventory/adjustments")).data?.data ?? [];
      return raw.map((a) => ({
        id: a.id,
        date: a.createdAt,
        productName: a.product?.name ?? "Unknown",
        type: a.type as "ADD" | "REMOVE",
        qty: a.quantity,
        reason: a.reason,
        user: a.user?.name ?? "—",
      })) as AdjustmentEntry[];
    },
  });

  const adjust = useMutation({
    mutationFn: async () => {
      await api.post("/inventory/adjustments", { ...form, qty: Number(form.qty) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
      setOpen(false);
      setForm({ productId: "", type: "ADD", qty: "", reason: "" });
    },
  });

  useEffect(() => {
    if (open) {
      api.get("/products?limit=200").then((r) => setProducts(r.data?.data?.products ?? [])).catch(() => {});
    }
  }, [open]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Adjust Stock
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              (data ?? []).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell className="font-medium">{entry.productName}</TableCell>
                  <TableCell>
                    <Badge variant={entry.type === "ADD" ? "default" : "destructive"} className={entry.type === "ADD" ? "bg-green-100 text-green-800" : ""}>
                      {entry.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatNumber(entry.qty)}</TableCell>
                  <TableCell>{entry.reason}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.user}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Product</label>
              <Select value={form.productId} onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Adjustment Type</label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as "ADD" | "REMOVE" }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADD">Add Stock</SelectItem>
                  <SelectItem value="REMOVE">Remove Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Quantity</label>
              <Input type="number" min={1} value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Reason</label>
              <Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Reason for adjustment..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => adjust.mutate()} disabled={!form.productId || !form.qty || adjust.isPending}>
              {adjust.isPending ? "Saving..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Audit Tab ─────────────────────────────────────────────────────────────────

function AuditTab() {
  const queryClient = useQueryClient();
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery<AuditData>({
    queryKey: ["inventory-audit"],
    queryFn: async () => {
      const [todayRes, historyRes, productsRes] = await Promise.all([
        api.get("/inventory/audit/today"),
        api.get("/inventory/audit/history"),
        api.get("/products?limit=500"),
      ]);
      const prods: any[] = productsRes.data?.data?.products ?? [];
      const history: any[] = historyRes.data?.data ?? [];
      return {
        products: prods.map((p) => ({
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          systemCount: p.stockQty,
        })),
        history: history.map((h) => ({
          id: h.id,
          date: h.date ?? h.createdAt,
          status: h.status,
          completedBy: h.completedBy ?? "—",
          discrepanciesCount: Array.isArray(h.discrepancies) ? h.discrepancies.length : 0,
        })),
      } as AuditData;
    },
  });

  const submitAudit = useMutation({
    mutationFn: async () => {
      const items = (data?.products ?? []).map((p) => ({
        productId: p.productId,
        physicalCount: physicalCounts[p.productId] ?? p.systemCount,
      }));
      await api.post("/inventory/audit/complete", { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-audit"] });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Today's Audit — {formatDate(new Date().toISOString())}</CardTitle>
            <Button onClick={() => submitAudit.mutate()} disabled={submitAudit.isPending}>
              <ClipboardList className="h-4 w-4 mr-2" />
              {submitAudit.isPending ? "Submitting..." : "Submit Audit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>System Count</TableHead>
                <TableHead>Physical Count</TableHead>
                <TableHead>Discrepancy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                (data?.products ?? []).map((p) => {
                  const physical = physicalCounts[p.productId];
                  const diff = physical !== undefined ? physical - p.systemCount : 0;
                  return (
                    <TableRow key={p.productId}>
                      <TableCell className="font-medium">{p.productName}</TableCell>
                      <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                      <TableCell>{formatNumber(p.systemCount)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          className="w-24"
                          placeholder={String(p.systemCount)}
                          value={physical ?? ""}
                          onChange={(e) => setPhysicalCounts((prev) => ({ ...prev, [p.productId]: Number(e.target.value) }))}
                        />
                      </TableCell>
                      <TableCell>
                        {physical !== undefined ? (
                          <span className={diff === 0 ? "text-green-600" : diff > 0 ? "text-blue-600" : "text-red-600"}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completed By</TableHead>
                <TableHead>Discrepancies</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.history ?? []).map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{formatDate(h.date)}</TableCell>
                  <TableCell>
                    <Badge variant={h.status === "COMPLETED" ? "default" : "secondary"}>{h.status}</Badge>
                  </TableCell>
                  <TableCell>{h.completedBy}</TableCell>
                  <TableCell>
                    <span className={h.discrepanciesCount > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                      {h.discrepanciesCount}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Batches Tab ──────────────────────────────────────────────────────────────

function BatchesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [form, setForm] = useState({ productId: "", batchNumber: "", expiryDate: "", qty: "", supplier: "" });

  const { data, isLoading } = useQuery<BatchEntry[]>({
    queryKey: ["inventory-batches", search],
    queryFn: async () => {
      const res = await api.get(`/inventory/batches?productName=${encodeURIComponent(search)}`);
      return res.data;
    },
  });

  const addBatch = useMutation({
    mutationFn: async () => {
      await api.post("/inventory/batches", { ...form, qty: Number(form.qty) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-batches"] });
      setOpen(false);
      setForm({ productId: "", batchNumber: "", expiryDate: "", qty: "", supplier: "" });
    },
  });

  useEffect(() => {
    if (open) {
      api.get("/products?limit=200").then((r) => setProducts(r.data?.data?.products ?? [])).catch(() => {});
    }
  }, [open]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Filter by product name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Batch
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Batch #</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Received Date</TableHead>
              <TableHead>Supplier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              (data ?? []).map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.productName}</TableCell>
                  <TableCell className="text-muted-foreground">{batch.batchNumber}</TableCell>
                  <TableCell>{formatDate(batch.expiryDate)}</TableCell>
                  <TableCell>{formatNumber(batch.qty)}</TableCell>
                  <TableCell>{formatDate(batch.receivedDate)}</TableCell>
                  <TableCell>{batch.supplier}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Product</label>
              <Select value={form.productId} onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select product..." /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Batch Number</label>
              <Input value={form.batchNumber} onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value }))} placeholder="BATCH-001" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Expiry Date</label>
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Quantity</label>
              <Input type="number" min={1} value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Supplier</label>
              <Input value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => addBatch.mutate()} disabled={!form.productId || !form.batchNumber || addBatch.isPending}>
              {addBatch.isPending ? "Saving..." : "Add Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Monitor stock levels, expiry, waste, and batches</p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap gap-1 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          <TabsTrigger value="expiring">Expiring</TabsTrigger>
          <TabsTrigger value="waste-log">Waste Log</TabsTrigger>
          <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
        <TabsContent value="low-stock" className="mt-6"><LowStockTab /></TabsContent>
        <TabsContent value="expiring" className="mt-6"><ExpiringTab /></TabsContent>
        <TabsContent value="waste-log" className="mt-6"><WasteLogTab /></TabsContent>
        <TabsContent value="adjustments" className="mt-6"><AdjustmentsTab /></TabsContent>
        <TabsContent value="audit" className="mt-6"><AuditTab /></TabsContent>
        <TabsContent value="batches" className="mt-6"><BatchesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
