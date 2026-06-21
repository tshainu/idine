import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBranchId } from "../lib/store";
import { Sidebar } from "../components/layout/sidebar";
import { Plus, Pencil, Trash2, Search, Receipt } from "lucide-react";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const TEXT = "#F3F4F6";

const EXPENSE_CATEGORIES = [
  "General", "Rent", "Utilities", "Salaries", "Supplies", "Maintenance",
  "Marketing", "Equipment", "Food & Beverage", "Transport", "Other"
];

const today = () => new Date().toISOString().split("T")[0];

const CAT_COLORS: Record<string, string> = {
  Rent: "#EF4444", Utilities: "#F97316", Salaries: "#A78BFA",
  Supplies: "#38BDF8", Maintenance: "#FBBF24", Marketing: "#34D399",
  Equipment: "#F472B6", "Food & Beverage": "#22C55E", Transport: "#60A5FA",
  General: GOLD, Other: DIM,
};

export default function ExpensesPage() {
  const branchId = getBranchId();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({ expenseDate: today(), category: "General", amount: "" });

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ["expenses", branchId],
    queryFn: async () => {
      const res = await fetch(`/api/expenses?branchId=${branchId}`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  const expenses: any[] = (expensesData as any)?.expenses || [];
  const filtered = expenses.filter(e => {
    const matchSearch = !search || e.category.toLowerCase().includes(search.toLowerCase()) || (e.notes || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || e.category === filterCat;
    return matchSearch && matchCat;
  });

  const totalThisMonth = expenses.filter(e => {
    const d = new Date(e.expenseDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const createExpense = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, branchId }) });
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); resetForm(); },
  });
  const updateExpense = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await fetch(`/api/expenses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); resetForm(); },
  });
  const deleteExpense = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  function resetForm() {
    setShowForm(false); setEditItem(null);
    setForm({ expenseDate: today(), category: "General", amount: "" });
  }
  function openEdit(e: any) {
    setEditItem(e);
    setForm({ category: e.category, amount: e.amount, expenseDate: e.expenseDate, notes: e.notes || "" });
    setShowForm(true);
  }
  function handleSubmit() {
    if (!form.amount || Number(form.amount) <= 0) return;
    const data = {
      category: form.category || "General",
      amount: Number(form.amount),
      expenseDate: form.expenseDate || today(),
      notes: form.notes?.trim() || null,
    };
    if (editItem) updateExpense.mutate({ id: editItem.id, data });
    else createExpense.mutate(data);
  }

  // Group by category for summary
  const byCategory = EXPENSE_CATEGORIES.reduce((acc, cat) => {
    const total = expenses.filter(e => e.category === cat).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    if (total > 0) acc.push({ cat, total });
    return acc;
  }, [] as { cat: string; total: number }[]).sort((a, b) => b.total - a.total);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="font-bold text-base" style={{ color: TEXT }}>Expenses</div>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: GOLD, color: "#1A0A2E" }}>
            <Plus size={13} />
            Add Expense
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Stats */}
          <div className="flex gap-3 flex-wrap">
            {[
              { label: "Total Records", value: expenses.length, color: GOLD },
              { label: "This Month", value: `LKR ${totalThisMonth.toLocaleString()}`, color: "#EF4444" },
              { label: "All Time", value: `LKR ${expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0).toLocaleString()}`, color: "#A78BFA" },
            ].map(s => (
              <div key={s.label} className="px-4 py-2.5 rounded-xl border" style={{ background: SURF, borderColor: BORD }}>
                <span className="text-base font-bold" style={{ color: s.color }}>{s.value}</span>
                <span className="text-xs ml-2" style={{ color: MUTED }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Category breakdown */}
          {byCategory.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {byCategory.slice(0, 6).map(({ cat, total }) => (
                <div key={cat} className="px-3 py-1.5 rounded-full border text-xs flex items-center gap-1.5"
                  style={{ background: "rgba(255,255,255,0.03)", borderColor: BORD }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[cat] || DIM }} />
                  <span style={{ color: MUTED }}>{cat}</span>
                  <span className="font-semibold" style={{ color: CAT_COLORS[cat] || DIM }}>LKR {total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: DIM }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                style={{ background: SURF, borderColor: BORD, color: TEXT }} />
            </div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border outline-none"
              style={{ background: SURF, borderColor: BORD, color: MUTED }}>
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORD}` }}>
                  {["Date", "Category", "Amount", "Notes", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: DIM }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-10 text-xs" style={{ color: DIM }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-16" style={{ color: DIM }}>
                    <Receipt size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-xs">No expense records yet</p>
                  </td></tr>
                ) : filtered.map((e: any) => (
                  <tr key={e.id} className="border-t" style={{ borderColor: BORD }}>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{e.expenseDate}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        background: `${CAT_COLORS[e.category] || DIM}22`,
                        color: CAT_COLORS[e.category] || DIM,
                        border: `1px solid ${CAT_COLORS[e.category] || DIM}44`
                      }}>
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold" style={{ color: "#EF4444" }}>LKR {Number(e.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs max-w-[200px] truncate" style={{ color: DIM }}>{e.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(e)} className="p-1 rounded" style={{ color: GOLD }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => { if (confirm("Delete this expense?")) deleteExpense.mutate(e.id); }} className="p-1 rounded" style={{ color: "#EF4444" }}>
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
          <div className="w-[420px] rounded-2xl p-6 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="font-bold text-sm mb-4" style={{ color: TEXT }}>{editItem ? "Edit Expense" : "Add Expense"}</div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Category</label>
                  <select value={form.category || "General"} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: MUTED }}>Date</label>
                  <input type="date" value={form.expenseDate || today()} onChange={e => setForm(p => ({ ...p, expenseDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                    style={{ background: BG, borderColor: BORD, color: TEXT }} />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Amount (LKR) *</label>
                <input type="number" min="0" step="0.01" value={form.amount || ""} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Notes (optional)</label>
                <textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none resize-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="Description or reference..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-xs" style={{ background: BORD, color: MUTED }}>Cancel</button>
              <button onClick={handleSubmit} disabled={!form.amount || Number(form.amount) <= 0}
                className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: GOLD, color: "#1A0A2E" }}>
                {editItem ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
