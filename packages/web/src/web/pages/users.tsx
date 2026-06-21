import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBranchId } from "../lib/store";
import { Sidebar } from "../components/layout/sidebar";
import { Plus, Trash2, Shield, User } from "lucide-react";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const TEXT = "#F3F4F6";

export default function UsersPage() {
  const branchId = getBranchId();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users", branchId],
    queryFn: async () => (await api.users.$get({ query: { branchId: String(branchId) } })).json(),
  });

  const users: any[] = (usersData as any)?.users || [];

  const createUser = useMutation({
    mutationFn: async (data: any) => (await api.users.$post({ json: { ...data, branchId } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setShowForm(false); setForm({}); },
  });
  const deleteUser = useMutation({
    mutationFn: async (id: number) => (await api.users[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const ROLE_COLOR: Record<string, string> = { superadmin: "#A78BFA", admin: GOLD, waiter: "#22C55E", cashier: "#38BDF8" };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="font-bold text-base" style={{ color: TEXT }}>Users</div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: GOLD, color: "#1A0A2E" }}>
            <Plus size={13} />
            Add User
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
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
                          {u.role === "superadmin" || u.role === "admin" ? <Shield size={13} color={ROLE_COLOR[u.role] || DIM} /> : <User size={13} color={ROLE_COLOR[u.role] || DIM} />}
                        </div>
                        <span className="text-xs font-medium" style={{ color: TEXT }}>{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: MUTED }}>****</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ background: (ROLE_COLOR[u.role] || DIM) + "22", color: ROLE_COLOR[u.role] || DIM }}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: MUTED }}>Branch {u.branchId}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => confirm("Delete user?") && deleteUser.mutate(u.id)}
                        className="p-1 rounded" style={{ color: "#EF4444" }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-80 rounded-2xl p-6 border" style={{ background: SURF, borderColor: BORD }}>
            <div className="font-bold text-sm mb-4" style={{ color: TEXT }}>Add User</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>Name</label>
                <input type="text" value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none"
                  style={{ background: BG, borderColor: BORD, color: TEXT }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: MUTED }}>PIN (4 digits)</label>
                <input type="password" maxLength={4} value={form.pin || ""} onChange={e => setForm(p => ({ ...p, pin: e.target.value }))}
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
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { setShowForm(false); setForm({}); }}
                className="px-4 py-2 rounded-lg text-xs" style={{ background: BORD, color: MUTED }}>Cancel</button>
              <button onClick={() => createUser.mutate(form)}
                className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: GOLD, color: "#1A0A2E" }}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
