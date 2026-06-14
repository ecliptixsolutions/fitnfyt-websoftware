import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, FileSpreadsheet, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card, StatusBadge } from "@/components/layout/AppShell";
import { downloadCsv, downloadExcel } from "@/lib/export";
import { colorFromName, dmy, initials, inr } from "@/lib/format";
import { useApp } from "@/store/app";

export const Route = createFileRoute("/branches/$id")({
  head: () => ({ meta: [{ title: "Branch Detail - Fit & Fyt GymOS" }] }),
  component: BranchDetail,
});

function BranchDetail() {
  const { id } = Route.useParams();
  const branches = useApp((state) => state.branches);
  const members = useApp((state) => state.members);
  const staff = useApp((state) => state.staff);
  const leads = useApp((state) => state.leads);
  const payments = useApp((state) => state.payments);
  const attendance = useApp((state) => state.attendance ?? []);
  const updateMember = useApp((state) => state.updateMember);
  const updateStaff = useApp((state) => state.updateStaff);
  const branch = branches.find((item) => item.id === id);

  if (!branch) {
    return (
      <AppShell title="Branch detail">
        <Card>Branch not found</Card>
      </AppShell>
    );
  }

  const branchMembers = members.filter((member) => (member.branchId ?? "b1") === branch.id);
  const branchStaff = staff.filter((person) => (person.branchId ?? "b1") === branch.id);
  const branchLeads = leads.filter((lead) => (lead.branchId ?? "b1") === branch.id);
  const branchPayments = payments.filter(
    (payment) =>
      (payment.branchId ?? "b1") === branch.id ||
      branchMembers.some((member) => member.id === payment.memberId),
  );
  const revenue = branchPayments
    .filter((payment) => payment.status === "Paid" && payment.type !== "refund")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const rows = [
    ...branchMembers.map((member) => [
      "Member",
      member.name,
      member.phone,
      member.plan,
      member.status,
    ]),
    ...branchStaff.map((person) => [
      "Staff",
      person.name,
      person.phone,
      person.role,
      person.active ? "Active" : "Inactive",
    ]),
    ...branchLeads.map((lead) => ["Lead", lead.name, lead.phone, lead.enquiry, lead.status]),
  ];
  const headers = ["Type", "Name", "Phone", "Category", "Status"];

  return (
    <AppShell
      title={branch.name}
      description={`${branch.city} - ${branch.address ?? "Address not set"}`}
      actions={
        <>
          <Link to="/branches" className="subtle-button">
            <ArrowLeft className="h-4 w-4" />
            Branches
          </Link>
          <button
            onClick={() => downloadCsv(`fitfyt-${branch.name}-report`, headers, rows)}
            className="subtle-button"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={() => downloadExcel(`fitfyt-${branch.name}-report`, headers, rows)}
            className="subtle-button"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
        </>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Metric label="Members" value={branchMembers.length || branch.members} />
        <Metric label="Staff" value={branchStaff.length} />
        <Metric label="Leads" value={branchLeads.length} />
        <Metric label="Revenue" value={inr(revenue || branch.revenue)} accent />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Card className="!p-0 overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="text-sm font-bold">Members</h2>
            <p className="mt-1 text-xs text-muted-foreground">Transfer members between branches</p>
          </div>
          <div>
            {branchMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3 text-xs"
              >
                <div
                  className={`grid h-8 w-8 place-items-center rounded-full text-[10px] font-bold text-white ${colorFromName(member.name)}`}
                >
                  {initials(member.name)}
                </div>
                <div className="min-w-40 flex-1">
                  <div className="font-semibold">{member.name}</div>
                  <div className="text-muted-foreground">{member.plan}</div>
                </div>
                <StatusBadge status={member.status} />
                <select
                  aria-label={`Transfer ${member.name}`}
                  className="input-field max-w-44 !py-2"
                  value={member.branchId ?? "b1"}
                  onChange={(event) => {
                    updateMember(member.id, { branchId: event.target.value });
                    toast.success(`${member.name} transferred`);
                  }}
                >
                  {branches.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {!branchMembers.length && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No members assigned.
              </div>
            )}
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="text-sm font-bold">Staff</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Managers, trainers, and access users
            </p>
          </div>
          <div>
            {branchStaff.map((person) => (
              <div
                key={person.id}
                className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3 text-xs"
              >
                <UserRoundCog className="h-4 w-4 text-primary" />
                <div className="min-w-40 flex-1">
                  <div className="font-semibold">{person.name}</div>
                  <div className="text-muted-foreground">{person.role}</div>
                </div>
                <span
                  className={`status-badge ${person.active ? "status-active" : "status-inactive"}`}
                >
                  {person.active ? "Active" : "Inactive"}
                </span>
                <select
                  aria-label={`Transfer ${person.name}`}
                  className="input-field max-w-44 !py-2"
                  value={person.branchId ?? "b1"}
                  onChange={(event) => {
                    updateStaff(person.id, { branchId: event.target.value });
                    toast.success(`${person.name} transferred`);
                  }}
                >
                  {branches.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {!branchStaff.length && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No staff assigned.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="text-sm font-bold">Recent branch activity</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Payments and attendance linked to this location
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Name</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {branchPayments.slice(0, 6).map((payment) => {
                const member = members.find((item) => item.id === payment.memberId);
                return (
                  <tr key={payment.id}>
                    <td>{dmy(payment.date)}</td>
                    <td>Payment</td>
                    <td>{member?.name ?? "Unknown"}</td>
                    <td>
                      {inr(payment.amount)} - {payment.status}
                    </td>
                  </tr>
                );
              })}
              {attendance
                .filter((record) => (record.branchId ?? "b1") === branch.id)
                .slice(0, 6)
                .map((record) => {
                  const member = members.find((item) => item.id === record.subjectId);
                  const person = staff.find((item) => item.id === record.subjectId);
                  return (
                    <tr key={record.id}>
                      <td>{dmy(record.date)}</td>
                      <td>Attendance</td>
                      <td>{member?.name ?? person?.name ?? "Unknown"}</td>
                      <td>{record.source} punch</td>
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

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <Card className="!p-4">
      <div className="section-label">{label}</div>
      <div className={`mt-2 text-2xl font-black ${accent ? "text-amber-400" : ""}`}>{value}</div>
    </Card>
  );
}
