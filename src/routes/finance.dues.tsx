import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import { colorFromName, dmy, initials, inr } from "@/lib/format";
import { useApp } from "@/store/app";

export const Route = createFileRoute("/finance/dues")({
  head: () => ({ meta: [{ title: "Pending Dues - Fit & Fyt GymOS" }] }),
  component: Dues,
});

function Dues() {
  const members = useApp((state) => state.members);
  const pendingPayments = useApp((state) => state.payments).filter(
    (payment) => payment.status === "Pending",
  );
  const addPayment = useApp((state) => state.addPayment);
  const updatePayment = useApp((state) => state.updatePayment);
  const dues = members
    .map((member) => ({ member, amount: Math.max(0, member.totalAmount - member.amountPaid) }))
    .filter((item) => item.amount > 0);
  return (
    <AppShell
      title="Pending dues"
      description={`${dues.length} members have an outstanding balance.`}
    >
      <Card className="!p-2">
        {dues.map(({ member, amount }) => {
          const pending = pendingPayments.find((payment) => payment.memberId === member.id);
          return (
            <div
              key={member.id}
              className="flex flex-wrap items-center gap-3 border-b border-border/50 p-3 last:border-0"
            >
              <div
                className={`grid h-10 w-10 place-items-center rounded-full text-xs font-bold text-white ${colorFromName(member.name)}`}
              >
                {initials(member.name)}
              </div>
              <div className="min-w-48 flex-1">
                <div className="text-sm font-semibold">{member.name}</div>
                <div className="text-xs text-muted-foreground">
                  {member.plan} - joined {dmy(member.startDate)}
                  {pending?.dueDate ? ` - due ${dmy(pending.dueDate)}` : ""}
                </div>
              </div>
              <div className="font-bold text-destructive">{inr(amount)}</div>
              <button
                onClick={() => toast.success(`Reminder prepared for ${member.name}`)}
                className="subtle-button"
              >
                <Bell className="h-4 w-4" />
                Remind
              </button>
              <button
                onClick={() => {
                  if (pending) {
                    updatePayment(pending.id, { status: "Paid", date: new Date().toISOString() });
                  } else {
                    addPayment({
                      memberId: member.id,
                      amount,
                      date: new Date().toISOString(),
                      mode: "UPI",
                      plan: member.plan,
                      status: "Paid",
                      type: "payment",
                      notes: "Due collected",
                    });
                  }
                  toast.success(`${member.name}'s due collected`);
                }}
                className="btn-primary text-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                Collect
              </button>
            </div>
          );
        })}
        {!dues.length && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            All member balances are fully paid.
          </div>
        )}
      </Card>
    </AppShell>
  );
}
