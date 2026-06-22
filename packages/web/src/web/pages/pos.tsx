import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";
import { Spinner } from "../components/ui/spinner";
import {
  Search, Plus, Minus, Pencil, RotateCcw, FileText, Receipt, Printer,
  Ban, Edit3, Info, UtensilsCrossed, ShoppingBag, Truck, Grid3x3,
  RefreshCw, Camera, X, ChevronDown, Check, SlidersHorizontal,
  LogOut, Globe, FolderOpen, Clock, Briefcase, Bell, Monitor, Menu, Scissors,
  User,
} from "lucide-react";

// ── Theme tokens ──────────────────────────────────────────────────────────────
const BG    = "var(--color-bg)";
const SURF  = "var(--color-surface)";
const SURF2 = "var(--color-surface-2)";
const BORD  = "var(--color-border)";
const GOLD  = "var(--color-gold)";
const TEXT  = "var(--color-text)";
const MUTED = "var(--color-text-muted)";
const DIM   = "var(--color-text-dim)";

// ── Types ─────────────────────────────────────────────────────────────────────
type OrderType = "dine-in" | "takeaway" | "delivery";
type Modifier  = { id: number; name: string; groupName: string; price: number };
type CartItem  = {
  menuItemId: number;
  name: string;
  price: number;
  qty: number;
  discount: number;
  printerId: number | null;
  modifiers: Modifier[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function waiterShortId(name: string | null | undefined): string {
  if (!name) return "WW";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    // First letter of first name + first letter of last name
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  // Single name: first two letters
  return name.slice(0, 2).toUpperCase();
}

function genOrderNumber(waiterName: string | null | undefined, seq: number): string {
  const now  = new Date();
  const mm   = String(now.getMonth() + 1).padStart(2, "0");
  const dd   = String(now.getDate()).padStart(2, "0");
  const ww   = waiterShortId(waiterName);
  const s    = String(seq).padStart(3, "0");
  return `${mm}${dd}${ww}-${s}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Small action button in left panel */
function Btn({ icon: Icon, label, onClick, danger }: {
  icon: any; label: string; onClick?: () => void; danger?: boolean;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded border text-xs font-medium transition-all hover:brightness-110"
      style={{
        background: danger ? "var(--color-danger)22" : SURF2,
        color:      danger ? "var(--color-danger)"   : MUTED,
        borderColor: danger ? "var(--color-danger)"  : BORD,
      }}>
      <Icon size={11} /> {label}
    </button>
  );
}

/** Toast banner near the top title */
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="ml-3 px-3 py-1 rounded-lg text-xs font-semibold animate-fade-up"
      style={{ background: GOLD, color: "#1A0A2E", whiteSpace: "nowrap" }}>
      {msg}
    </div>
  );
}

/** Customer search + add/edit dropdown */
function CustomerPicker({
  branchId, customerId, customerName,
  onChange,
}: {
  branchId: number;
  customerId: number | null;
  customerName: string;
  onChange: (id: number | null, name: string) => void;
}) {
  const [open,       setOpen]       = useState(false);
  const [search,     setSearch]     = useState("");
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form,       setForm]       = useState({ name: "", phone: "", address: "" });
  const ref = useRef<HTMLDivElement>(null);
  const qc  = useQueryClient();

  const { data } = useQuery({
    queryKey: ["customers", branchId, search],
    queryFn: async () => (await api.customers.$get({ query: { branchId: String(branchId), search } })).json(),
    enabled: open,
  });
  const customers = (data as any)?.customers || [];

  // close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editTarget) {
        return (await api.customers[":id"].$patch({ param: { id: String(editTarget.id) }, json: form })).json();
      }
      return (await api.customers.$post({ json: { ...form, branchId } })).json();
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      const c = res.customer;
      onChange(c.id, c.name);
      setShowModal(false);
      setSearch("");
      setOpen(false);
    },
  });

  function openAdd() {
    setEditTarget(null);
    setForm({ name: "", phone: "", address: "" });
    setShowModal(true);
    setOpen(false);
  }
  function openEdit(c: any, e: React.MouseEvent) {
    e.stopPropagation();
    setEditTarget(c);
    setForm({ name: c.name, phone: c.phone || "", address: c.address || "" });
    setShowModal(true);
    setOpen(false);
  }

  return (
    <div className="relative flex-1" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-1 px-2 py-1.5 rounded border text-xs focus:outline-none"
        style={{ background: SURF2, color: TEXT, borderColor: BORD }}>
        <User size={11} style={{ color: MUTED, flexShrink: 0 }} />
        <span className="flex-1 text-left truncate">{customerName || "Customer"}</span>
        <ChevronDown size={10} style={{ color: MUTED, flexShrink: 0 }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border shadow-xl"
          style={{ background: SURF, borderColor: BORD, minWidth: "180px" }}>
          <div className="p-1.5 border-b" style={{ borderColor: BORD }}>
            <div className="relative">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: DIM }} />
              <input autoFocus
                className="w-full pl-6 pr-2 py-1.5 rounded border text-xs focus:outline-none"
                style={{ background: SURF2, color: TEXT, borderColor: BORD }}
                placeholder="Search name or phone…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {/* Walk-in */}
            <button
              onClick={() => { onChange(null, "Walk-in Customer"); setOpen(false); setSearch(""); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:brightness-125 transition-all"
              style={{ color: MUTED }}>
              <User size={11} /> Walk-in Customer
              {!customerId && <Check size={10} className="ml-auto" style={{ color: GOLD }} />}
            </button>
            {customers.map((c: any) => (
              <div key={c.id} className="flex items-center gap-1 px-2 py-1.5 hover:brightness-125 transition-all group">
                <button
                  onClick={() => { onChange(c.id, c.name); setOpen(false); setSearch(""); }}
                  className="flex-1 flex flex-col text-left text-xs">
                  <span style={{ color: TEXT }}>{c.name}</span>
                  {c.phone && <span style={{ color: DIM }}>{c.phone}</span>}
                </button>
                {customerId === c.id && <Check size={10} style={{ color: GOLD }} />}
                <button onClick={e => openEdit(c, e)}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded"
                  style={{ color: MUTED }}>
                  <Pencil size={10} />
                </button>
              </div>
            ))}
            {customers.length === 0 && search && (
              <div className="px-3 py-2 text-xs" style={{ color: DIM }}>No results</div>
            )}
          </div>
          <div className="border-t p-1.5" style={{ borderColor: BORD }}>
            <button onClick={openAdd}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-all hover:brightness-110"
              style={{ background: GOLD + "22", color: GOLD, border: `1px solid ${GOLD}` }}>
              <Plus size={11} /> Add New Customer
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#00000088" }}>
          <div className="rounded-xl border p-5 w-80 shadow-2xl" style={{ background: SURF, borderColor: BORD }}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-sm" style={{ color: TEXT }}>{editTarget ? "Edit Customer" : "New Customer"}</span>
              <button onClick={() => setShowModal(false)} style={{ color: MUTED }}><X size={14} /></button>
            </div>
            {(["name", "phone", "address"] as const).map(f => (
              <div key={f} className="mb-3">
                <label className="block text-xs mb-1 capitalize" style={{ color: MUTED }}>{f}</label>
                <input
                  className="w-full px-2.5 py-1.5 rounded border text-xs focus:outline-none"
                  style={{ background: SURF2, color: TEXT, borderColor: BORD }}
                  value={(form as any)[f]}
                  onChange={e => setForm(v => ({ ...v, [f]: e.target.value }))}
                  placeholder={f === "name" ? "Full name *" : f === "phone" ? "Phone number" : "Address"} />
              </div>
            ))}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2 rounded border text-xs" style={{ borderColor: BORD, color: MUTED }}>Cancel</button>
              <button onClick={() => saveMut.mutate()}
                disabled={!form.name || saveMut.isPending}
                className="flex-1 py-2 rounded text-xs font-semibold disabled:opacity-40"
                style={{ background: GOLD, color: "#1A0A2E" }}>
                {saveMut.isPending ? <Spinner size={12} /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Modifier selector popup for a cart item */
function ModifierPicker({
  branchId,
  selected,
  onChange,
  onClose,
}: {
  branchId: number;
  selected: Modifier[];
  onChange: (mods: Modifier[]) => void;
  onClose: () => void;
}) {
  const { data } = useQuery({
    queryKey: ["modifiers", branchId],
    queryFn: async () => (await api.modifiers.$get({ query: { branchId: String(branchId) } })).json(),
  });
  const modifiers: Modifier[] = (data as any)?.modifiers || [];

  // group by groupName
  const groups = modifiers.reduce((acc, m) => {
    (acc[m.groupName] ||= []).push(m);
    return acc;
  }, {} as Record<string, Modifier[]>);

  function toggle(m: Modifier) {
    const has = selected.some(s => s.id === m.id);
    onChange(has ? selected.filter(s => s.id !== m.id) : [...selected, m]);
  }

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#00000088" }}>
      <div ref={ref} className="rounded-xl border shadow-2xl w-72 max-h-96 flex flex-col"
        style={{ background: SURF, borderColor: BORD }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: BORD }}>
          <span className="font-bold text-sm" style={{ color: TEXT }}>Modifiers / Add-ons</span>
          <button onClick={onClose} style={{ color: MUTED }}><X size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {Object.keys(groups).length === 0
            ? <p className="text-xs p-4 text-center" style={{ color: DIM }}>No modifiers configured</p>
            : Object.entries(groups).map(([group, items]) => (
              <div key={group} className="mb-2">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: DIM }}>{group}</div>
                {items.map(m => {
                  const active = selected.some(s => s.id === m.id);
                  return (
                    <button key={m.id} onClick={() => toggle(m)}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded text-xs transition-all"
                      style={{
                        background: active ? GOLD + "22" : "transparent",
                        color: active ? GOLD : TEXT,
                      }}>
                      <span>{m.name}</span>
                      <span className="flex items-center gap-2">
                        {m.price > 0 && <span style={{ color: MUTED }}>+{m.price.toFixed(2)}</span>}
                        {active && <Check size={10} style={{ color: GOLD }} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          }
        </div>
        <div className="border-t px-3 py-2" style={{ borderColor: BORD }}>
          <button onClick={onClose}
            className="w-full py-2 rounded text-xs font-semibold"
            style={{ background: GOLD, color: "#1A0A2E" }}>
            Done ({selected.length} selected)
          </button>
        </div>
      </div>
    </div>
  );
}

/** Order Details modal */
function OrderDetailsModal({ order, items, onClose, onCreateInvoice }: {
  order: any; items: any[]; onClose: () => void; onCreateInvoice: () => void;
}) {
  const subtotal = items.reduce((s: number, i: any) => s + (i.total ?? i.qty * i.price), 0);
  const tax      = 0;
  const charge   = 0;
  const tips     = 0;
  const discount = items.reduce((s: number, i: any) => s + (i.discount ?? 0), 0);
  const total    = subtotal - discount + tax + charge + tips;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#00000099" }}>
      <div className="rounded-xl border shadow-2xl w-[520px] max-h-[90vh] flex flex-col overflow-hidden"
        style={{ background: SURF, borderColor: BORD }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: BORD }}>
          <span className="font-bold text-sm" style={{ color: TEXT }}>Order Details</span>
          <button onClick={onClose} style={{ color: MUTED }}><X size={14} /></button>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b text-xs" style={{ borderColor: BORD }}>
          {[
            ["Order Type",   order.type === "dine-in" ? "Dine In" : order.type === "takeaway" ? "Take Away" : "Delivery"],
            ["Order Number", order.orderNumber],
            ["Waiter",       order.waiterName || "—"],
            ["Customer",     order.customerName || "Walk-in"],
            ["Table",        order.tableId ? `Table ${order.tableId}` : "—"],
            ["Status",       order.status],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ color: DIM }} className="mb-0.5">{k}</div>
              <div style={{ color: TEXT }} className="font-medium">{v}</div>
            </div>
          ))}
        </div>

        {/* Items table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0" style={{ background: SURF }}>
              <tr style={{ color: MUTED }} className="font-semibold">
                <th className="text-left px-4 py-2">Item</th>
                <th className="text-right px-2 py-2">Price</th>
                <th className="text-center px-2 py-2">Qty</th>
                <th className="text-center px-2 py-2">Discount</th>
                <th className="text-right px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => (
                <tr key={idx} className="border-t" style={{ borderColor: BORD }}>
                  <td className="px-4 py-2" style={{ color: TEXT }}>{item.name}</td>
                  <td className="px-2 py-2 text-right font-mono" style={{ color: MUTED }}>{item.price.toFixed(2)}</td>
                  <td className="px-2 py-2 text-center" style={{ color: TEXT }}>{item.qty}</td>
                  <td className="px-2 py-2 text-center" style={{ color: MUTED }}>{(item.discount ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold" style={{ color: GOLD }}>
                    {(item.total ?? item.qty * item.price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t px-5 py-3 space-y-1.5 text-xs" style={{ borderColor: BORD }}>
          {[
            ["Total Items", items.length],
            ["Sub Total",   subtotal.toFixed(2)],
            ["Discount",    discount.toFixed(2)],
            ["Tax",         tax.toFixed(2)],
            ["Charge",      charge.toFixed(2)],
            ["Tips",        tips.toFixed(2)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span style={{ color: MUTED }}>{k}</span>
              <span style={{ color: TEXT }}>{v}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-sm pt-1.5 border-t" style={{ borderColor: BORD }}>
            <span style={{ color: TEXT }}>Total Payable</span>
            <span style={{ color: GOLD }}>{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 py-3 border-t" style={{ borderColor: BORD }}>
          <button onClick={onCreateInvoice}
            className="flex-1 py-2 rounded text-xs font-semibold transition-all hover:brightness-110"
            style={{ background: GOLD, color: "#1A0A2E" }}>
            Create Invoice & Close
          </button>
          <button onClick={onClose}
            className="flex-1 py-2 rounded border text-xs font-medium"
            style={{ borderColor: BORD, color: MUTED }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/** Bill modal — pre-payment summary */
function BillModal({ order, items, onClose }: { order: any; items: any[]; onClose: () => void }) {
  const subtotal = items.reduce((s: number, i: any) => s + (i.total ?? i.qty * i.price), 0);
  const discount = items.reduce((s: number, i: any) => s + (i.discount ?? 0), 0);
  const total    = subtotal - discount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#00000099" }}>
      <div className="rounded-xl border shadow-2xl w-80 overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: BORD }}>
          <span className="font-bold text-sm" style={{ color: TEXT }}>Bill — {order.orderNumber}</span>
          <button onClick={onClose} style={{ color: MUTED }}><X size={14} /></button>
        </div>
        <div className="px-4 py-2 text-xs" style={{ color: MUTED }}>
          {order.type === "dine-in" ? "Dine In" : order.type === "takeaway" ? "Take Away" : "Delivery"}
          {order.tableId ? ` · Table ${order.tableId}` : ""}
          {" · "}{order.customerName}
        </div>
        <div className="px-2 pb-2">
          <table className="w-full text-xs">
            <thead><tr className="font-semibold border-b" style={{ color: DIM, borderColor: BORD }}>
              <th className="text-left px-2 py-1.5">Item</th>
              <th className="text-center px-2 py-1.5">Qty</th>
              <th className="text-right px-2 py-1.5">Total</th>
            </tr></thead>
            <tbody>
              {items.map((item: any, idx: number) => (
                <tr key={idx} className="border-t" style={{ borderColor: BORD }}>
                  <td className="px-2 py-1.5" style={{ color: TEXT }}>{item.name}</td>
                  <td className="px-2 py-1.5 text-center" style={{ color: MUTED }}>{item.qty}</td>
                  <td className="px-2 py-1.5 text-right font-mono" style={{ color: GOLD }}>
                    {(item.total ?? item.qty * item.price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t space-y-1 text-xs" style={{ borderColor: BORD }}>
          <div className="flex justify-between"><span style={{ color: MUTED }}>Sub Total</span><span style={{ color: TEXT }}>{subtotal.toFixed(2)}</span></div>
          {discount > 0 && <div className="flex justify-between"><span style={{ color: MUTED }}>Discount</span><span style={{ color: TEXT }}>-{discount.toFixed(2)}</span></div>}
          <div className="flex justify-between font-bold text-sm pt-1 border-t" style={{ borderColor: BORD }}>
            <span style={{ color: TEXT }}>Amount Payable</span>
            <span style={{ color: GOLD }}>{total.toFixed(2)}</span>
          </div>
        </div>
        <div className="px-4 py-3 border-t" style={{ borderColor: BORD }}>
          <button onClick={onClose} className="w-full py-2 rounded text-xs font-semibold"
            style={{ background: GOLD, color: "#1A0A2E" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/** Invoice modal — post-payment receipt */
function InvoiceModal({ order, items, onClose }: { order: any; items: any[]; onClose: () => void }) {
  const subtotal = items.reduce((s: number, i: any) => s + (i.total ?? i.qty * i.price), 0);
  const discount = items.reduce((s: number, i: any) => s + (i.discount ?? 0), 0);
  const total    = subtotal - discount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#00000099" }}>
      <div className="rounded-xl border shadow-2xl w-80 overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: BORD }}>
          <span className="font-bold text-sm" style={{ color: TEXT }}>Invoice — {order.orderNumber}</span>
          <button onClick={onClose} style={{ color: MUTED }}><X size={14} /></button>
        </div>
        <div className="px-4 py-2 text-xs" style={{ color: MUTED }}>
          Receipt · {new Date(order.createdAt || Date.now()).toLocaleString()}
        </div>
        <div className="px-4 py-2 text-xs space-y-0.5" style={{ color: MUTED }}>
          <div>Customer: <span style={{ color: TEXT }}>{order.customerName}</span></div>
          <div>Type: <span style={{ color: TEXT }}>{order.type}</span></div>
        </div>
        <div className="px-2 pb-2">
          <table className="w-full text-xs">
            <thead><tr className="font-semibold border-b" style={{ color: DIM, borderColor: BORD }}>
              <th className="text-left px-2 py-1.5">Item</th>
              <th className="text-center px-2 py-1.5">Qty</th>
              <th className="text-right px-2 py-1.5">Total</th>
            </tr></thead>
            <tbody>
              {items.map((item: any, idx: number) => (
                <tr key={idx} className="border-t" style={{ borderColor: BORD }}>
                  <td className="px-2 py-1.5" style={{ color: TEXT }}>{item.name}</td>
                  <td className="px-2 py-1.5 text-center" style={{ color: MUTED }}>{item.qty}</td>
                  <td className="px-2 py-1.5 text-right font-mono" style={{ color: GOLD }}>
                    {(item.total ?? item.qty * item.price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t space-y-1 text-xs" style={{ borderColor: BORD }}>
          <div className="flex justify-between"><span style={{ color: MUTED }}>Sub Total</span><span style={{ color: TEXT }}>{subtotal.toFixed(2)}</span></div>
          {discount > 0 && <div className="flex justify-between"><span style={{ color: MUTED }}>Discount</span><span style={{ color: TEXT }}>-{discount.toFixed(2)}</span></div>}
          <div className="flex justify-between font-bold text-sm pt-1 border-t" style={{ borderColor: BORD }}>
            <span style={{ color: TEXT }}>Paid</span>
            <span style={{ color: "#22C55E" }}>{total.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: BORD }}>
          <button className="flex-1 py-2 rounded border text-xs" style={{ borderColor: BORD, color: MUTED }}
            onClick={() => window.print()}>
            <Printer size={11} className="inline mr-1" /> Print
          </button>
          <button onClick={onClose} className="flex-1 py-2 rounded text-xs font-semibold"
            style={{ background: GOLD, color: "#1A0A2E" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function POSPage() {
  const branchId = getBranchId();
  const qc = useQueryClient();

  // ── State
  const [selectedOrderId,    setSelectedOrderId]    = useState<number | null>(null);
  const [orderType,          setOrderType]          = useState<OrderType>("dine-in");
  const [selectedWaiterId,   setSelectedWaiterId]   = useState<number | null>(null);
  const [customerId,         setCustomerId]         = useState<number | null>(null);
  const [customerName,       setCustomerName]       = useState("Walk-in Customer");
  const [selectedTableId,    setSelectedTableId]    = useState<number | null>(null);
  const [cartItems,          setCartItems]          = useState<CartItem[]>([]);
  const [categoryId,         setCategoryId]         = useState<number | null>(null);
  const [searchQuery,        setSearchQuery]        = useState("");
  const [activeFilter,       setActiveFilter]       = useState<string | null>(null);
  const [orderSearch,        setOrderSearch]        = useState("");
  const [toast,              setToast]              = useState<string | null>(null);

  // Modifier picker state
  const [modPickerItemId,    setModPickerItemId]    = useState<number | null>(null);

  // Modal states
  const [detailsOrderId,     setDetailsOrderId]     = useState<number | null>(null);
  const [billOrderId,        setBillOrderId]        = useState<number | null>(null);
  const [invoiceOrderId,     setInvoiceOrderId]     = useState<number | null>(null);
  const [cancelConfirmId,    setCancelConfirmId]    = useState<number | null>(null);
  const [modifyOrderId,      setModifyOrderId]      = useState<number | null>(null);

  // ── Queries
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", branchId],
    queryFn: async () => (await api.orders.$get({ query: { branchId: String(branchId) } })).json(),
    refetchInterval: 10000,
  });
  const { data: categoriesData } = useQuery({
    queryKey: ["categories", branchId],
    queryFn: async () => (await api.categories.$get({ query: { branchId: String(branchId) } })).json(),
  });
  const { data: menuData } = useQuery({
    queryKey: ["menu-items", branchId, categoryId],
    queryFn: async () => {
      const q: Record<string, string> = { branchId: String(branchId) };
      if (categoryId) q.categoryId = String(categoryId);
      return (await api["menu-items"].$get({ query: q })).json();
    },
  });
  const { data: tablesData } = useQuery({
    queryKey: ["tables", branchId],
    queryFn: async () => (await api.tables.$get({ query: { branchId: String(branchId) } })).json(),
  });
  const { data: usersData } = useQuery({
    queryKey: ["users", branchId],
    queryFn: async () => (await api.users.$get({ query: { branchId: String(branchId) } })).json(),
  });

  // Fetch details for modals when an order is selected
  const { data: orderDetailData } = useQuery({
    queryKey: ["order-detail", detailsOrderId ?? billOrderId ?? invoiceOrderId],
    queryFn: async () => {
      const id = detailsOrderId ?? billOrderId ?? invoiceOrderId;
      if (!id) return null;
      return (await api.orders[":id"].$get({ param: { id: String(id) } })).json();
    },
    enabled: !!(detailsOrderId || billOrderId || invoiceOrderId),
  });

  // ── Mutations
  const placeOrder = useMutation({
    mutationFn: async (status: string) => {
      const subtotal = cartItems.reduce((s, i) => s + (i.qty * i.price - i.discount + i.modifiers.reduce((ms, m) => ms + m.price, 0) * i.qty), 0);
      const now = new Date();
      const mm  = String(now.getMonth() + 1).padStart(2, "0");
      const dd  = String(now.getDate()).padStart(2, "0");
      const selectedWaiterName = waiters.find((w: any) => w.id === selectedWaiterId)?.name ?? null;
      const ww  = waiterShortId(selectedWaiterName);
      // get seq from existing orders today
      const orders = (ordersData as any)?.orders || [];
      const prefix = `${mm}${dd}${ww}-`;
      const todayOrders = orders.filter((o: any) => o.orderNumber?.startsWith(`${mm}${dd}`));
      const seq = todayOrders.length + 1;
      const orderNumber = `${prefix}${String(seq).padStart(3, "0")}`;

      const order = await (await api.orders.$post({
        json: {
          branchId, type: orderType, status, tableId: selectedTableId,
          waiterId: selectedWaiterId, customerId, customerName,
          subtotal, total: subtotal, orderNumber,
        },
      })).json();
      const orderId = (order as any).order.id;

      await (await api["order-items"].bulk.$post({
        json: {
          items: cartItems.map(i => ({
            orderId, menuItemId: i.menuItemId, name: i.name, price: i.price,
            qty: i.qty, printerId: i.printerId,
            total: i.qty * i.price - i.discount + i.modifiers.reduce((ms, m) => ms + m.price, 0) * i.qty,
            modifiers: i.modifiers.length ? JSON.stringify(i.modifiers.map(m => m.name)) : null,
          })),
        },
      })).json();

      if (status !== "draft") {
        const printerGroups = cartItems.reduce((acc, item) => {
          if (item.printerId) { (acc[item.printerId] ||= []).push(item); }
          return acc;
        }, {} as Record<number, CartItem[]>);
        const jobs = Object.entries(printerGroups).map(([pid, items]) => ({
          branchId, orderId, printerId: parseInt(pid),
          idempotencyKey: `${orderId}-${pid}-kot-1`, type: "kot", status: "pending",
          payload: JSON.stringify({
            orderId, orderNumber: (order as any).order.orderNumber,
            type: orderType, tableId: selectedTableId,
            items: items.map(i => ({ ...i, modifiers: i.modifiers.map(m => m.name) })),
          }),
        }));
        if (jobs.length > 0) await (await api["print-jobs"].batch.$post({ json: { jobs } })).json();
      }
      return order;
    },
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      resetOrder();
      showToast(status === "draft" ? "Order saved as draft" : "Order placed! KOT sent to kitchen.");
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      (await api.orders[":id"].$patch({ param: { id: String(id) }, json: { status } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); setCancelConfirmId(null); setSelectedOrderId(null); },
  });

  const reprintKOT = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await (await api.orders[":id"].$get({ param: { id: String(orderId) } })).json() as any;
      const { order, items } = res;
      const printerGroups = (items || []).reduce((acc: any, item: any) => {
        if (item.printerId) { (acc[item.printerId] ||= []).push(item); }
        return acc;
      }, {});
      const ts = Date.now();
      const jobs = Object.entries(printerGroups).map(([pid, pitems]: any) => ({
        branchId, orderId, printerId: parseInt(pid),
        idempotencyKey: `${orderId}-${pid}-kot-reprint-${ts}`, type: "reprint", status: "pending",
        payload: JSON.stringify({ orderId, orderNumber: order.orderNumber, type: order.type, items: pitems }),
      }));
      if (jobs.length > 0) await (await api["print-jobs"].batch.$post({ json: { jobs } })).json();
    },
    onSuccess: () => showToast("KOT reprint queued"),
  });

  // Load order into cart for modification
  const loadOrderForEdit = useCallback(async (orderId: number) => {
    const res = await (await api.orders[":id"].$get({ param: { id: String(orderId) } })).json() as any;
    const { order, items } = res;
    setOrderType(order.type as OrderType);
    setSelectedWaiterId(order.waiterId ?? null);
    setCustomerId(order.customerId ?? null);
    setCustomerName(order.customerName || "Walk-in Customer");
    setSelectedTableId(order.tableId ?? null);
    setCartItems((items || []).map((i: any) => ({
      menuItemId: i.menuItemId, name: i.name, price: i.price, qty: i.qty,
      discount: i.discount ?? 0, printerId: i.printerId ?? null, modifiers: [],
    })));
    setModifyOrderId(orderId);
    showToast("Order loaded for editing");
  }, []);

  // ── Helpers
  function resetOrder() {
    setCartItems([]); setOrderType("dine-in"); setSelectedTableId(null);
    setCustomerName("Walk-in Customer"); setCustomerId(null);
    setSelectedOrderId(null); setSelectedWaiterId(null); setModifyOrderId(null);
  }
  function showToast(msg: string) { setToast(msg); }

  function addToCart(item: any) {
    setCartItems(prev => {
      const ex = prev.find(i => i.menuItemId === item.id);
      if (ex) return prev.map(i => i.menuItemId === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, qty: 1, discount: 0, printerId: item.printerId ?? null, modifiers: [] }];
    });
  }
  function changeQty(id: number, delta: number) {
    setCartItems(prev => prev.map(i => i.menuItemId === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));
  }
  function setDiscount(id: number, val: number) {
    setCartItems(prev => prev.map(i => i.menuItemId === id ? { ...i, discount: isNaN(val) ? 0 : val } : i));
  }
  function removeItem(id: number) { setCartItems(prev => prev.filter(i => i.menuItemId !== id)); }
  function setItemModifiers(menuItemId: number, mods: Modifier[]) {
    setCartItems(prev => prev.map(i => i.menuItemId === menuItemId ? { ...i, modifiers: mods } : i));
  }

  // ── Derived data
  const orders      = (ordersData as any)?.orders || [];
  const categories  = (categoriesData as any)?.categories || [];
  const allMenuItems = (menuData as any)?.menuItems || [];
  const menuItems   = allMenuItems.filter((item: any) => {
    if (activeFilter === "veg"   && !item.isVeg)      return false;
    if (activeFilter === "bev"   && !item.isBeverage)  return false;
    if (activeFilter === "promo" && !item.isPromo)     return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  const tables      = (tablesData as any)?.tables || [];
  const waiters     = ((usersData as any)?.users || []).filter((u: any) => u.role === "waiter" || u.role === "manager");
  const filteredOrders = orders.filter((o: any) =>
    !orderSearch ||
    o.orderNumber?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customerName?.toLowerCase().includes(orderSearch.toLowerCase())
  );

  // Modal data
  const modalOrderData  = (orderDetailData as any) ?? {};
  const modalOrder      = modalOrderData.order  ?? {};
  const modalItems      = modalOrderData.items  ?? [];

  // Item row total (with modifiers)
  function itemTotal(item: CartItem) {
    const modCost = item.modifiers.reduce((s, m) => s + m.price, 0);
    return (item.qty * (item.price + modCost)) - item.discount;
  }
  const total = cartItems.reduce((s, i) => s + itemTotal(i), 0);

  // ── Constants
  const TOOLBAR_ICONS = [LogOut, Globe, FolderOpen, Printer, Clock, Briefcase, Grid3x3, Monitor, Bell, Receipt, Monitor, Monitor, Scissors, Menu];
  const TABS: { key: OrderType; label: string; icon: any }[] = [
    { key: "dine-in",   label: "Dine In",   icon: Grid3x3  },
    { key: "takeaway",  label: "Take Away", icon: ShoppingBag },
    { key: "delivery",  label: "Delivery",  icon: Truck },
  ];
  const FILTER_PILLS = [
    { key: "online", label: "Online",     color: "#22C55E" },
    { key: "veg",    label: "Vegetarian", color: "#22C55E" },
    { key: "bev",    label: "Beverage",   color: "#6B7280" },
    { key: "combo",  label: "Combo",      color: "#F5A623" },
    { key: "promo",  label: "Promo",      color: "#F472B6" },
  ];

  // ── Render
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: BG }}>

      {/* ===== TOP TOOLBAR ===== */}
      <div className="flex items-center h-10 px-2 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
        {/* Icon strip */}
        <div className="flex items-center gap-0.5 shrink-0">
          {TOOLBAR_ICONS.map((Icon, i) => (
            <button key={i} className="w-7 h-7 flex items-center justify-center rounded transition-colors"
              style={{ color: MUTED }}
              onMouseEnter={e => (e.currentTarget.style.background = SURF2)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Icon size={15} />
            </button>
          ))}
        </div>
        {/* Title */}
        <div className="ml-3 px-3 py-1 rounded text-sm font-bold shrink-0" style={{ color: GOLD }}>
          Delizz Restaurant
        </div>
        {/* Toast inline next to title */}
        {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
        {/* Filter pills pushed to right */}
        <div className="ml-auto flex items-center gap-1.5 pr-1">
          {FILTER_PILLS.map(p => (
            <button key={p.key}
              onClick={() => setActiveFilter(activeFilter === p.key ? null : p.key)}
              className="px-3 py-1 rounded text-xs font-semibold transition-all"
              style={{
                background:  activeFilter === p.key ? p.color : p.color + "22",
                color:       activeFilter === p.key ? "#fff"  : p.color,
                border:      `1px solid ${p.color}`,
                opacity:     activeFilter && activeFilter !== p.key ? 0.5 : 1,
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Running Orders ── */}
        <div className="w-56 flex flex-col border-r shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: BORD }}>
            <span className="font-semibold text-sm" style={{ color: GOLD }}>Running Orders</span>
            <button onClick={() => qc.invalidateQueries({ queryKey: ["orders"] })} style={{ color: MUTED }}>
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="px-2 py-1.5 border-b" style={{ borderColor: BORD }}>
            <input
              className="w-full px-2.5 py-1.5 rounded text-xs border focus:outline-none"
              style={{ background: SURF2, color: TEXT, borderColor: BORD }}
              placeholder="Table, Order No, Waiter…"
              value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
          </div>

          {/* Order list */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {ordersLoading
              ? <div className="flex justify-center p-6"><Spinner /></div>
              : filteredOrders.length === 0
                ? <div className="text-center p-6 text-xs" style={{ color: DIM }}>No running orders</div>
                : filteredOrders.map((order: any) => (
                  <button key={order.id}
                    onClick={() => setSelectedOrderId(selectedOrderId === order.id ? null : order.id)}
                    className="w-full p-2 rounded text-left transition-all"
                    style={{
                      background:  selectedOrderId === order.id ? SURF2 : "transparent",
                      border:      `1px solid ${selectedOrderId === order.id ? GOLD : BORD}`,
                    }}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs font-mono" style={{ color: GOLD }}>{order.orderNumber}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-white"
                        style={{ background: order.type === "dine-in" ? "#22C55E" : order.type === "takeaway" ? "#F5A623" : "#38BDF8" }}>
                        {order.type === "dine-in" ? "Dine" : order.type === "takeaway" ? "Take" : "Deliv"}
                      </span>
                    </div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: MUTED }}>{order.customerName}</div>
                    {order.tableId && <div className="text-[10px] mt-0.5" style={{ color: DIM }}>Table {order.tableId}</div>}
                  </button>
                ))
            }
          </div>

          {/* Action buttons */}
          <div className="p-2 space-y-1 border-t" style={{ borderColor: BORD }}>
            <Btn icon={Edit3}    label="Modify Order"
              onClick={() => selectedOrderId && loadOrderForEdit(selectedOrderId)} />
            <Btn icon={Info}     label="Order Details"
              onClick={() => selectedOrderId && setDetailsOrderId(selectedOrderId)} />
            <Btn icon={RotateCcw} label="Re-print KOT"
              onClick={() => selectedOrderId && reprintKOT.mutate(selectedOrderId)} />
            <div className="grid grid-cols-2 gap-1">
              <Btn icon={Receipt} label="Invoice"
                onClick={() => selectedOrderId && setInvoiceOrderId(selectedOrderId)} />
              <Btn icon={Printer} label="Bill"
                onClick={() => selectedOrderId && setBillOrderId(selectedOrderId)} />
            </div>
            <Btn icon={Ban} label="Cancel Order" danger
              onClick={() => selectedOrderId && setCancelConfirmId(selectedOrderId)} />
          </div>
        </div>

        {/* ── CENTER: Order entry ── */}
        <div className="flex-1 flex flex-col min-w-0 border-r" style={{ borderColor: BORD }}>

          {/* Order type tabs */}
          <div className="flex border-b" style={{ borderColor: BORD }}>
            {TABS.map(t => {
              const Icon   = t.icon;
              const active = orderType === t.key;
              return (
                <button key={t.key} onClick={() => setOrderType(t.key)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-all"
                  style={{
                    background:      active ? SURF2 : "transparent",
                    color:           active ? GOLD  : MUTED,
                    borderBottomColor: active ? GOLD : "transparent",
                  }}>
                  <Icon size={13} /> {t.label}
                </button>
              );
            })}
          </div>

          {/* Waiter + Customer + Table row */}
          <div className="flex items-center gap-2 p-2 border-b" style={{ borderColor: BORD }}>
            <select className="flex-1 px-2 py-1.5 rounded border text-xs focus:outline-none"
              style={{ background: SURF2, color: TEXT, borderColor: BORD }}
              value={selectedWaiterId || ""}
              onChange={e => setSelectedWaiterId(e.target.value ? parseInt(e.target.value) : null)}>
              <option value="">Waiter</option>
              {waiters.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <CustomerPicker
              branchId={branchId!}
              customerId={customerId}
              customerName={customerName}
              onChange={(id, name) => { setCustomerId(id); setCustomerName(name); }} />
            {orderType === "dine-in" && (
              <select className="px-2 py-1.5 rounded border text-xs focus:outline-none"
                style={{ background: SURF2, color: TEXT, borderColor: BORD, minWidth: "70px" }}
                value={selectedTableId || ""}
                onChange={e => setSelectedTableId(e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">Table</option>
                {tables.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>

          {/* Cart */}
          <div className="flex-1 overflow-y-auto">
            {cartItems.length === 0
              ? <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: DIM }}>
                  <UtensilsCrossed size={38} strokeWidth={1} />
                  <p className="text-sm">Select items from the menu</p>
                </div>
              : <table className="w-full text-sm">
                  <thead className="sticky top-0" style={{ background: SURF }}>
                    <tr style={{ color: MUTED }} className="text-xs font-semibold">
                      <th className="text-left px-3 py-2">Item</th>
                      <th className="text-right px-2 py-2">Price</th>
                      <th className="text-center px-2 py-2">Qty</th>
                      <th className="text-center px-2 py-2">Discount</th>
                      <th className="text-right px-2 py-2">Total</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item) => (
                      <tr key={item.menuItemId} className="border-t animate-fade-up" style={{ borderColor: BORD }}>
                        <td className="px-3 py-2">
                          <div className="text-xs font-medium" style={{ color: TEXT }}>{item.name}</div>
                          {/* Modifiers */}
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {item.modifiers.map(m => (
                              <span key={m.id} className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{ background: SURF2, color: MUTED }}>
                                {m.name}{m.price > 0 ? ` +${m.price.toFixed(2)}` : ""}
                              </span>
                            ))}
                            <button onClick={() => setModPickerItemId(item.menuItemId)}
                              className="text-[10px] px-1.5 py-0.5 rounded border transition-colors hover:brightness-110"
                              style={{ borderColor: BORD, color: DIM }}>
                              <SlidersHorizontal size={9} className="inline mr-0.5" />
                              Mod
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-xs text-right font-mono" style={{ color: MUTED }}>{item.price.toFixed(2)}</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => changeQty(item.menuItemId, -1)}
                              className="w-5 h-5 flex items-center justify-center rounded border transition-colors"
                              style={{ borderColor: BORD, color: TEXT }}><Minus size={9} /></button>
                            <span className="w-5 text-center text-xs font-bold" style={{ color: TEXT }}>{item.qty}</span>
                            <button onClick={() => changeQty(item.menuItemId, 1)}
                              className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                              style={{ background: GOLD, color: "#1A0A2E" }}><Plus size={9} /></button>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" placeholder="0" value={item.discount || ""}
                            onChange={e => setDiscount(item.menuItemId, parseFloat(e.target.value))}
                            className="w-14 px-1.5 py-1 rounded border text-xs text-center focus:outline-none"
                            style={{ background: SURF2, borderColor: BORD, color: TEXT }} />
                        </td>
                        <td className="px-2 py-2 text-xs text-right font-mono font-bold" style={{ color: GOLD }}>
                          {itemTotal(item).toFixed(2)}
                        </td>
                        <td className="px-2 py-2">
                          <button onClick={() => removeItem(item.menuItemId)}
                            className="w-5 h-5 flex items-center justify-center rounded-full text-white"
                            style={{ background: "var(--color-danger)" }}><X size={10} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>

          {/* Total payable (no Calendar/Eye icons) */}
          <div className="flex items-center px-3 py-2.5 border-t" style={{ background: SURF, borderColor: BORD }}>
            <span className="ml-auto font-bold text-base" style={{ color: TEXT }}>
              Total Payable: <span style={{ color: GOLD }}>{total.toFixed(2)}</span>
            </span>
          </div>

          {/* Bottom action row */}
          <div className="flex">
            <button onClick={resetOrder}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
              style={{ background: "var(--color-danger)" }}>
              <X size={14} /> Cancel
            </button>
            <button onClick={() => placeOrder.mutate("draft")} disabled={cartItems.length === 0 || placeOrder.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
              style={{ background: "var(--color-purple)" }}>
              <FileText size={14} /> Draft
            </button>
            <button disabled={cartItems.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
              style={{ background: "#38BDF8" }}>
              <Receipt size={14} /> Quick Invoice
            </button>
            <button onClick={() => placeOrder.mutate("confirmed")} disabled={cartItems.length === 0 || placeOrder.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
              style={{ background: "var(--color-success)" }}>
              {placeOrder.isPending ? <Spinner size={14} /> : <><UtensilsCrossed size={14} /> Place Order</>}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Menu ── */}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: BG }}>
          {/* Search */}
          <div className="p-2 border-b" style={{ borderColor: BORD }}>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: DIM }} />
              <input className="w-full pl-8 pr-3 py-2 rounded border text-xs focus:outline-none"
                style={{ background: SURF2, color: TEXT, borderColor: BORD }}
                placeholder="Name or Code or Category…"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Category column */}
            <div className="w-44 shrink-0 overflow-y-auto border-r py-1" style={{ borderColor: BORD, background: SURF }}>
              {[{ id: null, name: "All" }, ...categories].map((cat: any, idx: number) => {
                const active = categoryId === cat.id;
                const isAll  = cat.id === null;
                return (
                  <div key={cat.id ?? "all"}>
                    {!isAll && idx > 1 && (
                      <div className="mx-3 my-0.5 border-t" style={{ borderColor: BORD }} />
                    )}
                    <button onClick={() => setCategoryId(cat.id)}
                      className="w-full px-3 py-2 text-left text-sm transition-colors"
                      style={{
                        background:  active ? SURF2 : "transparent",
                        color:       active ? GOLD  : MUTED,
                        fontWeight:  active ? 600   : 400,
                        borderLeft:  active ? `3px solid ${GOLD}` : "3px solid transparent",
                      }}>
                      {cat.name}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Menu grid */}
            <div className="flex-1 overflow-y-auto p-2">
              {menuItems.length === 0
                ? <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: DIM }}>
                    <Camera size={36} strokeWidth={1} />
                    <p className="text-xs">No items found</p>
                  </div>
                : <div className="grid grid-cols-3 gap-2">
                    {menuItems.map((item: any) => {
                      const inCart = cartItems.find(i => i.menuItemId === item.id);
                      return (
                        <button key={item.id} onClick={() => addToCart(item)}
                          className="rounded-xl border overflow-hidden text-left transition-all hover:brightness-110 hover:-translate-y-0.5"
                          style={{
                            background:  SURF2,
                            borderColor: inCart ? GOLD : BORD,
                            boxShadow:   inCart ? `0 0 0 2px ${GOLD}44` : "none",
                          }}>
                          <div className="w-full aspect-[4/3] flex items-center justify-center relative"
                            style={{ background: SURF }}>
                            {item.imageUrl
                              ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                              : <Camera size={32} strokeWidth={1} style={{ color: DIM }} />}
                            {inCart && (
                              <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                                style={{ background: GOLD, color: "#1A0A2E" }}>
                                {inCart.qty}
                              </span>
                            )}
                          </div>
                          <div className="px-2 py-1.5">
                            <div className="text-sm font-semibold truncate" style={{ color: TEXT }}>{item.name}</div>
                            <div className="text-sm font-bold font-mono mt-0.5" style={{ color: GOLD }}>{item.price.toFixed(2)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
              }
            </div>
          </div>
        </div>

      </div>

      {/* ── MODALS ── */}

      {/* Modifier picker */}
      {modPickerItemId !== null && (() => {
        const item = cartItems.find(i => i.menuItemId === modPickerItemId);
        if (!item) return null;
        return (
          <ModifierPicker
            branchId={branchId!}
            selected={item.modifiers}
            onChange={mods => setItemModifiers(modPickerItemId, mods)}
            onClose={() => setModPickerItemId(null)} />
        );
      })()}

      {/* Order Details modal */}
      {detailsOrderId && modalOrder.id && (
        <OrderDetailsModal
          order={modalOrder} items={modalItems}
          onClose={() => setDetailsOrderId(null)}
          onCreateInvoice={() => { setDetailsOrderId(null); setInvoiceOrderId(detailsOrderId); }} />
      )}

      {/* Bill modal */}
      {billOrderId && modalOrder.id && (
        <BillModal order={modalOrder} items={modalItems} onClose={() => setBillOrderId(null)} />
      )}

      {/* Invoice modal */}
      {invoiceOrderId && modalOrder.id && (
        <InvoiceModal order={modalOrder} items={modalItems} onClose={() => setInvoiceOrderId(null)} />
      )}

      {/* Cancel confirmation */}
      {cancelConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#00000099" }}>
          <div className="rounded-xl border shadow-2xl p-5 w-72" style={{ background: SURF, borderColor: BORD }}>
            <div className="font-bold text-sm mb-2" style={{ color: TEXT }}>Cancel Order?</div>
            <div className="text-xs mb-4" style={{ color: MUTED }}>
              This will cancel the selected order. This action cannot be undone.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCancelConfirmId(null)}
                className="flex-1 py-2 rounded border text-xs" style={{ borderColor: BORD, color: MUTED }}>Keep</button>
              <button
                onClick={() => updateOrderStatus.mutate({ id: cancelConfirmId, status: "cancelled" })}
                disabled={updateOrderStatus.isPending}
                className="flex-1 py-2 rounded text-xs font-semibold disabled:opacity-40"
                style={{ background: "var(--color-danger)", color: "#fff" }}>
                {updateOrderStatus.isPending ? <Spinner size={12} /> : "Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
