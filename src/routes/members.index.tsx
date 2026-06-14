import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Filter, IdCard, Plus, Search, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell, Card, StatusBadge } from "@/components/layout/AppShell";
import { colorFromName, dmy, initials } from "@/lib/format";
import { useApp, type Status } from "@/store/app";

export const Route = createFileRoute("/members/")({
  head: () => ({ meta: [{ title: "Members - Fit & Fyt GymOS" }] }),
  component: MembersList,
});

const filters = ["all", "active", "expired", "expiring", "frozen"] as const;

function MembersList() {
  const members = useApp((s) => s.members);
  const importMembers = useApp((s) => s.importMembers);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [plan, setPlan] = useState("all");
  const [sort, setSort] = useState("newest");
  const fileInput = useRef<HTMLInputElement>(null);

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

  const actions = (
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
  );

  return (
    <AppShell
      title="Members"
      description={`${members.length} total members across all plans.`}
      actions={actions}
    >
      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => void importCsv(event.target.files?.[0])}
      />
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
                    <Link
                      to="/members/$id"
                      params={{ id: member.id }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold hover:text-primary"
                    >
                      <IdCard className="h-4 w-4" />
                      Profile
                    </Link>
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
              <div className="mt-2 text-[10px] text-muted-foreground">{dmy(member.expiryDate)}</div>
            </div>
          </Link>
        ))}
        {list.length === 0 && (
          <div className="card-surface p-8 text-center text-sm text-muted-foreground">
            No members match this search.
          </div>
        )}
      </div>
    </AppShell>
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
