import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";
import { Sidebar } from "../components/layout/sidebar";
import { Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight } from "lucide-react";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const TEXT = "#F3F4F6";

export default function ProductsPage() {
  const branchId = getBranchId();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: menuData, isLoading } = useQuery({
    queryKey: ["products-menu", branchId],
    queryFn: async () => (await api["menu-items"].$get({ query: { branchId: String(branchId) } })).json(),
  });
  const { data: catData } = useQuery({
    queryKey: ["categories", branchId],
    queryFn: async () => (await api.categories.$get({ query: { branchId: String(branchId) } })).json(),
  });
  const { data: printersData } = useQuery({
    queryKey: ["printers", branchId],
    queryFn: async () => (await api.printers.$get({ query: { branchId: String(branchId) } })).json(),
  });

  const items: any[] = (menuData as any)?.items || [];
  const categories: any[] = (catData as any)?.categories || [];
  const printers: any[] = (printersData as any)?.printers || [];

  const filtered = items.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || String(m.categoryId) === filterCat;
    return matchSearch && matchCat;
  });

  const createItem = useMutation({
    mutationFn: async (data: any) => (await api["menu-items"].$post({ json: { ...data, branchId } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products-menu"] }); resetForm(); },
  });
  const updateItem = useMutation({
    mutationFn: async ({ id, data }: any) => (await api["menu-items"][":id"].$patch({ param: { id: String(id) }, json: data })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products-menu"] }); resetForm(); },
  });
  const deleteItem = useMutation({
    mutationFn: async (id: number) => (await api["menu-items"][":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products-menu"] }),
  });
  const toggleAvailable = useMutation({
    mutationFn: async ({ id, available }: any) => (await api["menu-items"][":id"].$patch({ param: { id: String(id) }, json: { available } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products-menu"] }),
  });

  function resetForm() { setShowForm(false); setEditItem(null); setForm({}); }
  function openEdit(item: any) { setEditItem(item); setForm({ name: item.name, price: item.price, categoryId: item.categoryId, printerId: item.printerId, description: item.description }); setShowForm(true); }
  function handleSubmit() {
    const data = { ...form, price: Number(form.price), categoryId: Number(form.categoryId), printerId: form.printerId ? Number(form.printerId) : null };
    if (editItem) updateItem.mutate({ id: editItem.id, data });
    else createItem.mutate(data);
  }

  function catName(id: number) { return categories.find(c => c.id === id)?.name || "—"; }
  function printerName(id: number) { return printers.find(p => p.id === id)?.name || "None"; }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="font-bold text-base" style={{ color: TEXT }}>Menu Items</div>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: GOLD, color: "#1A0A2E" }}>
            <Plus size={13} />
            Add Item
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: DIM }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                style={{ background: SURF, borderColor: BORD, color: TEXT }} />
            </div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border outline-none"
              style={{ background: SURF, borderColor: BORD, color: MUTED }}>
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Stats */}
          <div className="flex gap-3">
            {[
              { label: "Total", value: items.length, color: GOLD },
              { label: "Available", value: items.filter(m => m.available).length, color: "#22C55E" },
              { label: "Unavailable", value: items.filter(m => !m.available).length, color: "#EF4444" },
            ].map(s => (
              <div key={s.label} className="px-4 py-2.5 rounded-xl border" style={{ background: SURF, borderColor: BORD }}>
                <span className="text-base font-bold" style={{ color: s.color }}>{s.value}</span>
                <span className="text-xs ml-2" style={{ color: MUTED }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORD}` }}>
                  {["Name", "Category", "Price", "Printer", "Available", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: DIM }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-xs" style={{ color: DIM }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-xs" style={{ color: DIM }}>No items found</td></tr>
                ) : filtered.map((m: any) => (
                  <tr key={m.id} className="border-t" style={{ borderColor: BORD }}>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: TEXT }}>{m.name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{catName(m.categoryId)}</td>
                    <td className="px-4 py-3 text-xs font-semibold" style={{ color: GOLD }}>LKR {Number(m.price).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{printerName(m.printerId)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleAvailable.mutate({ id: m.id, available: !m.available })}>
                        {m.available
                          ? <ToggleRight size={20} color="#22C55E" />
                          : <ToggleLeft size={20} color={DIM} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(m)} className="p-1 rounded" style={{ color: GOLD }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => confirm("Delete this item?") && deleteItem.mutate(m.id)} className="p-1 rounded" style={{ color: "#EF4444" }}>
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
          <div className="w-96 rounded-2xl p-6 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="font-bold text-sm mb-4" style={{ color: TEXT }}>{editItem ? "Edit Item" : "Add Item"}</div>
            <div className="space-y-3">
              {[
                { key: "name", label: "Name", type: "text" },
                { key: "price", label: "Price (LKR)", type: "number" },
                { key: "description", label: "Description", type: "text" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>{f.label}</label>
                  <input type={f.type} value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} />
                </div>
              ))}
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Category</label>
                <select value={form.categoryId || ""} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Print Station</label>
                <select value={form.printerId || ""} onChange={e => setForm(p => ({ ...p, printerId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }}>
                  <option value="">None</option>
                  {printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-xs" style={{ background: BORD, color: MUTED }}>Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: GOLD, color: "#1A0A2E" }}>
                {editItem ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
