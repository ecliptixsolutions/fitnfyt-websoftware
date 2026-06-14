import { createFileRoute } from "@tanstack/react-router";
import { LogIn, LogOut, Save, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import { colorFromName, dmy, initials, inr } from "@/lib/format";
import { useApp, type Staff } from "@/store/app";

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
  const attendance = useApp((state) => state.attendance ?? []);
  const updateStaff = useApp((state) => state.updateStaff);
  const punchIn = useApp((state) => state.punchIn);
  const punchOut = useApp((state) => state.punchOut);
  const person = staff.find((item) => item.id === id);
  const [edit, setEdit] = useState(false);
  if (!person)
    return (
      <AppShell title="Staff profile">
        <Card>Staff member not found</Card>
      </AppShell>
    );
  const records = attendance
    .filter((record) => record.subjectType === "staff" && record.subjectId === person.id)
    .sort((a, b) => b.punchIn.localeCompare(a.punchIn));
  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = records.find((record) => record.date === today);
  return (
    <AppShell
      title="Staff profile"
      description={`${person.role} - joined ${dmy(person.joined)}`}
      actions={
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
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
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
