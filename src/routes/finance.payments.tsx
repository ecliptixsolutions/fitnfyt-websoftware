import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet, Save, Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import { downloadCsv, downloadExcel } from "@/lib/export";
import { colorFromName, dmy, initials, inr } from "@/lib/format";
import { useApp, type Payment } from "@/store/app";

export const Route = createFileRoute("/finance/payments")({
  head: () => ({ meta: [{ title: "Transactions - Fit & Fyt GymOS" }] }),
  component: Payments,
});

function Payments() {
  const payments = useApp((state) => state.payments);
  const members = useApp((state) => state.members);
  const staff = useApp((state) => state.staff);
  const updatePayment = useApp((state) => state.updatePayment);
  const deletePayment = useApp((state) => state.deletePayment);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [mode, setMode] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Payment>>({});
  const editingPayment = payments.find((payment) => payment.id === editingId);
  const trainers = staff.filter((person) => person.role === "Trainer");
  const list = payments
    .filter((payment) => status === "all" || payment.status === status)
    .filter((payment) => mode === "all" || payment.mode === mode)
    .filter((payment) => {
      const member = members.find((item) => item.id === payment.memberId);
      const trainer = staff.find((person) => person.id === payment.trainerId);
      return `${member?.name ?? ""} ${trainer?.name ?? ""} ${payment.plan} ${payment.reference ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase());
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const rows = list.map((payment) => [
    payment.date.slice(0, 10),
    members.find((item) => item.id === payment.memberId)?.name ?? "Unknown",
    payment.type ?? "payment",
    payment.category ?? "Membership",
    payment.plan,
    staff.find((person) => person.id === payment.trainerId)?.name ?? "",
    payment.commissionPercent ? `${payment.commissionPercent}%` : "",
    payment.commissionAmount ?? "",
    payment.mode,
    payment.status,
    payment.amount,
    payment.reference ?? "",
  ]);
  const headers = [
    "Date",
    "Member",
    "Type",
    "Category",
    "Plan",
    "Trainer",
    "Commission %",
    "Commission",
    "Mode",
    "Status",
    "Amount",
    "Reference",
  ];
  return (
    <AppShell
      title="Transactions"
      description={`${list.length} matching payments and refunds.`}
      actions={
        <>
          <button
            onClick={() => downloadCsv("fitfyt-transactions", headers, rows)}
            className="subtle-button"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={() => downloadExcel("fitfyt-transactions", headers, rows)}
            className="subtle-button"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
        </>
      }
    >
      <Card className="mb-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="input-field pl-9"
              placeholder="Search member, plan, or reference"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            aria-label="Payment status"
            className="input-field min-w-36"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option>Paid</option>
            <option>Pending</option>
          </select>
          <select
            aria-label="Payment mode"
            className="input-field min-w-36"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="all">All modes</option>
            {["Cash", "UPI", "Card", "Bank"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
      </Card>
      {editingPayment && (
        <Card className="mb-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Edit transaction</h2>
              <p className="text-xs text-muted-foreground">
                Changes recalculate member dues and PT trainer payroll instantly.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingId(null);
                setDraft({});
              }}
              className="subtle-button"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Member">
              <select
                className="input-field"
                value={draft.memberId ?? editingPayment.memberId}
                onChange={(event) => setDraft({ ...draft, memberId: event.target.value })}
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <select
                className="input-field"
                value={draft.category ?? editingPayment.category ?? "Membership"}
                onChange={(event) => {
                  const category = event.target.value as NonNullable<Payment["category"]>;
                  setDraft({
                    ...draft,
                    category,
                    trainerId:
                      category === "Personal Training"
                        ? (draft.trainerId ?? editingPayment.trainerId ?? trainers[0]?.id)
                        : undefined,
                    commissionPercent:
                      category === "Personal Training"
                        ? (draft.commissionPercent ?? editingPayment.commissionPercent ?? 40)
                        : undefined,
                  });
                }}
              >
                <option>Membership</option>
                <option>Personal Training</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Date">
              <input
                className="input-field"
                type="date"
                value={(draft.date ?? editingPayment.date).slice(0, 10)}
                onChange={(event) =>
                  setDraft({ ...draft, date: new Date(event.target.value).toISOString() })
                }
              />
            </Field>
            <Field label="Amount">
              <input
                className="input-field"
                type="number"
                value={draft.amount ?? editingPayment.amount}
                onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })}
              />
            </Field>
            <Field label="Plan / package">
              <input
                className="input-field"
                value={draft.plan ?? editingPayment.plan}
                onChange={(event) => setDraft({ ...draft, plan: event.target.value })}
              />
            </Field>
            <Field label="Mode">
              <select
                className="input-field"
                value={draft.mode ?? editingPayment.mode}
                onChange={(event) =>
                  setDraft({ ...draft, mode: event.target.value as Payment["mode"] })
                }
              >
                {["Cash", "UPI", "Card", "Bank"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className="input-field"
                value={draft.status ?? editingPayment.status}
                onChange={(event) =>
                  setDraft({ ...draft, status: event.target.value as Payment["status"] })
                }
              >
                <option>Paid</option>
                <option>Pending</option>
              </select>
            </Field>
            <Field label="Reference">
              <input
                className="input-field"
                value={draft.reference ?? editingPayment.reference ?? ""}
                onChange={(event) => setDraft({ ...draft, reference: event.target.value })}
              />
            </Field>
            {(draft.category ?? editingPayment.category) === "Personal Training" && (
              <>
                <Field label="Trainer">
                  <select
                    className="input-field"
                    value={draft.trainerId ?? editingPayment.trainerId ?? trainers[0]?.id ?? ""}
                    onChange={(event) => setDraft({ ...draft, trainerId: event.target.value })}
                  >
                    {trainers.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Commission %">
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    max="100"
                    value={draft.commissionPercent ?? editingPayment.commissionPercent ?? 40}
                    onChange={(event) =>
                      setDraft({ ...draft, commissionPercent: Number(event.target.value) })
                    }
                  />
                </Field>
                <div className="rounded-md border border-border p-3">
                  <div className="text-xs text-muted-foreground">Trainer commission</div>
                  <div className="text-lg font-bold text-primary">
                    {inr(
                      Math.round(
                        ((draft.amount ?? editingPayment.amount) *
                          (draft.commissionPercent ?? editingPayment.commissionPercent ?? 40)) /
                          100,
                      ),
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => {
              const category = draft.category ?? editingPayment.category ?? "Membership";
              if (
                category === "Personal Training" &&
                !(draft.trainerId ?? editingPayment.trainerId)
              ) {
                toast.error("Select a trainer before saving PT commission");
                return;
              }
              updatePayment(editingPayment.id, {
                ...draft,
                category,
                trainerId:
                  category === "Personal Training"
                    ? (draft.trainerId ?? editingPayment.trainerId)
                    : undefined,
                commissionPercent:
                  category === "Personal Training"
                    ? (draft.commissionPercent ?? editingPayment.commissionPercent ?? 40)
                    : undefined,
              });
              setEditingId(null);
              setDraft({});
              toast.success("Transaction updated");
            }}
            className="btn-primary mt-4 w-full"
          >
            <Save className="h-4 w-4" />
            Save changes
          </button>
        </Card>
      )}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Plan</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((payment) => {
                const member = members.find((item) => item.id === payment.memberId);
                const trainer = staff.find((person) => person.id === payment.trainerId);
                return (
                  <tr key={payment.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-8 w-8 place-items-center rounded-full text-[10px] font-bold text-white ${colorFromName(member?.name ?? "?")}`}
                        >
                          {initials(member?.name ?? "?")}
                        </div>
                        <div>
                          <div className="font-semibold">{member?.name ?? "Unknown"}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {payment.reference || "No reference"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{dmy(payment.date)}</td>
                    <td className="capitalize">{payment.type ?? "payment"}</td>
                    <td>{payment.category ?? "Membership"}</td>
                    <td>
                      <div>{payment.plan}</div>
                      {trainer && (
                        <div className="text-[10px] text-primary">
                          {trainer.name} - {payment.commissionPercent ?? 40}% commission
                        </div>
                      )}
                    </td>
                    <td>{payment.mode}</td>
                    <td>
                      <span
                        className={`status-badge ${payment.status === "Paid" ? "status-active" : "status-expiring"}`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td
                      className={
                        payment.type === "refund"
                          ? "font-bold text-amber-400"
                          : "font-bold text-emerald-400"
                      }
                    >
                      {payment.type === "refund" ? "-" : ""}
                      {inr(payment.amount)}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setEditingId(payment.id);
                            setDraft({});
                          }}
                          className="subtle-button !min-h-8 !px-3 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            deletePayment(payment.id);
                            toast.success("Transaction deleted");
                          }}
                          className="subtle-button !min-h-8 !px-3 text-xs text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!list.length && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No matching transactions.
          </div>
        )}
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
