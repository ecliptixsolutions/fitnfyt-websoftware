import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import { useApp, type Payment } from "@/store/app";

export const Route = createFileRoute("/finance/record")({
  head: () => ({ meta: [{ title: "Record Transaction - Fit & Fyt GymOS" }] }),
  component: RecordTransaction,
});

function RecordTransaction() {
  const members = useApp((state) => state.members);
  const addPayment = useApp((state) => state.addPayment);
  const addRefund = useApp((state) => state.addRefund);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    memberId: members[0]?.id ?? "",
    amount: 0,
    mode: "UPI" as Payment["mode"],
    status: "Paid" as Payment["status"],
    type: "payment" as "payment" | "refund",
    date: new Date().toISOString().slice(0, 10),
    dueDate: "",
    reference: "",
    notes: "",
  });
  const member = members.find((item) => item.id === form.memberId);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm({ ...form, [key]: value });
  const submit = () => {
    if (!member || form.amount <= 0) return toast.error("Select a member and enter a valid amount");
    const transaction = {
      memberId: member.id,
      amount: form.amount,
      date: new Date(form.date).toISOString(),
      mode: form.mode,
      plan: member.plan,
      reference: form.reference,
      notes: form.notes,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
    };
    if (form.type === "refund") addRefund(transaction);
    else addPayment({ ...transaction, status: form.status, type: "payment" });
    toast.success(form.type === "refund" ? "Refund recorded" : "Payment recorded");
    navigate({ to: "/finance/payments" });
  };
  return (
    <AppShell title="Record transaction" description="Record a payment, pending due, or refund.">
      <Card className="mx-auto max-w-3xl space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-md bg-input p-1">
          {(["payment", "refund"] as const).map((type) => (
            <button
              key={type}
              onClick={() => set("type", type)}
              className={`rounded py-2 text-xs capitalize ${form.type === type ? "bg-primary font-bold text-white" : "text-muted-foreground"}`}
            >
              {type}
            </button>
          ))}
        </div>
        <Field label="Member">
          <select
            className="input-field"
            value={form.memberId}
            onChange={(event) => set("memberId", event.target.value)}
          >
            {members.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} - {item.plan}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Transaction date">
            <input
              type="date"
              className="input-field"
              value={form.date}
              onChange={(event) => set("date", event.target.value)}
            />
          </Field>
          <Field label="Amount">
            <input
              type="number"
              className="input-field"
              value={form.amount || ""}
              onChange={(event) => set("amount", Number(event.target.value))}
            />
          </Field>
        </div>
        {form.type === "payment" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status">
              <select
                className="input-field"
                value={form.status}
                onChange={(event) => set("status", event.target.value as Payment["status"])}
              >
                <option>Paid</option>
                <option>Pending</option>
              </select>
            </Field>
            <Field label="Due date">
              <input
                type="date"
                className="input-field"
                value={form.dueDate}
                onChange={(event) => set("dueDate", event.target.value)}
              />
            </Field>
          </div>
        )}
        <Field label="Payment mode">
          <div className="grid grid-cols-4 gap-2">
            {(["Cash", "UPI", "Card", "Bank"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => set("mode", mode)}
                className={`rounded-md border py-2 text-xs ${form.mode === mode ? "border-primary bg-primary font-bold text-white" : "border-border text-muted-foreground"}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Reference / receipt number">
          <input
            className="input-field"
            value={form.reference}
            onChange={(event) => set("reference", event.target.value)}
          />
        </Field>
        <Field label="Notes">
          <textarea
            className="input-field"
            rows={3}
            value={form.notes}
            onChange={(event) => set("notes", event.target.value)}
          />
        </Field>
        <button onClick={submit} className="btn-primary w-full">
          Save transaction
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
