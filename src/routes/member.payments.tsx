import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/layout/AppShell";
import { useApp } from "@/store/app";
import { dmy, inr } from "@/lib/format";
import { Download } from "lucide-react";

export const Route = createFileRoute("/member/payments")({
  head: () => ({ meta: [{ title: "My Payments — Fit Force Gym" }] }),
  component: MyPayments,
});

function MyPayments() {
  const member = useApp((s) => s.members[0]);
  const allPayments = useApp((s) => s.payments);
  const payments = allPayments.filter((p) => p.memberId === member.id);
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">My Payments</h1>
      <Card className="!p-2">
        {payments.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between p-3 border-b last:border-0 border-border/50"
          >
            <div>
              <div className="font-semibold text-sm">{inr(p.amount)}</div>
              <div className="text-xs text-muted-foreground">
                {p.plan} • {dmy(p.date)} • {p.mode}
              </div>
            </div>
            <button className="text-xs px-3 py-1.5 rounded-lg border border-border flex items-center gap-1">
              <Download className="w-3 h-3" />
              Receipt
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}
