import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, CheckCircle2, Edit3, MapPin, Phone, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import { inr } from "@/lib/format";
import { useApp, type Branch } from "@/store/app";

export const Route = createFileRoute("/branches/")({
  head: () => ({ meta: [{ title: "Branches - Fit & Fyt GymOS" }] }),
  component: Branches,
});

function Branches() {
  const branches = useApp((state) => state.branches);
  const members = useApp((state) => state.members);
  const staff = useApp((state) => state.staff);
  const leads = useApp((state) => state.leads);
  const payments = useApp((state) => state.payments);
  const currentBranch = useApp((state) => state.currentBranch);
  const addBranch = useApp((state) => state.addBranch);
  const updateBranch = useApp((state) => state.updateBranch);
  const deleteBranch = useApp((state) => state.deleteBranch);
  const setCurrentBranch = useApp((state) => state.setCurrentBranch);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState({
    name: "",
    city: "Mumbai",
    manager: "",
    address: "",
    phone: "",
    active: true,
  });

  const openForm = (branch?: Branch) => {
    setEditing(branch ?? null);
    setForm({
      name: branch?.name ?? "",
      city: branch?.city ?? "Mumbai",
      manager: branch?.manager ?? "",
      address: branch?.address ?? "",
      phone: branch?.phone ?? "",
      active: branch?.active ?? true,
    });
  };
  const save = () => {
    if (!form.name.trim() || !form.city.trim())
      return toast.error("Branch name and city are required");
    if (editing) {
      updateBranch(editing.id, form);
      toast.success("Branch updated");
    } else {
      addBranch(form);
      toast.success("Branch added");
    }
    setEditing(null);
    setForm({ name: "", city: "Mumbai", manager: "", address: "", phone: "", active: true });
  };

  return (
    <AppShell
      title="Branches"
      description="Manage locations, managers, members, staff, and branch performance."
      actions={
        <button onClick={() => openForm()} className="btn-primary text-xs">
          <Plus className="h-4 w-4" />
          Add branch
        </button>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Metric label="Branches" value={branches.length} />
        <Metric label="Members" value={members.length} />
        <Metric label="Staff" value={staff.length} />
        <Metric
          label="Open leads"
          value={leads.filter((lead) => lead.status !== "Converted").length}
        />
      </div>

      {(editing || form.name || form.address || form.phone) && (
        <Card className="mb-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold">{editing ? "Edit branch" : "Add branch"}</h2>
            <button
              onClick={() => {
                setEditing(null);
                setForm({
                  name: "",
                  city: "Mumbai",
                  manager: "",
                  address: "",
                  phone: "",
                  active: true,
                });
              }}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              Cancel
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Branch name">
              <input
                className="input-field"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="City">
              <input
                className="input-field"
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
              />
            </Field>
            <Field label="Manager">
              <input
                className="input-field"
                value={form.manager}
                onChange={(event) => setForm({ ...form, manager: event.target.value })}
              />
            </Field>
            <Field label="Address">
              <input
                className="input-field"
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
            </Field>
            <Field label="Phone">
              <input
                className="input-field"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </Field>
            <label className="flex items-end gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
                className="mb-3 accent-primary"
              />
              Active branch
            </label>
          </div>
          <button onClick={save} className="btn-primary mt-4 w-full">
            Save branch
          </button>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {branches.map((branch) => {
          const branchMembers = members.filter((member) => (member.branchId ?? "b1") === branch.id);
          const branchStaff = staff.filter((person) => (person.branchId ?? "b1") === branch.id);
          const branchRevenue =
            payments
              .filter(
                (payment) =>
                  payment.status === "Paid" &&
                  payment.type !== "refund" &&
                  ((payment.branchId ?? "b1") === branch.id ||
                    branchMembers.some((member) => member.id === payment.memberId)),
              )
              .reduce((sum, payment) => sum + payment.amount, 0) || branch.revenue;
          return (
            <Card key={branch.id}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-md bg-primary/15">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">{branch.name}</h2>
                    {currentBranch === branch.id && (
                      <span className="status-badge status-active">Current</span>
                    )}
                    {!branch.active && (
                      <span className="status-badge status-inactive">Inactive</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {branch.city}
                    </span>
                    {branch.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {branch.phone}
                      </span>
                    )}
                    <span>Manager: {branch.manager || "Not assigned"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openForm(branch)}
                    className="icon-button"
                    aria-label={`Edit ${branch.name}`}
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {branches.length > 1 && (
                    <button
                      onClick={() => {
                        if (
                          !confirm(
                            `Delete ${branch.name}? Its members and staff will move to the current branch.`,
                          )
                        )
                          return;
                        deleteBranch(branch.id);
                        toast.success("Branch deleted");
                      }}
                      className="icon-button text-destructive"
                      aria-label={`Delete ${branch.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
                <Mini label="Members" value={branchMembers.length || branch.members} />
                <Mini label="Staff" value={branchStaff.length} />
                <Mini label="Revenue" value={inr(branchRevenue)} accent />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/branches/$id"
                  params={{ id: branch.id }}
                  className="subtle-button flex-1"
                >
                  View branch
                </Link>
                <button
                  onClick={() => {
                    setCurrentBranch(branch.id);
                    toast.success(`${branch.name} selected`);
                  }}
                  className="subtle-button flex-1"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Set current
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="!p-4">
      <div className="section-label">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </Card>
  );
}

function Mini({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-bold ${accent ? "text-amber-400" : ""}`}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}
