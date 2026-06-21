import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";
import { Sidebar } from "../components/layout/sidebar";
import { Search, Download, Filter } from "lucide-react";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const TEXT = "#F3F4F6";

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

export default function SalesPage() {
  const branchId = getBranchId();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["sales-orders", branchId],
    queryFn: async () => (await api.orders.$get({ query: { branchId: String(branchId) } })).json(),
    refetchInterval: 30000,
  });

  const orders: any[] = (ordersData as any)?.orders || [];

  const filtered = orders.filter((o: any) => {
    const matchSearch = !search || String(o.orderNumber).includes(search) || (o.customerName || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const matchType = filterType === "all" || o.type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const totalRevenue = filtered.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const completedRevenue = filtered.filter(o => o.status === "completed" || o.status === "billed").reduce((s, o) => s + (Number(o.total) || 0), 0);

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
                  {["Order #", "Type", "Customer", "Items", "Total", "Status", "Time"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: DIM }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-xs" style={{ color: DIM }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-xs" style={{ color: DIM }}>No orders found</td></tr>
                ) : (
                  filtered.slice().reverse().map((o: any) => (
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
