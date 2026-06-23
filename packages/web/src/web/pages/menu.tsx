/**
 * /menu?branch=1&table=T1
 * Public QR Menu — no auth required.
 * Customers browse, add to cart, and place orders.
 */
import { useState, useEffect, useMemo } from "react";
import { useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ShoppingCart, Plus, Minus, X, ChevronRight, Check, UtensilsCrossed, Search } from "lucide-react";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const TEXT = "#F3F4F6";

type CartItem = {
  menuItemId: number;
  name: string;
  price: number;
  qty: number;
  notes: string;
};

function parseSearch(search: string) {
  const p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return { branch: p.get("branch"), table: p.get("table") };
}

export default function MenuPage() {
  const search = useSearch();
  const { branch, table } = parseSearch(search);
  const branchId = branch ? parseInt(branch) : null;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [tableNotes, setTableNotes] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [placed, setPlaced] = useState(false);
  const [orderNum, setOrderNum] = useState("");

  // Fetch menu items
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ["menu-items-public", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const r = await fetch(`/api/menu-items?branchId=${branchId}`);
      return r.json();
    },
  });

  // Fetch categories
  const { data: catData } = useQuery({
    queryKey: ["categories-public", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const r = await fetch(`/api/categories?branchId=${branchId}`);
      return r.json();
    },
  });

  // Fetch branch info
  const { data: branchData } = useQuery({
    queryKey: ["branch-public", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const r = await fetch(`/api/branches`);
      return r.json();
    },
  });

  const allItems: any[] = (itemsData?.menuItems || []).filter((i: any) => i.isActive !== false && i.is_active !== 0);
  const categories: any[] = catData?.categories || [];
  const branchName = branchData?.branches?.[0]?.name || "Restaurant";

  // Auto-select first category
  useEffect(() => {
    if (categories.length > 0 && activeCategory === null) {
      setActiveCategory(categories[0].id);
    }
  }, [categories]);

  const filteredItems = useMemo(() => {
    let items = allItems;
    if (searchQ) {
      items = items.filter(i => i.name.toLowerCase().includes(searchQ.toLowerCase()));
    } else if (activeCategory !== null) {
      items = items.filter(i => i.categoryId === activeCategory || i.category_id === activeCategory);
    }
    return items;
  }, [allItems, activeCategory, searchQ]);

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  function addToCart(item: any) {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) return prev.map(c => c.menuItemId === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: Number(item.price), qty: 1, notes: "" }];
    });
  }
  function removeFromCart(id: number) {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === id);
      if (!existing) return prev;
      if (existing.qty <= 1) return prev.filter(c => c.menuItemId !== id);
      return prev.map(c => c.menuItemId === id ? { ...c, qty: c.qty - 1 } : c);
    });
  }
  function getQty(id: number) {
    return cart.find(c => c.menuItemId === id)?.qty ?? 0;
  }

  const placeOrder = useMutation({
    mutationFn: async () => {
      // Find table id from name
      const tablesRes = await fetch(`/api/tables?branchId=${branchId}`);
      const tablesJson = await tablesRes.json();
      const tableObj = (tablesJson.tables || []).find((t: any) => t.name === table);
      const tableId = tableObj?.id ?? null;

      const total = subtotal;
      // Create order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          orderNumber: "TEMP",
          type: "dine-in",
          status: "pending",
          source: "qr",
          tableId,
          customerName: customerName.trim() || `Table ${table}`,
          notes: tableNotes.trim() || null,
          subtotal: total,
          total,
        }),
      });
      const orderJson = await orderRes.json();
      const orderId = orderJson.order.id;
      const orderNumber = orderJson.order.orderNumber;

      // Create order items
      await fetch("/api/order-items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(i => ({
            orderId,
            menuItemId: i.menuItemId,
            name: i.name,
            price: i.price,
            qty: i.qty,
            total: i.price * i.qty,
            modifiers: null,
            printerId: null,
          })),
        }),
      });

      return orderNumber;
    },
    onSuccess: (num) => {
      setOrderNum(num);
      setPlaced(true);
      setCart([]);
      setShowCart(false);
    },
  });

  if (!branchId || !table) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center p-8">
          <UtensilsCrossed size={48} className="mx-auto mb-4 opacity-30" style={{ color: GOLD }} />
          <p className="text-sm" style={{ color: MUTED }}>Invalid QR code. Please scan the QR code at your table.</p>
        </div>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center p-8 max-w-sm">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "#22C55E22" }}>
            <Check size={40} style={{ color: "#22C55E" }} />
          </div>
          <div className="text-xl font-bold mb-2" style={{ color: TEXT }}>Order Placed!</div>
          <div className="text-xs mb-1" style={{ color: MUTED }}>Order #{orderNum}</div>
          <div className="text-xs mb-6" style={{ color: DIM }}>Table {table}</div>
          <p className="text-sm mb-6" style={{ color: MUTED }}>
            Your order has been sent to our team. We'll bring it to your table shortly.
          </p>
          <button
            onClick={() => { setPlaced(false); setCustomerName(""); setTableNotes(""); }}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: GOLD, color: "#1A0A2E" }}>
            Order More
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: BG }}>
      {/* Header */}
      <div className="sticky top-0 z-30 border-b px-4 py-3" style={{ background: SURF, borderColor: BORD }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <div className="font-bold text-sm" style={{ color: TEXT }}>{branchName}</div>
            <div className="text-[11px] flex items-center gap-1" style={{ color: GOLD }}>
              <UtensilsCrossed size={10} /> Table {table}
            </div>
          </div>
          {totalItems > 0 && (
            <button onClick={() => setShowCart(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold relative"
              style={{ background: GOLD, color: "#1A0A2E" }}>
              <ShoppingCart size={14} />
              <span>{totalItems} item{totalItems > 1 ? "s" : ""}</span>
              <span className="font-bold">• LKR {subtotal.toLocaleString()}</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: DIM }} />
          <input
            value={searchQ}
            onChange={e => { setSearchQ(e.target.value); setActiveCategory(null); }}
            placeholder="Search menu..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none"
            style={{ background: SURF, borderColor: BORD, color: TEXT }}
          />
          {searchQ && <button onClick={() => setSearchQ("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={13} style={{ color: DIM }} /></button>}
        </div>

        {/* Category pills */}
        {!searchQ && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {categories.map((cat: any) => (
              <button key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={{
                  background: activeCategory === cat.id ? GOLD : SURF,
                  color: activeCategory === cat.id ? "#1A0A2E" : MUTED,
                  borderColor: activeCategory === cat.id ? GOLD : BORD,
                }}>
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Items grid */}
        {itemsLoading ? (
          <div className="text-center py-16 text-sm" style={{ color: DIM }}>Loading menu...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <UtensilsCrossed size={36} className="mx-auto mb-3 opacity-20" style={{ color: DIM }} />
            <p className="text-sm" style={{ color: DIM }}>No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item: any) => {
              const qty = getQty(item.id);
              const price = Number(item.price);
              return (
                <div key={item.id} className="rounded-2xl border flex flex-col overflow-hidden"
                  style={{ background: SURF, borderColor: BORD }}>
                  {/* Image */}
                  <div className="w-full aspect-square flex items-center justify-center overflow-hidden"
                    style={{ background: GOLD + "12" }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <UtensilsCrossed size={32} style={{ color: GOLD + "60" }} />
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3 flex flex-col flex-1">
                    <div className="text-xs font-semibold leading-snug mb-1" style={{ color: TEXT }}>{item.name}</div>
                    {item.description && (
                      <div className="text-[10px] line-clamp-1 mb-1" style={{ color: DIM }}>{item.description}</div>
                    )}
                    <div className="text-sm font-bold mt-auto mb-2" style={{ color: GOLD }}>
                      {price > 0 ? `LKR ${price.toLocaleString()}` : "Market price"}
                    </div>
                    {/* Add / qty */}
                    {qty === 0 ? (
                      <button onClick={() => addToCart(item)}
                        className="w-full py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                        style={{ background: GOLD, color: "#1A0A2E" }}>
                        <Plus size={13} /> Add
                      </button>
                    ) : (
                      <div className="flex items-center justify-between">
                        <button onClick={() => removeFromCart(item.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border"
                          style={{ borderColor: BORD, color: MUTED }}>
                          <Minus size={13} />
                        </button>
                        <span className="text-sm font-bold" style={{ color: TEXT }}>{qty}</span>
                        <button onClick={() => addToCart(item)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: GOLD, color: "#1A0A2E" }}>
                          <Plus size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating cart button (mobile) */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-20">
          <div className="max-w-lg mx-auto">
            <button onClick={() => setShowCart(true)}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl font-semibold shadow-xl"
              style={{ background: GOLD, color: "#1A0A2E" }}>
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} />
                <span className="text-sm">{totalItems} item{totalItems > 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <span>LKR {subtotal.toLocaleString()}</span>
                <ChevronRight size={16} />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Cart Sheet */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowCart(false); }}>
          <div className="max-w-lg mx-auto w-full rounded-t-3xl overflow-hidden flex flex-col"
            style={{ background: SURF, maxHeight: "90vh" }}>
            {/* Sheet header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: BORD }}>
              <div className="font-bold text-sm" style={{ color: TEXT }}>Your Order · Table {table}</div>
              <button onClick={() => setShowCart(false)}><X size={18} style={{ color: MUTED }} /></button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {cart.map(item => (
                <div key={item.menuItemId} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => removeFromCart(item.menuItemId)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center border"
                      style={{ borderColor: BORD, color: MUTED }}>
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center text-sm font-bold" style={{ color: TEXT }}>{item.qty}</span>
                    <button onClick={() => addToCart({ id: item.menuItemId, name: item.name, price: item.price, isActive: true })}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: GOLD, color: "#1A0A2E" }}>
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium" style={{ color: TEXT }}>{item.name}</div>
                  </div>
                  <div className="text-xs font-bold shrink-0" style={{ color: GOLD }}>
                    LKR {(item.price * item.qty).toLocaleString()}
                  </div>
                  <button onClick={() => setCart(c => c.filter(ci => ci.menuItemId !== item.menuItemId))}
                    className="p-1" style={{ color: "#EF444480" }}>
                    <X size={13} />
                  </button>
                </div>
              ))}

              {/* Customer name */}
              <div className="mt-4 pt-4 border-t" style={{ borderColor: BORD }}>
                <label className="text-xs mb-1.5 block" style={{ color: MUTED }}>Your Name (optional)</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. John"
                  className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} />
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: MUTED }}>Special Instructions (optional)</label>
                <textarea value={tableNotes} onChange={e => setTableNotes(e.target.value)}
                  placeholder="e.g. No spicy, extra sauce..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl border outline-none resize-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} />
              </div>
            </div>

            {/* Total + Place order */}
            <div className="px-5 py-4 border-t shrink-0" style={{ borderColor: BORD }}>
              <div className="flex justify-between text-sm mb-4">
                <span style={{ color: MUTED }}>Total</span>
                <span className="font-bold" style={{ color: GOLD }}>LKR {subtotal.toLocaleString()}</span>
              </div>
              <button
                onClick={() => placeOrder.mutate()}
                disabled={placeOrder.isPending || cart.length === 0}
                className="w-full py-3.5 rounded-2xl text-sm font-bold disabled:opacity-60"
                style={{ background: GOLD, color: "#1A0A2E" }}>
                {placeOrder.isPending ? "Placing order..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
