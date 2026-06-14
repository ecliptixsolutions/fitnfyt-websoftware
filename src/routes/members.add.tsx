import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/layout/AppShell";
import { useApp } from "@/store/app";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/members/add")({
  head: () => ({ meta: [{ title: "Add Member — Fit Force Gym" }] }),
  component: AddMember,
});

const plans = [
  { name: "Basic", price: 8999, days: 365 },
  { name: "Premium", price: 11999, days: 365 },
  { name: "Premium Plus", price: 24999, days: 365 },
];

function AddMember() {
  const addMember = useApp((s) => s.addMember);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", phone: "", email: "", dob: "", gender: "Male", plan: "Premium",
    startDate: new Date().toISOString().slice(0, 10), amountPaid: 11999, mode: "UPI", ref: "", locker: "",
  });
  const plan = plans.find((p) => p.name === form.plan)!;
  const expiry = new Date(form.startDate); expiry.setDate(expiry.getDate() + plan.days);
  const balance = plan.price - form.amountPaid;

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  const save = (andAnother: boolean) => {
    if (!form.name || !form.phone) { toast.error("Name and phone required"); return; }
    addMember({
      name: form.name, phone: form.phone, email: form.email,
      plan: form.plan, startDate: new Date(form.startDate).toISOString(),
      expiryDate: expiry.toISOString(), status: "active",
      amountPaid: Number(form.amountPaid), totalAmount: plan.price,
    });
    toast.success("Member added");
    if (andAnother) setForm({ ...form, name: "", phone: "", email: "" });
    else navigate({ to: "/members" });
  };

  const Field = ({ label, children }: any) => (
    <div><label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</label>{children}</div>
  );

  return (
    <AppShell title="Add Member">
      <Card className="space-y-4 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Personal Info</h3>
        <Field label="Full Name *"><input className="input-field mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Mobile *"><input className="input-field mt-1" placeholder="+91" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Email"><input className="input-field mt-1" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of Birth"><input className="input-field mt-1" type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
          <Field label="Gender">
            <select className="input-field mt-1" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card className="space-y-4 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Membership</h3>
        <Field label="Plan">
          <select className="input-field mt-1" value={form.plan} onChange={(e) => { set("plan", e.target.value); set("amountPaid", plans.find(p => p.name === e.target.value)!.price); }}>
            {plans.map((p) => <option key={p.name}>{p.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Date"><input className="input-field mt-1" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
          <Field label="Expiry"><input className="input-field mt-1 opacity-60" readOnly value={expiry.toISOString().slice(0, 10)} /></Field>
        </div>
      </Card>

      <Card className="space-y-4 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Payment</h3>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total</span><span className="font-semibold">₹{plan.price.toLocaleString("en-IN")}</span></div>
        <Field label="Amount Paid"><input className="input-field mt-1" type="number" value={form.amountPaid} onChange={(e) => set("amountPaid", e.target.value)} /></Field>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Balance Due</span><span className={`font-semibold ${balance > 0 ? "text-destructive" : "text-primary"}`}>₹{balance.toLocaleString("en-IN")}</span></div>
        <Field label="Payment Mode">
          <div className="grid grid-cols-4 gap-2 mt-1">
            {["Cash", "UPI", "Card", "Bank"].map((m) => (
              <button key={m} type="button" onClick={() => set("mode", m)} className={`py-2 text-xs rounded-lg border ${form.mode === m ? "bg-primary text-primary-foreground border-primary font-semibold" : "border-border text-muted-foreground"}`}>{m}</button>
            ))}
          </div>
        </Field>
        {(form.mode === "UPI" || form.mode === "Card") && (
          <Field label="Reference / UTR"><input className="input-field mt-1" value={form.ref} onChange={(e) => set("ref", e.target.value)} /></Field>
        )}
      </Card>

      <button onClick={() => save(false)} className="btn-primary w-full">Save Member</button>
      <button onClick={() => save(true)} className="w-full mt-2 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary">Save & Add Another</button>
    </AppShell>
  );
}
