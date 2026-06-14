import { createFileRoute, Link } from "@tanstack/react-router";
import { IndianRupee, Plus, Search, Users } from "lucide-react";
import { useState } from "react";
import { AppShell, Card } from "@/components/layout/AppShell";
import { colorFromName, dmy, initials } from "@/lib/format";
import { useApp } from "@/store/app";

export const Route = createFileRoute("/staff/")({
  head: () => ({ meta: [{ title: "Staff - Fit & Fyt GymOS" }] }),
  component: StaffList,
});

function StaffList() {
  const staff = useApp((state) => state.staff);
  const attendance = useApp((state) => state.attendance ?? []);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("all");
  const today = new Date().toISOString().slice(0, 10);
  const list = staff
    .filter((person) => active === "all" || String(person.active) === active)
    .filter((person) =>
      `${person.name} ${person.phone} ${person.role}`.toLowerCase().includes(query.toLowerCase()),
    );
  return (
    <AppShell
      title="Staff"
      description="Profiles, shifts, attendance, assignments, permissions, and payroll."
      actions={
        <>
          <Link to="/staff/payroll" className="subtle-button">
            <IndianRupee className="h-4 w-4" />
            Payroll
          </Link>
          <Link to="/staff/add" className="btn-primary text-xs">
            <Plus className="h-4 w-4" />
            Add staff
          </Link>
        </>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="section-label">Total staff</div>
          <div className="mt-2 text-2xl font-black">{staff.length}</div>
        </Card>
        <Card>
          <div className="section-label">Active</div>
          <div className="mt-2 text-2xl font-black text-emerald-400">
            {staff.filter((person) => person.active).length}
          </div>
        </Card>
        <Card>
          <div className="section-label">Present today</div>
          <div className="mt-2 text-2xl font-black text-primary">
            {
              new Set(
                attendance
                  .filter((record) => record.subjectType === "staff" && record.date === today)
                  .map((record) => record.subjectId),
              ).size
            }
          </div>
        </Card>
      </div>
      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="input-field pl-9"
              placeholder="Search staff by name, phone, or role"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            aria-label="Staff status"
            className="input-field min-w-40"
            value={active}
            onChange={(event) => setActive(event.target.value)}
          >
            <option value="all">All staff</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </Card>
      <div className="grid gap-3 xl:grid-cols-2">
        {list.map((person) => {
          const present = attendance.some(
            (record) =>
              record.subjectType === "staff" &&
              record.subjectId === person.id &&
              record.date === today,
          );
          return (
            <Link
              key={person.id}
              to="/staff/$id"
              params={{ id: person.id }}
              className="card-surface flex items-center gap-3 p-4 hover:border-primary/50"
            >
              <div
                className={`grid h-11 w-11 place-items-center rounded-full text-xs font-bold text-white ${colorFromName(person.name)}`}
              >
                {initials(person.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{person.name}</div>
                <div className="text-xs text-muted-foreground">
                  {person.phone} - joined {dmy(person.joined)}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {person.shift ?? "Shift not set"} - {person.weeklyOff ?? "Weekly off not set"}
                </div>
              </div>
              <div className="text-right">
                <span className="status-badge status-active">{person.role}</span>
                <div
                  className={`mt-2 text-[10px] ${present ? "text-emerald-400" : "text-muted-foreground"}`}
                >
                  {present ? "Present today" : person.active ? "Active" : "Inactive"}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {!list.length && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Users className="mx-auto mb-2 h-5 w-5" />
          No matching staff.
        </Card>
      )}
    </AppShell>
  );
}
