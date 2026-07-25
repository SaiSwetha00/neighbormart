import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Star,
  Truck,
  Phone,
  Mail,
  MapPin,
  User,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Search,
  PackageCheck,
  AlertCircle,
  CreditCard,
  BarChart2,
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
import { formatCurrency, formatDate, formatNumber } from "@/utils/format";
import { useSearchParams } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string;
  leadTimeDays: number;
  notes: string;
  rating: number;
  activePOsCount: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: "DRAFT" | "SENT" | "RECEIVED" | "PARTIAL" | "CANCELLED";
  expectedDate: string;
  itemCount: number;
  createdAt: string;
  totalAmount: number;
}

interface POItem {
  productId: string;
  productName: string;
  orderedQty: number;
  unitPrice: number;
  receivedQty?: number;
  batchNumber?: string;
  expiryDate?: string;
}

interface PODetail {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: string;
  expectedDate: string;
  notes: string;
  items: POItem[];
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference: string;
  notes: string;
  supplierId: string;
  supplierName: string;
}

interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  onTimeDeliveryPct: number;
  avgLeadTimeDays: number;
  discrepancyRatePct: number;
  totalOrders: number;
  totalSpend: number;
  rating: number;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
        />
      ))}
    </div>
  );
}

// ─── PO Status Badge ──────────────────────────────────────────────────────────

const PO_STATUS_VARIANTS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  RECEIVED: "bg-green-100 text-green-700",
  PARTIAL: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function POStatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PO_STATUS_VARIANTS[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

// ─── Supplier Slide-Over (Sheet) Form ─────────────────────────────────────────

function SupplierForm({
  open,
  onClose,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  initialData?: Partial<Supplier>;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "", contactPerson: "", phone: "", email: "",
    address: "", paymentTerms: "", leadTimeDays: "7", notes: "",
    ...initialData,
    leadTimeDays: String(initialData?.leadTimeDays ?? 7),
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, leadTimeDays: Number(form.leadTimeDays) };
      if (initialData?.id) {
        await api.put(`/suppliers/${initialData.id}`, payload);
      } else {
        await api.post("/suppliers", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      onClose();
    },
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-background shadow-xl overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initialData?.id ? "Edit Supplier" : "Add Supplier"}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Name *</label>
            <Input value={form.name} onChange={set("name")} placeholder="Supplier name" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Contact Person</label>
            <Input value={form.contactPerson} onChange={set("contactPerson")} placeholder="Contact name" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Phone</label>
            <Input value={form.phone} onChange={set("phone")} placeholder="+1-555-0000" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <Input type="email" value={form.email} onChange={set("email")} placeholder="supplier@example.com" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Address</label>
            <Input value={form.address} onChange={set("address")} placeholder="123 Supply St..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Payment Terms</label>
            <Input value={form.paymentTerms} onChange={set("paymentTerms")} placeholder="Net 30, COD, etc." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Lead Time (days)</label>
            <Input type="number" min={1} value={form.leadTimeDays} onChange={set("leadTimeDays")} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Notes</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm resize-none h-24 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.notes}
              onChange={set("notes")}
              placeholder="Additional notes..."
            />
          </div>
        </div>
        <div className="p-6 border-t flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>
            {save.isPending ? "Saving..." : "Save Supplier"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Suppliers Tab ─────────────────────────────────────────────────────────────

function SuppliersTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await api.get("/suppliers");
      return res.data?.data ?? [];
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setDeleteId(null);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditSupplier(undefined); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Supplier
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data ?? []).map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-base">{s.name}</h3>
                    <StarRating rating={s.rating} />
                  </div>
                  {s.activePOsCount > 0 && (
                    <Badge variant="secondary">{s.activePOsCount} active POs</Badge>
                  )}
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {s.contactPerson && (
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5" /> {s.contactPerson}
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" /> {s.phone}
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" /> {s.email}
                    </div>
                  )}
                  {s.notes && (
                    <p className="text-xs line-clamp-2 mt-2 text-muted-foreground">{s.notes}</p>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setEditSupplier(s); setFormOpen(true); }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200"
                    onClick={() => setDeleteId(s.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SupplierForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditSupplier(undefined); }}
        initialData={editSupplier}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the supplier and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && deleteSupplier.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Receive Goods Dialog ─────────────────────────────────────────────────────

function ReceiveGoodsDialog({ po, onClose }: { po: PODetail; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<POItem[]>(po.items.map((i) => ({ ...i, receivedQty: i.orderedQty, batchNumber: "", expiryDate: "" })));

  const receive = useMutation({
    mutationFn: async () => {
      await api.post(`/purchase-orders/${po.id}/receive`, { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      onClose();
    },
  });

  const updateItem = (idx: number, field: keyof POItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Receive Goods — {po.poNumber}</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Received Qty</TableHead>
                <TableHead>Batch #</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Discrepancy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => {
                const diff = (item.receivedQty ?? 0) - item.orderedQty;
                return (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>{formatNumber(item.orderedQty)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="w-24"
                        value={item.receivedQty ?? ""}
                        onChange={(e) => updateItem(idx, "receivedQty", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="w-28"
                        value={item.batchNumber ?? ""}
                        onChange={(e) => updateItem(idx, "batchNumber", e.target.value)}
                        placeholder="Batch #"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        className="w-36"
                        value={item.expiryDate ?? ""}
                        onChange={(e) => updateItem(idx, "expiryDate", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      {diff !== 0 && (
                        <span className="text-red-600 font-medium text-sm">{diff > 0 ? `+${diff}` : diff}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => receive.mutate()} disabled={receive.isPending}>
            <PackageCheck className="h-4 w-4 mr-2" />
            {receive.isPending ? "Confirming..." : "Confirm Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create PO Wizard ─────────────────────────────────────────────────────────

interface POLineItem { productId: string; productName: string; qty: number; unitPrice: number; }

function CreatePOWizard({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [supplierId, setSupplierId] = useState("");
  const [lineItems, setLineItems] = useState<POLineItem[]>([]);
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => (await api.get("/suppliers")).data?.data ?? [],
  });

  useEffect(() => {
    api.get(`/products?search=${encodeURIComponent(productSearch)}&limit=50`)
      .then((r) => setProducts(r.data?.data?.products ?? []))
      .catch(() => {});
  }, [productSearch]);

  const createPO = useMutation({
    mutationFn: async () => {
      await api.post("/purchase-orders", {
        supplierId,
        expectedDate,
        notes,
        items: lineItems.map((l) => ({ productId: l.productId, qty: l.qty, unitPrice: l.unitPrice })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      onClose();
    },
  });

  const total = lineItems.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const selectedSupplier = suppliers?.find((s) => s.id === supplierId);

  const addProduct = (p: ProductOption) => {
    if (!lineItems.find((l) => l.productId === p.id)) {
      setLineItems((prev) => [...prev, { productId: p.id, productName: p.name, qty: 1, unitPrice: 0 }]);
    }
  };

  const updateLine = (id: string, field: "qty" | "unitPrice", value: number) => {
    setLineItems((prev) => prev.map((l) => l.productId === id ? { ...l, [field]: value } : l));
  };

  const removeLine = (id: string) => setLineItems((prev) => prev.filter((l) => l.productId !== id));

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Purchase Order — Step {step} of 4</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            <p className="text-sm text-muted-foreground">Select a supplier for this PO</p>
            {(suppliers ?? []).map((s) => (
              <div
                key={s.id}
                onClick={() => setSupplierId(s.id)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${supplierId === s.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.contactPerson} · Lead time: {s.leadTimeDays} days</p>
                  </div>
                  <StarRating rating={s.rating} />
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search products..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
            </div>
            {productSearch && (
              <div className="border rounded-md max-h-32 overflow-y-auto">
                {products.map((p) => (
                  <div key={p.id} className="px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm" onClick={() => addProduct(p)}>
                    {p.name} <span className="text-muted-foreground">({p.sku})</span>
                  </div>
                ))}
              </div>
            )}
            {lineItems.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((l) => (
                    <TableRow key={l.productId}>
                      <TableCell className="font-medium">{l.productName}</TableCell>
                      <TableCell>
                        <Input type="number" min={1} className="w-20" value={l.qty} onChange={(e) => updateLine(l.productId, "qty", Number(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0} step={0.01} className="w-24" value={l.unitPrice} onChange={(e) => updateLine(l.productId, "unitPrice", Number(e.target.value))} />
                      </TableCell>
                      <TableCell>{formatCurrency(l.qty * l.unitPrice)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeLine(l.productId)}>✕</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-semibold">Total</TableCell>
                    <TableCell className="font-bold">{formatCurrency(total)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Expected Delivery Date</label>
              <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm resize-none h-28 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions..."
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Supplier</span><span className="font-medium">{selectedSupplier?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Expected Date</span><span>{formatDate(expectedDate)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Items</span><span>{lineItems.length}</span></div>
              <div className="flex justify-between font-semibold"><span>Total Amount</span><span>{formatCurrency(total)}</span></div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((l) => (
                  <TableRow key={l.productId}>
                    <TableCell>{l.productName}</TableCell>
                    <TableCell>{l.qty}</TableCell>
                    <TableCell>{formatCurrency(l.unitPrice)}</TableCell>
                    <TableCell>{formatCurrency(l.qty * l.unitPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>Back</Button>
          )}
          {step < 4 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={(step === 1 && !supplierId) || (step === 2 && lineItems.length === 0) || (step === 3 && !expectedDate)}
            >
              Next
            </Button>
          ) : (
            <Button onClick={() => createPO.mutate()} disabled={createPO.isPending}>
              {createPO.isPending ? "Creating..." : "Create Order"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Purchase Orders Tab ───────────────────────────────────────────────────────

function PurchaseOrdersTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const [receiveId, setReceiveId] = useState<string | null>(null);
  const [receivePO, setReceivePO] = useState<PODetail | null>(null);

  const { data, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["purchase-orders"],
    queryFn: async () => (await api.get("/purchase-orders")).data?.data ?? [],
  });

  const handleReceive = async (id: string) => {
    const res = await api.get(`/purchase-orders/${id}`);
    setReceivePO(res.data?.data ?? res.data);
    setReceiveId(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create PO
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expected Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Total</TableHead>
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
              (data ?? []).map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono font-medium">{po.poNumber}</TableCell>
                  <TableCell>{po.supplierName}</TableCell>
                  <TableCell><POStatusBadge status={po.status} /></TableCell>
                  <TableCell>{formatDate(po.expectedDate)}</TableCell>
                  <TableCell>{po.itemCount}</TableCell>
                  <TableCell>{formatDate(po.createdAt)}</TableCell>
                  <TableCell>{formatCurrency(po.totalAmount)}</TableCell>
                  <TableCell>
                    {(po.status === "SENT" || po.status === "PARTIAL") && (
                      <Button size="sm" variant="outline" onClick={() => handleReceive(po.id)}>
                        <PackageCheck className="h-3.5 w-3.5 mr-1" /> Receive
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {createOpen && <CreatePOWizard onClose={() => setCreateOpen(false)} />}
      {receiveId && receivePO && (
        <ReceiveGoodsDialog po={receivePO} onClose={() => { setReceiveId(null); setReceivePO(null); }} />
      )}
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab() {
  const queryClient = useQueryClient();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [form, setForm] = useState({ supplierId: "", amount: "", date: "", method: "BANK_TRANSFER", reference: "", notes: "" });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => (await api.get("/suppliers")).data?.data ?? [],
  });

  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ["supplier-payments"],
    queryFn: async () => (await api.get("/suppliers/payments")).data?.data ?? [],
  });

  const logPayment = useMutation({
    mutationFn: async () => {
      await api.post(`/suppliers/${form.supplierId}/payments`, { ...form, amount: Number(form.amount) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-payments"] });
      setPaymentOpen(false);
      setForm({ supplierId: "", amount: "", date: "", method: "BANK_TRANSFER", reference: "", notes: "" });
    },
  });

  const paymentsBySupplier = (payments ?? []).reduce<Record<string, Payment[]>>((acc, p) => {
    if (!acc[p.supplierId]) acc[p.supplierId] = [];
    acc[p.supplierId].push(p);
    return acc;
  }, {});

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setPaymentOpen(true)}>
          <CreditCard className="h-4 w-4 mr-2" /> Log Payment
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        Object.entries(paymentsBySupplier).map(([supplierId, items]) => {
          const supplierName = items[0]?.supplierName ?? "Unknown";
          const totalPaid = items.reduce((s, p) => s + p.amount, 0);
          return (
            <div key={supplierId}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-base">{supplierName}</h3>
                <span className="text-sm text-muted-foreground">Total Paid: {formatCurrency(totalPaid)}</span>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.date)}</TableCell>
                        <TableCell className="font-medium text-green-700">{formatCurrency(p.amount)}</TableCell>
                        <TableCell>{p.method.replace(/_/g, " ")}</TableCell>
                        <TableCell className="font-mono text-sm">{p.reference}</TableCell>
                        <TableCell className="text-muted-foreground">{p.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          );
        })
      )}

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Supplier</label>
              <Select value={form.supplierId} onValueChange={(v) => setForm((f) => ({ ...f, supplierId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select supplier..." /></SelectTrigger>
                <SelectContent>
                  {(suppliers ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Amount ($)</label>
              <Input type="number" min={0} step={0.01} value={form.amount} onChange={set("amount")} placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Input type="date" value={form.date} onChange={set("date")} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Payment Method</label>
              <Select value={form.method} onValueChange={(v) => setForm((f) => ({ ...f, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Reference</label>
              <Input value={form.reference} onChange={set("reference")} placeholder="TXN-001" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Input value={form.notes} onChange={set("notes")} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button onClick={() => logPayment.mutate()} disabled={!form.supplierId || !form.amount || !form.date || logPayment.isPending}>
              {logPayment.isPending ? "Saving..." : "Log Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Performance Tab ───────────────────────────────────────────────────────────

function PerformanceTab() {
  const { data, isLoading } = useQuery<SupplierPerformance[]>({
    queryKey: ["supplier-performance"],
    queryFn: async () => (await api.get("/suppliers/performance")).data?.data ?? [],
  });

  const pct = (v: number) => `${v.toFixed(1)}%`;

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-36 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data ?? []).map((s) => (
            <Card key={s.supplierId}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold">{s.supplierName}</h3>
                    <StarRating rating={s.rating} />
                  </div>
                  <Badge variant="secondary">{s.totalOrders} orders</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs">On-Time Delivery</p>
                    <p className="text-lg font-bold text-green-700">{pct(s.onTimeDeliveryPct)}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs">Avg Lead Time</p>
                    <p className="text-lg font-bold text-blue-700">{s.avgLeadTimeDays} days</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs">Discrepancy Rate</p>
                    <p className="text-lg font-bold text-red-700">{pct(s.discrepancyRatePct)}</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs">Total Spend</p>
                    <p className="text-lg font-bold text-purple-700">{formatCurrency(s.totalSpend)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "suppliers";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suppliers & Purchasing</h1>
        <p className="text-muted-foreground">Manage suppliers, purchase orders, payments, and performance</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>
        <TabsContent value="suppliers" className="mt-6"><SuppliersTab /></TabsContent>
        <TabsContent value="purchase-orders" className="mt-6"><PurchaseOrdersTab /></TabsContent>
        <TabsContent value="payments" className="mt-6"><PaymentsTab /></TabsContent>
        <TabsContent value="performance" className="mt-6"><PerformanceTab /></TabsContent>
      </Tabs>
    </div>
  );
}
