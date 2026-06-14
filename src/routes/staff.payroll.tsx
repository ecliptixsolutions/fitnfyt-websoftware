import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import { downloadCsv, downloadExcel } from "@/lib/export";
import { dmy, inr } from "@/lib/format";
import { useApp, type Payment } from "@/store/app";

export const Route = createFileRoute("/staff/payroll")({
  head: () => ({ meta: [{ title: "Payroll - Fit & Fyt GymOS" }] }),
  component: Payroll,
});

function Payroll() {
  const staff = useApp((state) => state.staff);
  const payroll = useApp((state) => state.payroll ?? []);
  const recordPayroll = useApp((state) => state.recordPayroll);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [mode, setMode] = useState<Payment["mode"]>("Bank");
  const [adjustments, setAdjustments] = useState<
    Record<string, { bonus: number; deduction: number }>
  >({});
  const rows = staff.map((person) => {
    const record = payroll.find((item) => item.staffId === person.id && item.month === month);
    return [
      person.name,
      person.role,
      month,
      person.salary,
      record?.bonus ?? 0,
      record?.deduction ?? 0,
      record ? person.salary + record.bonus - record.deduction : person.salary,
      record?.paidAt ? dmy(record.paidAt) : "Pending",
    ];
  });
  const headers = ["Staff", "Role", "Month", "Base Salary", "Bonus", "Deduction", "Net", "Paid"];
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
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Role</th>
                <th>Salary</th>
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
                return (
                  <tr key={person.id}>
                    <td className="font-semibold">{person.name}</td>
                    <td>{person.role}</td>
                    <td>
                      <div className="font-semibold">
                        {inr(
                          person.salary +
                            (record?.bonus ?? adjustment.bonus) -
                            (record?.deduction ?? adjustment.deduction),
                        )}
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
    </AppShell>
  );
}
