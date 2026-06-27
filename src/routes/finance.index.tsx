import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CreditCard,
  Download,
  FileSpreadsheet,
  List,
  ReceiptIndianRupee,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { AppShell, Card } from "@/components/layout/AppShell";
import { downloadCsv, downloadExcel } from "@/lib/export";
import { inr } from "@/lib/format";
import { getTrainerCommissionEntries, useApp } from "@/store/app";

export const Route = createFileRoute("/finance/")({
  head: () => ({ meta: [{ title: "Finance - Fit & Fyt GymOS" }] }),
  component: Finance,
});

type Period = "week" | "month" | "year" | "all";

function Finance() {
  const payments = useApp((state) => state.payments);
  const members = useApp((state) => state.members);
  const staff = useApp((state) => state.staff);
  const payroll = useApp((state) => state.payroll ?? []);
  const [period, setPeriod] = useState<Period>("month");
  const now = new Date();
  const filtered = payments.filter((payment) => inPeriod(payment.date, period, now));
  const paid = filtered.filter((payment) => payment.status === "Paid" && payment.type !== "refund");
  const refunds = filtered.filter((payment) => payment.type === "refund");
  const pending = payments.filter((payment) => payment.status === "Pending");
  const total = paid.reduce((sum, payment) => sum + payment.amount, 0);
  const refundTotal = refunds.reduce((sum, payment) => sum + payment.amount, 0);
  const pendingTotal = pending.reduce((sum, payment) => sum + payment.amount, 0);
  const commissionEntries = getTrainerCommissionEntries(payments, members, staff, payroll);
  const filteredCommissions = commissionEntries.filter((entry) =>
    inPeriod(entry.paymentDate, period, now),
  );
  const ptRevenue = paid
    .filter((payment) => payment.category === "Personal Training")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const ptCommission = filteredCommissions.reduce(
    (sum, entry) => sum + (entry.payoutStatus === "Refunded" ? 0 : entry.commissionAmount),
    0,
  );
  const newMembers = members.filter((member) => inPeriod(member.startDate, period, now)).length;
  const chart = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const value = payments
      .filter((payment) => {
        const paidAt = new Date(payment.date);
        return (
          payment.status === "Paid" &&
          payment.type !== "refund" &&
          paidAt.getMonth() === date.getMonth() &&
          paidAt.getFullYear() === date.getFullYear()
        );
      })
      .reduce((sum, payment) => sum + payment.amount, 0);
    return { month: date.toLocaleDateString("en-IN", { month: "short" }), value };
  });
  const rows = filtered.map((payment) => {
    const member = members.find((item) => item.id === payment.memberId);
    return [
      payment.date.slice(0, 10),
      member?.name ?? "Unknown",
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
    ];
  });
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
      title="Finance"
      description="Collections, dues, refunds, and transaction reporting."
      actions={
        <>
          <button
            onClick={() => downloadCsv("fitfyt-finance", headers, rows)}
            className="subtle-button"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={() => downloadExcel("fitfyt-finance", headers, rows)}
            className="subtle-button"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
          <Link to="/finance/record" className="btn-primary text-xs">
            <ReceiptIndianRupee className="h-4 w-4" />
            Record transaction
          </Link>
        </>
      }
    >
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-md bg-input p-1 sm:w-fit">
        {(["week", "month", "year", "all"] as Period[]).map((value) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={`rounded px-4 py-2 text-xs capitalize ${period === value ? "bg-primary font-bold text-white" : "text-muted-foreground"}`}
          >
            {value === "all" ? "All time" : `This ${value}`}
          </button>
        ))}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="section-label">Collected</div>
          <div className="mt-3 text-3xl font-black text-emerald-400">{inr(total)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{paid.length} paid transactions</div>
        </Card>
        <Card>
          <div className="section-label">Pending dues</div>
          <div className="mt-3 text-3xl font-black text-destructive">{inr(pendingTotal)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {pending.length} pending transactions
          </div>
        </Card>
        <Card>
          <div className="section-label">Refunds</div>
          <div className="mt-3 text-3xl font-black text-amber-400">{inr(refundTotal)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {refunds.length} refunds recorded
          </div>
        </Card>
        <Card>
          <div className="section-label">PT Commission</div>
          <div className="mt-3 text-3xl font-black text-primary">{inr(ptCommission)}</div>
          <div className="mt-1 text-xs text-muted-foreground">from {inr(ptRevenue)} PT revenue</div>
        </Card>
      </div>

      <Card className="mb-5">
        <div className="mb-3 text-sm font-semibold">Revenue - Last 6 months</div>
        <div className="h-56">
          <RevenueBars data={chart} />
        </div>
      </Card>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="!p-4 text-center">
          <div className="text-xl font-black">{newMembers}</div>
          <div className="mt-1 text-[10px] uppercase text-muted-foreground">New members</div>
        </Card>
        <Card className="!p-4 text-center">
          <div className="text-xl font-black">{paid.length}</div>
          <div className="mt-1 text-[10px] uppercase text-muted-foreground">Payments</div>
        </Card>
        <Card className="!p-4 text-center">
          <div className="text-xl font-black">
            {inr(paid.length ? Math.round(total / paid.length) : 0)}
          </div>
          <div className="mt-1 text-[10px] uppercase text-muted-foreground">Average payment</div>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link to="/finance/payments" className="card-surface flex items-center gap-3 p-4">
          <List className="h-5 w-5 text-primary" />
          <div>
            <div className="text-sm font-semibold">Payments</div>
            <div className="text-xs text-muted-foreground">Search transactions and receipts</div>
          </div>
        </Link>
        <Link to="/finance/record" className="card-surface flex items-center gap-3 p-4">
          <CreditCard className="h-5 w-5 text-amber-400" />
          <div>
            <div className="text-sm font-semibold">Record</div>
            <div className="text-xs text-muted-foreground">Payment, due, or refund</div>
          </div>
        </Link>
        <Link to="/finance/dues" className="card-surface flex items-center gap-3 p-4">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <div className="text-sm font-semibold">Dues</div>
            <div className="text-xs text-muted-foreground">Collect pending balances</div>
          </div>
        </Link>
      </div>
      {refunds.length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <RotateCcw className="h-4 w-4 text-amber-400" />
          Refunds are excluded from collected revenue.
        </div>
      )}
    </AppShell>
  );
}

function inPeriod(value: string, period: Period, now: Date) {
  if (period === "all") return true;
  const date = new Date(value);
  if (period === "year") return date.getFullYear() === now.getFullYear();
  if (period === "month")
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  return now.getTime() - date.getTime() <= 7 * 86400000 && date <= now;
}

function RevenueBars({ data }: { data: { month: string; value: number }[] }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="flex h-full items-end gap-3 pt-4">
      {data.map((item) => {
        const height = Math.max(12, Math.round((item.value / max) * 100));
        return (
          <div key={item.month} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <div
              className="rounded-t-md bg-primary transition-[height]"
              style={{ height: `${height}%` }}
              title={`${item.month}: ${inr(item.value)}`}
            />
            <div className="mt-2 text-center text-[11px] text-muted-foreground">{item.month}</div>
          </div>
        );
      })}
    </div>
  );
}
