import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { api } from "../lib/api";

export default function InvoicePrint() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems]  = useState<any[]>([]);
  const [error, setError]  = useState("");

  // Force light mode — invoice must always be white for printing
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.style.background = "#fff";
    document.body.style.color = "#000";
    return () => {
      // restore original theme when unmounted (if ever)
      const saved = localStorage.getItem("idine_theme") || "dark";
      document.documentElement.setAttribute("data-theme", saved);
      document.body.style.background = "";
      document.body.style.color = "";
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await (await api.orders[":id"].$get({ param: { id } })).json() as any;
        setOrder(res.order);
        setItems(res.items || []);
      } catch {
        setError("Failed to load invoice");
      }
    })();
  }, [id]);

  useEffect(() => {
    if (order) {
      document.title = order.orderNumber || "Invoice";
      // slight delay so the DOM is painted before print dialog
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [order]);

  const money = (n: number) => `Rs ${Number(n || 0).toFixed(2)}`;

  if (error) return (
    <div style={{ fontFamily: "monospace", padding: 20, textAlign: "center", color: "#c00" }}>{error}</div>
  );

  if (!order) return (
    <div style={{ fontFamily: "monospace", padding: 20, textAlign: "center" }}>Loading…</div>
  );

  return (
    <div style={{ fontFamily: "monospace", width: 300, margin: "0 auto", padding: 12, color: "#000" }}>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
        body { background: #fff; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
        td { padding: 3px 0; border-bottom: 1px dashed #ccc; }
        .tot { font-weight: bold; font-size: 15px; border-top: 2px solid #000; }
        .center { text-align: center; }
        .muted { color: #555; font-size: 12px; text-align: center; }
        h2 { text-align: center; margin: 4px 0; }
      `}</style>

      <h2>iDine</h2>
      <div className="muted">Invoice</div>
      <div className="muted">{order.orderNumber} · {order.type}</div>
      <div className="muted">{order.customerName || "Walk-in"}</div>

      <table>
        <tbody>
          {items.map((it: any, i: number) => (
            <tr key={i}>
              <td>{it.qty}× {it.name}</td>
              <td style={{ textAlign: "right" }}>{money(it.total)}</td>
            </tr>
          ))}
          <tr className="tot">
            <td>TOTAL</td>
            <td style={{ textAlign: "right" }}>{money(order.total)}</td>
          </tr>
        </tbody>
      </table>

      <p className="center" style={{ marginTop: 16 }}>Thank you!</p>

      <div className="no-print" style={{ textAlign: "center", marginTop: 24 }}>
        <button onClick={() => window.print()}
          style={{ padding: "8px 20px", fontFamily: "monospace", cursor: "pointer" }}>
          Print
        </button>
        <button onClick={() => window.close()}
          style={{ padding: "8px 20px", fontFamily: "monospace", cursor: "pointer", marginLeft: 8 }}>
          Close
        </button>
      </div>
    </div>
  );
}
