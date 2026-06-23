import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBranchId } from "../../lib/store";
import { Sidebar } from "../../components/layout/sidebar";
import { Plus, Pencil, Trash2, Search, Building2, Phone, Mail, MapPin, X } from "lucide-react";

const GOLD = "#F5A623";
const BG = "var(--color-bg)";
const SURF = "var(--color-surface)";
const BORD = "var(--color-border)";
const MUTED = "var(--color-text-muted)";
const DIM = "var(--color-text-dim)";
const TEXT = "var(--color-text)";

export default function SuppliersPage() {
  const branchId = getBranchId();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({ name: "", contactName: "", phone: "", email: "", address: "", notes: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers", branchId],
    queryFn: async () => { const r = await fetch(`/api/suppliers?branchId=${branchId}`); return r.json(); },
  });
  const suppliers: any[] = ((data as any)?.suppliers || []).filter((s: any) => s.is_active !== 0 && s.isActive !== false);
  const filtered = suppliers.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.contactName || "").toLowerCase().includes(search.toLowerCase()) || (s.phone || "").includes(search));

  const { data: purchasesData } = useQuery({
    queryKey: ["purchases", branchId],
    queryFn: async () => { const r = await fetch(`/api/purchases?branchId=${branchId}`); return r.json(); },
  });
  const purchases: any[] = (purchasesData as any)?.purchases || [];

  function supplierStats(id: number) {
    const rows = purchases.filter(p => p.supplierId === id);
    const total = rows.reduce((s, p) => s + Number(p.total), 0);
    const due = rows.reduce((s, p) => s + Number(p.dueAmount || 0), 0);
    return { count: rows.length, total, due };
  }

  const create = useMutation({
    mutationFn: async (body: any) => {
      const r = await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, branchId }) });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); resetForm(); },
  });
  const update = useMutation({
    mutationFn: async ({ id, body }: any) => {
      const r = await fetch(`/api/suppliers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); resetForm(); },
  });
  const remove = useMutation({
    mutationFn: async (id: number) => { const r = await fetch(`/api/suppliers/${id}`, { method: "DELETE" }); return r.json(); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  function resetForm() { setShowForm(false); setEditItem(null); setForm({ name: "", contactName: "", phone: "", email: "", address: "", notes: "" }); }
  function openEdit(s: any) {
    setEditItem(s);
    setForm({ name: s.name, contactName: s.contactName || "", phone: s.phone || "", email: s.email || "", address: s.address || "", notes: s.notes || "" });
    setShowForm(true);
  }
  function handleSubmit() {
    if (!form.name?.trim()) return;
    const body = {
      name: form.name.trim(),
      contactName: form.contactName?.trim() || null,
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      address: form.address?.trim() || null,
      notes: form.notes?.trim() || null,
    };
    if (editItem) update.mutate({ id: editItem.id, body });
    else create.mutate(body);
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="font-bold text-sm" style={{ color: TEXT }}>Suppliers</div>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: GOLD, color: "#1A0A2E" }}>
            <Plus size={13} /> New Supplier
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center gap-3">
            {[
              { label: "Total Suppliers", value: suppliers.length, color: GOLD },
              { label: "Total Purchased", value: `LKR ${purchases.reduce((s, p) => s + Number(p.total), 0).toLocaleString()}`, color: "#a78bfa" },
              { label: "Total Due", value: `LKR ${purchases.reduce((s, p) => s + Number(p.dueAmount || 0), 0).toLocaleString()}`, color: "#f87171" },
            ].map(s => (
              <div key={s.label} className="rounded-xl px-4 py-2.5 border" style={{ background: SURF, borderColor: BORD }}>
                <span className="text-base font-bold" style={{ color: s.color }}>{s.value}</span>
                <span className="text-xs ml-2" style={{ color: MUTED }}>{s.label}</span>
              </div>
            ))}
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: DIM }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
              style={{ background: SURF, borderColor: BORD, color: TEXT }} />
          </div>

          {isLoading ? (
            <div className="text-center py-16 text-xs" style={{ color: DIM }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16" style={{ color: DIM }}>
              <Building2 size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-xs">No suppliers yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((s: any) => {
                const stats = supplierStats(s.id);
                return (
                  <div key={s.id} className="rounded-2xl p-4 border" style={{ background: SURF, borderColor: BORD }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: GOLD + "22" }}>
                          <Building2 size={16} style={{ color: GOLD }} />
                        </div>
                        <div>
                          <div className="text-sm font-bold" style={{ color: TEXT }}>{s.name}</div>
                          {s.contactName && <div className="text-xs" style={{ color: MUTED }}>{s.contactName}</div>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg" style={{ color: GOLD, background: GOLD + "15" }}><Pencil size={12} /></button>
                        <button onClick={() => { if (confirm("Remove this supplier?")) remove.mutate(s.id); }} className="p-1.5 rounded-lg" style={{ color: "#EF4444", background: "#EF444415" }}><Trash2 size={12} /></button>
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      {s.phone && (
                        <div className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
                          <Phone size={11} style={{ color: DIM }} /> {s.phone}
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
                          <Mail size={11} style={{ color: DIM }} /> {s.email}
                        </div>
                      )}
                      {s.address && (
                        <div className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
                          <MapPin size={11} style={{ color: DIM }} /> {s.address}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-3 border-t" style={{ borderColor: BORD }}>
                      <div className="flex-1 text-center">
                        <div className="text-xs font-bold" style={{ color: GOLD }}>{stats.count}</div>
                        <div className="text-[10px]" style={{ color: DIM }}>Purchases</div>
                      </div>
                      <div className="flex-1 text-center border-x" style={{ borderColor: BORD }}>
                        <div className="text-xs font-bold" style={{ color: TEXT }}>LKR {Math.round(stats.total).toLocaleString()}</div>
                        <div className="text-[10px]" style={{ color: DIM }}>Total</div>
                      </div>
                      <div className="flex-1 text-center">
                        <div className="text-xs font-bold" style={{ color: stats.due > 0 ? "#f87171" : DIM }}>
                          {stats.due > 0 ? `LKR ${Math.round(stats.due).toLocaleString()}` : "—"}
                        </div>
                        <div className="text-[10px]" style={{ color: DIM }}>Due</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-[460px] rounded-2xl p-6 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-sm" style={{ color: TEXT }}>{editItem ? "Edit Supplier" : "New Supplier"}</div>
              <button onClick={resetForm}><X size={16} style={{ color: MUTED }} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Supplier Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="e.g. Fresh Farms Ltd..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Contact Person</label>
                  <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="Name..." />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="+94 77 ..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Email</label>
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="email@..." />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Address</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="Address..." />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none resize-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="Optional notes..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-xs" style={{ background: BORD, color: MUTED }}>Cancel</button>
              <button onClick={handleSubmit} disabled={!form.name?.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: GOLD, color: "#1A0A2E" }}>
                {editItem ? "Update" : "Add Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
