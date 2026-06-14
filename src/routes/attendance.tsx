import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  Timer,
  Wifi,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import { downloadCsv, downloadExcel } from "@/lib/export";
import { colorFromName, dmy, initials } from "@/lib/format";
import { useApp, type AttendanceRecord } from "@/store/app";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance - Fit & Fyt GymOS" }] }),
  component: Attendance,
});

type Range = "day" | "week" | "month" | "year" | "custom";

function Attendance() {
  const members = useApp((state) => state.members);
  const records = useApp((state) => state.attendance ?? []);
  const punchIn = useApp((state) => state.punchIn);
  const punchOut = useApp((state) => state.punchOut);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<Range>("day");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [fromDate, setFromDate] = useState(selectedDate);
  const [toDate, setToDate] = useState(selectedDate);
  const [memberId, setMemberId] = useState("all");
  const bounds = getRangeBounds(range, selectedDate, fromDate, toDate);
  const filteredRecords = useMemo(
    () =>
      records
        .filter(
          (record) =>
            record.subjectType === "member" &&
            record.date >= bounds.from &&
            record.date <= bounds.to &&
            (memberId === "all" || record.subjectId === memberId),
        )
        .sort((a, b) => b.punchIn.localeCompare(a.punchIn)),
    [bounds.from, bounds.to, memberId, records],
  );
  const dayRecords = records.filter(
    (record) => record.subjectType === "member" && record.date === selectedDate,
  );
  const visibleMembers = members.filter((member) =>
    `${member.name} ${member.phone} ${member.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  const exportRows = filteredRecords.map((record) => {
    const member = members.find((item) => item.id === record.subjectId);
    return [
      record.date,
      member?.id.toUpperCase() ?? record.subjectId,
      member?.name ?? "Unknown",
      member?.plan ?? "",
      time(record.punchIn),
      record.punchOut ? time(record.punchOut) : "Missing",
      duration(record),
      record.source,
    ];
  });
  const exportHeaders = [
    "Date",
    "Member ID",
    "Member",
    "Plan",
    "Punch In",
    "Punch Out",
    "Duration",
    "Source",
  ];
  const exportName = `fitfyt-attendance-${bounds.from}-to-${bounds.to}`;

  return (
    <AppShell
      title="Attendance"
      description="Daily punch records from manual entry and biometric devices."
      actions={
        <>
          <button
            onClick={() => downloadCsv(exportName, exportHeaders, exportRows)}
            className="subtle-button"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={() => downloadExcel(exportName, exportHeaders, exportRows)}
            className="subtle-button"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
        </>
      }
    >
      <Card className="mb-5 flex items-center gap-3 !p-4">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/15">
          <Wifi className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Biometric device connection</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Ready to configure when hardware is connected
          </div>
        </div>
        <button onClick={() => toast.info("No hardware configured yet")} className="subtle-button">
          <RefreshCw className="h-3 w-3" />
          Sync
        </button>
      </Card>

      <Card className="mb-5">
        <div className="grid gap-3 lg:grid-cols-[auto_1fr_1fr_auto]">
          <div className="flex gap-1 overflow-x-auto rounded-md bg-input p-1">
            {(["day", "week", "month", "year", "custom"] as Range[]).map((value) => (
              <button
                key={value}
                onClick={() => setRange(value)}
                className={`rounded px-3 py-2 text-xs capitalize ${range === value ? "bg-primary font-bold text-white" : "text-muted-foreground"}`}
              >
                {value}
              </button>
            ))}
          </div>
          {range === "custom" ? (
            <>
              <input
                aria-label="From date"
                type="date"
                className="input-field"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
              <input
                aria-label="To date"
                type="date"
                className="input-field"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </>
          ) : (
            <input
              aria-label="Selected date"
              type="date"
              className="input-field lg:col-span-2"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          )}
          <select
            aria-label="Member export filter"
            className="input-field"
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
          >
            <option value="all">All members</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Showing records from {dmy(bounds.from)} to {dmy(bounds.to)}
        </div>
      </Card>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric icon={CheckCircle2} label="Present on selected day" value={dayRecords.length} />
        <Metric
          icon={LogOut}
          label="Still inside"
          value={dayRecords.filter((record) => !record.punchOut).length}
        />
        <Metric icon={Timer} label="Records in selected range" value={filteredRecords.length} />
      </div>

      <Card className="mb-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">Daily punch desk</h2>
            <p className="mt-1 text-xs text-muted-foreground">{dmy(selectedDate)}</p>
          </div>
          <CalendarDays className="h-4 w-4 text-primary" />
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="input-field pl-9"
            placeholder="Search member or scan ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div>
          {visibleMembers.map((member) => {
            const record = dayRecords.find((item) => item.subjectId === member.id);
            return (
              <div
                key={member.id}
                className="flex flex-wrap items-center gap-3 border-t border-border py-3 text-xs first:border-0"
              >
                <div
                  className={`grid h-9 w-9 place-items-center rounded-full text-[10px] font-bold text-white ${colorFromName(member.name)}`}
                >
                  {initials(member.name)}
                </div>
                <div className="min-w-40 flex-1">
                  <div className="text-sm font-semibold">{member.name}</div>
                  <div className="text-muted-foreground">{member.plan}</div>
                </div>
                <div className="min-w-28">
                  <span className="text-muted-foreground">In: </span>
                  {record ? time(record.punchIn) : "-"}
                </div>
                <div className="min-w-28">
                  <span className="text-muted-foreground">Out: </span>
                  {record?.punchOut ? time(record.punchOut) : "-"}
                </div>
                {!record ? (
                  <button
                    onClick={() => {
                      punchIn(member.id, "member", "Manual", dateTimeFor(selectedDate));
                      toast.success(`${member.name} punched in`);
                    }}
                    className="btn-primary min-w-28 text-xs"
                  >
                    <LogIn className="h-4 w-4" />
                    Punch in
                  </button>
                ) : !record.punchOut ? (
                  <button
                    onClick={() => {
                      punchOut(record.id, dateTimeFor(selectedDate));
                      toast.success(`${member.name} punched out`);
                    }}
                    className="subtle-button min-w-28"
                  >
                    <LogOut className="h-4 w-4" />
                    Punch out
                  </button>
                ) : (
                  <span className="status-badge status-active min-w-28 justify-center">
                    {duration(record)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="text-sm font-bold">Attendance records</h2>
          <p className="mt-1 text-xs text-muted-foreground">Export-ready punch history</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {exportHeaders.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exportRows.map((row, index) => (
                <tr key={`${row[0]}-${row[1]}-${index}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{String(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!exportRows.length && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No attendance records in this range.
          </div>
        )}
      </Card>
    </AppShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
}) {
  return (
    <Card className="flex items-center gap-3 !p-4">
      <Icon className="h-5 w-5 text-primary" />
      <div>
        <div className="text-xl font-black">{value}</div>
        <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

function time(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function duration(record: AttendanceRecord) {
  if (!record.punchOut) return "Missing punch-out";
  const minutes = Math.max(
    0,
    Math.round((new Date(record.punchOut).getTime() - new Date(record.punchIn).getTime()) / 60000),
  );
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function dateTimeFor(date: string) {
  const now = new Date();
  const selected = new Date(`${date}T${now.toTimeString().slice(0, 8)}`);
  return selected.toISOString();
}

function getRangeBounds(range: Range, selectedDate: string, fromDate: string, toDate: string) {
  if (range === "custom") return { from: fromDate, to: toDate };
  const date = new Date(`${selectedDate}T12:00:00`);
  const from = new Date(date);
  const to = new Date(date);
  if (range === "week") {
    const weekday = (date.getDay() + 6) % 7;
    from.setDate(date.getDate() - weekday);
    to.setDate(from.getDate() + 6);
  }
  if (range === "month") {
    from.setDate(1);
    to.setMonth(date.getMonth() + 1, 0);
  }
  if (range === "year") {
    from.setMonth(0, 1);
    to.setMonth(11, 31);
  }
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}
