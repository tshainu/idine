import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { getBranchId } from "../../lib/store";
import { ReportLayout, DataTable, ViewToggle, GOLD, SURF, BORD, MUTED, DIM, TEXT } from "./layout";
import type { ColDef } from "./layout";
import { AlertTriangle } from "lucide-react";

const ING_COLS: ColDef[] = [
  { key: "name",        label: "Ingredient" },
  { key: "unit",        label: "Unit" },
  { key: "stockQty",    label: "Closing Stock", align: "right", render: (v, row) => <span style={{ fontWeight: 700, color: Number(v) < 0 ? "#f87171" : TEXT }}>{v} {row.unit}</span> },
  { key: "minStockQty", label: "Reorder Level",  align: "right", render: (v, row) => `${v} ${row.unit}` },
  { key: "costPerUnit", label: "Cost / Unit",     align: "right", render: v => `LKR ${Number(v).toLocaleString()}` },
  { key: "stockValue",  label: "Stock Value",     align: "right", render: v => <span style={{ color: GOLD, fontWeight: 700 }}>LKR {Math.round(Number(v)).toLocaleString()}</span> },
  { key: "status",      label: "Status", render: v => (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{
        background: v === "Negative" ? "#dc262633" : v === "Low" ? "#d9770633" : "#16a34a33",
        color: v === "Negative" ? "#f87171" : v === "Low" ? "#fbbf24" : "#4ade80",
      }}>{v}</span>
  )},
];

const PURCHASE_COLS: ColDef[] = [
  { key: "purchaseDate",    label: "Date" },
  { key: "supplierName",    label: "Supplier" },
  { key: "itemDescription", label: "Item" },
  { key: "qty",             label: "Qty",   align: "right" },
  { key: "unitCost",        label: "Unit Cost", align: "right", render: v => `LKR ${Number(v).toLocaleString()}` },
  { key: "total",           label: "Total",     align: "right", render: v => <span style={{ color: GOLD, fontWeight: 700 }}>LKR {Math.round(Number(v)).toLocaleString()}</span> },
  { key: "notes",           label: "Notes" },
];

export default function InventoryReport() {
  const branchId = getBranchId();
  const [view, setView] = useState<"summary" | "table">("summary");
  const [tableTab, setTableTab] = useState<"ingredients" | "purchases">("ingredients");

  const { data: ingData, isLoading } = useQuery({
    queryKey: ["ingredients", branchId],
    queryFn: async () => (await api.ingredients.$get({ query: { branchId: String(branchId) } })).json(),
  });
  const { data: purchasesData } = useQuery({
    queryKey: ["purchases", branchId],
    queryFn: async () => (await api.purchases.$get({ query: { branchId: String(branchId) } })).json(),
  });

  const ingredients: any[] = (ingData as any)?.ingredients || [];
  const purchases: any[] = (purchasesData as any)?.purchases || [];

  const lowStock = ingredients.filter(i => i.stockQty <= i.minStockQty && i.minStockQty > 0);
  const negative = ingredients.filter(i => i.stockQty < 0);
  const totalStockValue = ingredients.reduce((s, i) => s + (i.stockQty * i.costPerUnit), 0);

  function getPurchased(name: string) {
    return purchases.filter(p => p.itemDescription?.toLowerCase().includes(name.toLowerCase())).reduce((s, p) => s + (Number(p.qty) || 0), 0);
  }

  const ingRows = ingredients.map(ing => ({
    ...ing,
    stockValue: ing.stockQty * ing.costPerUnit,
    purchased: getPurchased(ing.name),
    status: ing.stockQty < 0 ? "Negative" : ing.stockQty <= ing.minStockQty && ing.minStockQty > 0 ? "Low" : "OK",
  }));

  const purchaseRows = purchases.map(p => ({ ...p, total: Number(p.total) }));

  return (
    <ReportLayout title="Inventory & Stock">
      {/* Alerts */}
      {(lowStock.length > 0 || negative.length > 0) && (
        <div className="space-y-2">
          {negative.length > 0 && (
            <div className="rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium border"
              style={{ background: "#dc262622", borderColor: "#dc2626", color: "#f87171" }}>
              <AlertTriangle size={16} />
              {negative.length} item(s) have negative stock — check consumption records.
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium border"
              style={{ background: "#d9770622", borderColor: "#d97706", color: "#fbbf24" }}>
              <AlertTriangle size={16} />
              {lowStock.length} item(s) below reorder level. Restock soon.
            </div>
          )}
        </div>
      )}

      {/* Summary + toggle */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="grid grid-cols-4 gap-3 flex-1">
          {[
            { label: "Total Ingredients", value: ingredients.length },
            { label: "Low Stock Items",   value: lowStock.length,  warn: lowStock.length > 0 },
            { label: "Negative Stock",    value: negative.length,  danger: negative.length > 0 },
            { label: "Stock Value",       value: `LKR ${Math.round(totalStockValue).toLocaleString()}` },
          ].map(c => (
            <div key={c.label} className="rounded-xl p-4 border" style={{
              background: SURF,
              borderColor: (c as any).danger ? "#dc2626" : (c as any).warn ? "#d97706" : BORD,
            }}>
              <div className="text-xl font-bold" style={{
                color: (c as any).danger ? "#f87171" : (c as any).warn ? "#fbbf24" : GOLD,
              }}>{c.value}</div>
              <div className="text-xs mt-0.5" style={{ color: MUTED }}>{c.label}</div>
            </div>
          ))}
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {/* TABLE VIEW */}
      {view === "table" ? (
        <>
          <div className="flex gap-1 border-b" style={{ borderColor: BORD }}>
            {([["ingredients", "Ingredients"] as const, ["purchases", "Purchases"] as const]).map(([k, l]) => (
              <button key={k} onClick={() => setTableTab(k)}
                className="px-4 py-2 text-xs font-semibold border-b-2 transition-all"
                style={{ color: tableTab === k ? GOLD : MUTED, borderBottomColor: tableTab === k ? GOLD : "transparent" }}>
                {l}
              </button>
            ))}
          </div>
          {tableTab === "ingredients"
            ? <DataTable title={`Ingredients (${ingRows.length})`} columns={ING_COLS} rows={ingRows} exportName="ingredients" />
            : <DataTable title={`Purchases (${purchaseRows.length})`} columns={PURCHASE_COLS} rows={purchaseRows} exportName="purchases" />
          }
        </>
      ) : (
        <>
          {/* Stock table */}
          <div className="rounded-2xl p-5 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="font-semibold text-sm mb-4" style={{ color: TEXT }}>Stock Status</div>
            {isLoading
              ? <div className="text-xs py-8 text-center" style={{ color: DIM }}>Loading…</div>
              : ingredients.length === 0
                ? <div className="text-xs py-8 text-center" style={{ color: DIM }}>No ingredients added yet.</div>
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ color: DIM }}>
                          <th className="text-left py-2 pr-4">Ingredient</th>
                          <th className="text-right py-2 pr-4">Purchased</th>
                          <th className="text-right py-2 pr-4">Closing Stock</th>
                          <th className="text-right py-2 pr-4">Reorder Level</th>
                          <th className="text-right py-2 pr-4">Unit Cost</th>
                          <th className="text-right py-2 pr-4">Stock Value</th>
                          <th className="text-right py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingredients.map((ing, i) => {
                          const purchased = getPurchased(ing.name);
                          const isLow = ing.stockQty <= ing.minStockQty && ing.minStockQty > 0;
                          const isNeg = ing.stockQty < 0;
                          const stockVal = ing.stockQty * ing.costPerUnit;
                          return (
                            <tr key={i} className="border-t" style={{ borderColor: BORD }}>
                              <td className="py-2 pr-4 font-medium" style={{ color: TEXT }}>{ing.name}</td>
                              <td className="py-2 pr-4 text-right" style={{ color: MUTED }}>{purchased > 0 ? `${purchased} ${ing.unit}` : "—"}</td>
                              <td className="py-2 pr-4 text-right font-bold" style={{ color: isNeg ? "#f87171" : TEXT }}>{ing.stockQty} {ing.unit}</td>
                              <td className="py-2 pr-4 text-right" style={{ color: MUTED }}>{ing.minStockQty} {ing.unit}</td>
                              <td className="py-2 pr-4 text-right" style={{ color: MUTED }}>LKR {ing.costPerUnit}</td>
                              <td className="py-2 pr-4 text-right font-bold" style={{ color: GOLD }}>LKR {Math.round(stockVal).toLocaleString()}</td>
                              <td className="py-2 text-right">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                  style={{
                                    background: isNeg ? "#dc262633" : isLow ? "#d9770633" : "#16a34a33",
                                    color: isNeg ? "#f87171" : isLow ? "#fbbf24" : "#4ade80",
                                  }}>
                                  {isNeg ? "Negative" : isLow ? "Low" : "OK"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
            }
          </div>

          {/* Recent purchases */}
          <div className="rounded-2xl p-5 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="font-semibold text-sm mb-4" style={{ color: TEXT }}>Recent Purchases</div>
            {purchases.length === 0
              ? <div className="text-xs text-center py-6" style={{ color: DIM }}>No purchases recorded.</div>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ color: DIM }}>
                        <th className="text-left py-2 pr-4">Date</th>
                        <th className="text-left py-2 pr-4">Supplier</th>
                        <th className="text-left py-2 pr-4">Item</th>
                        <th className="text-right py-2 pr-4">Qty</th>
                        <th className="text-right py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.slice(0, 20).map((p, i) => (
                        <tr key={i} className="border-t" style={{ borderColor: BORD }}>
                          <td className="py-2 pr-4" style={{ color: MUTED }}>{p.purchaseDate}</td>
                          <td className="py-2 pr-4" style={{ color: TEXT }}>{p.supplierName}</td>
                          <td className="py-2 pr-4" style={{ color: MUTED }}>{p.itemDescription}</td>
                          <td className="py-2 pr-4 text-right" style={{ color: TEXT }}>{p.qty}</td>
                          <td className="py-2 text-right font-bold" style={{ color: GOLD }}>LKR {Math.round(Number(p.total)).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        </>
      )}
    </ReportLayout>
  );
}
