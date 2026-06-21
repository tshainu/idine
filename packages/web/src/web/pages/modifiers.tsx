import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal, Plus, Search, Pencil, Trash2, X } from "lucide-react";
import { Sidebar } from "../components/layout/sidebar";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";

const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const GOLD = "#F5A623";
const TEXT = "#F3F4F6";
const MUTED = "#9CA3AF";

const EMPTY_FORM = { name: "", groupName: "General", price: 0 };

export default function ModifiersPage() {
  const qc = useQueryClient();
  const branchId = getBranchId();
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["modifiers", branchId],
    queryFn: async () => {
      const res = await (api as any).modifiers.$get({ query: branchId ? { branchId: String(branchId) } : {} });
      return res.json();
    },
  });

  const items: any[] = (data as any)?.modifiers || [];
  const groups = ["all", ...Array.from(new Set(items.map((i: any) => i.groupName)))];

  const createMod = useMutation({
    mutationFn: async (body: any) => (await (api as any).modifiers.$post({ json: { ...body, branchId } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["modifiers"] }); closeModal(); },
  });
  const updateMod = useMutation({
    mutationFn: async ({ id, body }: any) => (await (api as any).modifiers[":id"].$patch({ param: { id: String(id) }, json: body })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["modifiers"] }); closeModal(); },
  });
  const deleteMod = useMutation({
    mutationFn: async (id: number) => (await (api as any).modifiers[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modifiers"] }),
  });
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: any) => (await (api as any).modifiers[":id"].$patch({ param: { id: String(id) }, json: { isActive } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modifiers"] }),
  });

  function openCreate() { setForm(EMPTY_FORM); setSelected(null); setModal("create"); }
  function openEdit(m: any) { setSelected(m); setForm({ name: m.name, groupName: m.groupName, price: m.price }); setModal("edit"); }
  function closeModal() { setModal(null); setSelected(null); setForm(EMPTY_FORM); }
  function handleSubmit() {
    if (!form.name?.trim()) return;
    const body = { ...form, price: Number(form.price) };
    if (modal === "create") createMod.mutate(body);
    else if (modal === "edit" && selected) updateMod.mutate({ id: selected.id, body });
  }

  const filtered = items.filter((i: any) =>
    (filterGroup === "all" || i.groupName === filterGroup) &&
    (i.name.toLowerCase().includes(search.toLowerCase()) || i.groupName.toLowerCase().includes(search.toLowerCase()))
  );

  // Group by groupName for display
  const grouped: Record<string, any[]> = {};
  filtered.forEach((i: any) => {
    if (!grouped[i.groupName]) grouped[i.groupName] = [];
    grouped[i.groupName].push(i);
  });

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} color={GOLD} />
            <span className="font-bold text-base" style={{ color: TEXT }}>Modifiers</span>
            <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ background: "rgba(245,166,35,0.15)", color: GOLD }}>{items.length}</span>
          </div>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ background: GOLD, color: "#1A0A2E" }}>
            <Plus size={15} /> Add Modifier
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Modifiers", value: items.length, color: GOLD },
              { label: "Groups", value: groups.length - 1, color: "#60A5FA" },
              { label: "Paid Add-ons", value: items.filter((i: any) => i.price > 0).length, color: "#22C55E" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 border" style={{ background: SURF, borderColor: BORD }}>
                <div className="text-xs mb-1" style={{ color: MUTED }}>{s.label}</div>
                <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Search + group filter */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg border" style={{ background: SURF, borderColor: BORD }}>
              <Search size={14} color={MUTED} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search modifiers..." className="flex-1 bg-transparent text-sm outline-none" style={{ color: TEXT }} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {groups.map(g => (
                <button key={g} onClick={() => setFilterGroup(g)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: filterGroup === g ? GOLD : SURF, color: filterGroup === g ? "#1A0A2E" : MUTED, border: `1px solid ${filterGroup === g ? GOLD : BORD}` }}>
                  {g === "all" ? "All Groups" : g}
                </button>
              ))}
            </div>
          </div>

          {/* Grouped cards */}
          {isLoading ? (
            <div className="text-center py-16 text-sm" style={{ color: MUTED }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: MUTED }}>No modifiers found. Add your first modifier.</div>
          ) : Object.entries(grouped).map(([group, mods]) => (
            <div key={group} className="mb-6">
              <div className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: GOLD }}>{group}</div>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORD }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: SURF }}>
                      {["Modifier Name", "Price", "Status", "Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mods.map((m: any, idx: number) => (
                      <tr key={m.id} style={{ background: idx % 2 === 0 ? BG : "rgba(26,10,46,0.4)", borderTop: `1px solid ${BORD}` }}>
                        <td className="px-4 py-3 font-medium" style={{ color: TEXT }}>{m.name}</td>
                        <td className="px-4 py-3 font-mono" style={{ color: m.price > 0 ? GOLD : MUTED }}>
                          {m.price > 0 ? `+ Rs. ${m.price.toFixed(2)}` : "Free"}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleActive.mutate({ id: m.id, isActive: !m.isActive })}
                            className="text-xs px-2 py-0.5 rounded-full transition-all"
                            style={{ background: m.isActive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: m.isActive ? "#4ADE80" : "#F87171" }}>
                            {m.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(m)} className="p-1 rounded" style={{ color: GOLD }}><Pencil size={14} /></button>
                            <button onClick={() => { if (confirm(`Delete "${m.name}"?`)) deleteMod.mutate(m.id); }} className="p-1 rounded" style={{ color: "#EF4444" }}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base" style={{ color: TEXT }}>{modal === "create" ? "Add Modifier" : "Edit Modifier"}</h3>
              <button onClick={closeModal} style={{ color: MUTED }}><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: MUTED }}>Modifier Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Extra Cheese" className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ background: BG, borderColor: BORD, color: TEXT }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: MUTED }}>Group</label>
                <input value={form.groupName} onChange={e => setForm({ ...form, groupName: e.target.value })} placeholder="e.g. Toppings, Preferences" className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ background: BG, borderColor: BORD, color: TEXT }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: MUTED }}>Extra Price (Rs.) — 0 = Free</label>
                <input type="number" min="0" step="0.50" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ background: BG, borderColor: BORD, color: TEXT }} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 py-2 rounded-lg text-sm border" style={{ borderColor: BORD, color: MUTED }}>Cancel</button>
              <button onClick={handleSubmit} disabled={createMod.isPending || updateMod.isPending} className="flex-1 py-2 rounded-lg text-sm font-semibold" style={{ background: GOLD, color: "#1A0A2E" }}>
                {createMod.isPending || updateMod.isPending ? "Saving..." : modal === "create" ? "Add" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
