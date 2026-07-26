import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Key,
  UserCheck,
  UserX,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  Shield,
  UserCog,
  Eye,
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
import { formatDate } from "@/utils/format";
import { Link } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

type Permission =
  | "VIEW_REPORTS"
  | "MANAGE_INVENTORY"
  | "MANAGE_STAFF"
  | "MANAGE_PRODUCTS"
  | "MANAGE_ORDERS"
  | "MANAGE_SUPPLIERS"
  | "MANAGE_PROMOTIONS"
  | "VIEW_FINANCIALS";

const ALL_PERMISSIONS: { key: Permission; label: string }[] = [
  { key: "VIEW_REPORTS", label: "View Reports" },
  { key: "MANAGE_INVENTORY", label: "Manage Inventory" },
  { key: "MANAGE_STAFF", label: "Manage Staff" },
  { key: "MANAGE_PRODUCTS", label: "Manage Products" },
  { key: "MANAGE_ORDERS", label: "Manage Orders" },
  { key: "MANAGE_SUPPLIERS", label: "Manage Suppliers" },
  { key: "MANAGE_PROMOTIONS", label: "Manage Promotions" },
  { key: "VIEW_FINANCIALS", label: "View Financials" },
];

interface Manager {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "ACTIVE" | "SUSPENDED";
  permissions: Permission[];
  dateAdded: string;
  avatarUrl?: string;
}

type StaffPosition = "CASHIER" | "STOCK" | "SUPERVISOR" | "DELI" | "BAKER";
type ShiftType = "MORNING" | "EVENING" | "FULL_DAY" | "SPLIT";

interface StaffMember {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  position: StaffPosition;
  shiftType: ShiftType;
  status: "ACTIVE" | "INACTIVE" | "TERMINATED";
  dateJoined: string;
  notes?: string;
  avatarUrl?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POSITION_COLORS: Record<StaffPosition, string> = {
  CASHIER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  STOCK: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  SUPERVISOR: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  DELI: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  BAKER: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
};

const STATUS_VARIANTS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  SUSPENDED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  INACTIVE: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  TERMINATED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, url, size = "sm" }: { name: string; url?: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-base";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  if (url) {
    return <img src={url} alt={name} className={`${sz} rounded-full object-cover`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-primary/10 text-primary font-medium flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ─── Permissions Dialog ────────────────────────────────────────────────────────

function PermissionsDialog({
  manager,
  onClose,
}: {
  manager: Manager;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [perms, setPerms] = useState<Permission[]>(manager.permissions);

  const save = useMutation({
    mutationFn: async () => {
      await api.put(`/managers/${manager.id}/permissions`, { permissions: perms });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      onClose();
    },
  });

  const toggle = (p: Permission) => {
    setPerms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permissions — {manager.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {ALL_PERMISSIONS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={perms.includes(key)}
                onChange={() => toggle(key)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">{label}</span>
              {perms.includes(key) ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground ml-auto" />
              )}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving..." : "Save Permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manager Form (Slide-Over) ─────────────────────────────────────────────────

function ManagerForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Manager;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    password: "",
    permissions: initial?.permissions ?? [] as Permission[],
  });

  const save = useMutation({
    mutationFn: async () => {
      if (initial?.id) {
        await api.put(`/managers/${initial.id}`, { name: form.name, email: form.email, phone: form.phone, permissions: form.permissions });
      } else {
        await api.post("/managers", form);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      onClose();
    },
  });

  const togglePerm = (p: Permission) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p],
    }));
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-background shadow-xl overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial?.id ? "Edit Manager" : "Add Manager"}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Full Name *</label>
            <Input value={form.name} onChange={set("name")} placeholder="Jane Smith" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Email *</label>
            <Input type="email" value={form.email} onChange={set("email")} placeholder="jane@store.com" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Phone</label>
            <Input value={form.phone} onChange={set("phone")} placeholder="+1-555-0000" />
          </div>
          {!initial?.id && (
            <div>
              <label className="text-sm font-medium mb-1 block">Password *</label>
              <Input type="password" value={form.password} onChange={set("password")} placeholder="Temporary password" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-2 block">Permissions</label>
            <div className="space-y-2 border rounded-lg p-3">
              {ALL_PERMISSIONS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(key)}
                    onChange={() => togglePerm(key)}
                    className="h-4 w-4"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 border-t flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!form.name || !form.email || save.isPending}>
            {save.isPending ? "Saving..." : "Save Manager"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Managers Tab ─────────────────────────────────────────────────────────────

function ManagersTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editManager, setEditManager] = useState<Manager | undefined>();
  const [permManager, setPermManager] = useState<Manager | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<Manager[]>({
    queryKey: ["managers"],
    queryFn: async () => {
      const res = await api.get("/managers");
      const raw = res.data?.data ?? res.data;
      return (raw.managers ?? []).map((m: any) => ({
        id: m.id,
        name: m.user?.name ?? "Unknown",
        email: m.user?.email ?? "",
        phone: m.user?.phone ?? "",
        status: m.status,
        permissions: Array.isArray(m.permissions)
          ? m.permissions
          : Object.entries(m.permissions ?? {}).filter(([, v]) => v).map(([k]) => k as Permission),
        dateAdded: m.createdAt,
      })) as Manager[];
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/managers/${id}/status`, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["managers"] }),
  });

  const resetPassword = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/managers/${id}/reset-password`);
    },
  });

  const deleteManager = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/managers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      setDeleteId(null);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditManager(undefined); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Manager
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Manager</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              (data ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} url={m.avatarUrl} />
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.phone || "—"}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_VARIANTS[m.status]}`}>
                      {m.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {m.permissions.slice(0, 3).map((p) => (
                        <span key={p} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          {p.replace(/_/g, " ")}
                        </span>
                      ))}
                      {m.permissions.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{m.permissions.length - 3} more</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(m.dateAdded)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" title="Edit" onClick={() => { setEditManager(m); setFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Permissions" onClick={() => setPermManager(m)}>
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Reset Password"
                        onClick={() => resetPassword.mutate(m.id)}
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title={m.status === "ACTIVE" ? "Suspend" : "Activate"}
                        onClick={() => toggleStatus.mutate({ id: m.id, status: m.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })}
                      >
                        {m.status === "ACTIVE" ? (
                          <UserX className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button size="sm" variant="ghost" title="Delete" className="text-red-600" onClick={() => setDeleteId(m.id)}>
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

      <ManagerForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditManager(undefined); }}
        initial={editManager}
      />

      {permManager && (
        <PermissionsDialog manager={permManager} onClose={() => setPermManager(null)} />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Manager?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the manager account.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && deleteManager.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Staff Form ───────────────────────────────────────────────────────────────

function StaffForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: StaffMember;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    position: initial?.position ?? "CASHIER" as StaffPosition,
    shiftType: initial?.shiftType ?? "MORNING" as ShiftType,
    dateJoined: initial?.dateJoined?.split("T")[0] ?? new Date().toISOString().split("T")[0],
    notes: initial?.notes ?? "",
  });

  const [nextEmpId, setNextEmpId] = useState<string>("EMP-...");

  useEffect(() => {
    if (!initial?.id) {
      api.get("/staff/next-employee-id").then((r) => setNextEmpId(r.data?.data?.employeeId ?? "EMP-...")).catch(() => {});
    } else {
      setNextEmpId(initial.employeeId);
    }
  }, [initial]);

  const save = useMutation({
    mutationFn: async () => {
      if (initial?.id) {
        await api.put(`/staff/${initial.id}`, form);
      } else {
        await api.post("/staff", form);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
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
          <h2 className="text-lg font-semibold">{initial?.id ? "Edit Staff" : "Add Staff"}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Employee ID</label>
            <Input value={nextEmpId} disabled className="bg-muted font-mono" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Full Name *</label>
            <Input value={form.name} onChange={set("name")} placeholder="John Doe" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Email *</label>
            <Input type="email" value={form.email} onChange={set("email")} placeholder="john@store.com" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Phone</label>
            <Input value={form.phone} onChange={set("phone")} placeholder="+1-555-0000" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Position</label>
            <Select value={form.position} onValueChange={(v) => setForm((f) => ({ ...f, position: v as StaffPosition }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASHIER">Cashier</SelectItem>
                <SelectItem value="STOCK">Stock</SelectItem>
                <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                <SelectItem value="DELI">Deli</SelectItem>
                <SelectItem value="BAKER">Baker</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Shift Type</label>
            <Select value={form.shiftType} onValueChange={(v) => setForm((f) => ({ ...f, shiftType: v as ShiftType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MORNING">Morning</SelectItem>
                <SelectItem value="EVENING">Evening</SelectItem>
                <SelectItem value="FULL_DAY">Full Day</SelectItem>
                <SelectItem value="SPLIT">Split</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Date Joined</label>
            <Input type="date" value={form.dateJoined} onChange={set("dateJoined")} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Notes</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm resize-none h-20 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.notes}
              onChange={set("notes")}
              placeholder="Additional notes..."
            />
          </div>
        </div>
        <div className="p-6 border-t flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!form.name || !form.email || save.isPending}>
            {save.isPending ? "Saving..." : "Save Staff"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Staff Tab ─────────────────────────────────────────────────────────────────

function StaffTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | undefined>();
  const [terminateId, setTerminateId] = useState<string | null>(null);
  const [filterPosition, setFilterPosition] = useState("ALL");
  const [filterShift, setFilterShift] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<StaffMember[]>({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await api.get("/staff");
      const raw = res.data?.data ?? res.data;
      return (raw.staff ?? []).map((s: any) => ({
        id: s.id,
        employeeId: s.employeeId,
        name: s.user?.name ?? "Unknown",
        email: s.user?.email ?? "",
        phone: s.user?.phone ?? "",
        position: s.position,
        shiftType: s.shiftType,
        status: s.status,
        dateJoined: s.dateJoined,
        notes: s.notes ?? "",
      })) as StaffMember[];
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/staff/${id}/status`, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });

  const terminate = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/staff/${id}/status`, { status: "TERMINATED" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setTerminateId(null);
    },
  });

  const filtered = (data ?? []).filter((s) => {
    if (filterPosition !== "ALL" && s.position !== filterPosition) return false;
    if (filterShift !== "ALL" && s.shiftType !== filterShift) return false;
    if (filterStatus !== "ALL" && s.status !== filterStatus) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.employeeId.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 w-48" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterPosition} onValueChange={setFilterPosition}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Position" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Positions</SelectItem>
              <SelectItem value="CASHIER">Cashier</SelectItem>
              <SelectItem value="STOCK">Stock</SelectItem>
              <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
              <SelectItem value="DELI">Deli</SelectItem>
              <SelectItem value="BAKER">Baker</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterShift} onValueChange={setFilterShift}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Shift" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Shifts</SelectItem>
              <SelectItem value="MORNING">Morning</SelectItem>
              <SelectItem value="EVENING">Evening</SelectItem>
              <SelectItem value="FULL_DAY">Full Day</SelectItem>
              <SelectItem value="SPLIT">Split</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="TERMINATED">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditStaff(undefined); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Staff
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} url={s.avatarUrl} />
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{s.employeeId}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${POSITION_COLORS[s.position]}`}>
                      {s.position}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{s.shiftType.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_VARIANTS[s.status]}`}>
                      {s.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(s.dateJoined)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" title="Edit" onClick={() => { setEditStaff(s); setFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Link to={`/owner/team/${s.id}`}>
                        <Button size="sm" variant="ghost" title="View Profile">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {s.status !== "TERMINATED" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            title={s.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            onClick={() => toggleStatus.mutate({ id: s.id, status: s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}
                          >
                            {s.status === "ACTIVE" ? (
                              <UserX className="h-4 w-4 text-yellow-600" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" title="Terminate" onClick={() => setTerminateId(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <StaffForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditStaff(undefined); }}
        initial={editStaff}
      />

      <AlertDialog open={!!terminateId} onOpenChange={(o) => !o && setTerminateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Staff Member?</AlertDialogTitle>
            <AlertDialogDescription>This will mark the employee as terminated. This action can be reviewed by an admin.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => terminateId && terminate.mutate(terminateId)}
            >
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Management</h1>
        <p className="text-muted-foreground">Manage managers, staff permissions, and team members</p>
      </div>

      <Tabs defaultValue="managers">
        <TabsList>
          <TabsTrigger value="managers">Managers</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>
        <TabsContent value="managers" className="mt-6"><ManagersTab /></TabsContent>
        <TabsContent value="staff" className="mt-6"><StaffTab /></TabsContent>
      </Tabs>
    </div>
  );
}
