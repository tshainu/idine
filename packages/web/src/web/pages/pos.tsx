import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";
import { Spinner } from "../components/ui/spinner";
import {
  Search, Plus, Minus, Pencil, RotateCcw, FileText, Receipt, Printer,
  Ban, Edit3, Info, UtensilsCrossed, ShoppingBag, Truck, Grid3x3,
  Calendar, Eye, RefreshCw, Camera, X,
  LogOut, Globe, FolderOpen, Clock, Briefcase, Bell, Monitor, Menu, Scissors,
} from "lucide-react";

type OrderType = "dine-in" | "takeaway" | "delivery";
type CartItem = { menuItemId: number; name: string; price: number; qty: number; discount: number; printerId: number | null };

export default function POSPage() {
  const branchId = getBranchId();
  const qc = useQueryClient();

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderType, setOrderType] = useState<OrderType>("dine-in");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  // ---- Queries ----
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", branchId],
    queryFn: async () => (await api.orders.$get({ query: { branchId: String(branchId) } })).json(),
    refetchInterval: 10000,
  });
  const { data: categoriesData } = useQuery({
    queryKey: ["categories", branchId],
    queryFn: async () => (await api.categories.$get({ query: { branchId: String(branchId) } })).json(),
  });
  const { data: menuData } = useQuery({
    queryKey: ["menu-items", branchId, categoryId],
    queryFn: async () => {
      const q: Record<string, string> = { branchId: String(branchId) };
      if (categoryId) q.categoryId = String(categoryId);
      return (await api["menu-items"].$get({ query: q })).json();
    },
  });
  const { data: tablesData } = useQuery({
    queryKey: ["tables", branchId],
    queryFn: async () => (await api.tables.$get({ query: { branchId: String(branchId) } })).json(),
  });
  const { data: usersData } = useQuery({
    queryKey: ["users", branchId],
    queryFn: async () => (await api.users.$get({ query: { branchId: String(branchId) } })).json(),
  });

  // ---- Mutations ----
  const placeOrder = useMutation({
    mutationFn: async (status: string) => {
      const subtotal = cartItems.reduce((s, i) => s + (i.qty * i.price - i.discount), 0);
      const order = await (await api.orders.$post({
        json: { branchId, type: orderType, status, tableId: selectedTableId, waiterId: selectedWaiterId, customerName, subtotal, total: subtotal },
      })).json();
      const orderId = (order as any).order.id;
      await (await api["order-items"].bulk.$post({
        json: {
          items: cartItems.map(i => ({
            orderId, menuItemId: i.menuItemId, name: i.name, price: i.price,
            qty: i.qty, printerId: i.printerId, total: i.qty * i.price - i.discount,
          })),
        },
      })).json();
      if (status !== "draft") {
        const printerGroups = cartItems.reduce((acc, item) => {
          if (item.printerId) { (acc[item.printerId] ||= []).push(item); }
          return acc;
        }, {} as Record<number, CartItem[]>);
        const jobs = Object.entries(printerGroups).map(([pid, items]) => ({
          branchId, orderId, printerId: parseInt(pid),
          idempotencyKey: `${orderId}-${pid}-kot-1`, type: "kot", status: "pending",
          payload: JSON.stringify({ orderId, orderNumber: (order as any).order.orderNumber, type: orderType, tableId: selectedTableId, items }),
        }));
        if (jobs.length > 0) await (await api["print-jobs"].batch.$post({ json: { jobs } })).json();
      }
      return order;
    },
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      resetOrder();
      showNotification(status === "draft" ? "Order saved as draft" : "Order placed! KOT sent to kitchen.");
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      (await api.orders[":id"].$patch({ param: { id: String(id) }, json: { status } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });

  const reprintKOT = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await (await api.orders[":id"].$get({ param: { id: String(orderId) } })).json() as any;
      const { order, items } = res;
      const printerGroups = (items || []).reduce((acc: any, item: any) => {
        if (item.printerId) { (acc[item.printerId] ||= []).push(item); }
        return acc;
      }, {});
      const ts = Date.now();
      const jobs = Object.entries(printerGroups).map(([pid, pitems]: any) => ({
        branchId, orderId, printerId: parseInt(pid),
        idempotencyKey: `${orderId}-${pid}-kot-reprint-${ts}`, type: "reprint", status: "pending",
        payload: JSON.stringify({ orderId, orderNumber: order.orderNumber, type: order.type, items: pitems }),
      }));
      if (jobs.length > 0) await (await api["print-jobs"].batch.$post({ json: { jobs } })).json();
    },
    onSuccess: () => showNotification("KOT reprint queued"),
  });

  function resetOrder() {
    setCartItems([]); setOrderType("dine-in"); setSelectedTableId(null);
    setCustomerName("Walk-in Customer"); setSelectedOrderId(null);
  }
  function showNotification(msg: string) { setNotification(msg); setTimeout(() => setNotification(null), 2800); }
  function addToCart(item: any) {
    setCartItems(prev => {
      const ex = prev.find(i => i.menuItemId === item.id);
      if (ex) return prev.map(i => i.menuItemId === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, qty: 1, discount: 0, printerId: item.printerId }];
    });
  }
  function changeQty(id: number, delta: number) {
    setCartItems(prev => prev.map(i => i.menuItemId === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));
  }
  function setDiscount(id: number, val: number) {
    setCartItems(prev => prev.map(i => i.menuItemId === id ? { ...i, discount: isNaN(val) ? 0 : val } : i));
  }
  function removeItem(id: number) { setCartItems(prev => prev.filter(i => i.menuItemId !== id)); }

  const total = cartItems.reduce((s, i) => s + (i.qty * i.price - i.discount), 0);
  const orders = (ordersData as any)?.orders || [];
  const categories = (categoriesData as any)?.categories || [];
  const menuItems = ((menuData as any)?.menuItems || []).filter((item: any) => {
    if (activeFilter === "veg" && !item.isVeg) return false;
    if (activeFilter === "bev" && !item.isBeverage) return false;
    if (activeFilter === "promo" && !item.isPromo) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  const tables = (tablesData as any)?.tables || [];
  const waiters = ((usersData as any)?.users || []).filter((u: any) => u.role === "waiter" || u.role === "manager");
  const filteredOrders = orders.filter((o: any) =>
    !orderSearch ||
    o.orderNumber?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customerName?.toLowerCase().includes(orderSearch.toLowerCase())
  );

  const TOOLBAR_ICONS = [LogOut, Globe, FolderOpen, Printer, Clock, Briefcase, Grid3x3, Monitor, Bell, Receipt, Monitor, Monitor, Scissors, Menu];
  const TABS: { key: OrderType; label: string; icon: any }[] = [
    { key: "dine-in", label: "Dine In", icon: Grid3x3 },
    { key: "takeaway", label: "Take Away", icon: ShoppingBag },
    { key: "delivery", label: "Delivery", icon: Truck },
  ];
  const FILTER_PILLS = [
    { key: "online", label: "Online", color: "#22C55E" },
    { key: "veg", label: "Vegetarian", color: "#22C55E" },
    { key: "bev", label: "Beverage", color: "#6B7280" },
    { key: "combo", label: "Combo", color: "#F5A623" },
    { key: "promo", label: "Promo", color: "#F472B6" },
  ];

  // Dark theme tokens (inline for clarity)
  const BG = "var(--color-bg)";           // #0D0618
  const SURF = "var(--color-surface)";    // #1A0A2E
  const SURF2 = "var(--color-surface-2)"; // #241040
  const BORD = "var(--color-border)";     // #3D1F6E
  const GOLD = "var(--color-gold)";       // #F5A623
  const TEXT = "var(--color-text)";       // #F8F4FF
  const MUTED = "var(--color-text-muted)"; // #A898C8
  const DIM = "var(--color-text-dim)";    // #6B5A8E

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: BG }}>

      {/* Toast */}
      {notification && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-lg font-semibold text-sm animate-fade-up"
          style={{ background: GOLD, color: "#1A0A2E" }}>
          {notification}
        </div>
      )}

      {/* ===== TOP TOOLBAR ===== */}
      <div className="flex items-center h-10 px-2 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
        <div className="flex items-center gap-0.5">
          {TOOLBAR_ICONS.map((Icon, i) => (
            <button key={i} className="w-7 h-7 flex items-center justify-center rounded transition-colors"
              style={{ color: MUTED }}
              onMouseEnter={e => (e.currentTarget.style.background = SURF2)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Icon size={15} />
            </button>
          ))}
        </div>
        <div className="ml-3 px-3 py-1 rounded text-sm font-bold" style={{ color: GOLD }}>
          Delizz Restaurant
        </div>
        <div className="ml-auto flex items-center gap-1.5 pr-1">
          {FILTER_PILLS.map(p => (
            <button key={p.key}
              onClick={() => setActiveFilter(activeFilter === p.key ? null : p.key)}
              className="px-3 py-1 rounded text-xs font-semibold transition-all"
              style={{
                background: activeFilter === p.key ? p.color : p.color + "22",
                color: activeFilter === p.key ? "#fff" : p.color,
                border: `1px solid ${p.color}`,
                opacity: activeFilter && activeFilter !== p.key ? 0.5 : 1,
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div className="flex flex-1 overflow-hidden">

        {/* ---- LEFT: Running Orders ---- */}
        <div className="w-56 flex flex-col border-r shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: BORD }}>
            <span className="font-semibold text-sm" style={{ color: GOLD }}>Running Orders</span>
            <button onClick={() => qc.invalidateQueries({ queryKey: ["orders"] })} style={{ color: MUTED }}>
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="px-2 py-1.5 border-b" style={{ borderColor: BORD }}>
            <input
              className="w-full px-2.5 py-1.5 rounded text-xs border focus:outline-none"
              style={{ background: SURF2, color: TEXT, borderColor: BORD }}
              placeholder="Table, Order No, Waiter…"
              value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
            />
          </div>

          {/* Order list */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {ordersLoading
              ? <div className="flex justify-center p-6"><Spinner /></div>
              : filteredOrders.length === 0
                ? <div className="text-center p-6 text-xs" style={{ color: DIM }}>No running orders</div>
                : filteredOrders.map((order: any) => (
                  <button key={order.id}
                    onClick={() => setSelectedOrderId(selectedOrderId === order.id ? null : order.id)}
                    className="w-full p-2 rounded text-left transition-all"
                    style={{
                      background: selectedOrderId === order.id ? SURF2 : "transparent",
                      border: `1px solid ${selectedOrderId === order.id ? GOLD : BORD}`,
                    }}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs font-mono" style={{ color: GOLD }}>{order.orderNumber}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-white"
                        style={{ background: order.type === "dine-in" ? "#22C55E" : order.type === "takeaway" ? "#F5A623" : "#38BDF8" }}>
                        {order.type === "dine-in" ? "Dine" : order.type === "takeaway" ? "Take" : "Deliv"}
                      </span>
                    </div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: MUTED }}>{order.customerName}</div>
                    {order.tableId && <div className="text-[10px] mt-0.5" style={{ color: DIM }}>Table {order.tableId}</div>}
                  </button>
                ))
            }
          </div>

          {/* Action buttons */}
          <div className="p-2 space-y-1 border-t" style={{ borderColor: BORD }}>
            <Btn icon={Edit3} label="Modify Order" />
            <Btn icon={Info} label="Order Details" />
            <Btn icon={RotateCcw} label="Re-print KOT" onClick={() => selectedOrderId && reprintKOT.mutate(selectedOrderId)} />
            <div className="grid grid-cols-2 gap-1">
              <Btn icon={Receipt} label="Invoice" />
              <Btn icon={Printer} label="Bill" />
            </div>
            <Btn icon={Ban} label="Cancel Order" danger
              onClick={() => selectedOrderId && confirm("Cancel this order?") && updateOrderStatus.mutate({ id: selectedOrderId, status: "cancelled" })} />
          </div>
        </div>

        {/* ---- CENTER: Order entry ---- */}
        <div className="flex-1 flex flex-col min-w-0 border-r" style={{ borderColor: BORD }}>

          {/* Order type tabs */}
          <div className="flex border-b" style={{ borderColor: BORD }}>
            {TABS.map(t => {
              const Icon = t.icon;
              const active = orderType === t.key;
              return (
                <button key={t.key} onClick={() => setOrderType(t.key)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-all"
                  style={{
                    background: active ? SURF2 : "transparent",
                    color: active ? GOLD : MUTED,
                    borderBottomColor: active ? GOLD : "transparent",
                  }}>
                  <Icon size={13} /> {t.label}
                </button>
              );
            })}
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-all"
              style={{ background: "transparent", color: MUTED, borderBottomColor: "transparent" }}>
              <Grid3x3 size={13} /> Table
            </button>
          </div>

          {/* Waiter + customer + table row */}
          <div className="flex items-center gap-2 p-2 border-b" style={{ borderColor: BORD }}>
            <select className="flex-1 px-2 py-1.5 rounded border text-xs focus:outline-none"
              style={{ background: SURF2, color: TEXT, borderColor: BORD }}
              value={selectedWaiterId || ""} onChange={e => setSelectedWaiterId(e.target.value ? parseInt(e.target.value) : null)}>
              <option value="">Waiter</option>
              {waiters.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <select className="flex-1 px-2 py-1.5 rounded border text-xs focus:outline-none"
              style={{ background: SURF2, color: TEXT, borderColor: BORD }}
              value={customerName} onChange={e => setCustomerName(e.target.value)}>
              <option value="Walk-in Customer">Walk-in Customer</option>
            </select>
            {orderType === "dine-in" && (
              <select className="px-2 py-1.5 rounded border text-xs focus:outline-none"
                style={{ background: SURF2, color: TEXT, borderColor: BORD }}
                value={selectedTableId || ""} onChange={e => setSelectedTableId(e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">Table</option>
                {tables.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            <button className="w-8 h-8 flex items-center justify-center rounded border" style={{ borderColor: BORD, color: MUTED }}>
              <Pencil size={13} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded" style={{ background: GOLD, color: "#1A0A2E" }}>
              <Plus size={16} />
            </button>
          </div>

          {/* Cart table */}
          <div className="flex-1 overflow-y-auto">
            {cartItems.length === 0
              ? <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: DIM }}>
                  <UtensilsCrossed size={38} strokeWidth={1} />
                  <p className="text-sm">Select items from the menu</p>
                </div>
              : <table className="w-full text-sm">
                  <thead className="sticky top-0" style={{ background: SURF }}>
                    <tr style={{ color: MUTED }} className="text-xs font-semibold">
                      <th className="text-left px-3 py-2">Item</th>
                      <th className="text-right px-2 py-2">Price</th>
                      <th className="text-center px-2 py-2">Qty</th>
                      <th className="text-center px-2 py-2">Discount</th>
                      <th className="text-right px-2 py-2">Total</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item) => (
                      <tr key={item.menuItemId} className="border-t animate-fade-up" style={{ borderColor: BORD }}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <Pencil size={11} style={{ color: DIM }} />
                            <span className="text-xs font-medium" style={{ color: TEXT }}>{item.name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-xs text-right font-mono" style={{ color: MUTED }}>{item.price.toFixed(2)}</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => changeQty(item.menuItemId, -1)}
                              className="w-5 h-5 flex items-center justify-center rounded border transition-colors"
                              style={{ borderColor: BORD, color: TEXT }}><Minus size={9} /></button>
                            <span className="w-5 text-center text-xs font-bold" style={{ color: TEXT }}>{item.qty}</span>
                            <button onClick={() => changeQty(item.menuItemId, 1)}
                              className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                              style={{ background: GOLD, color: "#1A0A2E" }}><Plus size={9} /></button>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" placeholder="0" value={item.discount || ""}
                            onChange={e => setDiscount(item.menuItemId, parseFloat(e.target.value))}
                            className="w-14 px-1.5 py-1 rounded border text-xs text-center focus:outline-none"
                            style={{ background: SURF2, borderColor: BORD, color: TEXT }} />
                        </td>
                        <td className="px-2 py-2 text-xs text-right font-mono font-bold" style={{ color: GOLD }}>
                          {(item.qty * item.price - item.discount).toFixed(2)}
                        </td>
                        <td className="px-2 py-2">
                          <button onClick={() => removeItem(item.menuItemId)}
                            className="w-5 h-5 flex items-center justify-center rounded-full text-white"
                            style={{ background: "var(--color-danger)" }}><X size={10} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>

          {/* Total payable */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t" style={{ background: SURF, borderColor: BORD }}>
            <button className="w-7 h-7 flex items-center justify-center rounded border" style={{ borderColor: BORD, color: MUTED }}><Calendar size={13} /></button>
            <button className="w-7 h-7 flex items-center justify-center rounded border" style={{ borderColor: BORD, color: MUTED }}><Eye size={13} /></button>
            <span className="ml-auto font-bold text-base" style={{ color: TEXT }}>
              Total Payable: <span style={{ color: GOLD }}>{total.toFixed(2)}</span>
            </span>
          </div>

          {/* Bottom action buttons */}
          <div className="flex">
            <button onClick={resetOrder}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
              style={{ background: "var(--color-danger)" }}>
              <X size={14} /> Cancel
            </button>
            <button onClick={() => placeOrder.mutate("draft")} disabled={cartItems.length === 0 || placeOrder.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
              style={{ background: "var(--color-purple)" }}>
              <FileText size={14} /> Draft
            </button>
            <button disabled={cartItems.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
              style={{ background: "#38BDF8" }}>
              <Receipt size={14} /> Quick Invoice
            </button>
            <button onClick={() => placeOrder.mutate("confirmed")} disabled={cartItems.length === 0 || placeOrder.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
              style={{ background: "var(--color-success)" }}>
              {placeOrder.isPending ? <Spinner size={14} /> : <><UtensilsCrossed size={14} /> Place Order</>}
            </button>
          </div>
        </div>

        {/* ---- RIGHT: Menu ---- */}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: BG }}>
          {/* Search */}
          <div className="p-2 border-b" style={{ borderColor: BORD }}>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: DIM }} />
              <input className="w-full pl-8 pr-3 py-2 rounded border text-xs focus:outline-none"
                style={{ background: SURF2, color: TEXT, borderColor: BORD }}
                placeholder="Name or Code or Category…"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Category column */}
            <div className="w-44 shrink-0 overflow-y-auto border-r py-1" style={{ borderColor: BORD, background: SURF }}>
              {[{ id: null, name: "All" }, ...categories].map((cat: any) => {
                const active = categoryId === cat.id;
                return (
                  <button key={cat.id ?? "all"} onClick={() => setCategoryId(cat.id)}
                    className="w-full px-3 py-2 text-left text-xs transition-colors"
                    style={{
                      background: active ? SURF2 : "transparent",
                      color: active ? GOLD : MUTED,
                      fontWeight: active ? 600 : 400,
                      borderLeft: active ? `3px solid ${GOLD}` : "3px solid transparent",
                    }}>
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {/* Menu grid */}
            <div className="flex-1 overflow-y-auto p-2">
              {menuItems.length === 0
                ? <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: DIM }}>
                    <Camera size={36} strokeWidth={1} />
                    <p className="text-xs">No items found</p>
                  </div>
                : <div className="grid grid-cols-3 gap-2">
                    {menuItems.map((item: any) => {
                      const inCart = cartItems.find(i => i.menuItemId === item.id);
                      return (
                        <button key={item.id} onClick={() => addToCart(item)}
                          className="rounded-xl border overflow-hidden text-left transition-all hover:brightness-110 hover:-translate-y-0.5"
                          style={{
                            background: SURF2,
                            borderColor: inCart ? GOLD : BORD,
                            boxShadow: inCart ? `0 0 0 2px ${GOLD}44` : "none",
                          }}>
                          <div className="w-full aspect-[4/3] flex items-center justify-center relative"
                            style={{ background: SURF }}>
                            {item.imageUrl
                              ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                              : <Camera size={32} strokeWidth={1} style={{ color: DIM }} />}
                            {inCart && (
                              <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                                style={{ background: GOLD, color: "#1A0A2E" }}>
                                {inCart.qty}
                              </span>
                            )}
                          </div>
                          <div className="px-2 py-1.5">
                            <div className="text-xs font-semibold truncate" style={{ color: TEXT }}>{item.name}</div>
                            <div className="text-xs font-bold font-mono mt-0.5" style={{ color: GOLD }}>{item.price.toFixed(2)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
              }
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function Btn({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick?: () => void; danger?: boolean }) {
  const SURF2 = "var(--color-surface-2)";
  const BORD = "var(--color-border)";
  const MUTED = "var(--color-text-muted)";
  return (
    <button onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded border text-xs font-medium transition-all hover:brightness-110"
      style={{
        background: danger ? "var(--color-danger)22" : SURF2,
        color: danger ? "var(--color-danger)" : MUTED,
        borderColor: danger ? "var(--color-danger)" : BORD,
      }}>
      <Icon size={11} /> {label}
    </button>
  );
}
