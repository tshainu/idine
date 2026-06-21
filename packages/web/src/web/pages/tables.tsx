import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";
import { Sidebar } from "../components/layout/sidebar";
import { Plus, Pencil, Trash2, Users, ToggleLeft, ToggleRight, Table2 } from "lucide-react";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const TEXT = "#F3F4F6";

export default function TablesPage() {
  const branchId = getBranchId();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const { data: tablesData, isLoading } = useQuery({
    queryKey: ["tables", branchId],
    queryFn: async () => (await api.tables.$get({ query: { branchId: String(branchId) } })).json(),
    refetchInterval: 10000,
  });

  const tables: any[] = (tablesData as any)?.tables || [];
  const activeTables = tables.filter(t => t.isActive);
  const inactiveTables = tables.filter(t => !t.isActive);

  const createTable = useMutation({
    mutationFn: async (data: any) => (await api.tables.$post({ json: { ...data, branchId } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tables"] }); resetForm(); },
  });
  const updateTable = useMutation({
    mutationFn: async ({ id, data }: any) => (await api.tables[":id"].$patch({ param: { id: String(id) }, json: data })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tables"] }); resetForm(); },
  });
  const deleteTable = useMutation({
    mutationFn: async (id: number) => (await api.tables[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tables"] }),
  });
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: any) => (await api.tables[":id"].$patch({ param: { id: String(id) }, json: { isActive } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tables"] }),
  });

  function resetForm() { setShowForm(false); setEditItem(null); setForm({}); }
  function openEdit(t: any) {
    setEditItem(t);
    setForm({ name: t.name, capacity: t.capacity ?? 4 });
    setShowForm(true);
  }
  function handleSubmit() {
    if (!form.name?.trim()) return;
    const data = { name: form.name.trim(), capacity: Number(form.capacity) || 4 };
    if (editItem) updateTable.mutate({ id: editItem.id, data });
    else createTable.mutate(data);
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="font-bold text-base" style={{ color: TEXT }}>Tables</div>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: GOLD, color: "#1A0A2E" }}>
            <Plus size={13} />
            Add Table
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Stats */}
          <div className="flex gap-3 flex-wrap">
            {[
              { label: "Total Tables", value: tables.length, color: GOLD },
              { label: "Active", value: activeTables.length, color: "#22C55E" },
              { label: "Inactive", value: inactiveTables.length, color: "#EF4444" },
              { label: "Total Capacity", value: tables.reduce((s, t) => s + (t.capacity || 0), 0), color: "#38BDF8" },
            ].map(s => (
              <div key={s.label} className="px-4 py-2.5 rounded-xl border" style={{ background: SURF, borderColor: BORD }}>
                <span className="text-base font-bold" style={{ color: s.color }}>{s.value}</span>
                <span className="text-xs ml-2" style={{ color: MUTED }}>{s.label}</span>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="text-center py-10 text-xs" style={{ color: DIM }}>Loading...</div>
          ) : tables.length === 0 ? (
            <div className="text-center py-16" style={{ color: DIM }}>
              <Table2 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-1" style={{ color: MUTED }}>No tables yet</p>
              <p className="text-xs">Add tables to manage your restaurant floor</p>
            </div>
          ) : (
            /* Grid view */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {tables.map((t: any) => (
                <div key={t.id} className="rounded-2xl border p-4 flex flex-col gap-2 relative group"
                  style={{ background: SURF, borderColor: t.isActive ? BORD : "rgba(239,68,68,0.3)", opacity: t.isActive ? 1 : 0.6 }}>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold" style={{ color: t.isActive ? TEXT : DIM }}>{t.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{
                      background: t.isActive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                      color: t.isActive ? "#22C55E" : "#EF4444"
                    }}>
                      {t.isActive ? "Active" : "Off"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: MUTED }}>
                    <Users size={11} />
                    <span>{t.capacity || 4} seats</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(t)} className="p-1 rounded text-xs" style={{ color: GOLD }}>
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => toggleActive.mutate({ id: t.id, isActive: !t.isActive })} className="p-1 rounded">
                      {t.isActive ? <ToggleRight size={15} color="#22C55E" /> : <ToggleLeft size={15} color={DIM} />}
                    </button>
                    <button onClick={() => { if (confirm(`Delete table ${t.name}?`)) deleteTable.mutate(t.id); }} className="p-1 rounded" style={{ color: "#EF4444" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-80 rounded-2xl p-6 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="font-bold text-sm mb-4" style={{ color: TEXT }}>{editItem ? "Edit Table" : "Add Table"}</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Table Name / Number *</label>
                <input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="e.g. T1, Table 5" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Seating Capacity</label>
                <input type="number" min="1" max="50" value={form.capacity ?? 4} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))}
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
