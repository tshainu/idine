import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBranchId } from "../../lib/store";
import { Sidebar } from "../../components/layout/sidebar";
import { Plus, Pencil, Trash2, Search, Package, X } from "lucide-react";

const GOLD = "#F5A623";
const BG = "var(--color-bg)";
const SURF = "var(--color-surface)";
const BORD = "var(--color-border)";
const MUTED = "var(--color-text-muted)";
const DIM = "var(--color-text-dim)";
const TEXT = "var(--color-text)";

const UNITS = ["pcs", "kg", "g", "litre", "ml", "dozen", "box", "bag", "bottle", "pack"];

export default function PurchaseItemsPage() {
  const branchId = getBranchId();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({ name: "", unit: "pcs", lastCost: "", notes: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-items", branchId],
    queryFn: async () => { const r = await fetch(`/api/purchase-items?branchId=${branchId}`); return r.json(); },
  });
  const items: any[] = ((data as any)?.items || []).filter((i: any) => i.is_active !== 0 && i.isActive !== false);
  const filtered = items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.notes || "").toLowerCase().includes(search.toLowerCase()));

  const create = useMutation({
    mutationFn: async (body: any) => {
      const r = await fetch("/api/purchase-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, branchId }) });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-items"] }); resetForm(); },
  });
  const update = useMutation({
    mutationFn: async ({ id, body }: any) => {
      const r = await fetch(`/api/purchase-items/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-items"] }); resetForm(); },
  });
  const remove = useMutation({
    mutationFn: async (id: number) => { const r = await fetch(`/api/purchase-items/${id}`, { method: "DELETE" }); return r.json(); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-items"] }),
  });

  function resetForm() { setShowForm(false); setEditItem(null); setForm({ name: "", unit: "pcs", lastCost: "", notes: "" }); }
  function openEdit(i: any) {
    setEditItem(i);
    setForm({ name: i.name, unit: i.unit, lastCost: i.lastCost, notes: i.notes || "" });
    setShowForm(true);
  }
  function handleSubmit() {
    if (!form.name?.trim()) return;
    const body = { name: form.name.trim(), unit: form.unit, lastCost: Number(form.lastCost) || 0, notes: form.notes?.trim() || null };
    if (editItem) update.mutate({ id: editItem.id, body });
    else create.mutate(body);
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="font-bold text-sm" style={{ color: TEXT }}>Purchase Items</div>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: GOLD, color: "#1A0A2E" }}>
            <Plus size={13} /> New Item
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl px-4 py-2.5 border" style={{ background: SURF, borderColor: BORD }}>
              <span className="text-base font-bold" style={{ color: GOLD }}>{items.length}</span>
              <span className="text-xs ml-2" style={{ color: MUTED }}>Total Items</span>
            </div>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: DIM }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
              style={{ background: SURF, borderColor: BORD, color: TEXT }} />
          </div>

          <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORD}` }}>
                  {["Name", "Unit", "Last Cost", "Notes", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: DIM }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-10 text-xs" style={{ color: DIM }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-16" style={{ color: DIM }}>
                    <Package size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-xs">No purchase items yet</p>
                    <p className="text-[10px] mt-1" style={{ color: DIM }}>Add items you frequently purchase</p>
                  </td></tr>
                ) : filtered.map((i: any) => (
                  <tr key={i.id} className="border-t" style={{ borderColor: BORD }}>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: TEXT }}>{i.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: GOLD + "22", color: GOLD }}>{i.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: Number(i.lastCost) > 0 ? TEXT : DIM }}>
                      {Number(i.lastCost) > 0 ? `LKR ${Number(i.lastCost).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[180px] truncate" style={{ color: DIM }}>{i.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(i)} className="p-1 rounded" style={{ color: GOLD }}><Pencil size={13} /></button>
                        <button onClick={() => { if (confirm("Remove this item?")) remove.mutate(i.id); }} className="p-1 rounded" style={{ color: "#EF4444" }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-[420px] rounded-2xl p-6 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-sm" style={{ color: TEXT }}>{editItem ? "Edit Item" : "New Purchase Item"}</div>
              <button onClick={resetForm}><X size={16} style={{ color: MUTED }} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Item Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="e.g. Chicken Breast, Rice, Oil..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Unit</label>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Last Cost (LKR)</label>
                  <input type="number" min="0" step="0.01" value={form.lastCost} onChange={e => setForm(f => ({ ...f, lastCost: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="Optional..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-xs" style={{ background: BORD, color: MUTED }}>Cancel</button>
              <button onClick={handleSubmit} disabled={!form.name?.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: GOLD, color: "#1A0A2E" }}>
                {editItem ? "Update" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
