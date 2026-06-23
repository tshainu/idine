import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";
import { Sidebar } from "../components/layout/sidebar";
import { Search, Download, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const TEXT = "#F3F4F6";
const PURPLE = "#7C3AED";

const STATUS_COLOR: Record<string, string> = {
  open: "#22C55E",
  draft: "#F5A623",
  completed: "#38BDF8",
  billed: "#A78BFA",
  cancelled: "#EF4444",
};

const TYPE_COLOR: Record<string, string> = {
  "dine-in": "#22C55E",
  takeaway: "#F5A623",
  delivery: "#38BDF8",
};

type DateRange = "today" | "week" | "month" | "year" | "custom";

function getDateBounds(range: DateRange, customFrom: string, customTo: string): { from: Date | null; to: Date | null } {
  const now = new Date();
  if (range === "today") {
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (range === "week") {
    const from = new Date(now);
    from.setDate(now.getDate() - now.getDay());
    from.setHours(0, 0, 0, 0);
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (range === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (range === "year") {
    const from = new Date(now.getFullYear(), 0, 1);
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (range === "custom") {
    const from = customFrom ? new Date(customFrom + "T00:00:00") : null;
    const to = customTo ? new Date(customTo + "T23:59:59") : null;
    return { from, to };
  }
  return { from: null, to: null };
}

type SortKey = "orderNumber" | "type" | "customerName" | "items" | "total" | "status" | "createdAt";
type SortDir = "asc" | "desc";

export default function SalesPage() {
  const branchId = getBranchId();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["sales-orders", branchId],
    queryFn: async () => (await api.orders.$get({ query: { branchId: String(branchId) } })).json(),
    refetchInterval: 30000,
  });

  const orders: any[] = (ordersData as any)?.orders || [];

  const { from: dateBoundsFrom, to: dateBoundsTo } = getDateBounds(dateRange, customFrom, customTo);

  const filtered = orders.filter((o: any) => {
    const matchSearch = !search || String(o.orderNumber).includes(search) || (o.customerName || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const matchType = filterType === "all" || o.type === filterType;
    let matchDate = true;
    if (dateBoundsFrom || dateBoundsTo) {
      const t = new Date(o.createdAt).getTime();
      if (dateBoundsFrom && t < dateBoundsFrom.getTime()) matchDate = false;
      if (dateBoundsTo && t > dateBoundsTo.getTime()) matchDate = false;
    }
    return matchSearch && matchStatus && matchType && matchDate;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av: any, bv: any;
    if (sortKey === "items") { av = (a.items || []).length; bv = (b.items || []).length; }
    else if (sortKey === "total") { av = Number(a.total || 0); bv = Number(b.total || 0); }
    else if (sortKey === "createdAt") { av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime(); }
    else if (sortKey === "orderNumber") { av = Number(a.orderNumber); bv = Number(b.orderNumber); }
    else { av = String(a[sortKey] || ""); bv = String(b[sortKey] || ""); }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalRevenue = filtered.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const completedRevenue = filtered.filter(o => o.status === "completed" || o.status === "billed").reduce((s, o) => s + (Number(o.total) || 0), 0);

  const DATE_RANGES: { key: DateRange; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "year", label: "This Year" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="font-bold text-base" style={{ color: TEXT }}>Sales</div>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: BORD, color: MUTED }}>
            <Download size={13} />
            Export CSV
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Orders", value: filtered.length, color: GOLD },
              { label: "Total Revenue", value: `LKR ${totalRevenue.toLocaleString()}`, color: GOLD },
              { label: "Completed Revenue", value: `LKR ${completedRevenue.toLocaleString()}`, color: "#22C55E" },
              { label: "Cancelled", value: filtered.filter(o => o.status === "cancelled").length, color: "#EF4444" },
            ].map(c => (
              <div key={c.label} className="rounded-xl p-4 border" style={{ background: SURF, borderColor: BORD }}>
                <div className="text-xl font-bold" style={{ color: c.color }}>{c.value}</div>
                <div className="text-xs mt-0.5" style={{ color: MUTED }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Date range toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            {DATE_RANGES.map(r => (
              <button
                key={r.key}
                onClick={() => setDateRange(r.key)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: dateRange === r.key ? PURPLE : BORD,
                  color: dateRange === r.key ? "#fff" : MUTED,
                  border: `1px solid ${dateRange === r.key ? PURPLE : BORD}`,
                }}
              >
                {r.label}
              </button>
            ))}
            {dateRange === "custom" && (
              <div className="flex items-center gap-2 ml-1">
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border outline-none"
                  style={{ background: SURF, borderColor: BORD, color: TEXT }}
                />
                <span className="text-xs" style={{ color: DIM }}>to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border outline-none"
                  style={{ background: SURF, borderColor: BORD, color: TEXT }}
                />
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: DIM }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search order # or customer..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                style={{ background: SURF, borderColor: BORD, color: TEXT }}
              />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border outline-none"
              style={{ background: SURF, borderColor: BORD, color: MUTED }}>
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="billed">Billed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border outline-none"
              style={{ background: SURF, borderColor: BORD, color: MUTED }}>
              <option value="all">All Types</option>
              <option value="dine-in">Dine In</option>
              <option value="takeaway">Takeaway</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>

          {/* Table */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORD}` }}>
                  {([ 
                    { label: "Order #", key: "orderNumber" },
                    { label: "Type", key: "type" },
                    { label: "Customer", key: "customerName" },
                    { label: "Items", key: "items" },
                    { label: "Total", key: "total" },
                    { label: "Status", key: "status" },
                    { label: "Time", key: "createdAt" },
                  ] as { label: string; key: SortKey }[]).map(h => (
                    <th key={h.key}
                      className="px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none"
                      style={{ color: sortKey === h.key ? GOLD : DIM }}
                      onClick={() => handleSort(h.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {h.label}
                        {sortKey === h.key
                          ? (sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)
                          : <ArrowUpDown size={11} style={{ opacity: 0.35 }} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-xs" style={{ color: DIM }}>Loading...</td></tr>
                ) : sorted.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-xs" style={{ color: DIM }}>No orders found</td></tr>
                ) : (
                  sorted.map((o: any) => (
                    <tr key={o.id} className="border-t" style={{ borderColor: BORD }}>
                      <td className="px-4 py-3 font-mono font-bold text-xs" style={{ color: GOLD }}>#{o.orderNumber}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: (TYPE_COLOR[o.type] || DIM) + "22", color: TYPE_COLOR[o.type] || DIM }}>
                          {o.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{o.customerName || "—"}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{(o.items || []).length}</td>
                      <td className="px-4 py-3 text-xs font-semibold" style={{ color: TEXT }}>LKR {Number(o.total || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: (STATUS_COLOR[o.status] || DIM) + "22", color: STATUS_COLOR[o.status] || DIM }}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: DIM }}>
                        {new Date(o.createdAt).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
