import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogIn, LogOut, Save, Trash2, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import { colorFromName, dmy, initials, inr } from "@/lib/format";
import { deleteStaffFromSupabase } from "@/lib/supabase-data";
import { getTrainerCommissionEntries, useApp, type Staff } from "@/store/app";

export const Route = createFileRoute("/staff/$id")({
  head: () => ({ meta: [{ title: "Staff Profile - Fit & Fyt GymOS" }] }),
  component: StaffDetail,
});
const permissionOptions = [
  "View Members",
  "Add Members",
  "Edit Members",
  "View Finance",
  "Record Payments",
  "Mark Attendance",
  "View Reports",
  "Manage Leads",
];

function StaffDetail() {
  const { id } = Route.useParams();
  const staff = useApp((state) => state.staff);
  const members = useApp((state) => state.members);
  const leads = useApp((state) => state.leads);
  const payments = useApp((state) => state.payments);
  const payroll = useApp((state) => state.payroll ?? []);
  const attendance = useApp((state) => state.attendance ?? []);
  const updateStaff = useApp((state) => state.updateStaff);
  const deleteStaff = useApp((state) => state.deleteStaff);
  const punchIn = useApp((state) => state.punchIn);
  const punchOut = useApp((state) => state.punchOut);
  const navigate = useNavigate();
  const person = staff.find((item) => item.id === id);
  const [edit, setEdit] = useState(false);
  if (!person)
    return (
      <AppShell title="Staff profile">
        <Card>Staff member not found</Card>
      </AppShell>
    );

  const removeStaff = async () => {
    if (
      !confirm(
        `Delete ${person.name}? This removes staff attendance and unassigns related records.`,
      )
    )
      return;
    deleteStaff(person.id);
    await deleteStaffFromSupabase(person.id);
    toast.success("Staff deleted");
    navigate({ to: "/staff" });
  };

  const records = attendance
    .filter((record) => record.subjectType === "staff" && record.subjectId === person.id)
    .sort((a, b) => b.punchIn.localeCompare(a.punchIn));
  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = records.find((record) => record.date === today);
  const commissions = getTrainerCommissionEntries(payments, members, staff, payroll).filter(
    (entry) => entry.staffId === person.id,
  );
  const pendingCommission = commissions
    .filter((entry) => entry.payoutStatus === "Pending")
    .reduce((sum, entry) => sum + entry.commissionAmount, 0);
  const paidCommission = commissions
    .filter((entry) => entry.payoutStatus === "Paid")
    .reduce((sum, entry) => sum + entry.commissionAmount, 0);
  return (
    <AppShell
      title="Staff profile"
      description={`${person.role} - joined ${dmy(person.joined)}`}
      actions={
        <>
          <button
            onClick={() => {
              updateStaff(person.id, { active: !person.active });
              toast.success(person.active ? "Staff deactivated" : "Staff activated");
            }}
            className="subtle-button"
          >
            <UserCheck className="h-4 w-4" />
            {person.active ? "Deactivate" : "Activate"}
          </button>
          <button onClick={() => void removeStaff()} className="subtle-button text-destructive">
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </>
      }
    >
      <div className="mb-5 flex flex-col items-center text-center">
        <div
          className={`grid h-20 w-20 place-items-center rounded-full text-xl font-black text-white ${colorFromName(person.name)}`}
        >
          {initials(person.name)}
        </div>
        <h2 className="mt-3 text-xl font-bold">{person.name}</h2>
        <div className="text-xs text-muted-foreground">{person.phone}</div>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Card>
          <div className="section-label">Salary</div>
          <div className="mt-2 font-bold">{inr(person.salary)}</div>
        </Card>
        <Card>
          <div className="section-label">Shift</div>
          <div className="mt-2 font-bold">{person.shift ?? "Not set"}</div>
        </Card>
        <Card>
          <div className="section-label">Weekly off</div>
          <div className="mt-2 font-bold">{person.weeklyOff ?? "Not set"}</div>
        </Card>
        <Card>
          <div className="section-label">Assigned leads</div>
          <div className="mt-2 font-bold">
            {leads.filter((lead) => lead.assignedStaffId === person.id).length}
          </div>
        </Card>
        <Card>
          <div className="section-label">Pending PT</div>
          <div className="mt-2 font-bold text-primary">{inr(pendingCommission)}</div>
        </Card>
        <Card>
          <div className="section-label">Paid PT</div>
          <div className="mt-2 font-bold text-emerald-400">{inr(paidCommission)}</div>
        </Card>
      </div>
      <Card className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">Staff attendance</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Manual punches until hardware is configured.
            </p>
          </div>
          {!todayRecord ? (
            <button
              onClick={() => {
                punchIn(person.id, "staff");
                toast.success("Staff punched in");
              }}
              className="btn-primary text-xs"
            >
              <LogIn className="h-4 w-4" />
              Punch in
            </button>
          ) : !todayRecord.punchOut ? (
            <button
              onClick={() => {
                punchOut(todayRecord.id);
                toast.success("Staff punched out");
              }}
              className="subtle-button"
            >
              <LogOut className="h-4 w-4" />
              Punch out
            </button>
          ) : (
            <span className="status-badge status-active">Completed today</span>
          )}
        </div>
        <div className="mt-4">
          {records.slice(0, 7).map((record) => (
            <div
              key={record.id}
              className="flex justify-between border-t border-border py-2 text-xs"
            >
              <span>{dmy(record.date)}</span>
              <span>
                {new Date(record.punchIn).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                -{" "}
                {record.punchOut
                  ? new Date(record.punchOut).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Still in"}
              </span>
            </div>
          ))}
          {!records.length && (
            <div className="pt-4 text-xs text-muted-foreground">No attendance records yet.</div>
          )}
        </div>
      </Card>
      {person.role === "Trainer" && (
        <Card className="mb-5 !p-0 overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="text-sm font-bold">Personal Training commission</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Auto-calculated from PT payments assigned to this trainer.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Package</th>
                  <th>Amount</th>
                  <th>Commission</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.memberName}</td>
                    <td>
                      <div>{entry.packageName}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {dmy(entry.paymentDate)}
                      </div>
                    </td>
                    <td>{inr(entry.netAmount)}</td>
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
            {!commissions.length && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No PT commission assigned yet.
              </div>
            )}
          </div>
        </Card>
      )}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold">Profile and assignments</h2>
          <button onClick={() => setEdit((value) => !value)} className="subtle-button">
            {edit ? "Cancel" : "Edit"}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted-foreground">
            Role
            <select
              disabled={!edit}
              className="input-field mt-1"
              value={person.role}
              onChange={(event) =>
                updateStaff(person.id, { role: event.target.value as Staff["role"] })
              }
            >
              {["Trainer", "Receptionist", "Manager"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Shift
            <input
              disabled={!edit}
              className="input-field mt-1"
              value={person.shift ?? ""}
              onChange={(event) => updateStaff(person.id, { shift: event.target.value })}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Weekly off
            <select
              disabled={!edit}
              className="input-field mt-1"
              value={person.weeklyOff ?? ""}
              onChange={(event) => updateStaff(person.id, { weeklyOff: event.target.value })}
            >
              <option value="">Not set</option>
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
        </div>
        {edit && (
          <>
            <div className="mt-4 section-label">Permissions</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {permissionOptions.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center gap-2 rounded-md border border-border p-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={(person.permissions ?? []).includes(permission)}
                    onChange={(event) =>
                      updateStaff(person.id, {
                        permissions: event.target.checked
                          ? [...(person.permissions ?? []), permission]
                          : (person.permissions ?? []).filter((item) => item !== permission),
                      })
                    }
                    className="accent-primary"
                  />
                  {permission}
                </label>
              ))}
            </div>
            <div className="mt-4 section-label">Assigned members</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-2 rounded-md border border-border p-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={(person.assignedMemberIds ?? []).includes(member.id)}
                    onChange={(event) =>
                      updateStaff(person.id, {
                        assignedMemberIds: event.target.checked
                          ? [...(person.assignedMemberIds ?? []), member.id]
                          : (person.assignedMemberIds ?? []).filter(
                              (memberId) => memberId !== member.id,
                            ),
                      })
                    }
                    className="accent-primary"
                  />
                  {member.name}
                </label>
              ))}
            </div>
            <button
              onClick={() => {
                setEdit(false);
                toast.success("Staff profile saved");
              }}
              className="btn-primary mt-4 text-xs"
            >
              <Save className="h-4 w-4" />
              Save profile
            </button>
          </>
        )}
      </Card>
    </AppShell>
  );
}
