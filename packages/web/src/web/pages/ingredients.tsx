import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Utensils, Plus, Search, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { Sidebar } from "../components/layout/sidebar";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";

const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const GOLD = "#F5A623";
const TEXT = "#F3F4F6";
const MUTED = "#9CA3AF";

const UNITS = ["kg", "g", "litre", "ml", "pcs", "dozen", "bag", "box"];

const EMPTY_FORM = { name: "", unit: "kg", stockQty: 0, minStockQty: 0, costPerUnit: 0 };

export default function IngredientsPage() {
  const qc = useQueryClient();
  const branchId = getBranchId();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["ingredients", branchId],
    queryFn: async () => {
      const res = await api.ingredients.$get({ query: branchId ? { branchId: String(branchId) } : {} });
      return res.json();
    },
  });

  const items: any[] = (data as any)?.ingredients || [];

  const createIng = useMutation({
    mutationFn: async (body: any) => (await api.ingredients.$post({ json: { ...body, branchId } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ingredients"] }); closeModal(); },
  });

  const updateIng = useMutation({
    mutationFn: async ({ id, body }: any) => (await (api.ingredients as any)[":id"].$patch({ param: { id: String(id) }, json: body })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ingredients"] }); closeModal(); },
  });

  const deleteIng = useMutation({
    mutationFn: async (id: number) => (await (api.ingredients as any)[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredients"] }),
  });

  function openCreate() { setForm(EMPTY_FORM); setSelected(null); setModal("create"); }
  function openEdit(i: any) { setSelected(i); setForm({ name: i.name, unit: i.unit, stockQty: i.stockQty, minStockQty: i.minStockQty, costPerUnit: i.costPerUnit }); setModal("edit"); }
  function closeModal() { setModal(null); setSelected(null); setForm(EMPTY_FORM); }

  function handleSubmit() {
    if (!form.name?.trim()) return;
    const body = { ...form, stockQty: Number(form.stockQty), minStockQty: Number(form.minStockQty), costPerUnit: Number(form.costPerUnit) };
    if (modal === "create") createIng.mutate(body);
    else if (modal === "edit" && selected) updateIng.mutate({ id: selected.id, body });
  }

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const lowStock = items.filter(i => i.isActive !== false && i.stockQty <= i.minStockQty && i.minStockQty > 0);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="flex items-center gap-2">
            <Utensils size={18} color={GOLD} />
            <span className="font-bold text-base" style={{ color: TEXT }}>Ingredients</span>
            <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ background: "rgba(245,166,35,0.15)", color: GOLD }}>{items.length}</span>
          </div>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ background: GOLD, color: "#1A0A2E" }}>
            <Plus size={15} /> Add Ingredient
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Low stock alert */}
          {lowStock.length > 0 && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171" }}>
              <AlertTriangle size={15} />
              <span><b>{lowStock.length}</b> ingredient{lowStock.length > 1 ? "s" : ""} below minimum stock: {lowStock.map(i => i.name).join(", ")}</span>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Items", value: items.length, color: GOLD },
              { label: "Low Stock", value: lowStock.length, color: "#EF4444" },
              { label: "Total Value", value: `Rs. ${items.reduce((s, i) => s + i.stockQty * i.costPerUnit, 0).toFixed(2)}`, color: "#22C55E" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 border" style={{ background: SURF, borderColor: BORD }}>
                <div className="text-xs mb-1" style={{ color: MUTED }}>{s.label}</div>
                <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg border" style={{ background: SURF, borderColor: BORD }}>
              <Search size={14} color={MUTED} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ingredients..." className="flex-1 bg-transparent text-sm outline-none" style={{ color: TEXT }} />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORD }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: SURF }}>
                  {["Name", "Unit", "Stock Qty", "Min Stock", "Cost/Unit", "Stock Value", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-sm" style={{ color: MUTED }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-sm" style={{ color: MUTED }}>No ingredients found. Add your first one.</td></tr>
                ) : filtered.map((i, idx) => {
                  const isLow = i.stockQty <= i.minStockQty && i.minStockQty > 0;
                  return (
                    <tr key={i.id} style={{ background: idx % 2 === 0 ? BG : "rgba(26,10,46,0.4)", borderTop: `1px solid ${BORD}` }}>
                      <td className="px-4 py-3 font-medium" style={{ color: TEXT }}>{i.name}</td>
                      <td className="px-4 py-3" style={{ color: MUTED }}>{i.unit}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: isLow ? "#EF4444" : "#22C55E" }}>{i.stockQty}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: MUTED }}>{i.minStockQty}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: TEXT }}>Rs. {i.costPerUnit.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: GOLD }}>Rs. {(i.stockQty * i.costPerUnit).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: isLow ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)", color: isLow ? "#F87171" : "#4ADE80" }}>
                          {isLow ? "Low Stock" : "OK"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(i)} className="p-1 rounded hover:opacity-80" style={{ color: GOLD }}><Pencil size={14} /></button>
                          <button onClick={() => { if (confirm(`Delete "${i.name}"?`)) deleteIng.mutate(i.id); }} className="p-1 rounded hover:opacity-80" style={{ color: "#EF4444" }}><Trash2 size={14} /></button>
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

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base" style={{ color: TEXT }}>{modal === "create" ? "Add Ingredient" : "Edit Ingredient"}</h3>
              <button onClick={closeModal} style={{ color: MUTED }}><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: MUTED }}>Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chicken Breast" className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ background: BG, borderColor: BORD, color: TEXT }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: MUTED }}>Unit</label>
                <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ background: BG, borderColor: BORD, color: TEXT }}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: MUTED }}>Stock Qty</label>
                  <input type="number" min="0" step="0.01" value={form.stockQty} onChange={e => setForm({ ...form, stockQty: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ background: BG, borderColor: BORD, color: TEXT }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: MUTED }}>Min Stock Alert</label>
                  <input type="number" min="0" step="0.01" value={form.minStockQty} onChange={e => setForm({ ...form, minStockQty: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ background: BG, borderColor: BORD, color: TEXT }} />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: MUTED }}>Cost Per Unit (Rs.)</label>
                <input type="number" min="0" step="0.01" value={form.costPerUnit} onChange={e => setForm({ ...form, costPerUnit: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ background: BG, borderColor: BORD, color: TEXT }} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 py-2 rounded-lg text-sm border" style={{ borderColor: BORD, color: MUTED }}>Cancel</button>
              <button onClick={handleSubmit} disabled={createIng.isPending || updateIng.isPending} className="flex-1 py-2 rounded-lg text-sm font-semibold" style={{ background: GOLD, color: "#1A0A2E" }}>
                {createIng.isPending || updateIng.isPending ? "Saving..." : modal === "create" ? "Add" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
