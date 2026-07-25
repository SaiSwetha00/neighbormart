import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Star,
  Award,
  Gift,
  MessageSquare,
  Search,
  Copy,
  Check,
  ShoppingBag,
  TrendingUp,
  Crown,
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ChevronRight,
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
import { formatCurrency, formatDate, truncate } from "@/utils/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type CustomerTier = "SILVER" | "GOLD" | "PLATINUM";
type ComplaintStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
type GiftCardStatus = "ACTIVE" | "USED" | "EXPIRED";

interface CustomerSummary {
  id: string;
  userId: string;
  tier: CustomerTier;
  loyaltyPoints: number;
  totalSpend: number;
  totalOrders: number;
  createdAt: string;
  user: { name: string; email: string; phone: string };
}

interface CustomerOrder {
  id: string;
  total: number;
  createdAt: string;
  status: string;
}

interface CustomerDetail {
  id: string;
  tier: CustomerTier;
  loyaltyPoints: number;
  totalSpend: number;
  totalOrders: number;
  user: { name: string; email: string; phone: string; createdAt: string };
  addresses: Array<{ id: string; line1: string; city: string; state: string }>;
  orders: CustomerOrder[];
  complaints: Complaint[];
}

interface Segments {
  total: number;
  silver: number;
  gold: number;
  platinum: number;
  highValue: number;
  newCustomers: number;
}

interface Complaint {
  id: string;
  type: string;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
  customer: { user: { name: string; email: string } };
  order: { id: string; total: number } | null;
}

interface GiftCard {
  id: string;
  code: string;
  originalValue: number;
  currentBalance: number;
  status: GiftCardStatus;
  expiryDate: string | null;
  issuedTo: string | null;
}

// ─── Tier Badge ───────────────────────────────────────────────────────────────

const TIER_STYLES: Record<CustomerTier, string> = {
  SILVER: "bg-gray-100 text-gray-700 border border-gray-300",
  GOLD: "bg-amber-100 text-amber-700 border border-amber-300",
  PLATINUM: "bg-indigo-100 text-indigo-700 border border-indigo-400",
};

function TierBadge({ tier }: { tier: CustomerTier }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${TIER_STYLES[tier]}`}>
      {tier === "GOLD" && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
      {tier === "PLATINUM" && <Crown className="h-3 w-3" />}
      {tier}
    </span>
  );
}

// ─── Complaint Status Badge ───────────────────────────────────────────────────

const COMPLAINT_STATUS_STYLES: Record<ComplaintStatus, string> = {
  OPEN: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  RESOLVED: "bg-green-100 text-green-700",
};

const COMPLAINT_STATUS_ICONS: Record<ComplaintStatus, React.ReactNode> = {
  OPEN: <AlertCircle className="h-3 w-3" />,
  IN_PROGRESS: <Clock className="h-3 w-3" />,
  RESOLVED: <CheckCircle2 className="h-3 w-3" />,
};

function ComplaintStatusBadge({ status }: { status: ComplaintStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${COMPLAINT_STATUS_STYLES[status]}`}>
      {COMPLAINT_STATUS_ICONS[status]}
      {status.replace("_", " ")}
    </span>
  );
}

// ─── Gift Card Status Badge ───────────────────────────────────────────────────

const GIFT_CARD_STATUS_STYLES: Record<GiftCardStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  USED: "bg-gray-100 text-gray-600",
  EXPIRED: "bg-red-100 text-red-600",
};

function GiftCardStatusBadge({ status }: { status: GiftCardStatus }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${GIFT_CARD_STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 text-muted-foreground hover:text-foreground transition-colors"
      title="Copy code"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Add Points Dialog ────────────────────────────────────────────────────────

function AddPointsDialog({
  customerId,
  customerName,
  open,
  onClose,
}: {
  customerId: string;
  customerName: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ points: "", description: "" });

  const addPoints = useMutation({
    mutationFn: async () => {
      await api.post(`/crm/customers/${customerId}/loyalty`, {
        points: Number(form.points),
        type: "BONUS",
        description: form.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-customers"] });
      queryClient.invalidateQueries({ queryKey: ["crm-customer", customerId] });
      onClose();
      setForm({ points: "", description: "" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Loyalty Points</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Adding bonus points for <strong>{customerName}</strong></p>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Points to Add</label>
            <Input
              type="number"
              min={1}
              value={form.points}
              onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))}
              placeholder="e.g. 100"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Loyalty bonus for feedback"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => addPoints.mutate()}
            disabled={!form.points || Number(form.points) < 1 || addPoints.isPending}
          >
            {addPoints.isPending ? "Adding..." : "Add Points"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Customer Detail Panel ────────────────────────────────────────────────────

function CustomerDetailDialog({
  customerId,
  open,
  onClose,
}: {
  customerId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [addPointsOpen, setAddPointsOpen] = useState(false);

  const { data: customer, isLoading } = useQuery<CustomerDetail>({
    queryKey: ["crm-customer", customerId],
    queryFn: async () => {
      const res = await api.get(`/crm/customers/${customerId}`);
      return res.data?.data ?? res.data;
    },
    enabled: open && !!customerId,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : customer ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-semibold">{customer.user.name}</h2>
                    <TierBadge tier={customer.tier} />
                  </div>
                  <p className="text-sm text-muted-foreground">{customer.user.email}</p>
                  {customer.user.phone && (
                    <p className="text-sm text-muted-foreground">{customer.user.phone}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Member since {formatDate(customer.user.createdAt)}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAddPointsOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Points
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Loyalty Points</p>
                  <p className="text-xl font-bold text-indigo-600">{customer.loyaltyPoints.toLocaleString()}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Spend</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(customer.totalSpend)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="text-xl font-bold">{customer.totalOrders}</p>
                </div>
              </div>

              {/* Addresses */}
              {customer.addresses?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Saved Addresses</h3>
                  <div className="space-y-1.5">
                    {customer.addresses.map((addr) => (
                      <p key={addr.id} className="text-sm text-muted-foreground">
                        {addr.line1}, {addr.city}, {addr.state}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Order History */}
              {customer.orders?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Recent Orders</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customer.orders.slice(0, 8).map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}…</TableCell>
                          <TableCell className="text-sm">{formatDate(order.createdAt)}</TableCell>
                          <TableCell>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                              {order.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Failed to load customer details.</p>
          )}
        </DialogContent>
      </Dialog>

      {customer && (
        <AddPointsDialog
          customerId={customerId}
          customerName={customer.user.name}
          open={addPointsOpen}
          onClose={() => setAddPointsOpen(false)}
        />
      )}
    </>
  );
}

// ─── Customers Tab ────────────────────────────────────────────────────────────

function CustomersTab() {
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: segments, isLoading: segLoading } = useQuery<Segments>({
    queryKey: ["crm-segments"],
    queryFn: async () => {
      const res = await api.get("/crm/segments");
      return res.data?.data ?? res.data;
    },
  });

  const { data, isLoading } = useQuery<{ customers: CustomerSummary[]; pagination: unknown }>({
    queryKey: ["crm-customers", page, tier, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (tier !== "ALL") params.set("tier", tier);
      if (search) params.set("search", search);
      const res = await api.get(`/crm/customers?${params}`);
      const raw = res.data?.data ?? res.data;
      return raw;
    },
  });

  const customers = data?.customers ?? [];

  const segmentChips = [
    { label: "Total", value: segments?.total, icon: <Users className="h-4 w-4" />, color: "text-blue-600" },
    { label: "Silver", value: segments?.silver, icon: <Star className="h-4 w-4" />, color: "text-gray-600" },
    { label: "Gold", value: segments?.gold, icon: <Star className="h-4 w-4 fill-amber-400 text-amber-400" />, color: "text-amber-700" },
    { label: "Platinum", value: segments?.platinum, icon: <Crown className="h-4 w-4" />, color: "text-indigo-700" },
    { label: "High Value", value: segments?.highValue, icon: <TrendingUp className="h-4 w-4" />, color: "text-green-700" },
  ];

  return (
    <div className="space-y-5">
      {/* Segment summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {segmentChips.map((chip) => (
          <Card key={chip.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <span className={chip.color}>{chip.icon}</span>
              <div>
                <p className="text-xs text-muted-foreground">{chip.label}</p>
                {segLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className={`text-xl font-bold ${chip.color}`}>{(chip.value ?? 0).toLocaleString()}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select
          value={tier}
          onValueChange={(v) => { setTier(v); setPage(1); }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Tiers</SelectItem>
            <SelectItem value="SILVER">Silver</SelectItem>
            <SelectItem value="GOLD">Gold</SelectItem>
            <SelectItem value="PLATINUM">Platinum</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Points</TableHead>
              <TableHead className="text-right">Total Spend</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setSelectedId(c.id)}
                >
                  <TableCell className="font-medium">{c.user.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.user.email}</TableCell>
                  <TableCell><TierBadge tier={c.tier} /></TableCell>
                  <TableCell className="text-right font-medium text-indigo-700">
                    {c.loyaltyPoints.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(c.totalSpend)}</TableCell>
                  <TableCell className="text-right">{c.totalOrders}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Page {page}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={customers.length < 20}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Detail Dialog */}
      {selectedId && (
        <CustomerDetailDialog
          customerId={selectedId}
          open={!!selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

// ─── Resolve Complaint Dialog ─────────────────────────────────────────────────

function ResolveComplaintDialog({
  complaint,
  open,
  onClose,
}: {
  complaint: Complaint;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const resolve = useMutation({
    mutationFn: async () => {
      await api.patch(`/crm/complaints/${complaint.id}`, {
        status: "RESOLVED",
        resolutionNote: note,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-complaints"] });
      onClose();
      setNote("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve Complaint</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p className="font-medium">{complaint.customer.user.name}</p>
            <p className="text-muted-foreground">{complaint.type}</p>
            <p>{complaint.description}</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Resolution Note</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm resize-none h-24 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe how the complaint was resolved..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => resolve.mutate()}
            disabled={resolve.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {resolve.isPending ? "Resolving..." : "Mark Resolved"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Complaints Tab ───────────────────────────────────────────────────────────

function ComplaintsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [resolveTarget, setResolveTarget] = useState<Complaint | null>(null);

  const { data, isLoading } = useQuery<{ complaints: Complaint[] }>({
    queryKey: ["crm-complaints", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await api.get(`/crm/complaints?${params}`);
      return res.data?.data ?? res.data;
    },
  });

  const complaints = data?.complaints ?? [];

  const statusTabs: { label: string; value: string }[] = [
    { label: "All", value: "ALL" },
    { label: "Open", value: "OPEN" },
    { label: "In Progress", value: "IN_PROGRESS" },
    { label: "Resolved", value: "RESOLVED" },
  ];

  return (
    <div className="space-y-5">
      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {statusTabs.map((s) => (
          <Button
            key={s.value}
            variant={statusFilter === s.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : complaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No complaints found
                </TableCell>
              </TableRow>
            ) : (
              complaints.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{c.customer.user.name}</p>
                      <p className="text-xs text-muted-foreground">{c.customer.user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{c.type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[220px]">
                    {truncate(c.description, 80)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.order ? `#${c.order.id.slice(0, 8)}` : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(c.createdAt)}</TableCell>
                  <TableCell><ComplaintStatusBadge status={c.status} /></TableCell>
                  <TableCell>
                    {c.status !== "RESOLVED" && (
                      <Button size="sm" variant="outline" onClick={() => setResolveTarget(c)}>
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {resolveTarget && (
        <ResolveComplaintDialog
          complaint={resolveTarget}
          open={!!resolveTarget}
          onClose={() => setResolveTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Issue Gift Card Dialog ───────────────────────────────────────────────────

function IssueGiftCardDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ originalValue: "", issuedTo: "", expiryDate: "" });

  const issue = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { originalValue: Number(form.originalValue) };
      if (form.issuedTo) payload.issuedTo = form.issuedTo;
      if (form.expiryDate) payload.expiryDate = form.expiryDate;
      await api.post("/crm/gift-cards", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-gift-cards"] });
      onClose();
      setForm({ originalValue: "", issuedTo: "", expiryDate: "" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Issue Gift Card</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Value ($) *</label>
            <Input
              type="number"
              min={1}
              step={0.01}
              value={form.originalValue}
              onChange={(e) => setForm((f) => ({ ...f, originalValue: e.target.value }))}
              placeholder="e.g. 25.00"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Issue To (email, optional)</label>
            <Input
              type="email"
              value={form.issuedTo}
              onChange={(e) => setForm((f) => ({ ...f, issuedTo: e.target.value }))}
              placeholder="customer@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Expiry Date (optional)</label>
            <Input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => issue.mutate()}
            disabled={!form.originalValue || Number(form.originalValue) < 1 || issue.isPending}
          >
            {issue.isPending ? "Issuing..." : "Issue Gift Card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Gift Cards Tab ───────────────────────────────────────────────────────────

function GiftCardsTab() {
  const [issueOpen, setIssueOpen] = useState(false);

  const { data, isLoading } = useQuery<{ giftCards: GiftCard[] }>({
    queryKey: ["crm-gift-cards"],
    queryFn: async () => {
      const res = await api.get("/crm/gift-cards");
      return res.data?.data ?? res.data;
    },
  });

  const giftCards = data?.giftCards ?? [];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setIssueOpen(true)}>
          <Gift className="h-4 w-4 mr-2" /> Issue Gift Card
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Original Value</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Issued To</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : giftCards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No gift cards issued yet
                </TableCell>
              </TableRow>
            ) : (
              giftCards.map((gc) => (
                <TableRow key={gc.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-sm font-medium tracking-wider">{gc.code}</span>
                      <CopyButton text={gc.code} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(gc.originalValue)}</TableCell>
                  <TableCell className="text-right font-medium text-green-700">
                    {formatCurrency(gc.currentBalance)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {gc.issuedTo ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {gc.expiryDate ? formatDate(gc.expiryDate) : "No expiry"}
                  </TableCell>
                  <TableCell><GiftCardStatusBadge status={gc.status} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <IssueGiftCardDialog open={issueOpen} onClose={() => setIssueOpen(false)} />
    </div>
  );
}

// ─── Loyalty Config Tab ───────────────────────────────────────────────────────

function LoyaltyConfigTab() {
  const tiers = [
    {
      name: "Silver",
      range: "0 – 499 points",
      icon: <Star className="h-8 w-8 text-gray-500" />,
      color: "border-gray-200 bg-gray-50 dark:bg-gray-900/30",
      accent: "text-gray-700 dark:text-gray-300",
      badge: "bg-gray-100 text-gray-700",
      benefits: [
        "Early access to weekly deals",
        "Birthday bonus: 50 bonus points",
        "Priority customer support",
        "Monthly newsletter with exclusive tips",
      ],
    },
    {
      name: "Gold",
      range: "500 – 1,999 points",
      icon: <Star className="h-8 w-8 fill-amber-400 text-amber-400" />,
      color: "border-amber-200 bg-amber-50 dark:bg-amber-900/20",
      accent: "text-amber-700 dark:text-amber-400",
      badge: "bg-amber-100 text-amber-700",
      benefits: [
        "All Silver benefits",
        "2× points on weekend purchases",
        "Birthday bonus: 150 bonus points",
        "Free delivery on orders over $30",
        "Exclusive Gold member offers",
      ],
    },
    {
      name: "Platinum",
      range: "2,000+ points",
      icon: <Crown className="h-8 w-8 text-indigo-600" />,
      color: "border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20",
      accent: "text-indigo-700 dark:text-indigo-400",
      badge: "bg-indigo-100 text-indigo-700",
      benefits: [
        "All Gold benefits",
        "3× points on every purchase",
        "Birthday bonus: 500 bonus points",
        "Free delivery on all orders",
        "Dedicated Platinum support line",
        "First access to new products",
        "Exclusive Platinum-only promotions",
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
        <Zap className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Automatic Tier Assignment</p>
          <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">
            Customer tiers are automatically assigned based on accumulated loyalty points earned from purchases.
            Tiers update in real-time as customers accumulate or spend points.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tiers.map((tier) => (
          <Card key={tier.name} className={`border-2 ${tier.color}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                {tier.icon}
                <div>
                  <CardTitle className={`text-xl ${tier.accent}`}>{tier.name}</CardTitle>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tier.badge}`}>
                    {tier.range}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {tier.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${tier.accent}`} />
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                Automatically assigned when customer reaches {tier.range.split(" – ")[0].replace("0", "0")} loyalty points.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-muted/40 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ShoppingBag className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">How Points Are Earned</p>
            <p>Customers earn 1 loyalty point per $1 spent on qualifying purchases.</p>
            <p>Bonus points can be awarded manually by store owners for exceptional feedback, referrals, or promotional events.</p>
            <p>Points do not expire as long as the account remains active.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customer Management</h1>
        <p className="text-muted-foreground">Manage customers, complaints, gift cards, and loyalty program</p>
      </div>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers" className="flex items-center gap-1.5">
            <Users className="h-4 w-4" /> Customers
          </TabsTrigger>
          <TabsTrigger value="complaints" className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" /> Complaints
          </TabsTrigger>
          <TabsTrigger value="gift-cards" className="flex items-center gap-1.5">
            <Gift className="h-4 w-4" /> Gift Cards
          </TabsTrigger>
          <TabsTrigger value="loyalty-config" className="flex items-center gap-1.5">
            <Award className="h-4 w-4" /> Loyalty Config
          </TabsTrigger>
        </TabsList>
        <TabsContent value="customers" className="mt-6">
          <CustomersTab />
        </TabsContent>
        <TabsContent value="complaints" className="mt-6">
          <ComplaintsTab />
        </TabsContent>
        <TabsContent value="gift-cards" className="mt-6">
          <GiftCardsTab />
        </TabsContent>
        <TabsContent value="loyalty-config" className="mt-6">
          <LoyaltyConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
