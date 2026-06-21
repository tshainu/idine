import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";
import { Sidebar } from "../components/layout/sidebar";
import { Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight, Leaf, Coffee, Tag } from "lucide-react";

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

  // FIX: API returns menuItems not items
  const items: any[] = (menuData as any)?.menuItems || [];
  const categories: any[] = (catData as any)?.categories || [];
  const printers: any[] = (printersData as any)?.printers || [];

  const filtered = items.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || String(m.categoryId) === filterCat;
    return matchSearch && matchCat;
  });

  const createItem = useMutation({
    mutationFn: async (data: any) => (await api["menu-items"].$post({ json: { ...data, branchId } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products-menu", branchId] }); resetForm(); },
  });
  const updateItem = useMutation({
    mutationFn: async ({ id, data }: any) => (await api["menu-items"][":id"].$patch({ param: { id: String(id) }, json: data })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products-menu", branchId] }); resetForm(); },
  });
  const deleteItem = useMutation({
    mutationFn: async (id: number) => (await api["menu-items"][":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products-menu", branchId] }),
  });
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: any) => (await api["menu-items"][":id"].$patch({ param: { id: String(id) }, json: { isActive } })).json(),
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: ["products-menu", branchId] });
      const prev = qc.getQueryData(["products-menu", branchId]);
      qc.setQueryData(["products-menu", branchId], (old: any) => {
        if (!old?.menuItems) return old;
        return { ...old, menuItems: old.menuItems.map((m: any) => m.id === id ? { ...m, isActive } : m) };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(["products-menu", branchId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["products-menu", branchId] }),
  });

  function resetForm() { setShowForm(false); setEditItem(null); setForm({}); }
  function openEdit(item: any) {
    setEditItem(item);
    setForm({
      name: item.name,
      price: item.price,
      categoryId: item.categoryId,
      printerId: item.printerId,
      imageUrl: item.imageUrl || "",
      isVeg: item.isVeg || false,
      isBeverage: item.isBeverage || false,
      isPromo: item.isPromo || false,
      sortOrder: item.sortOrder || 0,
    });
    setShowForm(true);
  }
  function handleSubmit() {
    const data = {
      ...form,
      price: Number(form.price),
      categoryId: Number(form.categoryId) || null,
      printerId: form.printerId ? Number(form.printerId) : null,
      sortOrder: Number(form.sortOrder) || 0,
      isVeg: !!form.isVeg,
      isBeverage: !!form.isBeverage,
      isPromo: !!form.isPromo,
    };
    if (editItem) updateItem.mutate({ id: editItem.id, data });
    else createItem.mutate(data);
  }

  function catName(id: number) { return categories.find(c => c.id === id)?.name || "—"; }
  function printerName(id: number | null) { if (!id) return "None"; return printers.find(p => p.id === id)?.name || "None"; }

  function Toggle({ val, set }: { val: boolean; set: (v: boolean) => void }) {
    return (
      <button type="button" onClick={() => set(!val)}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border transition-colors"
        style={{ background: val ? "rgba(245,166,35,0.15)" : "transparent", borderColor: val ? GOLD : BORD, color: val ? GOLD : DIM }}>
        {val ? "Yes" : "No"}
      </button>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
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
          <div className="flex gap-3 flex-wrap">
            {[
              { label: "Total Items", value: items.length, color: GOLD },
              { label: "Active", value: items.filter(m => m.isActive).length, color: "#22C55E" },
              { label: "Inactive", value: items.filter(m => !m.isActive).length, color: "#EF4444" },
              { label: "Veg", value: items.filter(m => m.isVeg).length, color: "#4ADE80" },
              { label: "Beverage", value: items.filter(m => m.isBeverage).length, color: "#38BDF8" },
              { label: "Promo", value: items.filter(m => m.isPromo).length, color: "#A78BFA" },
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
                  {["Name", "Category", "Price", "Tags", "Printer", "Active", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: DIM }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-xs" style={{ color: DIM }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-xs" style={{ color: DIM }}>No items found</td></tr>
                ) : filtered.map((m: any) => (
                  <tr key={m.id} className="border-t" style={{ borderColor: BORD }}>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: TEXT }}>{m.name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{catName(m.categoryId)}</td>
                    <td className="px-4 py-3 text-xs font-semibold" style={{ color: GOLD }}>LKR {Number(m.price).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {m.isVeg && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(74,222,128,0.15)", color: "#4ADE80" }}>Veg</span>}
                        {m.isBeverage && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(56,189,248,0.15)", color: "#38BDF8" }}>Bev</span>}
                        {m.isPromo && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.15)", color: "#A78BFA" }}>Promo</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{printerName(m.printerId)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive.mutate({ id: m.id, isActive: !m.isActive })}>
                        {m.isActive
                          ? <ToggleRight size={20} color="#22C55E" />
                          : <ToggleLeft size={20} color={DIM} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(m)} className="p-1 rounded" style={{ color: GOLD }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => { if (confirm("Delete this item?")) deleteItem.mutate(m.id); }} className="p-1 rounded" style={{ color: "#EF4444" }}>
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
          <div className="w-[460px] rounded-2xl p-6 border max-h-[90vh] overflow-y-auto" style={{ background: SURF, borderColor: BORD }}>
            <div className="font-bold text-sm mb-4" style={{ color: TEXT }}>{editItem ? "Edit Item" : "Add Item"}</div>
            <div className="space-y-3">
              {[
                { key: "name", label: "Name", type: "text", required: true },
                { key: "price", label: "Price (LKR)", type: "number", required: true },
                { key: "imageUrl", label: "Image URL (optional)", type: "text" },
                { key: "sortOrder", label: "Sort Order", type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>{f.label}</label>
                  <input type={f.type} value={form[f.key] ?? ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
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
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Print Station (KOT)</label>
                <select value={form.printerId || ""} onChange={e => setForm(p => ({ ...p, printerId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }}>
                  <option value="">None</option>
                  {printers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                </select>
              </div>
              {/* Toggles */}
              <div className="pt-2">
                <label className="text-xs mb-2 block" style={{ color: MUTED }}>Item Tags</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Leaf size={13} color="#4ADE80" />
                    <span className="text-xs" style={{ color: MUTED }}>Vegetarian</span>
                    <button type="button" onClick={() => setForm(p => ({ ...p, isVeg: !p.isVeg }))}
                      className="px-2 py-0.5 rounded text-xs font-medium border"
                      style={{ background: form.isVeg ? "rgba(74,222,128,0.15)" : "transparent", borderColor: form.isVeg ? "#4ADE80" : BORD, color: form.isVeg ? "#4ADE80" : DIM }}>
                      {form.isVeg ? "Yes" : "No"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coffee size={13} color="#38BDF8" />
                    <span className="text-xs" style={{ color: MUTED }}>Beverage</span>
                    <button type="button" onClick={() => setForm(p => ({ ...p, isBeverage: !p.isBeverage }))}
                      className="px-2 py-0.5 rounded text-xs font-medium border"
                      style={{ background: form.isBeverage ? "rgba(56,189,248,0.15)" : "transparent", borderColor: form.isBeverage ? "#38BDF8" : BORD, color: form.isBeverage ? "#38BDF8" : DIM }}>
                      {form.isBeverage ? "Yes" : "No"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag size={13} color="#A78BFA" />
                    <span className="text-xs" style={{ color: MUTED }}>Promo</span>
                    <button type="button" onClick={() => setForm(p => ({ ...p, isPromo: !p.isPromo }))}
                      className="px-2 py-0.5 rounded text-xs font-medium border"
                      style={{ background: form.isPromo ? "rgba(167,139,250,0.15)" : "transparent", borderColor: form.isPromo ? "#A78BFA" : BORD, color: form.isPromo ? "#A78BFA" : DIM }}>
                      {form.isPromo ? "Yes" : "No"}
                    </button>
                  </div>
                </div>
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
