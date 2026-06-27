import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Download,
  Filter,
  IdCard,
  IndianRupee,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell, Card, StatusBadge } from "@/components/layout/AppShell";
import { colorFromName, dmy, initials } from "@/lib/format";
import { deleteMemberFromSupabase, deleteStaffFromSupabase } from "@/lib/supabase-data";
import { useApp, type Status } from "@/store/app";

export const Route = createFileRoute("/members/")({
  head: () => ({ meta: [{ title: "Members - Fit & Fyt GymOS" }] }),
  component: MembersList,
});

const filters = ["all", "active", "expired", "expiring", "frozen"] as const;
const peopleViews = ["members", "staff"] as const;

function MembersList() {
  const members = useApp((s) => s.members);
  const staff = useApp((s) => s.staff);
  const attendance = useApp((s) => s.attendance ?? []);
  const importMembers = useApp((s) => s.importMembers);
  const deleteMember = useApp((s) => s.deleteMember);
  const deleteStaff = useApp((s) => s.deleteStaff);
  const [view, setView] = useState<(typeof peopleViews)[number]>("members");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [plan, setPlan] = useState("all");
  const [sort, setSort] = useState("newest");
  const [staffQuery, setStaffQuery] = useState("");
  const [staffActive, setStaffActive] = useState("all");
  const fileInput = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  const list = members
    .filter((member) => {
      if (filter !== "all" && member.status !== filter) return false;
      if (plan !== "all" && member.plan !== plan) return false;
      return `${member.name} ${member.phone} ${member.email ?? ""} ${member.id}`
        .toLowerCase()
        .includes(query.toLowerCase());
    })
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "expiry")
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  const plans = [...new Set(members.map((member) => member.plan))];
  const staffList = staff
    .filter((person) => staffActive === "all" || String(person.active) === staffActive)
    .filter((person) =>
      `${person.name} ${person.phone} ${person.role}`
        .toLowerCase()
        .includes(staffQuery.toLowerCase()),
    );

  const removeMember = async (memberId: string, memberName: string) => {
    if (
      !confirm(
        `Delete ${memberName}? This removes the member, payments, and attendance from this app.`,
      )
    )
      return;
    deleteMember(memberId);
    await deleteMemberFromSupabase(memberId);
    toast.success("Member deleted");
  };

  const removeStaff = async (staffId: string, staffName: string) => {
    if (
      !confirm(`Delete ${staffName}? This removes staff attendance and unassigns related records.`)
    )
      return;
    deleteStaff(staffId);
    await deleteStaffFromSupabase(staffId);
    toast.success("Staff deleted");
  };

  const exportCsv = () => {
    const headers = [
      "name",
      "phone",
      "email",
      "plan",
      "status",
      "startDate",
      "expiryDate",
      "amountPaid",
      "totalAmount",
    ];
    const rows = list.map((member) =>
      headers.map((header) => {
        const value = String(member[header as keyof typeof member] ?? "");
        return `"${value.replaceAll('"', '""')}"`;
      }),
    );
    const blob = new Blob([[headers.join(","), ...rows.map((row) => row.join(","))].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fitfyt-members-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${list.length} members exported`);
  };

  const importCsv = async (file?: File) => {
    if (!file) return;
    const rows = parseCsv(await file.text());
    const validStatuses: Status[] = ["active", "expired", "expiring", "frozen"];
    const imported = rows
      .filter((row) => row.name && row.phone)
      .map((row) => ({
        name: row.name,
        phone: row.phone,
        email: row.email,
        plan: row.plan || "Basic",
        status: validStatuses.includes(row.status as Status) ? (row.status as Status) : "active",
        startDate: safeIso(row.startDate, new Date()),
        expiryDate: safeIso(row.expiryDate, new Date(Date.now() + 365 * 86400000)),
        amountPaid: Number(row.amountPaid) || 0,
        totalAmount: Number(row.totalAmount) || Number(row.amountPaid) || 0,
      }));
    if (!imported.length) {
      toast.error("No valid rows found. CSV must include name and phone.");
      return;
    }
    importMembers(imported);
    toast.success(`${imported.length} members imported`);
    if (fileInput.current) fileInput.current.value = "";
  };

  const actions =
    view === "members" ? (
      <>
        <button onClick={() => fileInput.current?.click()} className="subtle-button">
          <Upload className="h-4 w-4" />
          Import CSV
        </button>
        <button onClick={exportCsv} className="subtle-button">
          <Download className="h-4 w-4" />
          Export
        </button>
        <Link to="/members/add" className="btn-primary text-xs">
          <Plus className="h-4 w-4" />
          Add member
        </Link>
      </>
    ) : (
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
    );

  return (
    <AppShell
      title="Members"
      description={`${members.length} members and ${staff.length} staff profiles.`}
      actions={actions}
    >
      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => void importCsv(event.target.files?.[0])}
      />
      <Card className="mb-5 !p-2">
        <div className="grid gap-2 sm:grid-cols-2">
          {peopleViews.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={`rounded-md px-4 py-3 text-sm font-bold capitalize transition ${
                view === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {value === "members" ? `Members (${members.length})` : `Staff (${staff.length})`}
            </button>
          ))}
        </div>
      </Card>

      {view === "staff" ? (
        <StaffPanel
          attendance={attendance}
          list={staffList}
          query={staffQuery}
          setQuery={setStaffQuery}
          active={staffActive}
          setActive={setStaffActive}
          staffCount={staff.length}
          staffActiveCount={staff.filter((person) => person.active).length}
          today={today}
          removeStaff={removeStaff}
        />
      ) : (
        <>
          <Card className="mb-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="input-field pl-9"
                  placeholder="Search by name, ID, phone..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="scrollbar-hide flex gap-1 overflow-x-auto rounded-md bg-input p-1">
                {filters.map((value) => {
                  const count =
                    value === "all"
                      ? members.length
                      : members.filter((member) => member.status === value).length;
                  return (
                    <button
                      key={value}
                      onClick={() => setFilter(value)}
                      className={`whitespace-nowrap rounded px-3 py-2 text-xs capitalize ${
                        filter === value
                          ? "bg-primary font-bold text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {value === "expiring" ? "Expiring" : value} ({count})
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowAdvanced((value) => !value)}
                className={`icon-button shrink-0 ${showAdvanced || plan !== "all" ? "border-primary text-primary" : ""}`}
                aria-label="Advanced filters"
              >
                {showAdvanced ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
              </button>
            </div>
            {showAdvanced && (
              <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_1fr_auto]">
                <label className="text-xs text-muted-foreground">
                  Plan
                  <select
                    className="input-field mt-1"
                    value={plan}
                    onChange={(event) => setPlan(event.target.value)}
                  >
                    <option value="all">All plans</option>
                    {plans.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-muted-foreground">
                  Sort by
                  <select
                    className="input-field mt-1"
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                  >
                    <option value="newest">Newest joined</option>
                    <option value="name">Name A-Z</option>
                    <option value="expiry">Expiry date</option>
                  </select>
                </label>
                <button
                  onClick={() => {
                    setPlan("all");
                    setSort("newest");
                    setFilter("all");
                    setQuery("");
                  }}
                  className="subtle-button self-end"
                >
                  Clear filters
                </button>
              </div>
            )}
          </Card>

          <Card className="hidden !p-0 overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Contact</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <Link
                          to="/members/$id"
                          params={{ id: member.id }}
                          className="flex items-center gap-3"
                        >
                          <div
                            className={`grid h-9 w-9 place-items-center rounded-full text-[10px] font-bold text-white ${colorFromName(member.name)}`}
                          >
                            {initials(member.name)}
                          </div>
                          <div>
                            <div className="font-semibold">{member.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {member.id.toUpperCase()}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <div>{member.phone}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {member.email || "No email added"}
                        </div>
                      </td>
                      <td>{member.plan}</td>
                      <td>
                        <StatusBadge status={member.status} />
                      </td>
                      <td className="text-muted-foreground">{dmy(member.startDate)}</td>
                      <td className="text-muted-foreground">{dmy(member.expiryDate)}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to="/members/$id"
                            params={{ id: member.id }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold hover:text-primary"
                          >
                            <IdCard className="h-4 w-4" />
                            Profile
                          </Link>
                          <button
                            type="button"
                            onClick={() => void removeMember(member.id, member.name)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.length === 0 && (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No members match this search.
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-3 md:hidden">
            {list.map((member) => (
              <Link
                key={member.id}
                to="/members/$id"
                params={{ id: member.id }}
                className="card-surface flex items-center gap-3 p-4"
              >
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${colorFromName(member.name)}`}
                >
                  {initials(member.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{member.name}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {member.id.toUpperCase()} · {member.plan}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{member.phone}</div>
                </div>
                <div className="text-right">
                  <StatusBadge status={member.status} />
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    {dmy(member.expiryDate)}
                  </div>
                </div>
              </Link>
            ))}
            {list.length === 0 && (
              <div className="card-surface p-8 text-center text-sm text-muted-foreground">
                No members match this search.
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}

function StaffPanel({
  attendance,
  list,
  query,
  setQuery,
  active,
  setActive,
  staffCount,
  staffActiveCount,
  today,
  removeStaff,
}: {
  attendance: ReturnType<typeof useApp.getState>["attendance"];
  list: ReturnType<typeof useApp.getState>["staff"];
  query: string;
  setQuery: (value: string) => void;
  active: string;
  setActive: (value: string) => void;
  staffCount: number;
  staffActiveCount: number;
  today: string;
  removeStaff: (staffId: string, staffName: string) => Promise<void>;
}) {
  const presentToday = new Set(
    attendance
      .filter((record) => record.subjectType === "staff" && record.date === today)
      .map((record) => record.subjectId),
  ).size;

  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="section-label">Total staff</div>
          <div className="mt-2 text-2xl font-black">{staffCount}</div>
        </Card>
        <Card>
          <div className="section-label">Active</div>
          <div className="mt-2 text-2xl font-black text-emerald-400">{staffActiveCount}</div>
        </Card>
        <Card>
          <div className="section-label">Present today</div>
          <div className="mt-2 text-2xl font-black text-primary">{presentToday}</div>
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
            <div
              key={person.id}
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
                  className={`mt-2 text-[10px] ${
                    present ? "text-emerald-400" : "text-muted-foreground"
                  }`}
                >
                  {present ? "Present today" : person.active ? "Active" : "Inactive"}
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Link
                    to="/staff/$id"
                    params={{ id: person.id }}
                    className="text-xs font-semibold hover:text-primary"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => void removeStaff(person.id, person.name)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!list.length && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Users className="mx-auto mb-2 h-5 w-5" />
          No matching staff.
        </Card>
      )}
    </>
  );
}

function parseCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  if (lines.length < 2) return [];
  const parseLine = (line: string) => {
    const values: string[] = [];
    let value = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"' && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === "," && !quoted) {
        values.push(value.trim());
        value = "";
      } else {
        value += character;
      }
    }
    values.push(value.trim());
    return values;
  };
  const headers = parseLine(lines[0]);
  return lines
    .slice(1)
    .map((line) =>
      Object.fromEntries(headers.map((header, index) => [header, parseLine(line)[index] ?? ""])),
    ) as Record<string, string>[];
}

function safeIso(value: string | undefined, fallback: Date) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}
