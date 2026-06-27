import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Power, RefreshCw, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import {
  createManagedUser,
  deleteManagedUser,
  getManagedUsers,
  requestPasswordReset,
  updateManagedUser,
  type ManagedUserProfile,
} from "@/lib/supabase-auth";
import { useApp, type Role } from "@/store/app";

export const Route = createFileRoute("/user-access")({
  head: () => ({ meta: [{ title: "User Access - Fit & Fyt GymOS" }] }),
  component: UserAccess,
});

const permissionOptions = [
  { value: "dashboard", label: "Dashboard" },
  { value: "members", label: "Members & Staff" },
  { value: "attendance", label: "Attendance" },
  { value: "finance", label: "Finance" },
  { value: "leads", label: "Leads" },
  { value: "messages", label: "Messages" },
  { value: "hardware", label: "Biometric Devices" },
  { value: "enrollment", label: "Enrollment" },
] as const;

type EditableRole = Exclude<Role, "super">;

function blankForm() {
  return {
    name: "",
    email: "",
    phone: "",
    password: generatePassword(),
    role: "staff" as EditableRole,
    branchId: "b1",
    permissions: ["dashboard", "members", "attendance"],
  };
}

function UserAccess() {
  const auth = useApp((state) => state.auth);
  const branches = useApp((state) => state.branches);
  const navigate = useNavigate();
  const [users, setUsers] = useState<ManagedUserProfile[]>([]);
  const [form, setForm] = useState(blankForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ManagedUserProfile | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await getManagedUsers());
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.role !== "super") {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    void load();
  }, [auth?.role]);

  if (auth?.role !== "super") return null;

  const createAccount = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error("Name, email, and an 8-character temporary password are required");
      return;
    }
    setSaving(true);
    try {
      await createManagedUser({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        branchId: form.branchId,
        permissions: form.role === "staff" ? form.permissions : [],
      });
      toast.success("Login account created");
      setForm(blankForm());
      await load();
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="User Access"
      description="Create login credentials and control roles, branches, and permissions."
      actions={
        <button className="subtle-button" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      }
    >
      <Card className="mb-5">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="font-bold">Create login account</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Full name">
            <input className="input-field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          <Field label="Email / Login ID">
            <input className="input-field" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </Field>
          <Field label="Mobile number">
            <input className="input-field" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </Field>
          <Field label="Temporary password">
            <div className="flex gap-2">
              <input className="input-field" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              <button className="icon-button shrink-0" title="Generate password" onClick={() => setForm({ ...form, password: generatePassword() })}>
                <KeyRound className="h-4 w-4" />
              </button>
            </div>
          </Field>
          <Field label="Role">
            <select className="input-field" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as EditableRole })}>
              <option value="owner">Owner</option>
              <option value="staff">Staff</option>
              <option value="member">Member</option>
            </select>
          </Field>
          <Field label="Branch">
            <select className="input-field" value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </Field>
        </div>
        {form.role === "staff" && (
          <PermissionPicker value={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} />
        )}
        <button className="btn-primary mt-4 w-full justify-center" disabled={saving} onClick={() => void createAccount()}>
          <ShieldCheck className="h-4 w-4" />
          {saving ? "Creating account..." : "Create account"}
        </button>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">Existing access</h2>
        <span className="text-xs text-muted-foreground">{users.length} accounts</span>
      </div>
      <div className="space-y-3">
        {users.map((user) => {
          const isSelf = user.id === auth.id;
          const isEditing = editingId === user.id && draft;
          return (
            <Card key={user.id} className="!p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{user.name}</span>
                    <span className={`status-badge ${user.active === false ? "status-expired" : "status-active"}`}>
                      {user.active === false ? "Disabled" : "Active"}
                    </span>
                    <span className="status-badge status-expiring">{user.role}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{user.email} {user.phone ? `- ${user.phone}` : ""}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="subtle-button" onClick={() => {
                    setEditingId(user.id);
                    setDraft({ ...user, permissions: [...(user.permissions ?? [])] });
                  }}>Edit access</button>
                  <button className="subtle-button" disabled={!user.email} onClick={async () => {
                    try {
                      await requestPasswordReset(user.email ?? "");
                      toast.success("Password reset email sent");
                    } catch (error) {
                      toast.error(messageOf(error));
                    }
                  }}>Reset password</button>
                  {!isSelf && (
                    <>
                      <button className="icon-button" title={user.active === false ? "Enable account" : "Disable account"} onClick={async () => {
                        try {
                          await updateManagedUser(user.id, { active: user.active === false });
                          await load();
                        } catch (error) {
                          toast.error(messageOf(error));
                        }
                      }}><Power className="h-4 w-4" /></button>
                      <button className="icon-button text-destructive" title="Delete account" onClick={async () => {
                        if (!confirm(`Delete login access for ${user.name}?`)) return;
                        try {
                          await deleteManagedUser(user.id);
                          toast.success("Account deleted");
                          await load();
                        } catch (error) {
                          toast.error(messageOf(error));
                        }
                      }}><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-4 border-t border-border pt-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Role">
                      <select className="input-field" value={draft.role ?? "staff"} disabled={isSelf} onChange={(event) => setDraft({ ...draft, role: event.target.value as EditableRole })}>
                        <option value="owner">Owner</option>
                        <option value="staff">Staff</option>
                        <option value="member">Member</option>
                        {isSelf && <option value="super">Super Admin</option>}
                      </select>
                    </Field>
                    <Field label="Branch">
                      <select className="input-field" value={draft.branch_id ?? "b1"} onChange={(event) => setDraft({ ...draft, branch_id: event.target.value })}>
                        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Mobile number">
                      <input className="input-field" value={draft.phone ?? ""} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
                    </Field>
                  </div>
                  {draft.role === "staff" && (
                    <PermissionPicker value={draft.permissions ?? []} onChange={(permissions) => setDraft({ ...draft, permissions })} />
                  )}
                  <div className="mt-4 flex gap-2">
                    <button className="btn-primary" onClick={async () => {
                      try {
                        await updateManagedUser(user.id, {
                          phone: draft.phone ?? "",
                          role: draft.role === "super" ? undefined : draft.role ?? "staff",
                          branchId: draft.branch_id ?? "b1",
                          permissions: draft.role === "staff" ? draft.permissions ?? [] : [],
                        });
                        setEditingId(null);
                        setDraft(null);
                        toast.success("Access updated");
                        await load();
                      } catch (error) {
                        toast.error(messageOf(error));
                      }
                    }}>Save access</button>
                    <button className="subtle-button" onClick={() => {
                      setEditingId(null);
                      setDraft(null);
                    }}>Cancel</button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {!loading && users.length === 0 && <Card>No login accounts found.</Card>}
      </div>
    </AppShell>
  );
}

function PermissionPicker({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  return (
    <div className="mt-4">
      <div className="mb-2 text-xs text-muted-foreground">Staff permissions</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {permissionOptions.map((permission) => (
          <label key={permission.value} className="flex items-center gap-2 rounded border border-border px-3 py-2 text-xs">
            <input type="checkbox" checked={value.includes(permission.value)} onChange={(event) =>
              onChange(event.target.checked ? [...value, permission.value] : value.filter((item) => item !== permission.value))
            } />
            {permission.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1 text-xs text-muted-foreground"><span>{label}</span>{children}</label>;
}

function generatePassword() {
  return `Fit@${Math.random().toString(36).slice(2, 8)}${Math.floor(10 + Math.random() * 89)}`;
}

function messageOf(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  try {
    const parsed = JSON.parse(error.message);
    return parsed.error_description || parsed.msg || parsed.error || error.message;
  } catch {
    return error.message;
  }
}
