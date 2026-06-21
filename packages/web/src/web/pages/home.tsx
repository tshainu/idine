import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";
import { Sidebar } from "../components/layout/sidebar";
import {
  TrendingUp, ShoppingBag, Users, Clock, CheckCircle,
  XCircle, Utensils, Package, Coffee
} from "lucide-react";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const TEXT = "#F3F4F6";

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="rounded-2xl p-5 flex items-start gap-4 border" style={{ background: SURF, borderColor: BORD }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "22" }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: TEXT }}>{value}</div>
        <div className="text-sm font-medium mt-0.5" style={{ color: MUTED }}>{label}</div>
        {sub && <div className="text-xs mt-1" style={{ color: DIM }}>{sub}</div>}
      </div>
    </div>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: BORD }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function HomePage() {
  const branchId = getBranchId();

  const { data: ordersData } = useQuery({
    queryKey: ["home-orders", branchId],
    queryFn: async () => (await api.orders.$get({ query: { branchId: String(branchId) } })).json(),
    refetchInterval: 30000,
  });
  const { data: menuData } = useQuery({
    queryKey: ["home-menu", branchId],
    queryFn: async () => (await api["menu-items"].$get({ query: { branchId: String(branchId) } })).json(),
  });

  const orders: any[] = (ordersData as any)?.orders || [];
  const menuItems: any[] = (menuData as any)?.items || [];

  const today = new Date().toDateString();
  const todayOrders = orders.filter((o: any) => new Date(o.createdAt).toDateString() === today);
  const todayRevenue = todayOrders.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0);
  const completedToday = todayOrders.filter((o: any) => o.status === "completed" || o.status === "billed");
  const activeOrders = orders.filter((o: any) => o.status === "open" || o.status === "draft");
  const cancelledToday = todayOrders.filter((o: any) => o.status === "cancelled");

  // Order type breakdown
  const dineIn = todayOrders.filter((o: any) => o.type === "dine-in").length;
  const takeaway = todayOrders.filter((o: any) => o.type === "takeaway").length;
  const delivery = todayOrders.filter((o: any) => o.type === "delivery").length;
  const total = dineIn + takeaway + delivery || 1;

  // Top items from order items
  const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  orders.forEach((o: any) => {
    (o.items || []).forEach((it: any) => {
      const key = it.menuItemId || it.name;
      if (!itemMap[key]) itemMap[key] = { name: it.name || `Item #${key}`, qty: 0, revenue: 0 };
      itemMap[key].qty += it.quantity || 1;
      itemMap[key].revenue += (it.price || 0) * (it.quantity || 1);
    });
  });
  const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 6);
  const maxQty = topItems[0]?.qty || 1;

  // Revenue last 7 days
  const last7: { label: string; rev: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toDateString();
    const rev = orders
      .filter((o: any) => new Date(o.createdAt).toDateString() === ds)
      .reduce((s: number, o: any) => s + (Number(o.total) || 0), 0);
    last7.push({ label: d.toLocaleDateString("en", { weekday: "short" }), rev });
  }
  const maxRev = Math.max(...last7.map(d => d.rev), 1);

  // Recent orders
  const recent = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);

  const statusColor: Record<string, string> = {
    open: "#22C55E", draft: "#F5A623", completed: "#38BDF8", billed: "#A78BFA", cancelled: "#EF4444",
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div>
            <div className="font-bold text-base" style={{ color: TEXT }}>Dashboard</div>
            <div className="text-xs" style={{ color: DIM }}>{new Date().toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs" style={{ color: MUTED }}>Live</span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Stat cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Today's Revenue" value={`LKR ${todayRevenue.toLocaleString()}`} sub={`${todayOrders.length} orders`} icon={TrendingUp} color={GOLD} />
            <StatCard label="Active Orders" value={activeOrders.length} sub="Currently open" icon={Clock} color="#22C55E" />
            <StatCard label="Completed" value={completedToday.length} sub="Today" icon={CheckCircle} color="#38BDF8" />
            <StatCard label="Cancelled" value={cancelledToday.length} sub="Today" icon={XCircle} color="#EF4444" />
          </div>

          {/* Revenue chart + Order type breakdown */}
          <div className="grid grid-cols-3 gap-4">
            {/* Bar chart */}
            <div className="col-span-2 rounded-2xl p-5 border" style={{ background: SURF, borderColor: BORD }}>
              <div className="font-semibold text-sm mb-4" style={{ color: TEXT }}>Revenue — Last 7 Days</div>
              <div className="flex items-end gap-2 h-36">
                {last7.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[10px]" style={{ color: DIM }}>
                      {d.rev > 0 ? Math.round(d.rev / 1000) + "k" : ""}
                    </div>
                    <div className="w-full rounded-t-md transition-all" style={{
                      height: `${Math.max((d.rev / maxRev) * 112, 4)}px`,
                      background: i === 6 ? GOLD : "#2D1B4E",
                    }} />
                    <div className="text-[10px]" style={{ color: MUTED }}>{d.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order type */}
            <div className="rounded-2xl p-5 border" style={{ background: SURF, borderColor: BORD }}>
              <div className="font-semibold text-sm mb-4" style={{ color: TEXT }}>Order Types Today</div>
              <div className="space-y-4">
                {[
                  { label: "Dine In", count: dineIn, color: "#22C55E", icon: Utensils },
                  { label: "Takeaway", count: takeaway, color: GOLD, icon: Package },
                  { label: "Delivery", count: delivery, color: "#38BDF8", icon: Coffee },
                ].map(t => (
                  <div key={t.label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: MUTED }}>
                        <t.icon size={12} color={t.color} />
                        {t.label}
                      </div>
                      <span className="text-xs font-bold" style={{ color: t.color }}>{t.count}</span>
                    </div>
                    <MiniBar pct={(t.count / total) * 100} color={t.color} />
                  </div>
                ))}
                <div className="pt-2 border-t text-center" style={{ borderColor: BORD }}>
                  <span className="text-xs" style={{ color: DIM }}>Total: </span>
                  <span className="text-sm font-bold" style={{ color: TEXT }}>{dineIn + takeaway + delivery}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top items + Recent orders */}
          <div className="grid grid-cols-2 gap-4">
            {/* Top items */}
            <div className="rounded-2xl p-5 border" style={{ background: SURF, borderColor: BORD }}>
              <div className="font-semibold text-sm mb-4" style={{ color: TEXT }}>Top Selling Items</div>
              {topItems.length === 0 ? (
                <div className="text-center py-8 text-xs" style={{ color: DIM }}>No sales data yet</div>
              ) : (
                <div className="space-y-3">
                  {topItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: i === 0 ? GOLD : BORD, color: i === 0 ? "#1A0A2E" : MUTED }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" style={{ color: TEXT }}>{item.name}</div>
                        <div className="h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: BORD }}>
                          <div className="h-full rounded-full" style={{ width: `${(item.qty / maxQty) * 100}%`, background: GOLD }} />
                        </div>
                      </div>
                      <div className="text-xs font-bold shrink-0" style={{ color: GOLD }}>{item.qty}x</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent orders */}
            <div className="rounded-2xl p-5 border" style={{ background: SURF, borderColor: BORD }}>
              <div className="font-semibold text-sm mb-4" style={{ color: TEXT }}>Recent Orders</div>
              {recent.length === 0 ? (
                <div className="text-center py-8 text-xs" style={{ color: DIM }}>No orders yet</div>
              ) : (
                <div className="space-y-2">
                  {recent.map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: BORD }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold" style={{ color: GOLD }}>#{o.orderNumber}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{
                          background: (statusColor[o.status] || DIM) + "22",
                          color: statusColor[o.status] || DIM,
                        }}>{o.status}</span>
                      </div>
                      <div className="text-xs font-medium" style={{ color: TEXT }}>
                        LKR {Number(o.total || 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Menu summary */}
          <div className="rounded-2xl p-5 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="font-semibold text-sm mb-3" style={{ color: TEXT }}>Menu Overview</div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: GOLD }}>{menuItems.length}</div>
                <div className="text-xs" style={{ color: MUTED }}>Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: "#22C55E" }}>{menuItems.filter((m: any) => m.available).length}</div>
                <div className="text-xs" style={{ color: MUTED }}>Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: "#EF4444" }}>{menuItems.filter((m: any) => !m.available).length}</div>
                <div className="text-xs" style={{ color: MUTED }}>Unavailable</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
