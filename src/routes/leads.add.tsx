import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import { useApp, type LeadSource } from "@/store/app";

export const Route = createFileRoute("/leads/add")({
  head: () => ({ meta: [{ title: "Add Lead - Fit & Fyt GymOS" }] }),
  component: Add,
});

function Add() {
  const addLead = useApp((state) => state.addLead);
  const staff = useApp((state) => state.staff);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    enquiry: "Weight Loss",
    source: "Walk-in" as LeadSource,
    followUp: new Date().toISOString().slice(0, 10),
    notes: "",
    assignedStaffId: "",
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm({ ...form, [key]: value });
  const save = () => {
    if (!form.name.trim() || !form.phone.trim()) return toast.error("Name and phone are required");
    addLead({
      ...form,
      followUp: new Date(form.followUp).toISOString(),
      status: "New",
      activities: [],
    });
    toast.success("Lead added");
    navigate({ to: "/leads" });
  };
  return (
    <AppShell title="Add lead" description="Create a lead manually from any source.">
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
          <Field label="Enquiry">
            <select
              className="input-field"
              value={form.enquiry}
              onChange={(event) => set("enquiry", event.target.value)}
            >
              {["Weight Loss", "Muscle Gain", "General Fitness", "Zumba", "Yoga", "MMA"].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </Field>
          <Field label="Source">
            <select
              className="input-field"
              value={form.source}
              onChange={(event) => set("source", event.target.value as LeadSource)}
            >
              {["Walk-in", "WhatsApp", "Instagram", "Facebook", "Referral", "Website"].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Follow-up date">
            <input
              type="date"
              className="input-field"
              value={form.followUp}
              onChange={(event) => set("followUp", event.target.value)}
            />
          </Field>
          <Field label="Assign to staff">
            <select
              className="input-field"
              value={form.assignedStaffId}
              onChange={(event) => set("assignedStaffId", event.target.value)}
            >
              <option value="">Unassigned</option>
              {staff
                .filter((person) => person.active)
                .map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} - {person.role}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            className="input-field"
            rows={4}
            value={form.notes}
            onChange={(event) => set("notes", event.target.value)}
          />
        </Field>
        <button onClick={save} className="btn-primary w-full">
          Save lead
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
