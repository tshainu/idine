import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";
import { Sidebar } from "../components/layout/sidebar";
import { Printer, Tag, CheckCircle } from "lucide-react";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const TEXT = "#F3F4F6";

export default function KitchenPage() {
  const branchId = getBranchId();
  const qc = useQueryClient();
  const [saved, setSaved] = useState<number[]>([]);

  const { data: categoriesData } = useQuery({
    queryKey: ["categories", branchId],
    queryFn: async () => (await api.categories.$get({ query: { branchId: String(branchId) } })).json(),
  });
  const { data: printersData } = useQuery({
    queryKey: ["printers", branchId],
    queryFn: async () => (await api.printers.$get({ query: { branchId: String(branchId) } })).json(),
  });
  const { data: menuData } = useQuery({
    queryKey: ["admin-menu", branchId],
    queryFn: async () => (await api["menu-items"].$get({ query: { branchId: String(branchId) } })).json(),
  });

  const categories: any[] = (categoriesData as any)?.categories || [];
  const printers: any[] = (printersData as any)?.printers || [];
  const menuItems: any[] = (menuData as any)?.items || [];

  // Map categoryId → printerId (derived from menu items)
  const catPrinterMap: Record<number, number | null> = {};
  categories.forEach(cat => {
    const items = menuItems.filter(m => m.categoryId === cat.id);
    // Use the most common printerId for items in this category
    const freq: Record<number, number> = {};
    items.forEach(m => { if (m.printerId) freq[m.printerId] = (freq[m.printerId] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    catPrinterMap[cat.id] = sorted.length ? Number(sorted[0][0]) : null;
  });

  const [assignments, setAssignments] = useState<Record<number, number | null>>({});

  function getAssignment(catId: number): number | null {
    if (catId in assignments) return assignments[catId];
    return catPrinterMap[catId] ?? null;
  }

  const updateItems = useMutation({
    mutationFn: async ({ catId, printerId }: { catId: number; printerId: number | null }) => {
      const items = menuItems.filter(m => m.categoryId === catId);
      await Promise.all(items.map(m =>
        api["menu-items"][":id"].$patch({ param: { id: String(m.id) }, json: { printerId } })
      ));
      return catId;
    },
    onSuccess: (catId) => {
      qc.invalidateQueries({ queryKey: ["admin-menu"] });
      setSaved(prev => [...prev, catId]);
      setTimeout(() => setSaved(prev => prev.filter(id => id !== catId)), 2000);
    },
  });

  function handleChange(catId: number, val: string) {
    setAssignments(prev => ({ ...prev, [catId]: val === "" ? null : Number(val) }));
  }

  function handleSave(catId: number) {
    updateItems.mutate({ catId, printerId: getAssignment(catId) });
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 flex items-center px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div>
            <div className="font-bold text-base" style={{ color: TEXT }}>Kitchen Setup</div>
            <div className="text-xs" style={{ color: DIM }}>Assign printer stations to menu categories</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Printers overview */}
          <div>
            <div className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: DIM }}>Print Stations</div>
            <div className="flex flex-wrap gap-3">
              {printers.length === 0 ? (
                <div className="text-xs" style={{ color: DIM }}>No printers configured. Add printers in Admin → Printers.</div>
              ) : printers.map((p: any) => (
                <div key={p.id} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border" style={{ background: SURF, borderColor: BORD }}>
                  <Printer size={14} color={GOLD} />
                  <div>
                    <div className="text-xs font-semibold" style={{ color: TEXT }}>{p.name}</div>
                    <div className="text-[10px]" style={{ color: DIM }}>{p.type} · {p.ipAddress || p.port || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category → Printer assignment */}
          <div>
            <div className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: DIM }}>Category → Printer Routing</div>
            {categories.length === 0 ? (
              <div className="text-xs" style={{ color: DIM }}>No categories found. Add categories in Admin first.</div>
            ) : (
              <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORD}` }}>
                      <th className="px-5 py-3 text-left text-xs font-semibold" style={{ color: DIM }}>Category</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold" style={{ color: DIM }}>Items Count</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold" style={{ color: DIM }}>Print Station</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold" style={{ color: DIM }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat: any) => {
                      const count = menuItems.filter(m => m.categoryId === cat.id).length;
                      const current = getAssignment(cat.id);
                      const isSaved = saved.includes(cat.id);
                      return (
                        <tr key={cat.id} className="border-t" style={{ borderColor: BORD }}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <Tag size={13} color={GOLD} />
                              <span className="text-xs font-medium" style={{ color: TEXT }}>{cat.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs" style={{ color: MUTED }}>{count} items</td>
                          <td className="px-5 py-3">
                            <select
                              value={current ?? ""}
                              onChange={e => handleChange(cat.id, e.target.value)}
                              className="px-3 py-1.5 text-xs rounded-lg border outline-none w-48"
                              style={{ background: BG, borderColor: BORD, color: TEXT }}
                            >
                              <option value="">— No Printer —</option>
                              {printers.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-5 py-3">
                            {isSaved ? (
                              <div className="flex items-center gap-1 text-xs" style={{ color: "#22C55E" }}>
                                <CheckCircle size={13} />
                                Saved
                              </div>
                            ) : (
                              <button
                                onClick={() => handleSave(cat.id)}
                                disabled={updateItems.isPending}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                style={{ background: GOLD, color: "#1A0A2E" }}
                              >
                                {updateItems.isPending ? "Saving..." : "Save"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Info note */}
          <div className="rounded-xl p-4 border text-xs" style={{ background: "#F5A62311", borderColor: "#F5A62333", color: MUTED }}>
            <strong style={{ color: GOLD }}>How it works:</strong> When a KOT is printed, each item is routed to the printer assigned to its category.
            Items with no printer assigned will not print to kitchen. The billing bill printer handles final receipts separately.
          </div>
        </div>
      </div>
    </div>
  );
}
