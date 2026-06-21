import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";
import { Spinner } from "../components/ui/spinner";
import {
  LayoutDashboard, UtensilsCrossed, Tag, Table, Printer,
  Users, Building2, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  ChevronRight, BarChart3, Package
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "menu", label: "Menu Items", icon: UtensilsCrossed },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "tables", label: "Tables", icon: Table },
  { id: "printers", label: "Printers", icon: Printer },
  { id: "users", label: "Users", icon: Users },
  { id: "branches", label: "Branches", icon: Building2 },
];

export default function AdminPage() {
  const branchId = getBranchId();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Queries
  const { data: ordersData } = useQuery({
    queryKey: ["admin-orders", branchId],
    queryFn: async () => (await api.orders.$get({ query: { branchId: String(branchId) } })).json(),
  });
  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ["admin-menu", branchId],
    queryFn: async () => (await api["menu-items"].$get({ query: { branchId: String(branchId) } })).json(),
    enabled: activeTab === "menu",
  });
  const { data: categoriesData, isLoading: catLoading } = useQuery({
    queryKey: ["categories", branchId],
    queryFn: async () => (await api.categories.$get({ query: { branchId: String(branchId) } })).json(),
  });
  const { data: tablesData } = useQuery({
    queryKey: ["tables", branchId],
    queryFn: async () => (await api.tables.$get({ query: { branchId: String(branchId) } })).json(),
    enabled: activeTab === "tables",
  });
  const { data: printersData } = useQuery({
    queryKey: ["printers", branchId],
    queryFn: async () => (await api.printers.$get({ query: { branchId: String(branchId) } })).json(),
    enabled: activeTab === "printers",
  });
  const { data: usersData } = useQuery({
    queryKey: ["users", branchId],
    queryFn: async () => (await api.users.$get({ query: { branchId: String(branchId) } })).json(),
    enabled: activeTab === "users",
  });
  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => (await api.branches.$get()).json(),
    enabled: activeTab === "branches",
  });

  const orders = (ordersData as any)?.orders || [];
  const todayOrders = orders.filter((o: any) => {
    const d = new Date(o.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });
  const todayRevenue = todayOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);

  // Mutations
  const createMenuItem = useMutation({
    mutationFn: async (data: any) => (await api["menu-items"].$post({ json: { ...data, branchId } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-menu"] }); setShowForm(false); setFormData({}); },
  });
  const updateMenuItem = useMutation({
    mutationFn: async ({ id, data }: any) => (await api["menu-items"][":id"].$patch({ param: { id: String(id) }, json: data })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-menu"] }); setShowForm(false); setEditItem(null); setFormData({}); },
  });
  const deleteMenuItem = useMutation({
    mutationFn: async (id: number) => (await api["menu-items"][":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-menu"] }),
  });

  const createCategory = useMutation({
    mutationFn: async (data: any) => (await api.categories.$post({ json: { ...data, branchId } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); setShowForm(false); setFormData({}); },
  });

  const createTable = useMutation({
    mutationFn: async (data: any) => (await api.tables.$post({ json: { ...data, branchId } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tables"] }); setShowForm(false); setFormData({}); },
  });

  const createPrinter = useMutation({
    mutationFn: async (data: any) => (await api.printers.$post({ json: { ...data, branchId } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["printers"] }); setShowForm(false); setFormData({}); },
  });

  const createUser = useMutation({
    mutationFn: async (data: any) => (await api.users.$post({ json: { ...data, branchId } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setShowForm(false); setFormData({}); },
  });

  function handleSubmit() {
    if (activeTab === "menu") {
      if (editItem) updateMenuItem.mutate({ id: editItem.id, data: formData });
      else createMenuItem.mutate(formData);
    } else if (activeTab === "categories") createCategory.mutate(formData);
    else if (activeTab === "tables") createTable.mutate(formData);
    else if (activeTab === "printers") createPrinter.mutate(formData);
    else if (activeTab === "users") createUser.mutate(formData);
  }

  const categories = (categoriesData as any)?.categories || [];
  const printers = (printersData as any)?.printers || [];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-bg)" }}>
      {/* Sidebar */}
      <div className="w-56 flex flex-col border-r" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--color-gold)" }}>
              <UtensilsCrossed size={15} color="#1A0A2E" />
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: "var(--color-gold)" }}>iDine</div>
              <div className="text-xs" style={{ color: "var(--color-text-dim)" }}>Admin Panel</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setShowForm(false); setEditItem(null); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: activeTab === item.id ? "var(--color-gold)" : "transparent",
                color: activeTab === item.id ? "#1A0A2E" : "var(--color-text-muted)",
              }}>
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h1 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
            {NAV_ITEMS.find(n => n.id === activeTab)?.label}
          </h1>
          {activeTab !== "dashboard" && activeTab !== "branches" && (
            <button onClick={() => { setShowForm(true); setEditItem(null); setFormData({}); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:brightness-110"
              style={{ background: "var(--color-gold)", color: "#1A0A2E" }}>
              <Plus size={14} /> Add New
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Dashboard */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fade-up">
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Today's Orders", value: todayOrders.length, color: "var(--color-gold)", icon: Package },
                  { label: "Today's Revenue", value: `Rs. ${todayRevenue.toFixed(0)}`, color: "var(--color-success)", icon: BarChart3 },
                  { label: "Active Orders", value: orders.filter((o: any) => o.status === "confirmed").length, color: "var(--color-warning)", icon: Clock },
                  { label: "Total Orders", value: orders.length, color: "var(--color-purple-light)", icon: UtensilsCrossed },
                ].map(stat => (
                  <div key={stat.label} className="p-5 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>{stat.label}</div>
                      <stat.icon size={18} style={{ color: stat.color }} />
                    </div>
                    <div className="text-2xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Recent orders */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="px-5 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
                  <span className="font-semibold text-sm">Recent Orders</span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-xs" style={{ color: "var(--color-text-dim)" }}>
                      <th className="text-left px-5 py-2">Order #</th>
                      <th className="text-left px-5 py-2">Type</th>
                      <th className="text-left px-5 py-2">Customer</th>
                      <th className="text-left px-5 py-2">Status</th>
                      <th className="text-right px-5 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 10).map((order: any) => (
                      <tr key={order.id} className="border-t text-sm" style={{ borderColor: "var(--color-border)" }}>
                        <td className="px-5 py-2 font-mono font-bold" style={{ color: "var(--color-gold)" }}>{order.orderNumber}</td>
                        <td className="px-5 py-2 capitalize" style={{ color: "var(--color-text-muted)" }}>{order.type}</td>
                        <td className="px-5 py-2" style={{ color: "var(--color-text-muted)" }}>{order.customerName}</td>
                        <td className="px-5 py-2">
                          <span className="px-2 py-0.5 rounded text-xs font-bold capitalize"
                            style={{ background: "#22C55E22", color: "var(--color-success)" }}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-5 py-2 text-right font-mono font-bold" style={{ color: "var(--color-gold)" }}>
                          {order.total?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Menu Items */}
          {activeTab === "menu" && (
            <div className="animate-fade-up">
              {menuLoading ? <div className="flex justify-center p-12"><Spinner size={28} /></div> : (
                <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs border-b" style={{ color: "var(--color-text-dim)", borderColor: "var(--color-border)" }}>
                        <th className="text-left px-5 py-3">Name</th>
                        <th className="text-left px-5 py-3">Category</th>
                        <th className="text-left px-5 py-3">Printer</th>
                        <th className="text-right px-5 py-3">Price</th>
                        <th className="text-left px-5 py-3">Flags</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {((menuData as any)?.menuItems || []).map((item: any) => (
                        <tr key={item.id} className="border-t text-sm hover:brightness-110" style={{ borderColor: "var(--color-border)" }}>
                          <td className="px-5 py-3 font-medium">{item.name}</td>
                          <td className="px-5 py-3" style={{ color: "var(--color-text-muted)" }}>
                            {categories.find((c: any) => c.id === item.categoryId)?.name || "—"}
                          </td>
                          <td className="px-5 py-3" style={{ color: "var(--color-text-muted)" }}>
                            {printers.find((p: any) => p.id === item.printerId)?.name || "—"}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-bold" style={{ color: "var(--color-gold)" }}>
                            {item.price.toFixed(2)}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-1">
                              {item.isVeg && <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--color-success)" + "22", color: "var(--color-success)" }}>Veg</span>}
                              {item.isBeverage && <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#38BDF822", color: "#38BDF8" }}>Bev</span>}
                              {item.isPromo && <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--color-gold)" + "22", color: "var(--color-gold)" }}>Promo</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => { setEditItem(item); setFormData(item); setShowForm(true); }}
                                className="p-1.5 rounded-lg hover:brightness-110 transition-all"
                                style={{ background: "var(--color-surface-2)", color: "var(--color-gold)" }}>
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => { if (confirm("Delete item?")) deleteMenuItem.mutate(item.id); }}
                                className="p-1.5 rounded-lg hover:brightness-110 transition-all"
                                style={{ background: "var(--color-danger)" + "22", color: "var(--color-danger)" }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Categories */}
          {activeTab === "categories" && (
            <div className="animate-fade-up rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <table className="w-full">
                <thead>
                  <tr className="text-xs border-b" style={{ color: "var(--color-text-dim)", borderColor: "var(--color-border)" }}>
                    <th className="text-left px-5 py-3">Name</th>
                    <th className="text-left px-5 py-3">Sort Order</th>
                    <th className="text-left px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat: any) => (
                    <tr key={cat.id} className="border-t text-sm" style={{ borderColor: "var(--color-border)" }}>
                      <td className="px-5 py-3 font-medium">{cat.name}</td>
                      <td className="px-5 py-3 font-mono" style={{ color: "var(--color-text-muted)" }}>{cat.sortOrder}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{ background: "var(--color-success)" + "22", color: "var(--color-success)" }}>
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tables */}
          {activeTab === "tables" && (
            <div className="animate-fade-up">
              <div className="grid grid-cols-6 gap-3">
                {((tablesData as any)?.tables || []).map((t: any) => (
                  <div key={t.id} className="p-4 rounded-2xl text-center"
                    style={{ background: "var(--color-surface)", border: "2px solid var(--color-border)" }}>
                    <div className="text-lg font-bold" style={{ color: "var(--color-gold)" }}>{t.name}</div>
                    <div className="text-xs mt-1" style={{ color: "var(--color-text-dim)" }}>Cap: {t.capacity}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Printers */}
          {activeTab === "printers" && (
            <div className="animate-fade-up space-y-3">
              {((printersData as any)?.printers || []).map((p: any) => (
                <div key={p.id} className="flex items-center gap-4 p-4 rounded-2xl"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: p.type === "bill" ? "var(--color-gold)" + "22" : "var(--color-purple)" + "22" }}>
                    <Printer size={18} style={{ color: p.type === "bill" ? "var(--color-gold)" : "var(--color-purple-light)" }} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {p.connection === "lan" ? `LAN — ${p.ipAddress}:${p.port}` : "USB"}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase"
                    style={{ background: p.type === "bill" ? "var(--color-gold)" + "22" : "var(--color-purple)" + "22", color: p.type === "bill" ? "var(--color-gold)" : "var(--color-purple-light)" }}>
                    {p.type}
                  </span>
                  <span className="px-3 py-1 rounded-lg text-xs font-bold"
                    style={{ background: "var(--color-success)" + "22", color: "var(--color-success)" }}>
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Users */}
          {activeTab === "users" && (
            <div className="animate-fade-up rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <table className="w-full">
                <thead>
                  <tr className="text-xs border-b" style={{ color: "var(--color-text-dim)", borderColor: "var(--color-border)" }}>
                    <th className="text-left px-5 py-3">Name</th>
                    <th className="text-left px-5 py-3">Role</th>
                    <th className="text-left px-5 py-3">PIN</th>
                    <th className="text-left px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {((usersData as any)?.users || []).map((u: any) => (
                    <tr key={u.id} className="border-t text-sm" style={{ borderColor: "var(--color-border)" }}>
                      <td className="px-5 py-3 font-medium">{u.name}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-bold capitalize"
                          style={{ background: u.role === "superadmin" ? "var(--color-gold)" + "22" : "var(--color-purple)" + "22", color: u.role === "superadmin" ? "var(--color-gold)" : "var(--color-purple-light)" }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono" style={{ color: "var(--color-text-muted)" }}>{"•".repeat(u.pin?.length || 4)}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: "var(--color-success)" + "22", color: "var(--color-success)" }}>Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Branches */}
          {activeTab === "branches" && (
            <div className="animate-fade-up space-y-3">
              {((branchesData as any)?.branches || []).map((b: any) => (
                <div key={b.id} className="flex items-center gap-4 p-5 rounded-2xl"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--color-gold)" + "22" }}>
                    <Building2 size={18} style={{ color: "var(--color-gold)" }} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{b.name}</div>
                    <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>{b.address}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--color-text-dim)" }}>{b.phone}</div>
                  </div>
                  <span className="px-3 py-1 rounded-lg text-xs font-bold" style={{ background: "var(--color-success)" + "22", color: "var(--color-success)" }}>Active</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <h2 className="font-bold text-lg mb-4" style={{ color: "var(--color-gold)" }}>
              {editItem ? "Edit" : "Add"} {NAV_ITEMS.find(n => n.id === activeTab)?.label?.replace("s", "")}
            </h2>

            <div className="space-y-3">
              {activeTab === "menu" && (
                <>
                  <input placeholder="Item name" value={formData.name || ""} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }} />
                  <input type="number" placeholder="Price" value={formData.price || ""} onChange={e => setFormData(p => ({ ...p, price: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }} />
                  <select value={formData.categoryId || ""} onChange={e => setFormData(p => ({ ...p, categoryId: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
                    <option value="">Select Category</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={formData.printerId || ""} onChange={e => setFormData(p => ({ ...p, printerId: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
                    <option value="">Select Printer Station</option>
                    {((printersData as any)?.printers || []).filter((p: any) => p.type === "kot").map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div className="flex gap-4 text-sm">
                    {["isVeg", "isBeverage", "isPromo"].map(flag => (
                      <label key={flag} className="flex items-center gap-2 cursor-pointer" style={{ color: "var(--color-text-muted)" }}>
                        <input type="checkbox" checked={!!formData[flag]} onChange={e => setFormData(p => ({ ...p, [flag]: e.target.checked }))} />
                        {flag === "isVeg" ? "Veg" : flag === "isBeverage" ? "Beverage" : "Promo"}
                      </label>
                    ))}
                  </div>
                </>
              )}
              {activeTab === "categories" && (
                <>
                  <input placeholder="Category name" value={formData.name || ""} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }} />
                  <input type="number" placeholder="Sort order" value={formData.sortOrder || ""} onChange={e => setFormData(p => ({ ...p, sortOrder: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }} />
                </>
              )}
              {activeTab === "tables" && (
                <>
                  <input placeholder="Table name (e.g. T1)" value={formData.name || ""} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }} />
                  <input type="number" placeholder="Capacity" value={formData.capacity || ""} onChange={e => setFormData(p => ({ ...p, capacity: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }} />
                </>
              )}
              {activeTab === "printers" && (
                <>
                  <input placeholder="Printer name" value={formData.name || ""} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }} />
                  <select value={formData.type || "kot"} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
                    <option value="kot">KOT Printer</option>
                    <option value="bill">Bill Printer</option>
                  </select>
                  <select value={formData.connection || "lan"} onChange={e => setFormData(p => ({ ...p, connection: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
                    <option value="lan">LAN / Ethernet (IP)</option>
                    <option value="usb">USB</option>
                  </select>
                  {formData.connection !== "usb" && (
                    <input placeholder="IP Address (e.g. 192.168.1.50)" value={formData.ipAddress || ""} onChange={e => setFormData(p => ({ ...p, ipAddress: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }} />
                  )}
                </>
              )}
              {activeTab === "users" && (
                <>
                  <input placeholder="Name" value={formData.name || ""} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }} />
                  <input placeholder="PIN (4 digits)" maxLength={4} value={formData.pin || ""} onChange={e => setFormData(p => ({ ...p, pin: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }} />
                  <select value={formData.role || "waiter"} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
                    <option value="waiter">Waiter</option>
                    <option value="manager">Manager</option>
                    <option value="kitchen">Kitchen</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowForm(false); setEditItem(null); setFormData({}); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>
                Cancel
              </button>
              <button onClick={handleSubmit}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "var(--color-gold)", color: "#1A0A2E" }}>
                {editItem ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
