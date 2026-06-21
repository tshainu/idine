import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";
import { Sidebar } from "../components/layout/sidebar";
import { Plus, Pencil, Trash2, Tag, ToggleLeft, ToggleRight } from "lucide-react";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const TEXT = "#F3F4F6";

export default function CategoriesPage() {
  const branchId = getBranchId();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: catData, isLoading } = useQuery({
    queryKey: ["categories", branchId],
    queryFn: async () => (await api.categories.$get({ query: { branchId: String(branchId) } })).json(),
  });
  const { data: menuData } = useQuery({
    queryKey: ["products-menu", branchId],
    queryFn: async () => (await api["menu-items"].$get({ query: { branchId: String(branchId) } })).json(),
  });

  const categories: any[] = (catData as any)?.categories || [];
  const menuItems: any[] = (menuData as any)?.menuItems || [];

  function itemCount(catId: number) {
    return menuItems.filter(m => m.categoryId === catId).length;
  }

  const createCat = useMutation({
    mutationFn: async (data: any) => (await api.categories.$post({ json: { ...data, branchId } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); resetForm(); },
  });
  const updateCat = useMutation({
    mutationFn: async ({ id, data }: any) => (await api.categories[":id"].$patch({ param: { id: String(id) }, json: data })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); resetForm(); },
  });
  const deleteCat = useMutation({
    mutationFn: async (id: number) => (await api.categories[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: any) => (await api.categories[":id"].$patch({ param: { id: String(id) }, json: { isActive } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  function resetForm() { setShowForm(false); setEditItem(null); setForm({}); }
  function openEdit(c: any) {
    setEditItem(c);
    setForm({ name: c.name, sortOrder: c.sortOrder ?? 0 });
    setShowForm(true);
  }
  function handleSubmit() {
    if (!form.name?.trim()) return;
    const data = { name: form.name.trim(), sortOrder: Number(form.sortOrder) || 0 };
    if (editItem) updateCat.mutate({ id: editItem.id, data });
    else createCat.mutate(data);
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="font-bold text-base" style={{ color: TEXT }}>Menu Categories</div>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: GOLD, color: "#1A0A2E" }}>
            <Plus size={13} />
            Add Category
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Stats */}
          <div className="flex gap-3">
            {[
              { label: "Total", value: categories.length, color: GOLD },
              { label: "Active", value: categories.filter(c => c.isActive).length, color: "#22C55E" },
            ].map(s => (
              <div key={s.label} className="px-4 py-2.5 rounded-xl border" style={{ background: SURF, borderColor: BORD }}>
                <span className="text-base font-bold" style={{ color: s.color }}>{s.value}</span>
                <span className="text-xs ml-2" style={{ color: MUTED }}>{s.label}</span>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="text-center py-10 text-xs" style={{ color: DIM }}>Loading...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-16" style={{ color: DIM }}>
              <Tag size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-1" style={{ color: MUTED }}>No categories yet</p>
              <p className="text-xs">Create categories to organize your menu</p>
            </div>
          ) : (
            <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORD}` }}>
                    {["Category Name", "Items", "Sort Order", "Active", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: DIM }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c: any) => (
                    <tr key={c.id} className="border-t" style={{ borderColor: BORD }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,166,35,0.15)" }}>
                            <Tag size={13} color={GOLD} />
                          </div>
                          <span className="text-xs font-medium" style={{ color: TEXT }}>{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(245,166,35,0.1)", color: GOLD }}>
                          {itemCount(c.id)} items
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{c.sortOrder}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive.mutate({ id: c.id, isActive: !c.isActive })}>
                          {c.isActive ? <ToggleRight size={20} color="#22C55E" /> : <ToggleLeft size={20} color={DIM} />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(c)} className="p-1 rounded" style={{ color: GOLD }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => {
                            if (itemCount(c.id) > 0) { alert(`Cannot delete — ${itemCount(c.id)} items use this category`); return; }
                            if (confirm(`Delete category "${c.name}"?`)) deleteCat.mutate(c.id);
                          }} className="p-1 rounded" style={{ color: "#EF4444" }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-80 rounded-2xl p-6 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="font-bold text-sm mb-4" style={{ color: TEXT }}>{editItem ? "Edit Category" : "Add Category"}</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Category Name *</label>
                <input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="e.g. Chicken Gravy" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Sort Order</label>
                <input type="number" value={form.sortOrder ?? 0} onChange={e => setForm(p => ({ ...p, sortOrder: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} />
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
