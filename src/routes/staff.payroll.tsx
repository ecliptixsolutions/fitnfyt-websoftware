import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import { downloadCsv, downloadExcel } from "@/lib/export";
import { dmy, inr } from "@/lib/format";
import { getTrainerCommissionEntries, monthKey, useApp, type Payment } from "@/store/app";

export const Route = createFileRoute("/staff/payroll")({
  head: () => ({ meta: [{ title: "Payroll - Fit & Fyt GymOS" }] }),
  component: Payroll,
});

function Payroll() {
  const staff = useApp((state) => state.staff);
  const members = useApp((state) => state.members);
  const payments = useApp((state) => state.payments);
  const payroll = useApp((state) => state.payroll ?? []);
  const recordPayroll = useApp((state) => state.recordPayroll);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [mode, setMode] = useState<Payment["mode"]>("Bank");
  const [adjustments, setAdjustments] = useState<
    Record<string, { bonus: number; deduction: number }>
  >({});
  const commissions = getTrainerCommissionEntries(payments, members, staff, payroll);
  const monthCommissions = commissions.filter((entry) => monthKey(entry.paymentDate) === month);
  const rows = staff.map((person) => {
    const record = payroll.find((item) => item.staffId === person.id && item.month === month);
    const staffCommissions = monthCommissions.filter((entry) => entry.staffId === person.id);
    const commissionTotal = staffCommissions.reduce(
      (sum, entry) => sum + (entry.payoutStatus === "Refunded" ? 0 : entry.commissionAmount),
      0,
    );
    return [
      person.name,
      person.role,
      month,
      person.salary,
      record?.bonus ?? 0,
      record?.deduction ?? 0,
      commissionTotal,
      record
        ? person.salary + record.bonus - record.deduction + commissionTotal
        : person.salary + commissionTotal,
      record?.paidAt ? dmy(record.paidAt) : "Pending",
    ];
  });
  const headers = [
    "Staff",
    "Role",
    "Month",
    "Base Salary",
    "Bonus",
    "Deduction",
    "PT Commission",
    "Net",
    "Paid",
  ];
  const commissionHeaders = [
    "Trainer",
    "Member",
    "Package",
    "Payment Date",
    "PT Amount",
    "Refunded",
    "Commission %",
    "Commission",
    "Status",
  ];
  const commissionRows = monthCommissions.map((entry) => [
    entry.staffName,
    entry.memberName,
    entry.packageName,
    entry.paymentDate.slice(0, 10),
    entry.totalAmount,
    entry.refundedAmount,
    `${entry.commissionPercent}%`,
    entry.commissionAmount,
    entry.payoutStatus,
  ]);
  return (
    <AppShell
      title="Payroll"
      description="Monthly salary payment history."
      actions={
        <>
          <button
            onClick={() => downloadCsv(`fitfyt-payroll-${month}`, headers, rows)}
            className="subtle-button"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={() => downloadExcel(`fitfyt-payroll-${month}`, headers, rows)}
            className="subtle-button"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
          <button
            onClick={() =>
              downloadCsv(`fitfyt-pt-commissions-${month}`, commissionHeaders, commissionRows)
            }
            className="subtle-button"
          >
            PT CSV
          </button>
        </>
      }
    >
      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">
            Payroll month
            <input
              type="month"
              className="input-field mt-1"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Payment mode
            <select
              className="input-field mt-1"
              value={mode}
              onChange={(event) => setMode(event.target.value as Payment["mode"])}
            >
              {["Cash", "UPI", "Card", "Bank"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Card className="!p-4">
          <div className="section-label">PT Sales</div>
          <div className="mt-2 text-2xl font-black">
            {inr(monthCommissions.reduce((sum, entry) => sum + entry.netAmount, 0))}
          </div>
        </Card>
        <Card className="!p-4">
          <div className="section-label">Trainer Commission</div>
          <div className="mt-2 text-2xl font-black text-primary">
            {inr(
              monthCommissions.reduce(
                (sum, entry) =>
                  sum + (entry.payoutStatus === "Refunded" ? 0 : entry.commissionAmount),
                0,
              ),
            )}
          </div>
        </Card>
        <Card className="!p-4">
          <div className="section-label">Pending Commission</div>
          <div className="mt-2 text-2xl font-black text-amber-400">
            {inr(
              monthCommissions
                .filter((entry) => entry.payoutStatus === "Pending")
                .reduce((sum, entry) => sum + entry.commissionAmount, 0),
            )}
          </div>
        </Card>
        <Card className="!p-4">
          <div className="section-label">Paid Commission</div>
          <div className="mt-2 text-2xl font-black text-emerald-400">
            {inr(
              monthCommissions
                .filter((entry) => entry.payoutStatus === "Paid")
                .reduce((sum, entry) => sum + entry.commissionAmount, 0),
            )}
          </div>
        </Card>
      </div>
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Role</th>
                <th>Salary</th>
                <th>PT Commission</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((person) => {
                const record = payroll.find(
                  (item) => item.staffId === person.id && item.month === month,
                );
                const adjustment = adjustments[person.id] ?? { bonus: 0, deduction: 0 };
                const staffCommissions = monthCommissions.filter(
                  (entry) => entry.staffId === person.id && entry.payoutStatus !== "Refunded",
                );
                const commissionTotal = staffCommissions.reduce(
                  (sum, entry) => sum + entry.commissionAmount,
                  0,
                );
                const payableCommission = commissionTotal;
                return (
                  <tr key={person.id}>
                    <td className="font-semibold">{person.name}</td>
                    <td>{person.role}</td>
                    <td>
                      <div className="font-semibold">
                        {inr(
                          person.salary +
                            (record?.bonus ?? adjustment.bonus) -
                            (record?.deduction ?? adjustment.deduction) +
                            payableCommission,
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Base {inr(person.salary)}
                      </div>
                      {!record?.paidAt && (
                        <div className="mt-2 flex gap-2">
                          <input
                            aria-label={`${person.name} bonus`}
                            type="number"
                            className="input-field max-w-28 !p-1.5 text-[10px]"
                            placeholder="Bonus"
                            value={adjustment.bonus || ""}
                            onChange={(event) =>
                              setAdjustments({
                                ...adjustments,
                                [person.id]: { ...adjustment, bonus: Number(event.target.value) },
                              })
                            }
                          />
                          <input
                            aria-label={`${person.name} deduction`}
                            type="number"
                            className="input-field max-w-28 !p-1.5 text-[10px]"
                            placeholder="Deduction"
                            value={adjustment.deduction || ""}
                            onChange={(event) =>
                              setAdjustments({
                                ...adjustments,
                                [person.id]: {
                                  ...adjustment,
                                  deduction: Number(event.target.value),
                                },
                              })
                            }
                          />
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="font-semibold text-primary">{inr(payableCommission)}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {staffCommissions.length} PT sale
                        {staffCommissions.length === 1 ? "" : "s"}
                      </div>
                    </td>
                    <td>
                      {record?.paidAt ? (
                        <span className="status-badge status-active">
                          Paid {dmy(record.paidAt)}
                        </span>
                      ) : (
                        <span className="status-badge status-expiring">Pending</span>
                      )}
                    </td>
                    <td>
                      <button
                        disabled={Boolean(record?.paidAt)}
                        onClick={() => {
                          recordPayroll({
                            staffId: person.id,
                            month,
                            baseSalary: person.salary,
                            bonus: adjustment.bonus,
                            deduction: adjustment.deduction,
                            commissionTotal,
                            paidCommissionIds: staffCommissions.map((entry) => entry.id),
                            paidAt: new Date().toISOString(),
                            mode,
                          });
                          toast.success(`${person.name}'s salary marked paid`);
                        }}
                        className={
                          record?.paidAt ? "subtle-button opacity-50" : "btn-primary text-xs"
                        }
                      >
                        {record?.paidAt ? "Paid" : "Mark paid"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="mt-5 !p-0 overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="text-sm font-bold">Personal Training commission ledger</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Commission is calculated from paid PT transactions after refunds.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Trainer</th>
                <th>Member</th>
                <th>Package</th>
                <th>PT Amount</th>
                <th>Commission</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {monthCommissions.map((entry) => (
                <tr key={entry.id}>
                  <td className="font-semibold">{entry.staffName}</td>
                  <td>{entry.memberName}</td>
                  <td>
                    <div>{entry.packageName}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {dmy(entry.paymentDate)}
                      {entry.refundedAmount > 0 ? ` - refunded ${inr(entry.refundedAmount)}` : ""}
                    </div>
                  </td>
                  <td>{inr(entry.totalAmount)}</td>
                  <td className="font-bold text-primary">
                    {entry.commissionPercent}% - {inr(entry.commissionAmount)}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        entry.payoutStatus === "Paid"
                          ? "status-active"
                          : entry.payoutStatus === "Refunded"
                            ? "status-inactive"
                            : "status-expiring"
                      }`}
                    >
                      {entry.payoutStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!monthCommissions.length && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No Personal Training commission entries for this month.
            </div>
          )}
        </div>
      </Card>
    </AppShell>
  );
}
