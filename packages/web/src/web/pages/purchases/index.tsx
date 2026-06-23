import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBranchId } from "../../lib/store";
import { Sidebar } from "../../components/layout/sidebar";
import {
  Plus, Pencil, Trash2, Search, ShoppingBag, CreditCard,
  ChevronDown, ChevronRight, X, Check, Clock, AlertCircle
} from "lucide-react";

const GOLD = "#F5A623";
const BG = "var(--color-bg)";
const SURF = "var(--color-surface)";
const BORD = "var(--color-border)";
const MUTED = "var(--color-text-muted)";
const DIM = "var(--color-text-dim)";
const TEXT = "var(--color-text)";

const today = () => new Date().toISOString().split("T")[0];

const STATUS_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  paid:    { bg: "#16a34a22", text: "#4ade80", label: "Paid" },
  partial: { bg: "#d9770622", text: "#fbbf24", label: "Partial" },
  due:     { bg: "#dc262622", text: "#f87171", label: "Due" },
};
const PAY_METHODS = ["cash", "bank", "cheque", "card"];

export default function PurchasesListPage() {
  const branchId = getBranchId();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showPayForm, setShowPayForm] = useState<number | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", paymentDate: today(), method: "cash", reference: "", notes: "" });
  const [form, setForm] = useState<Record<string, any>>({
    purchaseDate: today(), qty: 1, unitCost: 0, amountPaid: 0, status: "due", paymentMethod: "cash"
  });

  const { data: purchasesData, isLoading } = useQuery({
    queryKey: ["purchases", branchId],
    queryFn: async () => { const r = await fetch(`/api/purchases?branchId=${branchId}`); return r.json(); },
    refetchInterval: 30000,
  });
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers", branchId],
    queryFn: async () => { const r = await fetch(`/api/suppliers?branchId=${branchId}`); return r.json(); },
  });
  const { data: purchaseItemsData } = useQuery({
    queryKey: ["purchase-items", branchId],
    queryFn: async () => { const r = await fetch(`/api/purchase-items?branchId=${branchId}`); return r.json(); },
  });

  const purchases: any[] = (purchasesData as any)?.purchases || [];
  const suppliers: any[] = ((suppliersData as any)?.suppliers || []).filter((s: any) => s.is_active !== 0 && s.isActive !== false);
  const purchaseItems: any[] = ((purchaseItemsData as any)?.items || []).filter((i: any) => i.is_active !== 0 && i.isActive !== false);

  const filtered = purchases.filter(p => {
    const matchSearch = !search || p.supplierName?.toLowerCase().includes(search.toLowerCase()) || p.itemDescription?.toLowerCase().includes(search.toLowerCase()) || p.invoiceNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalDue = purchases.reduce((s, p) => s + (Number(p.dueAmount) || 0), 0);
  const totalPaid = purchases.reduce((s, p) => s + (Number(p.amountPaid) || 0), 0);
  const totalAll = purchases.reduce((s, p) => s + (Number(p.total) || 0), 0);

  const createPurchase = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, branchId }) });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchases"] }); resetForm(); },
  });
  const updatePurchase = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const r = await fetch(`/api/purchases/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchases"] }); resetForm(); },
  });
  const deletePurchase = useMutation({
    mutationFn: async (id: number) => { const r = await fetch(`/api/purchases/${id}`, { method: "DELETE" }); return r.json(); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchases"] }),
  });
  const addPayment = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/purchase-payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, branchId }) });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchases"] }); qc.invalidateQueries({ queryKey: ["purchase-payments"] }); setShowPayForm(null); setPayForm({ amount: "", paymentDate: today(), method: "cash", reference: "", notes: "" }); },
  });
  const deletePayment = useMutation({
    mutationFn: async (id: number) => { const r = await fetch(`/api/purchase-payments/${id}`, { method: "DELETE" }); return r.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchases"] }); qc.invalidateQueries({ queryKey: ["purchase-payments"] }); },
  });

  function resetForm() {
    setShowForm(false); setEditItem(null);
    setForm({ purchaseDate: today(), qty: 1, unitCost: 0, amountPaid: 0, status: "due", paymentMethod: "cash" });
  }
  function openEdit(p: any) {
    setEditItem(p);
    setForm({
      supplierId: p.supplierId || "",
      supplierName: p.supplierName,
      purchaseItemId: p.purchaseItemId || "",
      itemDescription: p.itemDescription,
      invoiceNumber: p.invoiceNumber || "",
      qty: p.qty,
      unitCost: p.unitCost,
      purchaseDate: p.purchaseDate,
      notes: p.notes || "",
    });
    setShowForm(true);
  }
  function handleSupplierSelect(id: string) {
    const sup = suppliers.find(s => s.id === parseInt(id));
    setForm(f => ({ ...f, supplierId: id, supplierName: sup?.name || "" }));
  }
  function handleItemSelect(id: string) {
    const item = purchaseItems.find(i => i.id === parseInt(id));
    setForm(f => ({ ...f, purchaseItemId: id, itemDescription: item?.name || "", unitCost: item?.lastCost || f.unitCost }));
  }
  function handleSubmit() {
    if (!form.supplierName?.trim() || !form.itemDescription?.trim()) return;
    const data = {
      supplierId: form.supplierId || null,
      supplierName: form.supplierName.trim(),
      purchaseItemId: form.purchaseItemId || null,
      itemDescription: form.itemDescription.trim(),
      invoiceNumber: form.invoiceNumber?.trim() || null,
      qty: Number(form.qty) || 1,
      unitCost: Number(form.unitCost) || 0,
      purchaseDate: form.purchaseDate || today(),
      notes: form.notes?.trim() || null,
      amountPaid: Number(form.amountPaid) || 0,
      paymentMethod: form.paymentMethod || "cash",
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
          <div className="font-bold text-sm" style={{ color: TEXT }}>Purchases</div>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: GOLD, color: "#1A0A2E" }}>
            <Plus size={13} /> New Purchase
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Amount", value: `LKR ${Math.round(totalAll).toLocaleString()}`, color: GOLD },
              { label: "Total Paid", value: `LKR ${Math.round(totalPaid).toLocaleString()}`, color: "#4ade80" },
              { label: "Total Due", value: `LKR ${Math.round(totalDue).toLocaleString()}`, color: "#f87171" },
              { label: "Records", value: purchases.length, color: "#a78bfa" },
            ].map(s => (
              <div key={s.label} className="rounded-xl px-4 py-3 border" style={{ background: SURF, borderColor: BORD }}>
                <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: MUTED }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: DIM }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search supplier, item, invoice..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                style={{ background: SURF, borderColor: BORD, color: TEXT }} />
            </div>
            <div className="flex gap-1">
              {[["all", "All"], ["paid", "Paid"], ["partial", "Partial"], ["due", "Due"]].map(([k, l]) => (
                <button key={k} onClick={() => setFilterStatus(k)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                  style={{
                    background: filterStatus === k ? GOLD : "transparent",
                    color: filterStatus === k ? "#1A0A2E" : MUTED,
                    borderColor: filterStatus === k ? GOLD : BORD,
                  }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORD}` }}>
                  {["", "Date", "Invoice #", "Supplier", "Item", "Qty", "Unit Cost", "Total", "Paid", "Due", "Status", ""].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left text-xs font-semibold" style={{ color: DIM }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={12} className="text-center py-10 text-xs" style={{ color: DIM }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-16" style={{ color: DIM }}>
                    <ShoppingBag size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-xs">No purchase records</p>
                  </td></tr>
                ) : filtered.map((p: any) => {
                  const sc = STATUS_COLOR[p.status] || STATUS_COLOR.due;
                  const isExpanded = expandedId === p.id;
                  return (
                    <>
                      <tr key={p.id} className="border-t cursor-pointer hover:bg-white/5 transition-all" style={{ borderColor: BORD }}
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                        <td className="px-3 py-3">
                          <div style={{ color: MUTED }}>
                            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs" style={{ color: MUTED }}>{p.purchaseDate}</td>
                        <td className="px-3 py-3 text-xs font-mono" style={{ color: DIM }}>{p.invoiceNumber || "—"}</td>
                        <td className="px-3 py-3 text-xs font-medium" style={{ color: TEXT }}>{p.supplierName}</td>
                        <td className="px-3 py-3 text-xs" style={{ color: MUTED }}>{p.itemDescription}</td>
                        <td className="px-3 py-3 text-xs" style={{ color: TEXT }}>{p.qty}</td>
                        <td className="px-3 py-3 text-xs" style={{ color: MUTED }}>LKR {Number(p.unitCost).toLocaleString()}</td>
                        <td className="px-3 py-3 text-xs font-semibold" style={{ color: TEXT }}>LKR {Number(p.total).toLocaleString()}</td>
                        <td className="px-3 py-3 text-xs font-semibold" style={{ color: "#4ade80" }}>LKR {Number(p.amountPaid || 0).toLocaleString()}</td>
                        <td className="px-3 py-3 text-xs font-semibold" style={{ color: Number(p.dueAmount) > 0 ? "#f87171" : DIM }}>
                          {Number(p.dueAmount) > 0 ? `LKR ${Number(p.dueAmount).toLocaleString()}` : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
                        </td>
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => openEdit(p)} className="p-1 rounded" style={{ color: GOLD }} title="Edit"><Pencil size={12} /></button>
                            <button onClick={() => { if (confirm("Delete this purchase?")) deletePurchase.mutate(p.id); }} className="p-1 rounded" style={{ color: "#EF4444" }} title="Delete"><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded: payments */}
                      {isExpanded && (
                        <tr key={`exp-${p.id}`} style={{ borderColor: BORD }}>
                          <td colSpan={12} className="px-6 py-4" style={{ background: "rgba(245,166,35,0.04)", borderTop: `1px solid ${BORD}` }}>
                            <PaymentsPanel purchaseId={p.id} branchId={branchId} total={p.total}
                              showPayForm={showPayForm === p.id}
                              onShowPayForm={() => setShowPayForm(p.id)}
                              onHidePayForm={() => setShowPayForm(null)}
                              payForm={payForm} setPayForm={setPayForm}
                              onAddPayment={() => addPayment.mutate({ purchaseId: p.id, ...payForm })}
                              onDeletePayment={(pid: number) => deletePayment.mutate(pid)}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl p-6 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-sm" style={{ color: TEXT }}>{editItem ? "Edit Purchase" : "New Purchase"}</div>
              <button onClick={resetForm}><X size={16} style={{ color: MUTED }} /></button>
            </div>
            <div className="space-y-3">
              {/* Supplier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Supplier</label>
                  <select value={form.supplierId || ""} onChange={e => handleSupplierSelect(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }}>
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Supplier Name *</label>
                  <input value={form.supplierName || ""} onChange={e => setForm(f => ({ ...f, supplierName: e.target.value, supplierId: "" }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="Or type name..." />
                </div>
              </div>

              {/* Purchase Item */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Item (from catalog)</label>
                  <select value={form.purchaseItemId || ""} onChange={e => handleItemSelect(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }}>
                    <option value="">-- Select Item --</option>
                    {purchaseItems.map((i: any) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Item Description *</label>
                  <input value={form.itemDescription || ""} onChange={e => setForm(f => ({ ...f, itemDescription: e.target.value, purchaseItemId: "" }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="Or describe item..." />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Invoice #</label>
                  <input value={form.invoiceNumber || ""} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="INV-001..." />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Quantity</label>
                  <input type="number" min="0.01" step="0.01" value={form.qty || ""} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Unit Cost (LKR)</label>
                  <input type="number" min="0" step="0.01" value={form.unitCost || ""} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} />
                </div>
              </div>

              <div className="rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ background: "rgba(245,166,35,0.08)", border: `1px solid rgba(245,166,35,0.2)` }}>
                <span className="text-xs" style={{ color: MUTED }}>Total Amount</span>
                <span className="text-sm font-bold" style={{ color: GOLD }}>LKR {computedTotal.toLocaleString()}</span>
              </div>

              {!editItem && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: MUTED }}>Initial Payment (LKR)</label>
                    <input type="number" min="0" step="0.01" value={form.amountPaid || ""} onChange={e => setForm(f => ({ ...f, amountPaid: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                      style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="0" />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: MUTED }}>Payment Method</label>
                    <select value={form.paymentMethod || "cash"} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                      style={{ background: BG, borderColor: BORD, color: TEXT }}>
                      {PAY_METHODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Purchase Date</label>
                  <input type="date" value={form.purchaseDate || today()} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Notes</label>
                  <input value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="Optional..." />
                </div>
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

function PaymentsPanel({ purchaseId, branchId, total, showPayForm, onShowPayForm, onHidePayForm, payForm, setPayForm, onAddPayment, onDeletePayment }: any) {
  const { data } = useQuery({
    queryKey: ["purchase-payments", purchaseId],
    queryFn: async () => { const r = await fetch(`/api/purchase-payments?purchaseId=${purchaseId}`); return r.json(); },
  });
  const payments: any[] = (data as any)?.payments || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: TEXT }}>
          <CreditCard size={13} style={{ color: GOLD }} /> Payment History
        </div>
        {!showPayForm && (
          <button onClick={onShowPayForm}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{ background: GOLD + "22", color: GOLD, border: `1px solid ${GOLD}44` }}>
            <Plus size={11} /> Add Payment
          </button>
        )}
      </div>

      {showPayForm && (
        <div className="mb-3 p-3 rounded-xl border" style={{ background: SURF, borderColor: BORD }}>
          <div className="grid grid-cols-4 gap-2 mb-2">
            <div>
              <label className="text-[10px] mb-0.5 block" style={{ color: MUTED }}>Amount *</label>
              <input type="number" min="0" step="0.01" value={payForm.amount} onChange={e => setPayForm((f: any) => ({ ...f, amount: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border bg-transparent outline-none"
                style={{ background: "var(--color-bg)", borderColor: BORD, color: TEXT }} placeholder="0.00" />
            </div>
            <div>
              <label className="text-[10px] mb-0.5 block" style={{ color: MUTED }}>Date</label>
              <input type="date" value={payForm.paymentDate} onChange={e => setPayForm((f: any) => ({ ...f, paymentDate: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border bg-transparent outline-none"
                style={{ background: "var(--color-bg)", borderColor: BORD, color: TEXT }} />
            </div>
            <div>
              <label className="text-[10px] mb-0.5 block" style={{ color: MUTED }}>Method</label>
              <select value={payForm.method} onChange={e => setPayForm((f: any) => ({ ...f, method: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border bg-transparent outline-none"
                style={{ background: "var(--color-bg)", borderColor: BORD, color: TEXT }}>
                {["cash", "bank", "cheque", "card"].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] mb-0.5 block" style={{ color: MUTED }}>Reference</label>
              <input value={payForm.reference} onChange={e => setPayForm((f: any) => ({ ...f, reference: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border bg-transparent outline-none"
                style={{ background: "var(--color-bg)", borderColor: BORD, color: TEXT }} placeholder="Ref#..." />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onHidePayForm} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: BORD, color: MUTED }}>Cancel</button>
            <button onClick={onAddPayment} disabled={!payForm.amount || Number(payForm.amount) <= 0}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
              style={{ background: "#16a34a", color: "#fff" }}>
              <Check size={11} /> Record Payment
            </button>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="text-xs py-4 text-center" style={{ color: DIM }}>No payments recorded yet</div>
      ) : (
        <div className="space-y-1.5">
          {payments.map((pay: any) => (
            <div key={pay.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORD}` }}>
              <div className="flex items-center gap-3">
                <Check size={12} className="shrink-0" style={{ color: "#4ade80" }} />
                <div>
                  <div className="text-xs font-semibold" style={{ color: TEXT }}>LKR {Number(pay.amount).toLocaleString()}</div>
                  <div className="text-[10px]" style={{ color: DIM }}>{pay.paymentDate} · {pay.method}{pay.reference ? ` · ${pay.reference}` : ""}</div>
                </div>
              </div>
              <button onClick={() => { if (confirm("Delete this payment?")) onDeletePayment(pay.id); }} style={{ color: "#EF4444" }}>
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          <div className="flex justify-between text-xs px-3 py-2 mt-1 rounded-lg" style={{ background: "rgba(245,166,35,0.06)", border: `1px solid rgba(245,166,35,0.15)` }}>
            <span style={{ color: MUTED }}>Total of {payments.length} payment(s)</span>
            <span className="font-bold" style={{ color: GOLD }}>LKR {payments.reduce((s: number, p: any) => s + Number(p.amount), 0).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
