import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";
import { Sidebar } from "../components/layout/sidebar";
import { Plus, Pencil, Trash2, Search, Phone, User, Star, MapPin, Calendar } from "lucide-react";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const TEXT = "#F3F4F6";

function qualityScore(orderCnt: number, spent: number, createdAt: string | null): number {
  if (orderCnt === 0) return 10; // new customers start at 10
  const base = Math.min(5, orderCnt * 0.5);
  const spendScore = Math.min(3, spent / 5000);
  // regularity bonus: orders per month
  let regularityBonus = 0;
  if (createdAt) {
    const months = Math.max(1, (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
    const opm = orderCnt / months;
    regularityBonus = Math.min(2, opm * 0.5);
  }
  return Math.min(10, parseFloat((base + spendScore + regularityBonus).toFixed(1)));
}

function scoreColor(score: number) {
  if (score >= 8) return "#22C55E";
  if (score >= 5) return "#F5A623";
  return "#EF4444";
}

export default function CustomersPage() {
  const branchId = getBranchId();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: customersData, isLoading } = useQuery({
    queryKey: ["customers", branchId],
    queryFn: async () => (await api.customers.$get({ query: { branchId: String(branchId) } })).json(),
    refetchInterval: 30000,
  });

  const { data: ordersData } = useQuery({
    queryKey: ["sales-orders", branchId],
    queryFn: async () => (await api.orders.$get({ query: { branchId: String(branchId) } })).json(),
  });

  const customers: any[] = (customersData as any)?.customers || [];
  const orders: any[] = (ordersData as any)?.orders || [];

  const filtered = customers.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search) ||
    (c.address || "").toLowerCase().includes(search.toLowerCase())
  );

  function orderCount(customerId: number) {
    return orders.filter(o => o.customerId === customerId).length;
  }
  function totalSpent(customerId: number) {
    return orders.filter(o => o.customerId === customerId).reduce((s, o) => s + (Number(o.total) || 0), 0);
  }
  function ordersPerMonth(customerId: number, createdAt: string | null): string {
    const cnt = orderCount(customerId);
    if (!createdAt || cnt === 0) return "—";
    const months = Math.max(1, (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
    return (cnt / months).toFixed(1) + "/mo";
  }

  const createCustomer = useMutation({
    mutationFn: async (data: any) => (await api.customers.$post({ json: { ...data, branchId } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); resetForm(); },
  });
  const updateCustomer = useMutation({
    mutationFn: async ({ id, data }: any) => (await api.customers[":id"].$patch({ param: { id: String(id) }, json: data })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); resetForm(); },
  });
  const deleteCustomer = useMutation({
    mutationFn: async (id: number) => (await api.customers[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });

  function resetForm() { setShowForm(false); setEditItem(null); setForm({}); }
  function openEdit(c: any) {
    setEditItem(c);
    setForm({ name: c.name, phone: c.phone || "", address: c.address || "" });
    setShowForm(true);
  }
  function handleSubmit() {
    if (!form.name?.trim()) return;
    const data = {
      name: form.name.trim(),
      phone: form.phone?.trim() || null,
      address: form.address?.trim() || null,
    };
    if (editItem) updateCustomer.mutate({ id: editItem.id, data });
    else createCustomer.mutate(data);
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="font-bold text-base" style={{ color: TEXT }}>Customers</div>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: GOLD, color: "#1A0A2E" }}>
            <Plus size={13} />
            Add Customer
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Stats */}
          <div className="flex gap-3 flex-wrap">
            {[
              { label: "Total Customers", value: customers.length, color: GOLD },
              { label: "This Month", value: customers.filter(c => {
                if (!c.createdAt) return false;
                const d = new Date(c.createdAt);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length, color: "#22C55E" },
              { label: "Regulars (≥5 orders)", value: customers.filter(c => orderCount(c.id) >= 5).length, color: "#A78BFA" },
            ].map(s => (
              <div key={s.label} className="px-4 py-2.5 rounded-xl border" style={{ background: SURF, borderColor: BORD }}>
                <span className="text-base font-bold" style={{ color: s.color }}>{s.value}</span>
                <span className="text-xs ml-2" style={{ color: MUTED }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: DIM }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone or address..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
              style={{ background: SURF, borderColor: BORD, color: TEXT }} />
          </div>

          {/* Table */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORD}` }}>
                  {["Customer", "Phone", "Address", "Orders", "Total Spent", "Regularity", "Quality", "Since", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: DIM }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-10 text-xs" style={{ color: DIM }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10" style={{ color: DIM }}>
                    <User size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No customers found</p>
                  </td></tr>
                ) : filtered.map((c: any) => {
                  const cnt = orderCount(c.id);
                  const spent = totalSpent(c.id);
                  const score = qualityScore(cnt, spent, c.createdAt);
                  const color = scoreColor(score);
                  return (
                    <tr key={c.id} className="border-t" style={{ borderColor: BORD }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: "rgba(245,166,35,0.2)", color: GOLD }}>
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium" style={{ color: TEXT }}>{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>
                        {c.phone ? (
                          <span className="flex items-center gap-1"><Phone size={11} />{c.phone}</span>
                        ) : <span style={{ color: DIM }}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED, maxWidth: 140 }}>
                        {c.address ? (
                          <span className="flex items-center gap-1 truncate" title={c.address}>
                            <MapPin size={11} className="shrink-0" />{c.address}
                          </span>
                        ) : <span style={{ color: DIM }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(245,166,35,0.15)", color: GOLD }}>
                          {cnt}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold" style={{ color: "#22C55E" }}>
                        LKR {spent.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>
                        {ordersPerMonth(c.id, c.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Star size={11} color={color} fill={color} />
                          <span className="text-xs font-bold" style={{ color }}>{score}/10</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: DIM }}>
                        {c.createdAt ? (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(c)} className="p-1 rounded" style={{ color: GOLD }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => { if (confirm(`Delete ${c.name}?`)) deleteCustomer.mutate(c.id); }} className="p-1 rounded" style={{ color: "#EF4444" }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-96 rounded-2xl p-6 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="font-bold text-sm mb-4" style={{ color: TEXT }}>{editItem ? "Edit Customer" : "Add Customer"}</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Name *</label>
                <input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="Customer name" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Phone</label>
                <input value={form.phone || ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="07X XXX XXXX" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Address</label>
                <textarea value={form.address || ""} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none resize-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="Street, City..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-xs" style={{ background: BORD, color: MUTED }}>Cancel</button>
              <button onClick={handleSubmit} disabled={!form.name?.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: GOLD, color: "#1A0A2E" }}>
                {editItem ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
