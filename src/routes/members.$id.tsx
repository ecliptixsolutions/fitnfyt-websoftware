import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  Flame,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Snowflake,
  Sun,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell, Card, StatusBadge } from "@/components/layout/AppShell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { colorFromName, daysBetween, dmy, initials, inr } from "@/lib/format";
import { useApp, type Payment, type Status } from "@/store/app";

export const Route = createFileRoute("/members/$id")({
  head: () => ({ meta: [{ title: "Member Profile - Fit & Fyt GymOS" }] }),
  component: Detail,
});

const planPrices: Record<string, Record<number, number>> = {
  Basic: { 6: 4999, 12: 8999, 24: 16999 },
  Premium: { 6: 6999, 12: 11999, 24: 21499 },
  "Premium Plus": { 6: 13499, 12: 24999, 24: 44999 },
};

function Detail() {
  const { id } = Route.useParams();
  const members = useApp((state) => state.members);
  const allPayments = useApp((state) => state.payments);
  const updateMember = useApp((state) => state.updateMember);
  const renewMember = useApp((state) => state.renewMember);
  const toggleMemberFreeze = useApp((state) => state.toggleMemberFreeze);
  const setWorkoutPlan = useApp((state) => state.setWorkoutPlan);
  const addMemberDocument = useApp((state) => state.addMemberDocument);
  const [tab, setTab] = useState<"history" | "payments" | "workouts" | "docs">("history");
  const [editOpen, setEditOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [exercise, setExercise] = useState("");
  const [edit, setEdit] = useState({
    name: "",
    phone: "",
    email: "",
    plan: "",
    expiryDate: "",
    status: "active" as Status,
  });
  const [renewal, setRenewal] = useState({
    plan: "Premium",
    months: 12,
    amount: 11999,
    mode: "UPI" as Payment["mode"],
  });
  const documentInput = useRef<HTMLInputElement>(null);
  const member = members.find((item) => item.id === id);
  const payments = allPayments.filter((payment) => payment.memberId === id);

  if (!member) {
    return (
      <AppShell title="Member profile">
        <Card>Member not found</Card>
      </AppShell>
    );
  }

  const days = daysBetween(new Date(), new Date(member.expiryDate));
  const workouts = member.workoutPlan ?? [];
  const documents = member.documents ?? [];
  const openEdit = () => {
    setEdit({
      name: member.name,
      phone: member.phone,
      email: member.email ?? "",
      plan: member.plan,
      expiryDate: new Date(member.expiryDate).toISOString().slice(0, 10),
      status: member.status,
    });
    setEditOpen(true);
  };
  const openRenew = () => {
    const months = 12;
    setRenewal({
      plan: member.plan,
      months,
      amount: planPrices[member.plan]?.[months] ?? 0,
      mode: "UPI",
    });
    setRenewOpen(true);
  };
  const updateRenewal = (patch: Partial<typeof renewal>) => {
    const next = { ...renewal, ...patch };
    if (patch.plan || patch.months)
      next.amount = planPrices[next.plan]?.[next.months] ?? next.amount;
    setRenewal(next);
  };

  return (
    <AppShell title="Member profile" description={`${member.id.toUpperCase()} - ${member.plan}`}>
      <div className="mb-4 flex flex-col items-center text-center">
        <div
          className={`grid h-24 w-24 place-items-center rounded-full text-2xl font-black text-white ${colorFromName(member.name)}`}
        >
          {initials(member.name)}
        </div>
        <h1 className="mt-3 text-2xl font-bold">{member.name}</h1>
        <div className="mt-1 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {member.phone}
          </span>
          {member.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {member.email}
            </span>
          )}
        </div>
      </div>

      <Card className="mb-4 border-primary/40 bg-primary/10 !p-5">
        <div className="section-label text-primary">Membership</div>
        <div className="mt-1 text-2xl font-black">{member.plan}</div>
        <div className="mt-3 flex justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {dmy(member.startDate)} to {dmy(member.expiryDate)}
          </span>
          <StatusBadge status={member.status} />
        </div>
        <div className="mt-4 flex items-end gap-2">
          <div className="text-5xl font-black text-primary">{Math.max(days, 0)}</div>
          <div className="mb-1.5 text-xs text-muted-foreground">days remaining</div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Card className="!p-3 text-center">
          <div className="text-xl font-black">{member.checkIns.length}</div>
          <div className="mt-1 text-[10px] uppercase text-muted-foreground">Total Check-ins</div>
        </Card>
        <Card className="!p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-xl font-black">
            <Flame className="h-5 w-5 text-amber-400" />
            {member.streak}
          </div>
          <div className="mt-1 text-[10px] uppercase text-muted-foreground">Streak</div>
        </Card>
        <Card className="!p-3 text-center">
          <div className="text-xl font-black text-destructive">
            {Math.max(0, 30 - member.checkIns.length)}
          </div>
          <div className="mt-1 text-[10px] uppercase text-muted-foreground">Missed</div>
        </Card>
      </div>

      <div className="mb-3 flex gap-1 rounded-md bg-input p-1">
        {(["history", "payments", "workouts", "docs"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex-1 rounded px-2 py-2 text-xs capitalize ${tab === value ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"}`}
          >
            {value}
          </button>
        ))}
      </div>

      <Card className="mb-4 !p-3">
        {tab === "history" && <History dates={member.checkIns} />}
        {tab === "payments" &&
          (payments.length === 0 ? (
            <Empty text="No payments recorded" />
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="flex justify-between border-b border-border/50 py-2 text-sm last:border-0"
              >
                <div>
                  <div>{payment.plan}</div>
                  <div className="text-xs text-muted-foreground">
                    {dmy(payment.date)} - {payment.mode}
                  </div>
                </div>
                <div className="font-semibold text-primary">{inr(payment.amount)}</div>
              </div>
            ))
          ))}
        {tab === "workouts" && (
          <div>
            <div className="mb-3 flex gap-2">
              <input
                className="input-field"
                value={exercise}
                onChange={(event) => setExercise(event.target.value)}
                placeholder="Add exercise or workout"
              />
              <button
                className="icon-button shrink-0"
                aria-label="Add workout"
                onClick={() => {
                  if (!exercise.trim()) return;
                  setWorkoutPlan(member.id, [...workouts, exercise.trim()]);
                  setExercise("");
                  toast.success("Workout added");
                }}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {workouts.length === 0 ? (
              <Empty text="No workout plan assigned" />
            ) : (
              workouts.map((workout, index) => (
                <div
                  key={`${workout}-${index}`}
                  className="flex items-center gap-3 border-b border-border/50 py-3 text-sm last:border-0"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <span>{workout}</span>
                  <button
                    onClick={() =>
                      setWorkoutPlan(
                        member.id,
                        workouts.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    className="ml-auto text-xs text-destructive"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        {tab === "docs" && (
          <div>
            <input
              ref={documentInput}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                addMemberDocument(member.id, file.name);
                toast.success("Document added");
                event.target.value = "";
              }}
            />
            <button onClick={() => documentInput.current?.click()} className="subtle-button mb-3">
              <Upload className="h-4 w-4" />
              Add document
            </button>
            {documents.length === 0 ? (
              <Empty text="No documents uploaded" />
            ) : (
              documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center gap-3 border-b border-border/50 py-3 text-sm last:border-0"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  <span>{document.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {dmy(document.uploadedAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <button onClick={openRenew} className="btn-primary justify-center text-sm">
          <RefreshCw className="h-4 w-4" />
          Renew
        </button>
        <button onClick={openEdit} className="subtle-button justify-center text-sm">
          <Pencil className="h-4 w-4" />
          Edit
        </button>
        <button
          onClick={() => {
            toggleMemberFreeze(member.id);
            toast.success(member.status === "frozen" ? "Membership unfrozen" : "Membership frozen");
          }}
          className="subtle-button justify-center text-sm"
        >
          {member.status === "frozen" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Snowflake className="h-4 w-4" />
          )}
          {member.status === "frozen" ? "Unfreeze" : "Freeze"}
        </button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
            <DialogDescription>Update profile and membership details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input
                className="input-field"
                value={edit.name}
                onChange={(event) => setEdit({ ...edit, name: event.target.value })}
              />
            </Field>
            <Field label="Phone">
              <input
                className="input-field"
                value={edit.phone}
                onChange={(event) => setEdit({ ...edit, phone: event.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                className="input-field"
                value={edit.email}
                onChange={(event) => setEdit({ ...edit, email: event.target.value })}
              />
            </Field>
            <Field label="Plan">
              <select
                className="input-field"
                value={edit.plan}
                onChange={(event) => setEdit({ ...edit, plan: event.target.value })}
              >
                {Object.keys(planPrices).map((plan) => (
                  <option key={plan}>{plan}</option>
                ))}
              </select>
            </Field>
            <Field label="Expiry date">
              <input
                type="date"
                className="input-field"
                value={edit.expiryDate}
                onChange={(event) => setEdit({ ...edit, expiryDate: event.target.value })}
              />
            </Field>
            <Field label="Status">
              <select
                className="input-field"
                value={edit.status}
                onChange={(event) => setEdit({ ...edit, status: event.target.value as Status })}
              >
                {["active", "expiring", "expired", "frozen"].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </Field>
          </div>
          <DialogFooter>
            <button
              className="btn-primary"
              onClick={() => {
                if (!edit.name.trim() || !edit.phone.trim())
                  return toast.error("Name and phone are required");
                updateMember(member.id, {
                  ...edit,
                  expiryDate: new Date(edit.expiryDate).toISOString(),
                });
                setEditOpen(false);
                toast.success("Member updated");
              }}
            >
              Save changes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>Renew membership</DialogTitle>
            <DialogDescription>
              The expiry date and payment history update immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Plan">
              <select
                className="input-field"
                value={renewal.plan}
                onChange={(event) => updateRenewal({ plan: event.target.value })}
              >
                {Object.keys(planPrices).map((plan) => (
                  <option key={plan}>{plan}</option>
                ))}
              </select>
            </Field>
            <Field label="Duration">
              <select
                className="input-field"
                value={renewal.months}
                onChange={(event) => updateRenewal({ months: Number(event.target.value) })}
              >
                <option value={6}>6 months</option>
                <option value={12}>1 year</option>
                <option value={24}>2 years</option>
              </select>
            </Field>
            <Field label="Amount">
              <input
                type="number"
                className="input-field"
                value={renewal.amount}
                onChange={(event) => updateRenewal({ amount: Number(event.target.value) })}
              />
            </Field>
            <Field label="Payment mode">
              <select
                className="input-field"
                value={renewal.mode}
                onChange={(event) => updateRenewal({ mode: event.target.value as Payment["mode"] })}
              >
                {["Cash", "UPI", "Card", "Bank"].map((mode) => (
                  <option key={mode}>{mode}</option>
                ))}
              </select>
            </Field>
          </div>
          <DialogFooter>
            <button
              className="btn-primary"
              onClick={() => {
                if (renewal.amount <= 0) return toast.error("Enter a valid payment amount");
                renewMember(member.id, renewal.plan, renewal.months, renewal.amount, renewal.mode);
                setRenewOpen(false);
                toast.success("Membership renewed");
              }}
            >
              Confirm renewal
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function History({ dates }: { dates: string[] }) {
  if (!dates.length) return <Empty text="No check-ins yet" />;
  return dates.slice(0, 10).map((date, index) => (
    <div
      key={`${date}-${index}`}
      className="flex justify-between border-b border-border/50 py-2 text-sm last:border-0"
    >
      <span>{dmy(date)}</span>
      <span className="text-muted-foreground">
        {new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  ));
}

function Empty({ text }: { text: string }) {
  return <div className="p-4 text-center text-sm text-muted-foreground">{text}</div>;
}
