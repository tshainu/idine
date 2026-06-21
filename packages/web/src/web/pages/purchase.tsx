import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";
import { Sidebar } from "../components/layout/sidebar";
import { Plus, Pencil, Trash2, Search, Package } from "lucide-react";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const TEXT = "#F3F4F6";

const today = () => new Date().toISOString().split("T")[0];

export default function PurchasePage() {
  const branchId = getBranchId();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({ purchaseDate: today(), qty: 1, unitCost: 0 });

  const { data: purchasesData, isLoading } = useQuery({
    queryKey: ["purchases", branchId],
    queryFn: async () => {
      const res = await fetch(`/api/purchases?branchId=${branchId}`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  const purchases: any[] = (purchasesData as any)?.purchases || [];
  const filtered = purchases.filter(p =>
    !search ||
    p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
    p.itemDescription.toLowerCase().includes(search.toLowerCase())
  );

  const totalThisMonth = purchases.filter(p => {
    const d = new Date(p.purchaseDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, p) => s + (Number(p.total) || 0), 0);

  const createPurchase = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, branchId }) });
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchases"] }); resetForm(); },
  });
  const updatePurchase = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await fetch(`/api/purchases/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchases"] }); resetForm(); },
  });
  const deletePurchase = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/purchases/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchases"] }),
  });

  function resetForm() {
    setShowForm(false); setEditItem(null);
    setForm({ purchaseDate: today(), qty: 1, unitCost: 0 });
  }
  function openEdit(p: any) {
    setEditItem(p);
    setForm({ supplierName: p.supplierName, itemDescription: p.itemDescription, qty: p.qty, unitCost: p.unitCost, purchaseDate: p.purchaseDate, notes: p.notes || "" });
    setShowForm(true);
  }
  function handleSubmit() {
    if (!form.supplierName?.trim() || !form.itemDescription?.trim()) return;
    const data = {
      supplierName: form.supplierName.trim(),
      itemDescription: form.itemDescription.trim(),
      qty: Number(form.qty) || 1,
      unitCost: Number(form.unitCost) || 0,
      purchaseDate: form.purchaseDate || today(),
      notes: form.notes?.trim() || null,
    };
    if (editItem) updatePurchase.mutate({ id: editItem.id, data });
    else createPurchase.mutate(data);
  }

  const computedTotal = (Number(form.qty) || 0) * (Number(form.unitCost) || 0);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="font-bold text-base" style={{ color: TEXT }}>Purchases</div>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: GOLD, color: "#1A0A2E" }}>
            <Plus size={13} />
            New Purchase
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Stats */}
          <div className="flex gap-3 flex-wrap">
            {[
              { label: "Total Records", value: purchases.length, color: GOLD },
              { label: "This Month", value: `LKR ${totalThisMonth.toLocaleString()}`, color: "#EF4444" },
              { label: "All Time", value: `LKR ${purchases.reduce((s, p) => s + (Number(p.total) || 0), 0).toLocaleString()}`, color: "#A78BFA" },
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search supplier or item..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
              style={{ background: SURF, borderColor: BORD, color: TEXT }} />
          </div>

          {/* Table */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORD}` }}>
                  {["Date", "Supplier", "Item", "Qty", "Unit Cost", "Total", "Notes", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: DIM }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-10 text-xs" style={{ color: DIM }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-16" style={{ color: DIM }}>
                    <Package size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-xs">No purchase records yet</p>
                  </td></tr>
                ) : filtered.map((p: any) => (
                  <tr key={p.id} className="border-t" style={{ borderColor: BORD }}>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{p.purchaseDate}</td>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: TEXT }}>{p.supplierName}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{p.itemDescription}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: TEXT }}>{p.qty}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>LKR {Number(p.unitCost).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs font-semibold" style={{ color: "#EF4444" }}>LKR {Number(p.total).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs max-w-[120px] truncate" style={{ color: DIM }}>{p.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(p)} className="p-1 rounded" style={{ color: GOLD }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => { if (confirm("Delete this purchase record?")) deletePurchase.mutate(p.id); }} className="p-1 rounded" style={{ color: "#EF4444" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-[460px] rounded-2xl p-6 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="font-bold text-sm mb-4" style={{ color: TEXT }}>{editItem ? "Edit Purchase" : "New Purchase"}</div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Supplier Name *</label>
                  <input value={form.supplierName || ""} onChange={e => setForm(p => ({ ...p, supplierName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="Supplier..." />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Purchase Date</label>
                  <input type="date" value={form.purchaseDate || today()} onChange={e => setForm(p => ({ ...p, purchaseDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Item Description *</label>
                <input value={form.itemDescription || ""} onChange={e => setForm(p => ({ ...p, itemDescription: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="What was purchased..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Quantity</label>
                  <input type="number" min="0.01" step="0.01" value={form.qty || ""} onChange={e => setForm(p => ({ ...p, qty: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Unit Cost (LKR)</label>
                  <input type="number" min="0" step="0.01" value={form.unitCost || ""} onChange={e => setForm(p => ({ ...p, unitCost: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} />
                </div>
              </div>
              <div className="rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <span className="text-xs" style={{ color: MUTED }}>Total Amount</span>
                <span className="text-sm font-bold" style={{ color: "#EF4444" }}>LKR {computedTotal.toLocaleString()}</span>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Notes (optional)</label>
                <textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none resize-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="Any additional notes..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-xs" style={{ background: BORD, color: MUTED }}>Cancel</button>
              <button onClick={handleSubmit} disabled={!form.supplierName?.trim() || !form.itemDescription?.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: GOLD, color: "#1A0A2E" }}>
                {editItem ? "Update" : "Save Purchase"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
