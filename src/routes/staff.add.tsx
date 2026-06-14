import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import { useApp, type Staff } from "@/store/app";

export const Route = createFileRoute("/staff/add")({
  head: () => ({ meta: [{ title: "Add Staff - Fit & Fyt GymOS" }] }),
  component: Add,
});
const permissions = [
  "View Members",
  "Add Members",
  "Edit Members",
  "View Finance",
  "Record Payments",
  "Mark Attendance",
  "View Reports",
  "Manage Leads",
];

function Add() {
  const addStaff = useApp((state) => state.addStaff);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    role: "Trainer" as Staff["role"],
    joined: new Date().toISOString().slice(0, 10),
    salary: 20000,
    shift: "06:00 - 14:00",
    weeklyOff: "Sunday",
    permissions: [...permissions],
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm({ ...form, [key]: value });
  const save = () => {
    if (!form.name.trim() || !form.phone.trim()) return toast.error("Name and phone are required");
    addStaff({
      ...form,
      joined: new Date(form.joined).toISOString(),
      active: true,
      assignedMemberIds: [],
    });
    toast.success("Staff added");
    navigate({ to: "/staff" });
  };
  return (
    <AppShell title="Add staff">
      <Card className="mx-auto max-w-3xl space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input
              className="input-field"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              className="input-field"
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Role">
            <select
              className="input-field"
              value={form.role}
              onChange={(event) => set("role", event.target.value as Staff["role"])}
            >
              {["Trainer", "Receptionist", "Manager"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="Joining date">
            <input
              type="date"
              className="input-field"
              value={form.joined}
              onChange={(event) => set("joined", event.target.value)}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Monthly salary">
            <input
              type="number"
              className="input-field"
              value={form.salary}
              onChange={(event) => set("salary", Number(event.target.value))}
            />
          </Field>
          <Field label="Shift">
            <input
              className="input-field"
              value={form.shift}
              onChange={(event) => set("shift", event.target.value)}
            />
          </Field>
          <Field label="Weekly off">
            <select
              className="input-field"
              value={form.weeklyOff}
              onChange={(event) => set("weeklyOff", event.target.value)}
            >
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </Field>
        </div>
        <Field label="Permissions">
          <div className="grid gap-2 sm:grid-cols-2">
            {permissions.map((permission) => (
              <label
                key={permission}
                className="flex items-center gap-2 rounded-md border border-border p-2 text-xs text-foreground"
              >
                <input
                  type="checkbox"
                  checked={form.permissions.includes(permission)}
                  onChange={(event) =>
                    set(
                      "permissions",
                      event.target.checked
                        ? [...form.permissions, permission]
                        : form.permissions.filter((item) => item !== permission),
                    )
                  }
                  className="accent-primary"
                />
                {permission}
              </label>
            ))}
          </div>
        </Field>
        <button onClick={save} className="btn-primary w-full">
          Save staff
        </button>
      </Card>
    </AppShell>
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
