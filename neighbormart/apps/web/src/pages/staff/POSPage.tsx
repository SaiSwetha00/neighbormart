import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  DollarSign,
  Receipt,
  X,
  Package,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Printer,
  RotateCcw,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/format';

// ── Constants ─────────────────────────────────────────────────────────────────

const TAX_RATE = 0.08;

// ── Types ─────────────────────────────────────────────────────────────────────

interface PosSession {
  id: string;
  openingBalance: number;
  openedAt: string;
  cashier: { name: string };
}

interface PosProduct {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  stockQty: number;
  images: { url: string }[];
  category: { name: string };
}

interface CartItem {
  product: PosProduct;
  quantity: number;
}

interface PosCustomer {
  id: string;
  loyaltyPoints: number;
  user: { name: string; email: string; phone: string };
}

interface AppliedCoupon {
  coupon: Record<string, unknown>;
  discount: number;
  code: string;
}

interface SaleOrder {
  id: string;
  total: number;
  items: Array<{
    name?: string;
    quantity: number;
    unitPrice?: number;
    subtotal?: number;
  }>;
  changeGiven?: number;
  cashTendered?: number;
}

interface SaleResult {
  order: SaleOrder;
  change: number;
}

interface OrderItem {
  id: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
}

interface LookedUpOrder {
  id: string;
  total: number;
  items: OrderItem[];
}

// ── Debounce hook ─────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function POSPage() {
  const { store } = useAuthStore();
  const storeId = store?.id ?? '';
  const queryClient = useQueryClient();

  // ── Session dialog state ───────────────────────────────────────────────────
  const [showOpenDrawerDialog, setShowOpenDrawerDialog] = useState(false);
  const [showCloseDrawerDialog, setShowCloseDrawerDialog] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // ── Product search ─────────────────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const debouncedProductSearch = useDebounce(productSearch, 300);

  // ── Cart state ─────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);

  // ── Customer state ─────────────────────────────────────────────────────────
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomer | null>(null);
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const debouncedCustomerSearch = useDebounce(customerSearch, 300);

  // ── Coupon state ───────────────────────────────────────────────────────────
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState('');

  // ── Payment state ──────────────────────────────────────────────────────────
  const [cashTendered, setCashTendered] = useState('');
  const [saleError, setSaleError] = useState('');

  // ── Receipt / Return state ─────────────────────────────────────────────────
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState('');
  const [lookedUpOrder, setLookedUpOrder] = useState<LookedUpOrder | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState('');
  const [returnError, setReturnError] = useState('');

  // ── Queries ────────────────────────────────────────────────────────────────

  // Active POS session
  const { data: session, isLoading: sessionLoading } = useQuery<PosSession | null>({
    queryKey: ['pos-session-active'],
    queryFn: async () => {
      const res = await api.get('/pos/session/active');
      return res.data?.success ? (res.data.data ?? null) : null;
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  // Products (empty search returns all products from the store)
  const { data: productsRaw, isLoading: productsLoading } = useQuery<PosProduct[]>({
    queryKey: ['pos-products', debouncedProductSearch, storeId],
    queryFn: async () => {
      const res = await api.get('/customer/products', {
        params: {
          search: debouncedProductSearch || undefined,
          limit: 12,
          storeId: storeId || undefined,
        },
      });
      const raw = res.data?.data ?? res.data;
      return (raw?.products ?? raw) as PosProduct[];
    },
    enabled: debouncedProductSearch.length > 0,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  // Initial products (shown before any search)
  const { data: initialProductsRaw, isLoading: initialLoading } = useQuery<PosProduct[]>({
    queryKey: ['pos-products-initial', storeId],
    queryFn: async () => {
      const res = await api.get('/customer/products', {
        params: { limit: 12, storeId: storeId || undefined },
      });
      const raw = res.data?.data ?? res.data;
      return (raw?.products ?? raw) as PosProduct[];
    },
    staleTime: 120_000,
  });

  const allProducts: PosProduct[] = debouncedProductSearch.length > 0
    ? (productsRaw ?? [])
    : (initialProductsRaw ?? []);

  // Unique category names from loaded products
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const p of allProducts) {
      const name = p.category?.name;
      if (name && !seen.has(name)) {
        seen.add(name);
        result.push(name);
      }
    }
    return result;
  }, [allProducts]);

  // Category-filtered product list (client-side)
  const products = useMemo(
    () =>
      categoryFilter
        ? allProducts.filter((p) => p.category?.name === categoryFilter)
        : allProducts,
    [allProducts, categoryFilter]
  );

  // Customer search
  const { data: customerResults, isLoading: customerSearchLoading } = useQuery<PosCustomer[]>({
    queryKey: ['pos-customer-search', debouncedCustomerSearch],
    queryFn: async () => {
      const res = await api.get('/pos/customer-search', {
        params: { q: debouncedCustomerSearch },
      });
      const raw = res.data?.data ?? res.data;
      return (raw?.customers ?? raw) as PosCustomer[];
    },
    enabled: debouncedCustomerSearch.length > 0 && !selectedCustomer,
    staleTime: 30_000,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const openSessionMutation = useMutation({
    mutationFn: (balance: number) =>
      api.post('/pos/session/open', { openingBalance: balance }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-session-active'] });
      setShowOpenDrawerDialog(false);
      setOpeningBalance('');
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: ({
      id,
      balance,
      notes,
    }: {
      id: string;
      balance: number;
      notes: string;
    }) =>
      api.patch(`/pos/session/${id}/close`, {
        closingBalance: balance,
        notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-session-active'] });
      setShowCloseDrawerDialog(false);
      setClosingBalance('');
      setClosingNotes('');
    },
  });

  const validateCouponMutation = useMutation({
    mutationFn: ({
      code,
      subtotalAmt,
    }: {
      code: string;
      subtotalAmt: number;
    }) => api.post('/pos/validate-coupon', { code, subtotal: subtotalAmt }),
    onSuccess: (res, variables) => {
      const raw = res.data?.data ?? res.data;
      setAppliedCoupon({
        coupon: raw.coupon,
        discount: raw.discount,
        code: variables.code,
      });
      setCouponError('');
    },
    onError: () => {
      setCouponError('Invalid or expired coupon code.');
    },
  });

  const saleMutation = useMutation({
    mutationFn: (payload: {
      items: { productId: string; quantity: number }[];
      customerId?: string;
      couponCode?: string;
      cashTendered: number;
      loyaltyPointsUsed?: number;
    }) => api.post('/pos/sale', payload),
    onSuccess: (res) => {
      const raw = res.data?.data ?? res.data;
      setSaleResult(raw as SaleResult);
      setShowReceiptDialog(true);
      setSaleError('');
      queryClient.invalidateQueries({ queryKey: ['pos-products-initial'] });
    },
    onError: () => {
      setSaleError('Sale could not be completed. Please try again.');
    },
  });

  const returnMutation = useMutation({
    mutationFn: (payload: {
      orderId: string;
      items: { orderItemId: string; quantity: number; reason: string }[];
      reason: string;
    }) => api.post('/pos/return', payload),
    onSuccess: () => {
      setShowReturnDialog(false);
      resetReturnDialog();
    },
    onError: () => {
      setReturnError('Failed to process the return. Please try again.');
    },
  });

  const lookupOrderMutation = useMutation({
    mutationFn: (orderId: string) =>
      api
        .get(`/orders/${orderId}`)
        .then((res) => (res.data?.data ?? res.data) as LookedUpOrder),
    onSuccess: (data) => {
      setLookedUpOrder(data);
      setReturnError('');
      const init: Record<string, number> = {};
      for (const item of data.items ?? []) {
        init[item.id] = 0;
      }
      setReturnQtys(init);
    },
    onError: () => {
      setReturnError('Order not found. Please check the Order ID.');
      setLookedUpOrder(null);
    },
  });

  // ── Cart operations ────────────────────────────────────────────────────────

  const addToCart = useCallback((product: PosProduct) => {
    if (product.stockQty === 0) return;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx !== -1) {
        return prev.map((item, j) =>
          j === idx
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, product.stockQty),
              }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity: Math.max(
                  0,
                  Math.min(item.quantity + delta, item.product.stockQty)
                ),
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setUseLoyaltyPoints(false);
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    setCashTendered('');
    setSaleError('');
  }, []);

  // ── Reset return dialog ────────────────────────────────────────────────────

  const resetReturnDialog = () => {
    setReturnOrderId('');
    setLookedUpOrder(null);
    setReturnQtys({});
    setReturnReason('');
    setReturnError('');
  };

  // ── Computed values ────────────────────────────────────────────────────────

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (acc, i) => acc + i.product.sellingPrice * i.quantity,
        0
      ),
    [cart]
  );

  const loyaltyDiscount = useMemo(() => {
    if (!useLoyaltyPoints || !selectedCustomer || subtotal === 0) return 0;
    return Math.min(selectedCustomer.loyaltyPoints * 0.01, subtotal);
  }, [useLoyaltyPoints, selectedCustomer, subtotal]);

  const couponDiscount = appliedCoupon?.discount ?? 0;
  const discountedBase = Math.max(0, subtotal - couponDiscount - loyaltyDiscount);
  const tax = discountedBase * TAX_RATE;
  const total = discountedBase + tax;
  const cashTenderedNum = parseFloat(cashTendered) || 0;
  const change = Math.max(0, cashTenderedNum - total);
  const cartItemCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const isGridLoading = debouncedProductSearch.length > 0 ? productsLoading : initialLoading;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCompleteSale = () => {
    if (!session || cart.length === 0 || cashTenderedNum < total) return;
    setSaleError('');

    const loyaltyPointsUsed =
      useLoyaltyPoints && selectedCustomer && loyaltyDiscount > 0
        ? Math.round(loyaltyDiscount / 0.01)
        : undefined;

    saleMutation.mutate({
      items: cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      })),
      customerId: selectedCustomer?.id,
      couponCode: appliedCoupon?.code,
      cashTendered: cashTenderedNum,
      loyaltyPointsUsed,
    });
  };

  const handleNewSale = () => {
    setShowReceiptDialog(false);
    setSaleResult(null);
    clearCart();
  };

  const handleApplyCoupon = () => {
    const code = couponCode.trim();
    if (!code) return;
    setCouponError('');
    validateCouponMutation.mutate({ code, subtotalAmt: subtotal });
  };

  const handleSubmitReturn = () => {
    if (!lookedUpOrder) return;
    const items = (lookedUpOrder.items ?? [])
      .filter((item) => (returnQtys[item.id] ?? 0) > 0)
      .map((item) => ({
        orderItemId: item.id,
        quantity: returnQtys[item.id],
        reason: returnReason,
      }));

    if (items.length === 0) {
      setReturnError('Select at least one item to return.');
      return;
    }
    if (!returnReason.trim()) {
      setReturnError('Please provide a reason for the return.');
      return;
    }

    returnMutation.mutate({
      orderId: lookedUpOrder.id,
      items,
      reason: returnReason,
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">

      {/* ─── TOP BAR: Cash Drawer ──────────────────────────────────── */}
      <div className="flex-none border-b border-border bg-card px-4 py-2.5 flex items-center justify-between gap-4 shadow-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1B4332]">
            <DollarSign className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-foreground text-sm hidden sm:block">
            NeighborMart POS
          </span>
        </div>

        <div className="flex items-center gap-3">
          {sessionLoading ? (
            <div className="h-7 w-52 animate-pulse rounded-full bg-muted" />
          ) : session ? (
            <>
              <div className="flex items-center gap-2 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1.5">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-semibold text-green-700 dark:text-green-400 whitespace-nowrap">
                  Drawer Open — {formatCurrency(Number(session.openingBalance))}
                </span>
              </div>
              {session.cashier?.name && (
                <span className="text-xs text-muted-foreground hidden md:block">
                  {session.cashier.name}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setShowCloseDrawerDialog(true)}
              >
                Close Drawer
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="h-8 bg-[#1B4332] hover:bg-[#2D6A4F] text-white gap-1.5"
              onClick={() => setShowOpenDrawerDialog(true)}
            >
              <DollarSign className="h-3.5 w-3.5" />
              Open Cash Drawer
            </Button>
          )}
        </div>
      </div>

      {/* ─── MAIN SPLIT ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─────── LEFT PANEL (60%): Products ──────────────────────── */}
        <div
          className="flex flex-col border-r border-border overflow-hidden"
          style={{ width: '60%' }}
        >
          {/* Search + Category chips */}
          <div className="flex-none px-4 pt-4 pb-2 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search products by name or SKU…"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setCategoryFilter('');
                }}
                className="pl-9 pr-9"
              />
              {productSearch && (
                <button
                  onClick={() => setProductSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Category filter chips */}
            {categories.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setCategoryFilter('')}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors border',
                    !categoryFilter
                      ? 'bg-[#1B4332] text-white border-[#1B4332]'
                      : 'bg-background text-muted-foreground border-border hover:border-[#1B4332]/40 hover:text-foreground'
                  )}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() =>
                      setCategoryFilter(cat === categoryFilter ? '' : cat)
                    }
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors border',
                      categoryFilter === cat
                        ? 'bg-[#1B4332] text-white border-[#1B4332]'
                        : 'bg-background text-muted-foreground border-border hover:border-[#1B4332]/40 hover:text-foreground'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product grid — scrollable */}
          <div className="flex-1 overflow-y-auto px-4 pb-2">
            {isGridLoading ? (
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 pt-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card overflow-hidden"
                  >
                    <div className="h-28 bg-muted animate-pulse" />
                    <div className="p-2.5 space-y-2">
                      <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                      <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground opacity-30" />
                <div>
                  <p className="font-medium text-foreground">No products found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {productSearch
                      ? `No results for "${productSearch}"`
                      : 'Products will appear here once loaded'}
                  </p>
                </div>
                {(productSearch || categoryFilter) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setProductSearch('');
                      setCategoryFilter('');
                    }}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 pt-1">
                {products.map((product) => {
                  const inCart = cart.find(
                    (i) => i.product.id === product.id
                  );
                  const outOfStock = product.stockQty === 0;
                  const lowStock = !outOfStock && product.stockQty <= 5;

                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={outOfStock}
                      className={cn(
                        'group relative flex flex-col rounded-xl border bg-card overflow-hidden text-left transition-all duration-150',
                        outOfStock
                          ? 'opacity-50 cursor-not-allowed border-border'
                          : inCart
                          ? 'border-[#1B4332] ring-2 ring-[#1B4332]/30 cursor-pointer'
                          : 'border-border hover:border-[#1B4332]/50 hover:shadow-md cursor-pointer active:scale-[0.98]'
                      )}
                    >
                      {/* Product image */}
                      <div className="relative h-28 bg-muted flex items-center justify-center overflow-hidden">
                        {product.images?.[0]?.url ? (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-10 w-10 text-muted-foreground opacity-30" />
                        )}

                        {outOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <span className="text-[10px] font-bold text-white bg-red-500 rounded px-1.5 py-0.5">
                              OUT OF STOCK
                            </span>
                          </div>
                        )}

                        {lowStock && (
                          <div className="absolute top-1.5 right-1.5">
                            <span className="text-[9px] font-bold text-white bg-orange-500 rounded-full px-1.5 py-0.5">
                              LOW
                            </span>
                          </div>
                        )}

                        {inCart && !outOfStock && (
                          <div className="absolute top-1.5 left-1.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1B4332] text-[10px] font-bold text-white">
                              {inCart.quantity}
                            </span>
                          </div>
                        )}

                        {!outOfStock && (
                          <div className="absolute inset-0 bg-[#1B4332]/0 group-hover:bg-[#1B4332]/10 transition-colors flex items-center justify-center">
                            <Plus className="h-8 w-8 text-[#1B4332] opacity-0 group-hover:opacity-70 transition-opacity" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2.5 flex flex-col gap-1 flex-1">
                        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                          {product.name}
                        </p>
                        {product.category?.name && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {product.category.name}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-auto pt-1">
                          <span className="text-xs font-bold text-[#1B4332]">
                            {formatCurrency(product.sellingPrice)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {product.stockQty} left
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Barcode hint */}
          <div className="flex-none border-t border-border bg-muted/20 px-4 py-2">
            <p className="text-[11px] text-muted-foreground text-center">
              Barcode scanner: focus the search bar and scan — results appear automatically
            </p>
          </div>
        </div>

        {/* ─────── RIGHT PANEL (40%): Cart + Payment ────────────────── */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: '40%' }}
        >
          {/* Cart header */}
          <div className="flex-none px-4 pt-3.5 pb-2.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-foreground" />
              <h2 className="font-semibold text-foreground text-sm">
                Cart
                {cartItemCount > 0 && (
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    ({cartItemCount})
                  </span>
                )}
              </h2>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Scrollable: cart items + totals + customer + coupon */}
          <div className="flex-1 overflow-y-auto">

            {/* Cart items */}
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 gap-2 text-center px-4">
                <ShoppingCart className="h-8 w-8 text-muted-foreground opacity-20" />
                <p className="text-sm text-muted-foreground">
                  Click a product to add it to the cart
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-2.5 px-4 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-1 leading-snug">
                        {item.product.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatCurrency(item.product.sellingPrice)} each
                      </p>
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center gap-1 flex-none">
                      <button
                        onClick={() => updateQty(item.product.id, -1)}
                        className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-7 text-center text-sm font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.product.id, 1)}
                        disabled={item.quantity >= item.product.stockQty}
                        className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Row subtotal */}
                    <span className="text-sm font-semibold text-foreground w-14 text-right flex-none tabular-nums">
                      {formatCurrency(item.product.sellingPrice * item.quantity)}
                    </span>

                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors flex-none"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Order totals */}
            {cart.length > 0 && (
              <div className="mx-4 my-2 rounded-lg border border-dashed border-border p-3 space-y-1.5 bg-muted/20">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Coupon ({appliedCoupon?.code})
                    </span>
                    <span className="text-green-600 dark:text-green-400 font-medium tabular-nums">
                      -{formatCurrency(couponDiscount)}
                    </span>
                  </div>
                )}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-600 dark:text-purple-400">
                      Loyalty Points
                    </span>
                    <span className="text-purple-600 dark:text-purple-400 font-medium tabular-nums">
                      -{formatCurrency(loyaltyDiscount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (8%)</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(tax)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-border">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(total)}</span>
                </div>
              </div>
            )}

            {/* Customer section */}
            <div className="px-4 py-3 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Customer (Optional)
                </span>
              </div>

              {selectedCustomer ? (
                <div className="flex items-start justify-between rounded-lg bg-muted/40 border border-border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {selectedCustomer.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedCustomer.user.email}
                    </p>
                    {selectedCustomer.user.phone && (
                      <p className="text-xs text-muted-foreground">
                        {selectedCustomer.user.phone}
                      </p>
                    )}
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">
                      {selectedCustomer.loyaltyPoints} pts ={' '}
                      {formatCurrency(selectedCustomer.loyaltyPoints * 0.01)}
                    </p>
                    {selectedCustomer.loyaltyPoints > 0 && subtotal > 0 && (
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useLoyaltyPoints}
                          onChange={(e) =>
                            setUseLoyaltyPoints(e.target.checked)
                          }
                          className="accent-[#1B4332]"
                        />
                        <span className="text-xs text-foreground">
                          Use points — save{' '}
                          {formatCurrency(
                            Math.min(
                              selectedCustomer.loyaltyPoints * 0.01,
                              subtotal
                            )
                          )}
                        </span>
                      </label>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                      setUseLoyaltyPoints(false);
                    }}
                    className="ml-2 mt-0.5 text-muted-foreground hover:text-foreground transition-colors flex-none"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search by name, email or phone…"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    onBlur={() =>
                      setTimeout(() => setShowCustomerDropdown(false), 200)
                    }
                    className="pl-8 h-9 text-sm"
                  />
                  {showCustomerDropdown &&
                    debouncedCustomerSearch.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                        {customerSearchLoading ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                            Searching…
                          </div>
                        ) : customerResults &&
                          customerResults.length > 0 ? (
                          customerResults.slice(0, 5).map((c) => (
                            <button
                              key={c.id}
                              onMouseDown={() => {
                                setSelectedCustomer(c);
                                setCustomerSearch('');
                                setShowCustomerDropdown(false);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1B4332]/10 text-[#1B4332] text-sm font-bold flex-none">
                                {c.user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {c.user.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {c.user.email} · {c.loyaltyPoints} pts
                                </p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                            No customers found
                          </div>
                        )}
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Coupon section */}
            <div className="px-4 pb-3 border-t border-border pt-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
                Coupon Code
              </p>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-none" />
                    <div>
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                        {appliedCoupon.code}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Saves {formatCurrency(appliedCoupon.discount)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponCode('');
                      setCouponError('');
                    }}
                    className="text-green-600 hover:text-green-800 dark:text-green-400 ml-2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="COUPON CODE"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleApplyCoupon();
                      }}
                      className="h-9 text-sm font-mono uppercase tracking-widest"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 px-3 shrink-0"
                      onClick={handleApplyCoupon}
                      disabled={
                        !couponCode.trim() ||
                        validateCouponMutation.isPending
                      }
                    >
                      {validateCouponMutation.isPending ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </Button>
                  </div>
                  {couponError && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {couponError}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Fixed bottom: Cash Payment ── */}
          <div className="flex-none border-t border-border bg-card px-4 pt-3 pb-4 space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[#1B4332]" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Cash Payment
              </span>
            </div>

            {/* Quick amount buttons */}
            <div className="grid grid-cols-5 gap-1.5">
              {[10, 20, 50, 100].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setCashTendered(String(amt))}
                  className={cn(
                    'rounded-lg border text-xs font-semibold py-1.5 transition-all',
                    cashTenderedNum === amt
                      ? 'bg-[#1B4332] text-white border-[#1B4332]'
                      : 'border-border text-foreground bg-background hover:bg-muted hover:border-[#1B4332]/30'
                  )}
                >
                  ${amt}
                </button>
              ))}
              <button
                onClick={() =>
                  setCashTendered(total > 0 ? total.toFixed(2) : '')
                }
                className={cn(
                  'rounded-lg border text-xs font-semibold py-1.5 transition-all',
                  total > 0 && Math.abs(cashTenderedNum - total) < 0.001
                    ? 'bg-[#1B4332] text-white border-[#1B4332]'
                    : 'border-border text-foreground bg-background hover:bg-muted hover:border-[#1B4332]/30'
                )}
              >
                Exact
              </button>
            </div>

            {/* Cash tendered input */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium select-none">
                $
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                className="pl-6 text-base font-semibold tabular-nums"
              />
            </div>

            {/* Change display */}
            {cashTenderedNum > 0 &&
              cashTenderedNum >= total &&
              total > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-2.5">
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Change to give
                  </span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400 tabular-nums">
                    {formatCurrency(change)}
                  </span>
                </div>
              )}

            {/* Insufficient cash warning */}
            {cashTenderedNum > 0 &&
              cashTenderedNum < total &&
              total > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 flex-none" />
                  Need {formatCurrency(total - cashTenderedNum)} more to
                  complete sale
                </div>
              )}

            {saleError && (
              <p className="text-xs text-red-500 text-center">{saleError}</p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                className={cn(
                  'flex-1 h-11 text-sm font-semibold gap-2 transition-all',
                  cart.length > 0 &&
                    cashTenderedNum >= total &&
                    total > 0 &&
                    session
                    ? 'bg-[#1B4332] hover:bg-[#2D6A4F] text-white'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
                disabled={
                  cart.length === 0 ||
                  cashTenderedNum < total ||
                  total === 0 ||
                  !session ||
                  saleMutation.isPending
                }
                onClick={handleCompleteSale}
              >
                {saleMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4" />
                    Complete Sale
                    {total > 0 ? ` — ${formatCurrency(total)}` : ''}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="h-11 px-3 shrink-0"
                onClick={() => {
                  setShowReturnDialog(true);
                  resetReturnDialog();
                }}
                title="Process Return"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {!session && (
              <p className="text-[11px] text-center text-muted-foreground">
                Open the cash drawer to process sales
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* DIALOGS                                                          */}
      {/* ──────────────────────────────────────────────────────────────── */}

      {/* Open Cash Drawer */}
      <Dialog
        open={showOpenDrawerDialog}
        onOpenChange={setShowOpenDrawerDialog}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Open Cash Drawer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="opening-balance">Opening Balance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium select-none">
                  $
                </span>
                <Input
                  id="opening-balance"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="pl-6"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the amount of cash currently in the drawer.
              </p>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowOpenDrawerDialog(false);
                setOpeningBalance('');
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white"
              disabled={openSessionMutation.isPending}
              onClick={() =>
                openSessionMutation.mutate(parseFloat(openingBalance) || 0)
              }
            >
              {openSessionMutation.isPending && (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              )}
              Open Drawer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Cash Drawer */}
      <Dialog
        open={showCloseDrawerDialog}
        onOpenChange={setShowCloseDrawerDialog}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Close Cash Drawer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {session && (
              <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm space-y-0.5">
                <div>
                  <span className="text-muted-foreground">Opened: </span>
                  <span className="font-medium">
                    {new Date(session.openedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Opening balance:{' '}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(Number(session.openingBalance))}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="closing-balance">Closing Balance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium select-none">
                  $
                </span>
                <Input
                  id="closing-balance"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={closingBalance}
                  onChange={(e) => setClosingBalance(e.target.value)}
                  className="pl-6"
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="closing-notes">Notes (Optional)</Label>
              <textarea
                id="closing-notes"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Any notes about this session…"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCloseDrawerDialog(false);
                setClosingBalance('');
                setClosingNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                closeSessionMutation.isPending || !closingBalance || !session
              }
              onClick={() => {
                if (!session) return;
                closeSessionMutation.mutate({
                  id: session.id,
                  balance: parseFloat(closingBalance) || 0,
                  notes: closingNotes,
                });
              }}
            >
              {closeSessionMutation.isPending && (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              )}
              Close Drawer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt */}
      <Dialog
        open={showReceiptDialog}
        onOpenChange={() => {
          /* prevent accidental dismiss — use buttons only */
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Sale Complete!
            </DialogTitle>
          </DialogHeader>

          {saleResult && (
            <div
              id="pos-receipt"
              className="rounded-lg border border-border bg-muted/20 p-4 space-y-3 text-sm"
            >
              <div className="text-center border-b border-dashed border-border pb-3">
                <p className="font-bold text-base tracking-tight">
                  NeighborMart
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Order #
                  {(saleResult.order.id ?? '').slice(-8).toUpperCase()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date().toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>

              <div className="space-y-1.5">
                {(saleResult.order.items ?? []).map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {item.name ?? `Item ${idx + 1}`}
                      {item.quantity > 1 && (
                        <span className="ml-1 text-xs">× {item.quantity}</span>
                      )}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(
                        item.subtotal ??
                          (item.unitPrice ?? 0) * item.quantity
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-border pt-3 space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatCurrency(saleResult.order.total)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Cash Tendered</span>
                  <span className="tabular-nums">
                    {formatCurrency(
                      saleResult.order.cashTendered ?? cashTenderedNum
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-green-600 dark:text-green-400">
                  <span>Change Given</span>
                  <span className="tabular-nums">
                    {formatCurrency(
                      saleResult.change ??
                        saleResult.order.changeGiven ??
                        0
                    )}
                  </span>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground border-t border-dashed border-border pt-2">
                Thank you for shopping at NeighborMart!
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
            <Button
              className="flex-1 bg-[#1B4332] hover:bg-[#2D6A4F] text-white gap-2"
              onClick={handleNewSale}
            >
              <ShoppingCart className="h-4 w-4" />
              New Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return */}
      <Dialog
        open={showReturnDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowReturnDialog(false);
            resetReturnDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Process Return
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {/* Order lookup */}
            <div className="space-y-1.5">
              <Label>Order ID</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter Order ID to look up…"
                  value={returnOrderId}
                  onChange={(e) => {
                    setReturnOrderId(e.target.value);
                    setReturnError('');
                    if (lookedUpOrder) setLookedUpOrder(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && returnOrderId.trim()) {
                      lookupOrderMutation.mutate(returnOrderId.trim());
                    }
                  }}
                />
                <Button
                  variant="outline"
                  className="shrink-0 gap-1.5"
                  disabled={
                    !returnOrderId.trim() || lookupOrderMutation.isPending
                  }
                  onClick={() =>
                    lookupOrderMutation.mutate(returnOrderId.trim())
                  }
                >
                  {lookupOrderMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Look Up
                </Button>
              </div>
            </div>

            {returnError && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 flex-none" />
                {returnError}
              </div>
            )}

            {lookedUpOrder && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Order #
                  {(lookedUpOrder.id ?? '').slice(-8).toUpperCase()} — select
                  items to return:
                </p>

                <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                  {(lookedUpOrder.items ?? []).length === 0 ? (
                    <div className="px-4 py-4 text-sm text-muted-foreground text-center">
                      No items found in this order.
                    </div>
                  ) : (
                    (lookedUpOrder.items ?? []).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {item.productName ??
                              `Item ${item.id.slice(-4)}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Ordered: {item.quantity} ·{' '}
                            {formatCurrency(item.unitPrice)} each
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-none">
                          <button
                            onClick={() =>
                              setReturnQtys((prev) => ({
                                ...prev,
                                [item.id]: Math.max(
                                  0,
                                  (prev[item.id] ?? 0) - 1
                                ),
                              }))
                            }
                            disabled={(returnQtys[item.id] ?? 0) === 0}
                            className="h-7 w-7 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold tabular-nums">
                            {returnQtys[item.id] ?? 0}
                          </span>
                          <button
                            onClick={() =>
                              setReturnQtys((prev) => ({
                                ...prev,
                                [item.id]: Math.min(
                                  item.quantity,
                                  (prev[item.id] ?? 0) + 1
                                ),
                              }))
                            }
                            disabled={
                              (returnQtys[item.id] ?? 0) >= item.quantity
                            }
                            className="h-7 w-7 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="return-reason">Reason for Return</Label>
                  <textarea
                    id="return-reason"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Describe the reason for this return…"
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowReturnDialog(false);
                resetReturnDialog();
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white"
              disabled={
                !lookedUpOrder ||
                returnMutation.isPending ||
                !returnReason.trim()
              }
              onClick={handleSubmitReturn}
            >
              {returnMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing…
                </>
              ) : (
                'Process Return'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
