import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";
import { Sidebar } from "../components/layout/sidebar";
import { Save, CheckCircle, RotateCcw, HelpCircle, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const TEXT = "#F3F4F6";
const PURPLE = "#7C3AED";

function Label({ children, required, help }: { children: React.ReactNode; required?: boolean; help?: string }) {
  return (
    <div className="flex items-center gap-1 mb-1.5">
      <span className="text-xs font-medium" style={{ color: MUTED }}>{children}</span>
      {required && <span className="text-red-400 text-xs">*</span>}
      {help && <HelpCircle size={11} style={{ color: DIM }} title={help} />}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors";
const inputStyle = { background: BG, borderColor: BORD, color: TEXT } as React.CSSProperties;

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputCls} style={inputStyle} {...props} />;
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={inputCls} style={{ ...inputStyle, cursor: "pointer" }} {...props}>
      {children}
    </select>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-4 gap-4 mb-5">{children}</div>;
}

function Field({ label, required, help, children }: { label: string; required?: boolean; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label required={required} help={help}>{label}</Label>
      {children}
    </div>
  );
}

// Sub-page: Outlet Setting
function OutletSetting({ onBack }: { onBack: () => void }) {
  const branchId = getBranchId();
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    outletName: "Delizz Restaurant",
    phone: "0779900280",
    email: "delizz@gmail.com",
    address: "Palaly Road, Thirunelveli, Jaffna",
    cashier: "",
  });

  const { data: usersData } = useQuery({
    queryKey: ["users", branchId],
    queryFn: async () => (await api.users.$get({ query: { branchId: String(branchId) } })).json(),
  });
  const users: any[] = (usersData as any)?.users || [];

  const updateBranch = useMutation({
    mutationFn: async (data: any) => (await api.branches[":id"].$patch({ param: { id: String(branchId) }, json: data })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
        <div className="px-6 py-5 border-b" style={{ borderColor: BORD }}>
          <h2 className="text-xl font-bold" style={{ color: TEXT }}>Outlet Setting</h2>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Outlet Name" required>
              <Input value={form.outletName} onChange={set("outletName")} />
            </Field>
            <Field label="Phone" required>
              <Input value={form.phone} onChange={set("phone")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <Input type="email" value={form.email} onChange={set("email")} />
            </Field>
            <Field label="Address" required>
              <Input value={form.address} onChange={set("address")} />
            </Field>
          </div>
          <Field label="Online/Self Order Receiving Cashier">
            <Select value={form.cashier} onChange={set("cashier")}>
              <option value="">Select</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { updateBranch.mutate({ name: form.outletName, address: form.address }); }}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: PURPLE, color: "#fff" }}
            >
              {saved ? "Saved!" : "Submit"}
            </button>
            <button
              onClick={onBack}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: PURPLE + "99", color: "#fff" }}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-page: Tax Setting
function TaxSetting({ onBack }: { onBack: () => void }) {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ taxName: "VAT", taxPercent: "0", taxType: "inclusive" });
  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));
  }
  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
        <div className="px-6 py-5 border-b" style={{ borderColor: BORD }}>
          <h2 className="text-xl font-bold" style={{ color: TEXT }}>Tax Setting</h2>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Tax Name" required><Input value={form.taxName} onChange={set("taxName")} /></Field>
          <Field label="Tax %" required><Input type="number" value={form.taxPercent} onChange={set("taxPercent")} /></Field>
          <Field label="Tax Type">
            <Select value={form.taxType} onChange={set("taxType")}>
              <option value="inclusive">Inclusive</option>
              <option value="exclusive">Exclusive</option>
            </Select>
          </Field>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setSaved(true)} className="px-6 py-2.5 rounded-lg text-sm font-semibold" style={{ background: PURPLE, color: "#fff" }}>
              {saved ? "Saved!" : "Submit"}
            </button>
            <button onClick={onBack} className="px-6 py-2.5 rounded-lg text-sm font-semibold" style={{ background: PURPLE + "99", color: "#fff" }}>Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-page: Payment Methods
function PaymentMethods({ onBack }: { onBack: () => void }) {
  const DEFAULT = ["Cash", "Card", "Online Transfer", "Bank Transfer"];
  const [methods, setMethods] = useState<{ name: string; active: boolean }[]>(
    DEFAULT.map(n => ({ name: n, active: n === "Cash" || n === "Card" }))
  );
  const [newName, setNewName] = useState("");
  const [saved, setSaved] = useState(false);

  function toggle(idx: number) {
    setMethods(prev => prev.map((m, i) => i === idx ? { ...m, active: !m.active } : m));
  }
  function addMethod() {
    const name = newName.trim();
    if (!name || methods.find(m => m.name.toLowerCase() === name.toLowerCase())) return;
    setMethods(prev => [...prev, { name, active: true }]);
    setNewName("");
  }
  function removeMethod(idx: number) {
    setMethods(prev => prev.filter((_, i) => i !== idx));
  }
  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
        <div className="px-6 py-5 border-b" style={{ borderColor: BORD }}>
          <h2 className="text-xl font-bold" style={{ color: TEXT }}>Payment Methods</h2>
          <p className="text-xs mt-1" style={{ color: MUTED }}>Enable or disable payment methods shown at checkout.</p>
        </div>
        <div className="p-6 space-y-3">
          {methods.map((m, idx) => (
            <div key={m.name} className="flex items-center justify-between px-4 py-3 rounded-xl border" style={{ borderColor: BORD, background: BG }}>
              <span className="text-sm font-medium" style={{ color: TEXT }}>{m.name}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => toggle(idx)}
                  className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
                  style={{ background: m.active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: m.active ? "#4ADE80" : "#F87171" }}>
                  {m.active ? "Active" : "Disabled"}
                </button>
                <button onClick={() => removeMethod(idx)} className="text-xs" style={{ color: "#EF4444" }}>✕</button>
              </div>
            </div>
          ))}
          {/* Add new */}
          <div className="flex gap-2 mt-4">
            <input
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addMethod()}
              placeholder="Add payment method..."
              className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ background: BG, borderColor: BORD, color: TEXT }}
            />
            <button onClick={addMethod} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: GOLD, color: "#1A0A2E" }}>Add</button>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} className="px-6 py-2.5 rounded-lg text-sm font-semibold" style={{ background: PURPLE, color: "#fff" }}>{saved ? "Saved!" : "Save"}</button>
            <button onClick={onBack} className="px-6 py-2.5 rounded-lg text-sm font-semibold" style={{ background: PURPLE + "99", color: "#fff" }}>Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-page: Printer Setup
function PrinterSetup({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<"invoice" | "bill" | "kot">("invoice");
  const branchId = getBranchId();
  const { data: printersData } = useQuery({
    queryKey: ["printers", branchId],
    queryFn: async () => (await api.printers.$get({ query: { branchId: String(branchId) } })).json(),
  });
  const printers: any[] = (printersData as any)?.printers || [];
  const tabs = [
    { id: "invoice" as const, label: "Invoice Printer" },
    { id: "bill" as const, label: "Bill Printer" },
    { id: "kot" as const, label: "KOT Printer" },
  ];
  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
        <div className="px-6 py-5 border-b" style={{ borderColor: BORD }}>
          <h2 className="text-xl font-bold" style={{ color: TEXT }}>Printer Setup</h2>
        </div>
        <div className="flex border-b" style={{ borderColor: BORD }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-5 py-3 text-xs font-semibold transition-all"
              style={{ color: tab === t.id ? GOLD : DIM, borderBottom: tab === t.id ? `2px solid ${GOLD}` : "2px solid transparent" }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-6 space-y-4">
          <Field label="Select Printer">
            <Select>
              <option value="">— None —</option>
              {printers.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
              ))}
            </Select>
          </Field>
          <Field label="Paper Size">
            <Select>
              <option value="80mm">80mm</option>
              <option value="58mm">58mm</option>
            </Select>
          </Field>
          <div className="text-xs" style={{ color: DIM }}>
            Manage printers (add/edit/delete) in Admin → Printers.
          </div>
          <div className="flex gap-3 pt-2">
            <button className="px-6 py-2.5 rounded-lg text-sm font-semibold" style={{ background: PURPLE, color: "#fff" }}>Save</button>
            <button onClick={onBack} className="px-6 py-2.5 rounded-lg text-sm font-semibold" style={{ background: PURPLE + "99", color: "#fff" }}>Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-page: Delivery Partners
function DeliveryPartners({ onBack }: { onBack: () => void }) {
  const [partners, setPartners] = useState([
    { name: "PickMe Food", apiKey: "", active: false },
    { name: "Uber Eats", apiKey: "", active: false },
    { name: "Swiggy", apiKey: "", active: false },
  ]);
  const [newPartner, setNewPartner] = useState({ name: "", apiKey: "" });
  const [saved, setSaved] = useState(false);

  function toggle(idx: number) {
    setPartners(prev => prev.map((p, i) => i === idx ? { ...p, active: !p.active } : p));
  }
  function setField(idx: number, key: "name" | "apiKey", value: string) {
    setPartners(prev => prev.map((p, i) => i === idx ? { ...p, [key]: value } : p));
  }
  function addPartner() {
    if (!newPartner.name.trim()) return;
    setPartners(prev => [...prev, { ...newPartner, active: true }]);
    setNewPartner({ name: "", apiKey: "" });
  }
  function remove(idx: number) {
    setPartners(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
        <div className="px-6 py-5 border-b" style={{ borderColor: BORD }}>
          <h2 className="text-xl font-bold" style={{ color: TEXT }}>Delivery Partners</h2>
          <p className="text-xs mt-1" style={{ color: MUTED }}>Configure third-party delivery platform integrations.</p>
        </div>
        <div className="p-6 space-y-3">
          {partners.map((p, idx) => (
            <div key={idx} className="rounded-xl border p-4 space-y-3" style={{ borderColor: BORD, background: BG }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: TEXT }}>{p.name}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggle(idx)}
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: p.active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: p.active ? "#4ADE80" : "#F87171" }}>
                    {p.active ? "Active" : "Disabled"}
                  </button>
                  <button onClick={() => remove(idx)} className="text-xs" style={{ color: "#EF4444" }}>✕</button>
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: MUTED }}>API Key / Token</label>
                <input value={p.apiKey} onChange={e => setField(idx, "apiKey", e.target.value)}
                  placeholder="Enter API key..."
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ background: SURF, borderColor: BORD, color: TEXT }} />
              </div>
            </div>
          ))}
          {/* Add new partner */}
          <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: BORD, background: BG }}>
            <div className="text-xs font-semibold" style={{ color: MUTED }}>Add New Partner</div>
            <div className="grid grid-cols-2 gap-2">
              <input value={newPartner.name} onChange={e => setNewPartner(p => ({ ...p, name: e.target.value }))}
                placeholder="Partner name" className="px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ background: SURF, borderColor: BORD, color: TEXT }} />
              <input value={newPartner.apiKey} onChange={e => setNewPartner(p => ({ ...p, apiKey: e.target.value }))}
                placeholder="API key (optional)" className="px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ background: SURF, borderColor: BORD, color: TEXT }} />
            </div>
            <button onClick={addPartner} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: GOLD, color: "#1A0A2E" }}>Add Partner</button>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }} className="px-6 py-2.5 rounded-lg text-sm font-semibold" style={{ background: PURPLE, color: "#fff" }}>{saved ? "Saved!" : "Save"}</button>
            <button onClick={onBack} className="px-6 py-2.5 rounded-lg text-sm font-semibold" style={{ background: PURPLE + "99", color: "#fff" }}>Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-page: Loyalty & Wallet
function LoyaltyWallet({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState({ enabled: "Enable", minPoints: "40", pointRate: "0.5" });
  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));
  }
  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
        <div className="px-6 py-5 border-b" style={{ borderColor: BORD }}>
          <h2 className="text-xl font-bold" style={{ color: TEXT }}>Loyalty &amp; Wallet</h2>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Loyalty Point" help="Enable or disable loyalty points program">
            <Select value={form.enabled} onChange={set("enabled")}>
              <option>Enable</option>
              <option>Disable</option>
            </Select>
          </Field>
          <Field label="Minimum Loyalty Point to Redeem" required>
            <Input type="number" value={form.minPoints} onChange={set("minPoints")} />
          </Field>
          <Field label="Loyalty Point Rate" required help="Points earned per currency unit">
            <Input type="number" step="0.1" value={form.pointRate} onChange={set("pointRate")} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button className="px-6 py-2.5 rounded-lg text-sm font-semibold" style={{ background: PURPLE, color: "#fff" }}>Save</button>
            <button onClick={onBack} className="px-6 py-2.5 rounded-lg text-sm font-semibold" style={{ background: PURPLE + "99", color: "#fff" }}>Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Settings page
export default function SettingsPage() {
  const branchId = getBranchId();
  const qc = useQueryClient();
  const [location] = useLocation();
  const [subPage, setSubPage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const { data: usersData } = useQuery({
    queryKey: ["users", branchId],
    queryFn: async () => (await api.users.$get({ query: { branchId: String(branchId) } })).json(),
  });
  const users: any[] = (usersData as any)?.users || [];

  const [form, setForm] = useState({
    restaurantName: "Delizz Restaurant",
    restaurantShortName: "DR",
    website: "www.delizz.com",
    dateFormat: "D/M/Y",
    timezone: "Asia/Colombo",
    currencySymbol: "LKR",
    currencyPosition: "Before Amount",
    precision: "2 Digit",
    decimalSeparator: "Dot(.)",
    thousandSeparator: "Comma(,)",
    posClickBehavior: "Show Options",
    defaultOrderType: "Dine In",
    defaultDeliveryPartner: "None",
    defaultWaiter: "",
    defaultCustomer: "Walk-in Customer",
    defaultPaymentMethod: "Cash",
    placeOrderTooltip: "Show",
    foodMenuTooltip: "Show",
    smsSendAuto: "Yes",
    prePostPayment: "Post Payment",
    serviceCharge: "10%",
    deliveryCharge: "15%",
    exportDailySales: "Enable",
    invoiceFooter: "Thank you for visiting us!\niDine POS || Powered By AxisXNOR",
  });

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (subPage === "outlet") return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-6"><OutletSetting onBack={() => setSubPage(null)} /></div>
    </div>
  );
  if (subPage === "tax") return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-6"><TaxSetting onBack={() => setSubPage(null)} /></div>
    </div>
  );
  if (subPage === "payment") return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-6"><PaymentMethods onBack={() => setSubPage(null)} /></div>
    </div>
  );
  if (subPage === "printers") return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-6"><PrinterSetup onBack={() => setSubPage(null)} /></div>
    </div>
  );
  if (subPage === "delivery") return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-6"><DeliveryPartners onBack={() => setSubPage(null)} /></div>
    </div>
  );
  if (subPage === "loyalty") return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-6"><LoyaltyWallet onBack={() => setSubPage(null)} /></div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="font-bold text-base" style={{ color: TEXT }}>Settings</div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: saved ? "#22C55E" : PURPLE, color: "#fff" }}
          >
            {saved ? <CheckCircle size={13} /> : <Save size={13} />}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        {/* Quick links row */}
        <div className="flex items-center gap-2 px-6 py-3 border-b shrink-0 overflow-x-auto" style={{ borderColor: BORD }}>
          {[
            { key: "outlet", label: "Outlet Setting" },
            { key: "tax", label: "Tax Setting" },
            { key: "payment", label: "Payment Methods" },
            { key: "printers", label: "Printer Setup" },
            { key: "delivery", label: "Delivery Partners" },
            { key: "loyalty", label: "Loyalty & Wallet" },
          ].map(link => (
            <button
              key={link.key}
              onClick={() => setSubPage(link.key)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
              style={{ background: BORD, color: MUTED }}
            >
              {link.label}
              <ChevronRight size={11} />
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="rounded-2xl border p-6" style={{ background: SURF, borderColor: BORD }}>
            <h2 className="text-lg font-bold mb-6" style={{ color: TEXT }}>General Setting</h2>

            {/* Row 1 */}
            <Row>
              <Field label="Restaurant Name" required>
                <Input value={form.restaurantName} onChange={set("restaurantName")} />
              </Field>
              <Field label="Restaurant Short Name" required>
                <Input value={form.restaurantShortName} onChange={set("restaurantShortName")} />
              </Field>
              <Field label="Invoice Logo">
                <div className="flex gap-2 items-center">
                  <label className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border cursor-pointer"
                    style={{ borderColor: BORD, color: MUTED, background: BG }}>
                    <input type="file" className="hidden" accept="image/*" />
                    Choose file
                  </label>
                  <span className="text-xs" style={{ color: DIM }}>No file chosen</span>
                  <button className="px-2 py-1 text-xs rounded font-semibold" style={{ background: PURPLE, color: "#fff" }}>Show</button>
                </div>
              </Field>
              <Field label="Website">
                <Input value={form.website} onChange={set("website")} />
              </Field>
            </Row>

            {/* Row 2 */}
            <Row>
              <Field label="Date Format" required>
                <Select value={form.dateFormat} onChange={set("dateFormat")}>
                  <option>D/M/Y</option><option>M/D/Y</option><option>Y/M/D</option>
                </Select>
              </Field>
              <Field label="Time Zone" required>
                <Select value={form.timezone} onChange={set("timezone")}>
                  <option>Asia/Colombo</option><option>Asia/Kolkata</option><option>UTC</option>
                  <option>Asia/Dubai</option><option>Europe/London</option>
                </Select>
              </Field>
              <Field label="Currency Symbol" required>
                <Input value={form.currencySymbol} onChange={set("currencySymbol")} />
              </Field>
              <Field label="Currency Position" required>
                <Select value={form.currencyPosition} onChange={set("currencyPosition")}>
                  <option>Before Amount</option><option>After Amount</option>
                </Select>
              </Field>
            </Row>

            {/* Row 3 */}
            <Row>
              <Field label="Precision" required>
                <Select value={form.precision} onChange={set("precision")}>
                  <option>2 Digit</option><option>0 Digit</option><option>1 Digit</option>
                </Select>
              </Field>
              <Field label="Decimals Separator" required>
                <Select value={form.decimalSeparator} onChange={set("decimalSeparator")}>
                  <option>Dot(.)</option><option>Comma(,)</option>
                </Select>
              </Field>
              <Field label="Thousands Separator" required>
                <Select value={form.thousandSeparator} onChange={set("thousandSeparator")}>
                  <option>Comma(,)</option><option>Dot(.)</option><option>Space</option>
                </Select>
              </Field>
              <Field label="When clicking on item in POS" help="What happens when you tap a menu item in POS">
                <Select value={form.posClickBehavior} onChange={set("posClickBehavior")}>
                  <option>Show Options</option><option>Add Directly</option>
                </Select>
              </Field>
            </Row>

            {/* Row 4 */}
            <Row>
              <Field label="Default Order Type" help="Pre-selected order type when creating a new order">
                <Select value={form.defaultOrderType} onChange={set("defaultOrderType")}>
                  <option>Dine In</option><option>Takeaway</option><option>Delivery</option>
                </Select>
              </Field>
              <Field label="Default Delivery Partner">
                <Select value={form.defaultDeliveryPartner} onChange={set("defaultDeliveryPartner")}>
                  <option>None</option>
                </Select>
              </Field>
              <Field label="Default Waiter">
                <Select value={form.defaultWaiter} onChange={set("defaultWaiter")}>
                  <option value="">None</option>
                  {users.filter((u: any) => u.role === "waiter").map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Default Customer" required>
                <Select value={form.defaultCustomer} onChange={set("defaultCustomer")}>
                  <option>Walk-in Customer</option>
                </Select>
              </Field>
            </Row>

            {/* Row 5 */}
            <Row>
              <Field label="Default Payment Method" required>
                <Select value={form.defaultPaymentMethod} onChange={set("defaultPaymentMethod")}>
                  <option>Cash</option><option>Card</option><option>Online Transfer</option>
                </Select>
              </Field>
              <Field label="Place Order Tooltip(in POS)" required>
                <Select value={form.placeOrderTooltip} onChange={set("placeOrderTooltip")}>
                  <option>Show</option><option>Hide</option>
                </Select>
              </Field>
              <Field label="Food Menu Tooltip(in POS)" required>
                <Select value={form.foodMenuTooltip} onChange={set("foodMenuTooltip")}>
                  <option>Show</option><option>Hide</option>
                </Select>
              </Field>
              <Field label="SMS Send Auto(in final invoice)">
                <Select value={form.smsSendAuto} onChange={set("smsSendAuto")}>
                  <option>Yes</option><option>No</option>
                </Select>
              </Field>
            </Row>

            {/* Row 6 */}
            <Row>
              <Field label="Pre or Post Payment" required>
                <Select value={form.prePostPayment} onChange={set("prePostPayment")}>
                  <option>Post Payment</option><option>Pre Payment</option>
                </Select>
              </Field>
              <Field label="Service Charge (eg:10% or 10)" help="Enter as percentage e.g. 10% or flat amount e.g. 10">
                <Input value={form.serviceCharge} onChange={set("serviceCharge")} placeholder="e.g. 10%" />
              </Field>
              <Field label="Delivery Charge (eg:10% or 10)" help="Enter as percentage e.g. 15% or flat amount e.g. 50">
                <Input value={form.deliveryCharge} onChange={set("deliveryCharge")} placeholder="e.g. 15%" />
              </Field>
              <div />
            </Row>

            {/* Row 7 — Export + Reset */}
            <div className="grid grid-cols-4 gap-4 mb-5 items-end">
              <Field label="Export Daily Sales & Reset All Sales" help="Automatically export and reset daily sales data">
                <Select value={form.exportDailySales} onChange={set("exportDailySales")}>
                  <option>Enable</option><option>Disable</option>
                </Select>
              </Field>
              <div className="col-span-2 flex items-end">
                {resetConfirm ? (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs" style={{ color: "#EF4444" }}>Are you sure? This cannot be undone.</span>
                    <button
                      className="px-4 py-2.5 rounded-lg text-sm font-semibold"
                      style={{ background: "#EF4444", color: "#fff" }}
                      onClick={() => setResetConfirm(false)}
                    >Confirm Reset</button>
                    <button
                      className="px-4 py-2.5 rounded-lg text-sm font-semibold"
                      style={{ background: BORD, color: MUTED }}
                      onClick={() => setResetConfirm(false)}
                    >Cancel</button>
                  </div>
                ) : (
                  <button
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold"
                    style={{ background: PURPLE, color: "#fff" }}
                    onClick={() => setResetConfirm(true)}
                  >
                    <RotateCcw size={14} />
                    Reset Transactional Data
                  </button>
                )}
              </div>
              <div />
            </div>

            {/* Invoice Footer */}
            <div className="mb-6">
              <Label>Invoice Footer</Label>
              <textarea
                rows={3}
                value={form.invoiceFooter}
                onChange={set("invoiceFooter")}
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none resize-none"
                style={{ background: BG, borderColor: BORD, color: TEXT }}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSave}
              className="px-8 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: PURPLE, color: "#fff" }}
            >
              {saved ? "Saved!" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
