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
  const staff = useApp((state) => state.staff);
  const payments = useApp((state) => state.payments);
  const addPayment = useApp((state) => state.addPayment);
  const addRefund = useApp((state) => state.addRefund);
  const navigate = useNavigate();
  const trainers = staff.filter((person) => person.role === "Trainer" && person.active);
  const ptPayments = payments.filter(
    (payment) =>
      payment.category === "Personal Training" &&
      payment.type !== "refund" &&
      payment.status === "Paid",
  );
  const [form, setForm] = useState({
    memberId: members[0]?.id ?? "",
    amount: 0,
    mode: "UPI" as Payment["mode"],
    status: "Paid" as Payment["status"],
    type: "payment" as "payment" | "refund",
    category: "Membership" as NonNullable<Payment["category"]>,
    plan: "",
    trainerId: trainers[0]?.id ?? "",
    commissionPercent: 40,
    refundForPaymentId: "",
    date: new Date().toISOString().slice(0, 10),
    dueDate: "",
    reference: "",
    notes: "",
  });
  const member = members.find((item) => item.id === form.memberId);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm({ ...form, [key]: value });
  const linkedRefundPayment = ptPayments.find((payment) => payment.id === form.refundForPaymentId);
  const submit = () => {
    if (!member || form.amount <= 0) return toast.error("Select a member and enter a valid amount");
    if (form.category === "Personal Training" && !form.trainerId)
      return toast.error("Select a trainer for Personal Training");
    const transaction = {
      memberId: member.id,
      amount: form.amount,
      date: new Date(form.date).toISOString(),
      mode: form.mode,
      plan:
        form.category === "Personal Training"
          ? form.plan || "Personal Training"
          : form.plan || member.plan,
      reference: form.reference,
      notes: form.notes,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      category: form.category,
      trainerId: form.category === "Personal Training" ? form.trainerId : undefined,
      commissionPercent: form.category === "Personal Training" ? form.commissionPercent : undefined,
      refundForPaymentId:
        form.type === "refund" && form.category === "Personal Training"
          ? form.refundForPaymentId
          : undefined,
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
        <Field label="Transaction category">
          <select
            className="input-field"
            value={form.category}
            onChange={(event) => {
              const category = event.target.value as NonNullable<Payment["category"]>;
              setForm({
                ...form,
                category,
                plan:
                  category === "Personal Training"
                    ? "PT Strength Transformation - 12 sessions"
                    : "",
                status: category === "Personal Training" ? "Paid" : form.status,
              });
            }}
          >
            <option>Membership</option>
            <option>Personal Training</option>
            <option>Other</option>
          </select>
        </Field>
        {form.category === "Personal Training" && form.type === "refund" && (
          <Field label="Refund against PT payment">
            <select
              className="input-field"
              value={form.refundForPaymentId}
              onChange={(event) => {
                const payment = ptPayments.find((item) => item.id === event.target.value);
                setForm({
                  ...form,
                  refundForPaymentId: event.target.value,
                  memberId: payment?.memberId ?? form.memberId,
                  trainerId: payment?.trainerId ?? form.trainerId,
                  commissionPercent: payment?.commissionPercent ?? form.commissionPercent,
                  plan: payment ? `${payment.plan} - refund` : form.plan,
                });
              }}
            >
              <option value="">Select original PT sale</option>
              {ptPayments.map((payment) => {
                const paymentMember = members.find((item) => item.id === payment.memberId);
                return (
                  <option key={payment.id} value={payment.id}>
                    {paymentMember?.name ?? "Unknown"} - {payment.plan} - ₹
                    {payment.amount.toLocaleString("en-IN")}
                  </option>
                );
              })}
            </select>
          </Field>
        )}
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
        {form.category === "Personal Training" && (
          <Card className="border-primary/30 bg-primary/5 !p-4">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">
              Personal Training commission
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="PT package">
                <input
                  className="input-field"
                  value={form.plan}
                  onChange={(event) => set("plan", event.target.value)}
                />
              </Field>
              <Field label="Trainer">
                <select
                  className="input-field"
                  value={form.trainerId}
                  onChange={(event) => set("trainerId", event.target.value)}
                >
                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Commission %">
                <input
                  className="input-field"
                  type="number"
                  value={form.commissionPercent}
                  onChange={(event) => set("commissionPercent", Number(event.target.value))}
                />
              </Field>
              <div className="rounded-md border border-border p-3 text-sm">
                <div className="text-xs text-muted-foreground">Trainer commission</div>
                <div className="mt-1 text-lg font-black text-primary">
                  ₹
                  {Math.round((form.amount * form.commissionPercent) / 100).toLocaleString("en-IN")}
                </div>
                {linkedRefundPayment && (
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    Original sale ₹{linkedRefundPayment.amount.toLocaleString("en-IN")}
                  </div>
                )}
              </div>
            </div>
          </Card>
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
