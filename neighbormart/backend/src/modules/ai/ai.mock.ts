import prisma from '../../config/database';

// ─── Intent detection ─────────────────────────────────────────────────────────

type Intent =
  | 'revenue' | 'low_stock' | 'expiring' | 'staff' | 'orders'
  | 'customers' | 'product_find' | 'return_help' | 'summary'
  | 'forecast' | 'promotions' | 'waste' | 'schedule' | 'greeting' | 'general';

function detectIntent(message: string): Intent {
  const m = message.toLowerCase();
  if (/hello|hi\b|hey|good (morning|afternoon|evening)/.test(m)) return 'greeting';
  if (/revenue|sales|money|earn|income|profit|turnover/.test(m)) return 'revenue';
  if (/low stock|running low|out of stock|reorder|restock|stock level/.test(m)) return 'low_stock';
  if (/expir|expire|expiry|spoil|fresh|best before/.test(m)) return 'expiring';
  if (/staff|employee|team|worker|cashier|who is working|logged in/.test(m)) return 'staff';
  if (/order|pending|deliver|dispatch|ship|customer order/.test(m)) return 'orders';
  if (/customer|loyalty|member|tier|points/.test(m)) return 'customers';
  if (/where is|find|locate|aisle|shelf|in stock|do you have/.test(m)) return 'product_find';
  if (/return|refund|how do i|how to|process|step/.test(m)) return 'return_help';
  if (/forecast|predict|next month|next week|trend|projection/.test(m)) return 'forecast';
  if (/promo|discount|offer|coupon|deal|sale price/.test(m)) return 'promotions';
  if (/waste|shrink|spoil|discard|throw/.test(m)) return 'waste';
  if (/schedule|shift|roster|who.*work|clock/.test(m)) return 'schedule';
  if (/summar|today|how did|overview|brief|report|this week/.test(m)) return 'summary';
  return 'general';
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function fetchDaySummary(storeId: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const [todayOrders, weekOrders, lowStock, expiring, pendingOrders] = await Promise.all([
    prisma.order.aggregate({
      where: { storeId, createdAt: { gte: today }, status: { not: 'CANCELLED' } },
      _sum: { total: true }, _count: true,
    }),
    prisma.order.aggregate({
      where: { storeId, createdAt: { gte: weekAgo, lt: today }, status: { not: 'CANCELLED' } },
      _sum: { total: true }, _count: true,
    }),
    prisma.product.findMany({
      where: { storeId, stockQty: { lte: 10 }, status: 'ACTIVE' },
      select: { name: true, stockQty: true },
      orderBy: { stockQty: 'asc' }, take: 5,
    }),
    prisma.productBatch.count({
      where: { product: { storeId }, expiryDate: { lte: new Date(Date.now() + 3 * 86400000), gte: new Date() } },
    }),
    prisma.order.count({ where: { storeId, status: 'PENDING' } }),
  ]);

  const todayRevenue = Number(todayOrders._sum.total || 0);
  const weekRevenue = Number(weekOrders._sum.total || 0);
  const avgDaily = weekRevenue / 7;
  const vsAvg = avgDaily > 0 ? ((todayRevenue - avgDaily) / avgDaily * 100).toFixed(0) : null;

  return { todayRevenue, todayCount: todayOrders._count, avgDaily, vsAvg, lowStock, expiringCount: expiring, pendingOrders };
}

async function fetchLowStock(storeId: string) {
  return prisma.product.findMany({
    where: { storeId, stockQty: { lte: 10 }, status: 'ACTIVE' },
    select: { name: true, stockQty: true, lowStockThreshold: true, sku: true },
    orderBy: { stockQty: 'asc' }, take: 10,
  });
}

async function fetchExpiring(storeId: string, days = 7) {
  const cutoff = new Date(Date.now() + days * 86400000);
  return prisma.productBatch.findMany({
    where: { product: { storeId }, expiryDate: { lte: cutoff, gte: new Date() } },
    include: { product: { select: { name: true } } },
    orderBy: { expiryDate: 'asc' }, take: 10,
  });
}

async function fetchPendingOrders(storeId: string) {
  return prisma.order.findMany({
    where: { storeId, status: { in: ['PENDING', 'CONFIRMED'] } },
    select: { id: true, status: true, total: true, type: true, createdAt: true },
    orderBy: { createdAt: 'asc' }, take: 8,
  });
}

async function fetchStaffStatus(storeId: string) {
  return prisma.user.findMany({
    where: { storeId, role: { in: ['STAFF', 'MANAGER'] }, status: 'ACTIVE' },
    select: { name: true, role: true, lastLogin: true },
    take: 10,
  });
}

async function fetchCustomerStats(storeId: string) {
  const [total, tiers, topCustomers] = await Promise.all([
    prisma.customer.count({ where: { storeId } }),
    prisma.customer.groupBy({ by: ['tier'], where: { storeId }, _count: true }),
    prisma.customer.findMany({
      where: { storeId },
      select: { loyaltyPoints: true, tier: true, user: { select: { name: true } } },
      orderBy: { loyaltyPoints: 'desc' }, take: 3,
    }),
  ]);
  return { total, tiers, topCustomers };
}

async function fetchRevenueTrend(storeId: string) {
  const results = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    const next = new Date(d.getTime() + 86400000);
    const agg = await prisma.order.aggregate({
      where: { storeId, createdAt: { gte: d, lt: next }, status: { not: 'CANCELLED' } },
      _sum: { total: true }, _count: true,
    });
    results.push({ date: d.toLocaleDateString('en-US', { weekday: 'short' }), revenue: Number(agg._sum.total || 0), orders: agg._count });
  }
  return results;
}

async function fetchActivePromotions(storeId: string) {
  return prisma.promotion.findMany({
    where: { storeId, status: 'ACTIVE', startDate: { lte: new Date() }, endDate: { gte: new Date() } },
    select: { name: true, type: true, discountValue: true, usedCount: true, endDate: true },
    take: 5,
  });
}

async function fetchProductByKeyword(storeId: string, keyword: string) {
  return prisma.product.findMany({
    where: { storeId, status: 'ACTIVE', name: { contains: keyword } },
    select: { name: true, stockQty: true, sellingPrice: true, sku: true },
    take: 5,
  });
}

async function fetchCustomerOrders(userId: string) {
  const customer = await prisma.customer.findUnique({
    where: { userId },
    include: { orders: { orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, status: true, total: true, createdAt: true } } },
  });
  return customer;
}

// ─── Response builders ────────────────────────────────────────────────────────

function fmt(n: number) { return `$${n.toFixed(2)}`; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const greetings = [
  "Hello! I'm NeighborMart AI, ready to help.",
  "Hi there! What can I help you with today?",
  "Hey! I'm here to help you run the store smarter.",
];

async function ownerResponse(storeId: string, message: string, intent: Intent, storeName: string): Promise<string> {
  switch (intent) {
    case 'greeting': return pick(greetings);

    case 'summary': {
      const d = await fetchDaySummary(storeId);
      const trend = d.vsAvg ? (Number(d.vsAvg) >= 0 ? `▲ ${d.vsAvg}% above` : `▼ ${Math.abs(Number(d.vsAvg))}% below`) : 'on par with';
      const alerts = [];
      if (d.lowStock.length) alerts.push(`${d.lowStock.length} items low on stock`);
      if (d.expiringCount) alerts.push(`${d.expiringCount} batches expire in 3 days`);
      if (d.pendingOrders) alerts.push(`${d.pendingOrders} orders pending`);
      return `**${storeName} — Today's Summary**\n\nRevenue: ${fmt(d.todayRevenue)} across ${d.todayCount} orders — ${trend} your 7-day average of ${fmt(d.avgDaily)}.${d.lowStock.length ? `\n\nTop low-stock item: ${d.lowStock[0].name} (${d.lowStock[0].stockQty} units left).` : ''}${alerts.length ? `\n\n⚠️ Attention needed: ${alerts.join(', ')}.` : '\n\nEverything looks good — no critical alerts.'}\n\n**Next action:** ${d.lowStock.length ? 'Create a purchase order for low-stock items.' : d.pendingOrders ? 'Review and dispatch the pending orders.' : 'Keep up the good work!'}`;
    }

    case 'revenue': {
      const trend = await fetchRevenueTrend(storeId);
      const total7 = trend.reduce((s, d) => s + d.revenue, 0);
      const best = trend.reduce((a, b) => b.revenue > a.revenue ? b : a);
      const worst = trend.reduce((a, b) => b.revenue < a.revenue ? b : a);
      return `**7-Day Revenue Breakdown**\n\n${trend.map(d => `${d.date}: ${fmt(d.revenue)} (${d.orders} orders)`).join('\n')}\n\n**Total:** ${fmt(total7)}\n**Best day:** ${best.date} at ${fmt(best.revenue)}\n**Slowest day:** ${worst.date} at ${fmt(worst.revenue)}\n\n**Next action:** ${best.revenue > total7 / 7 * 1.3 ? `${best.date} performed 30%+ above average — analyze what drove that and replicate it.` : 'Revenue is consistent. Consider a targeted weekend promotion to boost the peak.'}`;
    }

    case 'low_stock': {
      const items = await fetchLowStock(storeId);
      if (!items.length) return "Great news — no products are critically low right now! All items are stocked above their minimum thresholds.";
      return `**Low Stock Alert — ${items.length} items need attention**\n\n${items.map((p, i) => `${i + 1}. ${p.name} — ${p.stockQty} units left (threshold: ${p.lowStockThreshold || 10})`).join('\n')}\n\n**Next action:** Go to Suppliers → Create Purchase Order and reorder the top 3 items immediately.`;
    }

    case 'expiring': {
      const batches = await fetchExpiring(storeId);
      if (!batches.length) return "No products are expiring in the next 7 days. Great inventory management!";
      return `**Expiring Products — Next 7 Days**\n\n${batches.map(b => `• ${b.product.name} — expires ${b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'unknown'}`).join('\n')}\n\n**Recommended action:** Apply a 15–20% markdown or create a bundle promotion to clear these items before they expire. Go to Promotions → Create Promotion.`;
    }

    case 'staff': {
      const staff = await fetchStaffStatus(storeId);
      const recent = staff.filter(s => s.lastLogin && (Date.now() - new Date(s.lastLogin).getTime()) < 86400000);
      return `**Team Status — ${staff.length} active staff**\n\n${staff.map(s => `• ${s.name} (${s.role}) — last seen ${s.lastLogin ? new Date(s.lastLogin).toLocaleString() : 'never'}`).join('\n')}\n\n${recent.length} of ${staff.length} staff logged in today.\n\n**Next action:** ${recent.length < staff.length ? 'Some staff haven\'t logged in — check the schedule and send a reminder.' : 'All staff are active today!'}`;
    }

    case 'orders': {
      const orders = await fetchPendingOrders(storeId);
      if (!orders.length) return "No pending orders right now — you're all caught up! All orders have been processed.";
      const totalValue = orders.reduce((s, o) => s + Number(o.total), 0);
      return `**Pending Orders — ${orders.length} awaiting action**\n\nTotal value: ${fmt(totalValue)}\n\n${orders.slice(0, 5).map(o => `• Order #${o.id.slice(-6)} — ${o.status} — ${fmt(Number(o.total))} (${o.type})`).join('\n')}\n\n**Next action:** Go to Orders and mark the oldest ones as Confirmed to start processing.`;
    }

    case 'customers': {
      const c = await fetchCustomerStats(storeId);
      return `**Customer Base — ${c.total} members**\n\n${c.tiers.map((t: any) => `• ${t.tier}: ${t._count} customers`).join('\n')}\n\nTop customers by loyalty:\n${c.topCustomers.map((c: any, i: number) => `${i + 1}. ${c.user.name} — ${c.loyaltyPoints} points (${c.tier})`).join('\n')}\n\n**Next action:** Run a targeted promotion for Gold/Silver tier customers to increase repeat purchases.`;
    }

    case 'forecast': {
      const trend = await fetchRevenueTrend(storeId);
      const avg = trend.reduce((s, d) => s + d.revenue, 0) / 7;
      const projected = avg * 30;
      const growth = 1.08;
      return `**Revenue Forecast — Next 30 Days**\n\nBased on your 7-day average of ${fmt(avg)}/day:\n\n• Conservative estimate: ${fmt(projected * 0.9)}\n• Realistic estimate: ${fmt(projected)}\n• Optimistic (with promotions): ${fmt(projected * growth)}\n\n**Key levers:** Running 2–3 weekend promotions could add ${fmt(projected * 0.08)} to monthly revenue.\n\n**Next action:** Plan a promotion for the weekend to push toward the optimistic target.`;
    }

    case 'promotions': {
      const promos = await fetchActivePromotions(storeId);
      if (!promos.length) return "No active promotions running right now. Consider creating one to boost weekend sales — a 10% discount on slow-moving items can significantly reduce waste and increase footfall.";
      return `**Active Promotions — ${promos.length} running**\n\n${promos.map(p => `• ${p.name}: ${p.type === 'PERCENTAGE' ? `${p.discountValue}% off` : `$${p.discountValue} off`} — used ${p.usedCount} times — ends ${new Date(p.endDate).toLocaleDateString()}`).join('\n')}\n\n**Next action:** ${promos[0].usedCount < 5 ? 'Your top promotion has low usage — promote it on the customer app to increase redemption.' : 'Promotions are performing well!'}`;
    }

    default:
      return `I'm analyzing your store data for "${message}"...\n\nFor detailed analysis, try asking about:\n• Revenue ("How did we do today?")\n• Inventory ("What's low on stock?")\n• Expiring items ("What's expiring soon?")\n• Staff ("Who's working today?")\n• Orders ("Show pending orders")\n• Customers ("Customer overview")`;
  }
}

async function managerResponse(storeId: string, message: string, intent: Intent): Promise<string> {
  switch (intent) {
    case 'greeting': return "Hi! I'm here to help with store operations. Ask me about inventory, orders, or expiring products.";

    case 'summary': {
      const [lowStock, expiring, pending] = await Promise.all([
        fetchLowStock(storeId),
        fetchExpiring(storeId, 3),
        fetchPendingOrders(storeId),
      ]);
      const items = [];
      if (lowStock.length) items.push(`⚠️ ${lowStock.length} items low on stock (critical: ${lowStock[0]?.name})`);
      if (expiring.length) items.push(`🕐 ${expiring.length} batches expire within 3 days`);
      if (pending.length) items.push(`📦 ${pending.length} orders pending dispatch`);
      if (!items.length) return "Operations look good today — no critical items, no expiring batches, and all orders are on track!";
      return `**Today's Operations Summary**\n\n${items.join('\n')}\n\n**Priority:** ${lowStock.length ? 'Raise a purchase order for low-stock items first.' : 'Process the pending orders.'}`;
    }

    case 'low_stock': {
      const items = await fetchLowStock(storeId);
      if (!items.length) return "All products are adequately stocked — no reorder needed right now.";
      return `**${items.length} items need restocking:**\n\n${items.map((p, i) => `${i + 1}. ${p.name} — ${p.stockQty} units (SKU: ${p.sku})`).join('\n')}\n\nRaise purchase orders for the top items as soon as possible.`;
    }

    case 'expiring': {
      const batches = await fetchExpiring(storeId, 7);
      if (!batches.length) return "No products expiring in the next 7 days.";
      return `**Expiring items (next 7 days):**\n\n${batches.map(b => `• ${b.product.name} — ${b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'unknown'}`).join('\n')}\n\nConsider markdowns to clear these before expiry.`;
    }

    case 'orders': {
      const orders = await fetchPendingOrders(storeId);
      if (!orders.length) return "No pending orders — all caught up!";
      return `**${orders.length} pending orders:**\n\n${orders.slice(0, 6).map(o => `• #${o.id.slice(-6)} — ${o.status} — $${Number(o.total).toFixed(2)} (${o.type})`).join('\n')}\n\nProcess oldest first to maintain delivery SLAs.`;
    }

    case 'staff': {
      const staff = await fetchStaffStatus(storeId);
      const today = staff.filter(s => s.lastLogin && (Date.now() - new Date(s.lastLogin).getTime()) < 86400000);
      return `**Team: ${staff.length} members, ${today.length} active today**\n\n${staff.map(s => `• ${s.name} (${s.role})`).join('\n')}`;
    }

    default:
      return `I can help with operations data. Try asking:\n• "What needs attention today?"\n• "Show expiring items"\n• "Low stock list"\n• "Pending orders summary"`;
  }
}

async function staffResponse(storeId: string, message: string, intent: Intent): Promise<string> {
  if (intent === 'greeting') return "Hi! Ask me about products, stock, or how to process returns.";

  if (intent === 'return_help') {
    return "**To process a return:**\n1. Go to POS → Find the original order by ID\n2. Click 'Process Return'\n3. Select the item(s) and quantity\n4. Choose reason (defective/unwanted/damaged)\n5. Confirm — stock will be restocked automatically\n\nRefund is credited back to the original payment method.";
  }

  if (intent === 'product_find' || intent === 'low_stock') {
    const keyword = message.replace(/where is|find|locate|in stock|do you have|is|stock/gi, '').trim().split(' ').filter(w => w.length > 2).join(' ') || message.split(' ').slice(-1)[0];
    const products = await fetchProductByKeyword(storeId, keyword);
    if (!products.length) return `No products found matching "${keyword}". Try scanning the barcode or check with the manager.`;
    return products.map(p => `${p.name}: ${p.stockQty > 0 ? `✅ ${p.stockQty} in stock — $${Number(p.sellingPrice).toFixed(2)}` : '❌ Out of stock'}`).join('\n');
  }

  return "I can help with:\n• Finding products (\"Where is organic milk?\")\n• Stock check (\"Is bread in stock?\")\n• Returns (\"How do I process a return?\")\n• Prices (\"What's the price of eggs?\")";
}

async function customerResponse(userId: string, storeId: string, message: string, intent: Intent): Promise<string> {
  const m = message.toLowerCase();

  if (intent === 'greeting') return "Hello! I'm your personal shopping assistant. I can help you find products, track orders, plan meals, and more!";

  if (intent === 'orders') {
    const c = await fetchCustomerOrders(userId);
    if (!c || !c.orders.length) return "You don't have any recent orders. Ready to start shopping? Browse our products or ask me for recommendations!";
    return `**Your recent orders:**\n\n${c.orders.map(o => `• Order #${o.id.slice(-6)} — ${o.status} — $${Number(o.total).toFixed(2)} — ${new Date(o.createdAt).toLocaleDateString()}`).join('\n')}\n\nFor detailed tracking, go to My Orders.`;
  }

  if (intent === 'product_find') {
    const keyword = message.replace(/where is|find|show me|do you have|looking for/gi, '').trim().split(' ').filter(w => w.length > 2).join(' ');
    const products = await fetchProductByKeyword(storeId, keyword || message.split(' ').slice(-1)[0]);
    if (!products.length) return `I couldn't find "${keyword}" in our store. Try a different name or browse the shop page!`;
    return `Here's what I found:\n\n${products.map(p => `• **${p.name}** — $${Number(p.sellingPrice).toFixed(2)} — ${p.stockQty > 0 ? `✅ ${p.stockQty} available` : '❌ Out of stock'}`).join('\n')}`;
  }

  if (intent === 'promotions') {
    const promos = await fetchActivePromotions(storeId);
    if (!promos.length) return "No promotions running right now, but check back soon — we run weekly deals! All loyalty points you earn can also be redeemed for discounts.";
    return `**Current Deals**\n\n${promos.map(p => `• ${p.name}: ${p.type === 'PERCENTAGE' ? `${p.discountValue}% off` : `$${p.discountValue} off`} — ends ${new Date(p.endDate).toLocaleDateString()}`).join('\n')}\n\nThese apply automatically at checkout!`;
  }

  if (/meal|dinner|lunch|recipe|plan|cook|budget|week/.test(m)) {
    const budget = m.match(/\$?(\d+)/)?.[1];
    return `**Meal Planning${budget ? ` — $${budget} budget` : ''}**\n\nHere are some ideas:\n\n• **Monday:** Pasta with tomato sauce (~$8)\n• **Tuesday:** Stir-fry vegetables with rice (~$7)\n• **Wednesday:** Lentil soup and bread (~$6)\n• **Thursday:** Grilled chicken salad (~$10)\n• **Friday:** Homemade pizza (~$9)\n\nAll ingredients are available in our store. Would you like me to check availability for any of these?`;
  }

  if (/vegan|vegetarian|gluten|dairy.free|organic|healthy/.test(m)) {
    const keyword = /vegan/.test(m) ? 'vegan' : /organic/.test(m) ? 'organic' : /gluten/.test(m) ? 'gluten' : 'natural';
    const products = await fetchProductByKeyword(storeId, keyword);
    if (!products.length) return `We're still building our ${keyword} section. Check the product page and filter by dietary preference, or ask a staff member!`;
    return `**${keyword.charAt(0).toUpperCase() + keyword.slice(1)} options:**\n\n${products.map(p => `• ${p.name} — $${Number(p.sellingPrice).toFixed(2)}`).join('\n')}\n\nFind these in the health & wellness aisle!`;
  }

  return "I can help you:\n• Find products (\"Where is organic milk?\")\n• Track orders (\"Where is my order?\")\n• Plan meals (\"Plan dinners for 4 under $50\")\n• See deals (\"What's on sale?\")\n\nWhat would you like to know?";
}

// ─── Main mock chat function ──────────────────────────────────────────────────

export async function mockChat(userId: string, role: string, storeId: string, message: string): Promise<string> {
  const intent = detectIntent(message);

  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { name: true } });
  const storeName = store?.name || 'NeighborMart';

  switch (role.toUpperCase()) {
    case 'OWNER': return ownerResponse(storeId, message, intent, storeName);
    case 'MANAGER': return managerResponse(storeId, message, intent);
    case 'STAFF':
    case 'CASHIER': return staffResponse(storeId, message, intent);
    case 'CUSTOMER': return customerResponse(userId, storeId, message, intent);
    default: return ownerResponse(storeId, message, intent, storeName);
  }
}

// ─── Mock panel insight ───────────────────────────────────────────────────────

export async function mockPanelInsight(storeId: string, module: string): Promise<string> {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  switch (module.toLowerCase()) {
    case 'sales': {
      const rev = await prisma.order.aggregate({ where: { storeId, createdAt: { gte: today }, status: { not: 'CANCELLED' } }, _sum: { total: true }, _count: true });
      const amt = Number(rev._sum.total || 0);
      return amt > 0 ? `${rev._count} orders worth $${amt.toFixed(2)} so far today. ${amt > 500 ? 'Strong start — on track for a great day.' : 'Morning is slow — a flash promotion could boost afternoon sales.'}` : 'No sales recorded yet today. Consider running a morning promotion to kickstart the day.';
    }
    case 'inventory': {
      const low = await prisma.product.count({ where: { storeId, stockQty: { lte: 10 }, status: 'ACTIVE' } });
      return low > 0 ? `${low} product${low > 1 ? 's are' : ' is'} running low. Raise purchase orders today to avoid stockouts over the weekend.` : 'Inventory levels look healthy — all products are above their minimum threshold.';
    }
    case 'orders': {
      const pending = await prisma.order.count({ where: { storeId, status: 'PENDING' } });
      return pending > 0 ? `${pending} order${pending > 1 ? 's are' : ' is'} pending — confirm and dispatch the oldest ones first to maintain delivery targets.` : 'All orders are up to date — no pending deliveries. Great execution today!';
    }
    case 'customers': {
      const count = await prisma.customer.count({ where: { storeId } });
      const gold = await prisma.customer.count({ where: { storeId, tier: 'GOLD' } });
      return `${count} registered customers, ${gold} Gold tier. Consider sending a loyalty reward to Gold members to drive repeat visits this week.`;
    }
    case 'finance': {
      const weekAgo = new Date(today.getTime() - 7 * 86400000);
      const rev = await prisma.order.aggregate({ where: { storeId, createdAt: { gte: weekAgo }, status: { not: 'CANCELLED' } }, _sum: { total: true } });
      const weekly = Number(rev._sum.total || 0);
      return `$${weekly.toFixed(2)} revenue this week. Average daily: $${(weekly / 7).toFixed(2)}. ${weekly > 3000 ? 'Excellent week — ahead of target.' : 'Consider a weekend promotion to hit your weekly goal.'}`;
    }
    case 'promotions': {
      const active = await prisma.promotion.count({ where: { storeId, status: 'ACTIVE', startDate: { lte: new Date() }, endDate: { gte: new Date() } } });
      return active > 0 ? `${active} promotion${active > 1 ? 's' : ''} currently running. Monitor redemption rates — low usage may need better visibility on the customer app.` : 'No active promotions. A weekend deal could drive a 15–20% uplift in orders.';
    }
    case 'staff':
    case 'team': {
      const total = await prisma.user.count({ where: { storeId, role: { in: ['STAFF', 'MANAGER'] }, status: 'ACTIVE' } });
      return `${total} active staff members on your team. Ensure shifts are scheduled and all staff have clocked in for today's operations.`;
    }
    default:
      return 'Real-time data is being analyzed. Check back in a few minutes for fresh insights on this module.';
  }
}

// ─── Mock report summary ──────────────────────────────────────────────────────

export function mockReportSummary(reportData: unknown, reportType: string): string {
  const d = reportData as any;

  switch (reportType.toUpperCase()) {
    case 'SALES': {
      const count = d?._count || 0;
      const total = Number(d?._sum?.total || 0);
      const avg = count > 0 ? total / count : 0;
      return `**Key Finding:** ${count} orders generated $${total.toFixed(2)} in revenue with an average order value of $${avg.toFixed(2)}.\n\n**Recommendations:**\n• ${avg < 20 ? 'Average order value is below $20 — introduce bundle deals or upsell prompts at checkout.' : 'Strong average order value — maintain momentum with loyalty rewards.'}\n• ${count > 50 ? 'High order volume — ensure staffing is adequate for peak times.' : 'Order volume is moderate — a targeted promotion could increase frequency.'}\n• Track repeat purchase rate to identify loyal customers for personalized offers.\n\n**Watch out for:** Any day where orders drop below 5 warrants investigating external factors (weather, local events).`;
    }
    case 'LOW_STOCK': {
      const items = Array.isArray(d) ? d : [];
      return `**Key Finding:** ${items.length} product${items.length !== 1 ? 's' : ''} ${items.length !== 1 ? 'are' : 'is'} below minimum stock threshold.${items.length ? ` Most critical: ${items[0]?.name} with only ${items[0]?.stockQty} units.` : ''}\n\n**Recommendations:**\n• Create purchase orders immediately for the top 3 items to prevent stockouts.\n• Review reorder points — if items are frequently hitting low stock, increase the threshold.\n• Consider negotiating bulk pricing with suppliers for fast-moving items.\n\n**Watch out for:** Stockouts during weekends when supplier deliveries may be delayed.`;
    }
    case 'INVENTORY': {
      const items = Array.isArray(d) ? d : [];
      const totalValue = items.reduce((s: number, p: any) => s + (Number(p.sellingPrice || 0) * (p.stockQty || 0)), 0);
      return `**Key Finding:** ${items.length} active products with total inventory value of $${totalValue.toFixed(2)}.\n\n**Recommendations:**\n• Review slow-moving products and consider markdowns to free up shelf space.\n• Ensure high-velocity items are always well-stocked — these drive the most revenue.\n• Conduct a physical count for the top 20 products to verify system accuracy.\n\n**Watch out for:** Discrepancies between system stock and physical count — these indicate shrinkage.`;
    }
    case 'WASTE': {
      const items = Array.isArray(d) ? d : [];
      return `**Key Finding:** ${items.length} waste log entries recorded in this period.\n\n**Recommendations:**\n• Identify the top 3 most-wasted products and reduce their order quantities.\n• Implement markdown pricing for items approaching expiry — a 20% discount is better than 100% waste.\n• Train staff to follow FIFO (first in, first out) to minimize expiry waste.\n\n**Watch out for:** Waste exceeding 3% of total revenue — that's a profitability red flag.`;
    }
    case 'CUSTOMERS': {
      const items = Array.isArray(d) ? d : [];
      const gold = items.filter((c: any) => c.tier === 'GOLD').length;
      return `**Key Finding:** ${items.length} customers in the loyalty program, ${gold} Gold tier.\n\n**Recommendations:**\n• Run an exclusive promotion for Gold tier members to maintain their loyalty.\n• Identify customers who haven't purchased in 30+ days and send a win-back offer.\n• Increase loyalty point multipliers on slow days to incentivize visits.\n\n**Watch out for:** A declining active customer count signals a retention problem — act before it becomes a trend.`;
    }
    default:
      return `**Key Finding:** Report data has been analyzed for ${reportType}.\n\n**Recommendations:**\n• Review the data patterns and identify the top 3 anomalies.\n• Compare against previous period to spot trends.\n• Share findings with your team during the next standup.\n\n**Watch out for:** Any metric that deviates more than 20% from the previous period.`;
  }
}

// ─── Mock daily brief ─────────────────────────────────────────────────────────

export async function mockDailyBrief(storeId: string, storeName: string): Promise<string> {
  const d = await fetchDaySummary(storeId);
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const weekRev = await prisma.order.aggregate({ where: { storeId, createdAt: { gte: weekAgo }, status: { not: 'CANCELLED' } }, _sum: { total: true } });
  const weeklyRevenue = Number(weekRev._sum.total || 0);

  const greet = new Date().getHours() < 12 ? 'Good morning' : 'Good afternoon';
  const alerts = [];
  if (d.lowStock.length) alerts.push(`🔴 ${d.lowStock.length} items need restocking (${d.lowStock[0]?.name} is critical)`);
  if (d.expiringCount) alerts.push(`🟡 ${d.expiringCount} batches expire in 3 days`);
  if (d.pendingOrders) alerts.push(`📦 ${d.pendingOrders} orders pending`);

  return `${greet}! Here's your ${storeName} briefing:\n\n**Yesterday:** ${d.todayCount} orders — $${d.todayRevenue.toFixed(2)} revenue\n**7-day total:** $${weeklyRevenue.toFixed(2)}\n\n${alerts.length ? `**Action items:**\n${alerts.join('\n')}` : '✅ No critical alerts — great performance!'}\n\n**Focus for today:**\n${d.lowStock.length ? `1. Restock ${d.lowStock[0]?.name} and ${d.lowStock.length - 1} other items` : '1. Monitor order dispatch times'}\n${d.expiringCount ? `2. Create markdowns for expiring items` : '2. Review customer feedback and loyalty activity'}\n3. Check in with your team at shift start`;
}
