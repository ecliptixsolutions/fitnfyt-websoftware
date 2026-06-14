import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet, Search } from "lucide-react";
import { useState } from "react";
import { AppShell, Card } from "@/components/layout/AppShell";
import { downloadCsv, downloadExcel } from "@/lib/export";
import { colorFromName, dmy, initials, inr } from "@/lib/format";
import { useApp } from "@/store/app";

export const Route = createFileRoute("/finance/payments")({
  head: () => ({ meta: [{ title: "Transactions - Fit & Fyt GymOS" }] }),
  component: Payments,
});

function Payments() {
  const payments = useApp((state) => state.payments);
  const members = useApp((state) => state.members);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [mode, setMode] = useState("all");
  const list = payments
    .filter((payment) => status === "all" || payment.status === status)
    .filter((payment) => mode === "all" || payment.mode === mode)
    .filter((payment) => {
      const member = members.find((item) => item.id === payment.memberId);
      return `${member?.name ?? ""} ${payment.plan} ${payment.reference ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase());
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const rows = list.map((payment) => [
    payment.date.slice(0, 10),
    members.find((item) => item.id === payment.memberId)?.name ?? "Unknown",
    payment.type ?? "payment",
    payment.plan,
    payment.mode,
    payment.status,
    payment.amount,
    payment.reference ?? "",
  ]);
  const headers = ["Date", "Member", "Type", "Plan", "Mode", "Status", "Amount", "Reference"];
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
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Date</th>
                <th>Type</th>
                <th>Plan</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {list.map((payment) => {
                const member = members.find((item) => item.id === payment.memberId);
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
                    <td>{payment.plan}</td>
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
