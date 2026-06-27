import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/layout/AppShell";
import { queueHikvisionEnrollment } from "@/lib/supabase-data";
import { useApp } from "@/store/app";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/members/add")({
  head: () => ({ meta: [{ title: "Add Member - Fit Force Gym" }] }),
  component: AddMember,
});

const plans = [
  { name: "Basic", price: 8999, days: 365 },
  { name: "Premium", price: 11999, days: 365 },
  { name: "Premium Plus", price: 24999, days: 365 },
];

function defaultEmployeeNumber() {
  return `EMP${new Date().getTime().toString().slice(-6)}`;
}

function AddMember() {
  const addMember = useApp((s) => s.addMember);
  const currentBranch = useApp((s) => s.currentBranch);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    dob: "",
    gender: "Male",
    plan: "Premium",
    startDate: new Date().toISOString().slice(0, 10),
    amountPaid: 11999,
    mode: "UPI",
    ref: "",
    locker: "",
    enrollBiometric: true,
    employeeNumber: defaultEmployeeNumber(),
    cardNumber: "",
    faceImagePath: "",
  });
  const plan = plans.find((p) => p.name === form.plan)!;
  const expiry = new Date(form.startDate);
  expiry.setDate(expiry.getDate() + plan.days);
  const balance = plan.price - Number(form.amountPaid || 0);

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  const save = async (andAnother: boolean) => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone required");
      return;
    }

    const employeeNumber = form.employeeNumber.trim().toUpperCase();
    if (form.enrollBiometric && !employeeNumber) {
      toast.error("Employee number is required for biometric enrollment");
      return;
    }

    setSaving(true);
    try {
      const memberId = form.enrollBiometric ? employeeNumber : undefined;
      addMember({
        id: memberId,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        plan: form.plan,
        startDate: new Date(form.startDate).toISOString(),
        expiryDate: expiry.toISOString(),
        status: "active",
        amountPaid: Number(form.amountPaid),
        totalAmount: plan.price,
        branchId: currentBranch,
      });

      if (form.enrollBiometric) {
        await queueHikvisionEnrollment({
          employeeNumber,
          subjectId: employeeNumber,
          subjectType: "member",
          name: form.name.trim(),
          cardNumber: form.cardNumber.trim() || undefined,
          faceImagePath: form.faceImagePath.trim() || undefined,
          validFrom: new Date(form.startDate).toISOString(),
          validTo: expiry.toISOString(),
          active: true,
          branchId: currentBranch,
        });
        toast.success("Member added and queued for device enrollment");
      } else {
        toast.success("Member added");
      }

      if (andAnother) {
        setForm({
          ...form,
          name: "",
          phone: "",
          email: "",
          cardNumber: "",
          faceImagePath: "",
          employeeNumber: defaultEmployeeNumber(),
        });
      } else {
        navigate({ to: "/members" });
      }
    } catch (error) {
      console.error(error);
      toast.error("Member saved locally, but device enrollment queue failed");
    } finally {
      setSaving(false);
    }
  };


  return (
    <AppShell title="Add Member">
      <Card className="space-y-4 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Personal Info</h3>
        <Field label="Full Name *">
          <input className="input-field mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Mobile *">
          <input className="input-field mt-1" placeholder="+91" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Email">
          <input className="input-field mt-1" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of Birth">
            <input className="input-field mt-1" type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
          </Field>
          <Field label="Gender">
            <select className="input-field mt-1" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card className="space-y-4 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Membership</h3>
        <Field label="Plan">
          <select
            className="input-field mt-1"
            value={form.plan}
            onChange={(e) => {
              set("plan", e.target.value);
              set("amountPaid", plans.find((p) => p.name === e.target.value)!.price);
            }}
          >
            {plans.map((p) => <option key={p.name}>{p.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Date">
            <input className="input-field mt-1" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </Field>
          <Field label="Expiry">
            <input className="input-field mt-1 opacity-60" readOnly value={expiry.toISOString().slice(0, 10)} />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Biometric Enrollment</h3>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <input
              type="checkbox"
              checked={form.enrollBiometric}
              onChange={(event) => set("enrollBiometric", event.target.checked)}
            />
            Queue to device
          </label>
        </div>
        {form.enrollBiometric && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Employee Number *">
                <input
                  className="input-field mt-1 uppercase"
                  value={form.employeeNumber}
                  onChange={(event) => set("employeeNumber", event.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Card Number">
                <input className="input-field mt-1" value={form.cardNumber} onChange={(event) => set("cardNumber", event.target.value)} />
              </Field>
            </div>
            <Field label="Face Image Path">
              <input
                className="input-field mt-1"
                placeholder="C:\\Users\\padar\\Pictures\\HikvisionFaces\\EMP002.jpg"
                value={form.faceImagePath}
                onChange={(event) => set("faceImagePath", event.target.value)}
              />
            </Field>
          </>
        )}
      </Card>

      <Card className="space-y-4 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Payment</h3>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total</span><span className="font-semibold">INR {plan.price.toLocaleString("en-IN")}</span></div>
        <Field label="Amount Paid">
          <input className="input-field mt-1" type="number" value={form.amountPaid} onChange={(e) => set("amountPaid", e.target.value)} />
        </Field>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Balance Due</span><span className={`font-semibold ${balance > 0 ? "text-destructive" : "text-primary"}`}>INR {balance.toLocaleString("en-IN")}</span></div>
        <Field label="Payment Mode">
          <div className="grid grid-cols-4 gap-2 mt-1">
            {["Cash", "UPI", "Card", "Bank"].map((m) => (
              <button key={m} type="button" onClick={() => set("mode", m)} className={`py-2 text-xs rounded-lg border ${form.mode === m ? "bg-primary text-primary-foreground border-primary font-semibold" : "border-border text-muted-foreground"}`}>{m}</button>
            ))}
          </div>
        </Field>
        {(form.mode === "UPI" || form.mode === "Card") && (
          <Field label="Reference / UTR">
            <input className="input-field mt-1" value={form.ref} onChange={(e) => set("ref", e.target.value)} />
          </Field>
        )}
      </Card>

      <button disabled={saving} onClick={() => save(false)} className="btn-primary w-full disabled:opacity-60">
        {saving ? "Saving..." : "Save Member"}
      </button>
      <button disabled={saving} onClick={() => save(true)} className="w-full mt-2 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary disabled:opacity-60">
        Save & Add Another
      </button>
    </AppShell>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}