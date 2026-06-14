import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, IndianRupee, Sparkles } from "lucide-react";
import { AppShell, Card } from "@/components/layout/AppShell";
import { dmy, inr } from "@/lib/format";
import { useApp } from "@/store/app";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications - Fit & Fyt GymOS" }] }),
  component: Notifications,
});

function Notifications() {
  const members = useApp((state) => state.members);
  const payments = useApp((state) => state.payments);
  const leads = useApp((state) => state.leads);
  const today = new Date().toDateString();
  const items = [
    ...members.flatMap((member) =>
      member.checkIns
        .filter((checkIn) => new Date(checkIn).toDateString() === today)
        .map((checkIn) => ({
          key: `${member.id}-${checkIn}`,
          icon: CheckCircle2,
          color: "text-emerald-400 bg-emerald-500/15",
          title: `${member.name} checked in`,
          body: new Date(checkIn).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          date: checkIn,
          to: "/attendance",
        })),
    ),
    ...payments.map((payment) => ({
      key: payment.id,
      icon: payment.status === "Paid" ? IndianRupee : AlertTriangle,
      color:
        payment.status === "Paid" ? "text-primary bg-primary/15" : "text-amber-400 bg-amber-500/15",
      title: payment.status === "Paid" ? "Payment received" : "Payment pending",
      body: `${inr(payment.amount)} - ${members.find((member) => member.id === payment.memberId)?.name ?? "Member"}`,
      date: payment.date,
      to: payment.status === "Paid" ? "/finance" : "/finance/dues",
    })),
    ...leads
      .filter((lead) => lead.status === "New")
      .map((lead) => ({
        key: lead.id,
        icon: Sparkles,
        color: "text-sky-400 bg-sky-500/15",
        title: `New lead: ${lead.name}`,
        body: lead.enquiry,
        date: lead.followUp,
        to: "/leads",
      })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <AppShell title="Notifications" description={`${items.length} live updates from your gym.`}>
      <Card className="!p-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              to={item.to as never}
              className="flex gap-3 border-b border-border/50 p-3 last:border-0 hover:bg-secondary/40"
            >
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${item.color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.body}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{dmy(item.date)}</div>
              </div>
            </Link>
          );
        })}
        {items.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">No notifications yet.</div>
        )}
      </Card>
    </AppShell>
  );
}
