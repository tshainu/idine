import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";
import { Sidebar } from "../components/layout/sidebar";
import { Plus, Trash2, Shield, User, Pencil, KeyRound, ShieldCheck } from "lucide-react";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const TEXT = "#F3F4F6";
const PURPLE = "#7C3AED";
const ROLE_COLOR: Record<string, string> = { superadmin: "#A78BFA", admin: GOLD, manager: "#F97316", waiter: "#22C55E", cashier: "#38BDF8" };

type ModalType = "create" | "edit" | "pin" | null;
type TabType = "users" | "privileges";

const GENERAL_SECTIONS = [
  "Dashboard", "POS", "Menu Items", "Categories", "Sales",
  "Customers", "Reports", "Settings", "Users", "Kitchen",
  "Tables", "Expenses", "Purchases", "Promotions", "Ingredients",
];

const POS_SECTIONS = [
  "Print Bill", "Print Invoice", "Print KOT", "Cancel Order",
  "Apply Discount", "Apply Coupon", "Void Item", "Refund Order",
  "Change Order Type", "Change Table", "Assign Waiter",
  "Edit Placed Order", "Quick Add Item",
];

const PRIVILEGE_SECTIONS = [...GENERAL_SECTIONS, ...POS_SECTIONS];

const ROLES = ["superadmin", "admin", "manager", "waiter", "cashier"];

const DEFAULT_PRIVILEGES: Record<string, Record<string, boolean>> = {
  superadmin: Object.fromEntries(PRIVILEGE_SECTIONS.map(s => [s, true])),
  admin:      Object.fromEntries(PRIVILEGE_SECTIONS.map(s => [s, true])),
  manager:    Object.fromEntries(PRIVILEGE_SECTIONS.map(s => [s,
    !["Settings", "Users", "Refund Order", "Void Item"].includes(s)
  ])),
  waiter:     Object.fromEntries(PRIVILEGE_SECTIONS.map(s => [s,
    ["POS", "Kitchen", "Tables", "Print Bill", "Print KOT"].includes(s)
  ])),
  cashier:    Object.fromEntries(PRIVILEGE_SECTIONS.map(s => [s,
    ["POS", "Sales", "Customers", "Print Bill", "Print Invoice", "Apply Discount", "Cancel Order"].includes(s)
  ])),
};

export default function UsersPage() {
  const branchId = getBranchId();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabType>("users");
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [pinForm, setPinForm] = useState({ pin: "", confirmPin: "" });
  const [pinError, setPinError] = useState("");

  // Privileges state
  const [privileges, setPrivileges] = useState<Record<string, Record<string, boolean>>>(DEFAULT_PRIVILEGES);
  const [privSaved, setPrivSaved] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("waiter");

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users", branchId],
    queryFn: async () => (await api.users.$get({ query: { branchId: String(branchId) } })).json(),
  });

  const { data: settingsData } = useQuery({
    queryKey: ["settings", branchId],
    queryFn: async () => (await api.settings.$get({ query: { branchId: String(branchId) } })).json(),
  });

  // Load saved privileges from settings
  useEffect(() => {
    const s = (settingsData as any)?.settings as Record<string, string> | undefined;
    if (s?.userPrivileges) {
      try {
        const parsed = JSON.parse(s.userPrivileges);
        setPrivileges(p => ({ ...DEFAULT_PRIVILEGES, ...parsed }));
      } catch {}
    }
  }, [settingsData]);

  const users: any[] = (usersData as any)?.users || [];

  const createUser = useMutation({
    mutationFn: async (data: any) => (await api.users.$post({ json: { ...data, branchId } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); closeModal(); },
  });
  const updateUser = useMutation({
    mutationFn: async ({ id, data }: any) => (await api.users[":id"].$patch({ param: { id: String(id) }, json: data })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); closeModal(); },
  });
  const deleteUser = useMutation({
    mutationFn: async (id: number) => (await api.users[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
  const savePrivileges = useMutation({
    mutationFn: async () =>
      (await api.settings.$post({ json: { branchId, settings: { userPrivileges: JSON.stringify(privileges) } } })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", branchId] });
      setPrivSaved(true);
      setTimeout(() => setPrivSaved(false), 2000);
    },
  });

  function closeModal() { setModal(null); setSelectedUser(null); setForm({}); setPinForm({ pin: "", confirmPin: "" }); setPinError(""); }

  function openEdit(u: any) {
    setSelectedUser(u);
    setForm({ name: u.name, role: u.role });
    setModal("edit");
  }

  function openChangePin(u: any) {
    setSelectedUser(u);
    setPinForm({ pin: "", confirmPin: "" });
    setPinError("");
    setModal("pin");
  }

  function handleCreate() {
    if (!form.name?.trim() || !form.pin || form.pin.length !== 4) return;
    createUser.mutate({ name: form.name.trim(), pin: form.pin, role: form.role || "waiter" });
  }

  function handleEdit() {
    if (!form.name?.trim()) return;
    updateUser.mutate({ id: selectedUser.id, data: { name: form.name.trim(), role: form.role } });
  }

  function handleChangePin() {
    setPinError("");
    if (pinForm.pin.length !== 4) { setPinError("PIN must be 4 digits"); return; }
    if (pinForm.pin !== pinForm.confirmPin) { setPinError("PINs do not match"); return; }
    updateUser.mutate({ id: selectedUser.id, data: { pin: pinForm.pin } });
  }

  function togglePriv(role: string, section: string) {
    setPrivileges(p => ({
      ...p,
      [role]: { ...p[role], [section]: !p[role]?.[section] },
    }));
  }

  function toggleAllRole(role: string, val: boolean) {
    setPrivileges(p => ({
      ...p,
      [role]: Object.fromEntries(PRIVILEGE_SECTIONS.map(s => [s, val])),
    }));
  }

  const rolePrivs = privileges[selectedRole] || {};
  const allEnabled = PRIVILEGE_SECTIONS.every(s => rolePrivs[s]);
  const noneEnabled = PRIVILEGE_SECTIONS.every(s => !rolePrivs[s]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="font-bold text-base" style={{ color: TEXT }}>Users & Waiters</div>
          {tab === "users" && (
            <button onClick={() => { setForm({ role: "waiter" }); setModal("create"); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: GOLD, color: "#1A0A2E" }}>
              <Plus size={13} />
              Add User
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0" style={{ borderColor: BORD }}>
          {[
            { id: "users" as TabType, label: "Users" },
            { id: "privileges" as TabType, label: "Privileges" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-6 py-3 text-xs font-semibold transition-all"
              style={{
                color: tab === t.id ? GOLD : DIM,
                borderBottom: tab === t.id ? `2px solid ${GOLD}` : "2px solid transparent",
              }}>
              {t.id === "privileges" && <ShieldCheck size={12} className="inline mr-1.5" />}
              {t.label}
            </button>
          ))}
        </div>

        {tab === "users" ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Stats */}
            <div className="flex gap-3 flex-wrap">
              {Object.entries(ROLE_COLOR).map(([role, color]) => {
                const count = users.filter(u => u.role === role).length;
                if (count === 0) return null;
                return (
                  <div key={role} className="px-4 py-2.5 rounded-xl border" style={{ background: SURF, borderColor: BORD }}>
                    <span className="text-base font-bold" style={{ color }}>{count}</span>
                    <span className="text-xs ml-2 capitalize" style={{ color: MUTED }}>{role}</span>
                  </div>
                );
              })}
            </div>

            {/* Table */}
            <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORD}` }}>
                    {["Name", "PIN", "Role", "Branch", "Actions"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold" style={{ color: DIM }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="text-center py-10 text-xs" style={{ color: DIM }}>Loading...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-xs" style={{ color: DIM }}>No users found</td></tr>
                  ) : users.map((u: any) => (
                    <tr key={u.id} className="border-t" style={{ borderColor: BORD }}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{ background: (ROLE_COLOR[u.role] || DIM) + "33" }}>
                            {u.role === "superadmin" || u.role === "admin"
                              ? <Shield size={13} color={ROLE_COLOR[u.role] || DIM} />
                              : <User size={13} color={ROLE_COLOR[u.role] || DIM} />}
                          </div>
                          <span className="text-xs font-medium" style={{ color: TEXT }}>{u.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs tracking-widest" style={{ color: DIM }}>••••</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium capitalize"
                          style={{ background: (ROLE_COLOR[u.role] || DIM) + "22", color: ROLE_COLOR[u.role] || DIM }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: MUTED }}>
                        {u.branchId ? `Branch ${u.branchId}` : "All"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(u)} className="p-1 rounded" title="Edit user" style={{ color: GOLD }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => openChangePin(u)} className="p-1 rounded" title="Change PIN" style={{ color: "#38BDF8" }}>
                            <KeyRound size={13} />
                          </button>
                          <button onClick={() => { if (confirm(`Delete ${u.name}?`)) deleteUser.mutate(u.id); }} className="p-1 rounded" style={{ color: "#EF4444" }}>
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
        ) : (
          /* Privileges Tab */
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="rounded-2xl border overflow-hidden" style={{ background: SURF, borderColor: BORD }}>
                <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: BORD }}>
                  <div>
                    <div className="font-bold text-sm" style={{ color: TEXT }}>Role Privileges</div>
                    <div className="text-xs mt-0.5" style={{ color: DIM }}>Control which sections each role can access</div>
                  </div>
                  <button
                    onClick={() => savePrivileges.mutate()}
                    disabled={savePrivileges.isPending}
                    className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                    style={{ background: privSaved ? "#22C55E" : PURPLE, color: "#fff" }}
                  >
                    {privSaved ? "Saved!" : savePrivileges.isPending ? "Saving…" : "Save Privileges"}
                  </button>
                </div>

                {/* Role selector tabs */}
                <div className="flex border-b overflow-x-auto" style={{ borderColor: BORD }}>
                  {ROLES.map(role => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className="px-5 py-2.5 text-xs font-semibold capitalize transition-all whitespace-nowrap"
                      style={{
                        color: selectedRole === role ? (ROLE_COLOR[role] || GOLD) : DIM,
                        borderBottom: selectedRole === role ? `2px solid ${ROLE_COLOR[role] || GOLD}` : "2px solid transparent",
                        background: selectedRole === role ? (ROLE_COLOR[role] || GOLD) + "0D" : "transparent",
                      }}
                    >
                      {role}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {/* Bulk actions */}
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-xs" style={{ color: MUTED }}>Quick select:</span>
                    <button
                      onClick={() => toggleAllRole(selectedRole, true)}
                      disabled={allEnabled}
                      className="px-3 py-1 rounded-lg text-xs font-medium disabled:opacity-40"
                      style={{ background: "rgba(34,197,94,0.15)", color: "#4ADE80" }}
                    >
                      Enable All
                    </button>
                    <button
                      onClick={() => toggleAllRole(selectedRole, false)}
                      disabled={noneEnabled}
                      className="px-3 py-1 rounded-lg text-xs font-medium disabled:opacity-40"
                      style={{ background: "rgba(239,68,68,0.15)", color: "#F87171" }}
                    >
                      Disable All
                    </button>
                  </div>

                  {/* Privilege grid */}
                  {[
                    { label: "General", sections: GENERAL_SECTIONS },
                    { label: "POS Screen Actions", sections: POS_SECTIONS },
                  ].map(({ label, sections }, groupIdx) => (
                    <div key={label}>
                      {groupIdx > 0 && (
                        <div className="flex items-center gap-3 my-5">
                          <div className="flex-1 border-t" style={{ borderColor: BORD }} />
                          <span className="text-xs font-semibold px-2 py-0.5 rounded"
                            style={{ color: GOLD, background: GOLD + "18", border: `1px solid ${GOLD}44` }}>
                            {label}
                          </span>
                          <div className="flex-1 border-t" style={{ borderColor: BORD }} />
                        </div>
                      )}
                      {groupIdx === 0 && (
                        <div className="text-xs font-semibold mb-3" style={{ color: MUTED }}>{label}</div>
                      )}
                      <div className="grid grid-cols-3 gap-3">
                        {sections.map(section => {
                          const enabled = !!rolePrivs[section];
                          return (
                            <button
                              key={section}
                              onClick={() => togglePriv(selectedRole, section)}
                              className="flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all"
                              style={{
                                borderColor: enabled ? (ROLE_COLOR[selectedRole] || GOLD) + "55" : BORD,
                                background: enabled ? (ROLE_COLOR[selectedRole] || GOLD) + "11" : BG,
                              }}
                            >
                              <span className="text-xs font-medium" style={{ color: enabled ? TEXT : MUTED }}>{section}</span>
                              <div
                                className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                                style={{
                                  background: enabled ? (ROLE_COLOR[selectedRole] || GOLD) : "transparent",
                                  border: `1.5px solid ${enabled ? (ROLE_COLOR[selectedRole] || GOLD) : BORD}`,
                                }}
                              >
                                {enabled && <span className="text-[9px] font-bold" style={{ color: BG }}>✓</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <p className="text-xs mt-4" style={{ color: DIM }}>
                    Note: Privileges are enforced per role. Individual user overrides are not supported.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {modal === "create" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-80 rounded-2xl p-6 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="font-bold text-sm mb-4" style={{ color: TEXT }}>Add User</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Full Name *</label>
                <input type="text" value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="e.g. Ahmed Rashid" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>PIN (4 digits) *</label>
                <input type="password" maxLength={4} inputMode="numeric" value={form.pin || ""}
                  onChange={e => setForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none tracking-widest"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="••••" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Role</label>
                <select value={form.role || "waiter"} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }}>
                  <option value="waiter">Waiter</option>
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg text-xs" style={{ background: BORD, color: MUTED }}>Cancel</button>
              <button onClick={handleCreate} disabled={!form.name?.trim() || form.pin?.length !== 4}
                className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: GOLD, color: "#1A0A2E" }}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {modal === "edit" && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-80 rounded-2xl p-6 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="font-bold text-sm mb-1" style={{ color: TEXT }}>Edit User</div>
            <div className="text-xs mb-4" style={{ color: DIM }}>Editing: {selectedUser.name}</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Full Name *</label>
                <input type="text" value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Role</label>
                <select value={form.role || "waiter"} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }}>
                  <option value="waiter">Waiter</option>
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
            </div>
            <p className="text-xs mt-3" style={{ color: DIM }}>To change PIN, use the key icon on the user list.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg text-xs" style={{ background: BORD, color: MUTED }}>Cancel</button>
              <button onClick={handleEdit} disabled={!form.name?.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: GOLD, color: "#1A0A2E" }}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change PIN Modal */}
      {modal === "pin" && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-80 rounded-2xl p-6 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="flex items-center gap-2 mb-1">
              <KeyRound size={16} color="#38BDF8" />
              <div className="font-bold text-sm" style={{ color: TEXT }}>Change PIN</div>
            </div>
            <div className="text-xs mb-4" style={{ color: DIM }}>For: {selectedUser.name}</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>New PIN (4 digits)</label>
                <input type="password" maxLength={4} inputMode="numeric"
                  value={pinForm.pin} onChange={e => setPinForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none tracking-widest text-center text-lg"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} placeholder="••••" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Confirm PIN</label>
                <input type="password" maxLength={4} inputMode="numeric"
                  value={pinForm.confirmPin} onChange={e => setPinForm(p => ({ ...p, confirmPin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none tracking-widest text-center text-lg"
                  style={{ background: BG, borderColor: pinError ? "#EF4444" : BORD, color: TEXT }} placeholder="••••" />
              </div>
              {pinError && <p className="text-xs" style={{ color: "#EF4444" }}>{pinError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg text-xs" style={{ background: BORD, color: MUTED }}>Cancel</button>
              <button onClick={handleChangePin} disabled={pinForm.pin.length !== 4}
                className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: "#38BDF8", color: "#0D0618" }}>
                Update PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
