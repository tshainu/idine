import { useEffect, useState } from "react";

const BG    = "var(--color-bg)";
const SURF  = "var(--color-surface)";
const SURF2 = "var(--color-surface-2)";
const BORD  = "var(--color-border)";
const GOLD  = "var(--color-gold)";
const TEXT  = "var(--color-text)";
const MUTED = "var(--color-text-muted)";
const DIM   = "var(--color-text-dim)";

const DISPLAY_KEY = "idine_customer_display";
const money = (n: number) => `Rs ${Number(n || 0).toFixed(2)}`;

type DisplayItem = { name: string; qty: number; price: number; lineTotal: number };
type DisplayState = {
  items: DisplayItem[];
  total: number;
  customerName?: string;
  orderType?: string;
  ts: number;
};

function readState(): DisplayState {
  try {
    const raw = localStorage.getItem(DISPLAY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { items: [], total: 0, ts: 0 };
}

export default function CustomerDisplay() {
  const [state, setState] = useState<DisplayState>(readState());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", localStorage.getItem("idine_theme") || "dark");
    const onStorage = (e: StorageEvent) => {
      if (e.key === DISPLAY_KEY && e.newValue) {
        try { setState(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    // poll fallback (same-window updates don't fire storage event)
    const iv = setInterval(() => setState(readState()), 800);
    return () => { window.removeEventListener("storage", onStorage); clearInterval(iv); };
  }, []);

  const empty = state.items.length === 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: BG, color: TEXT }}>
      {/* Header — logo */}
      <div className="flex flex-col items-center justify-center py-8 border-b" style={{ borderColor: BORD, background: SURF }}>
        <img src="/logo-icon.png" alt="iDine" style={{ width: 72, height: 72, borderRadius: 14, objectFit: "contain" }} />
        <div className="mt-3 text-2xl font-bold" style={{ color: GOLD }}>iDine</div>
        <div className="text-sm mt-1" style={{ color: MUTED }}>Welcome — Your Order</div>
      </div>

      {/* Order info */}
      {!empty && (
        <div className="flex items-center justify-between px-8 py-3 border-b" style={{ borderColor: BORD, background: SURF2 }}>
          <span className="text-base" style={{ color: TEXT }}>{state.customerName || "Walk-in Customer"}</span>
          {state.orderType && <span className="text-sm uppercase px-3 py-1 rounded" style={{ background: GOLD, color: "#000", fontWeight: 700 }}>{state.orderType}</span>}
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        {empty ? (
          <div className="h-full flex flex-col items-center justify-center" style={{ color: DIM }}>
            <div className="text-xl">Waiting for order…</div>
            <div className="text-sm mt-2">Items will appear here as they're added.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {state.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between py-3 px-4 rounded-lg" style={{ background: SURF }}>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold w-10 text-center rounded py-1" style={{ background: SURF2, color: GOLD }}>{it.qty}×</span>
                  <span className="text-lg" style={{ color: TEXT }}>{it.name}</span>
                </div>
                <span className="text-lg font-semibold" style={{ color: TEXT }}>{money(it.lineTotal)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total */}
      <div className="px-8 py-6 border-t" style={{ borderColor: BORD, background: SURF }}>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold" style={{ color: MUTED }}>TOTAL</span>
          <span className="text-4xl font-extrabold" style={{ color: GOLD }}>{money(state.total)}</span>
        </div>
      </div>
    </div>
  );
}
