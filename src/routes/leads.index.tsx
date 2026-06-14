import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { AppShell, Card } from "@/components/layout/AppShell";
import { dmy } from "@/lib/format";
import { useApp, type LeadSource } from "@/store/app";

export const Route = createFileRoute("/leads/")({
  head: () => ({ meta: [{ title: "Leads - Fit & Fyt GymOS" }] }),
  component: Leads,
});

const sources: ("All" | LeadSource)[] = [
  "All",
  "Walk-in",
  "WhatsApp",
  "Instagram",
  "Facebook",
  "Referral",
  "Website",
];
const statuses = ["All", "New", "Follow-up", "Interested", "Converted", "Lost"];

function Leads() {
  const leads = useApp((state) => state.leads);
  const staff = useApp((state) => state.staff);
  const [source, setSource] = useState<(typeof sources)[number]>("All");
  const [status, setStatus] = useState("All");
  const [query, setQuery] = useState("");
  const list = leads
    .filter((lead) => source === "All" || lead.source === source)
    .filter((lead) => status === "All" || lead.status === status)
    .filter((lead) =>
      `${lead.name} ${lead.phone} ${lead.enquiry}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => a.followUp.localeCompare(b.followUp));
  return (
    <AppShell
      title="Leads"
      description="Manual CRM pipeline for every enquiry source."
      actions={
        <Link to="/leads/add" className="btn-primary text-xs">
          <Plus className="h-4 w-4" />
          Add lead
        </Link>
      }
    >
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="input-field pl-9"
            placeholder="Search leads by name, phone, or enquiry"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <select
          aria-label="Lead status"
          className="input-field min-w-44"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {statuses.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      <div className="scrollbar-hide mb-5 flex gap-2 overflow-x-auto">
        {sources.map((value) => (
          <button
            key={value}
            onClick={() => setSource(value)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${source === value ? "border-primary bg-primary font-semibold text-white" : "border-border text-muted-foreground"}`}
          >
            {value} (
            {value === "All" ? leads.length : leads.filter((lead) => lead.source === value).length})
          </button>
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {list.map((lead) => {
          const assigned = staff.find((person) => person.id === lead.assignedStaffId);
          return (
            <Link
              key={lead.id}
              to="/leads/$id"
              params={{ id: lead.id }}
              className="card-surface p-4 hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{lead.name}</div>
                  <div className="text-xs text-muted-foreground">{lead.phone}</div>
                </div>
                <LeadBadge status={lead.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="section-label">Source</div>
                  <div className="mt-1">{lead.source}</div>
                </div>
                <div>
                  <div className="section-label">Enquiry</div>
                  <div className="mt-1">{lead.enquiry}</div>
                </div>
                <div>
                  <div className="section-label">Follow-up</div>
                  <div className="mt-1">{dmy(lead.followUp)}</div>
                </div>
                <div>
                  <div className="section-label">Assigned to</div>
                  <div className="mt-1 flex items-center gap-1">
                    <UserPlus className="h-3 w-3 text-primary" />
                    {assigned?.name ?? "Unassigned"}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {!list.length && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No leads match these filters.
        </Card>
      )}
    </AppShell>
  );
}

export function LeadBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    New: "status-frozen",
    "Follow-up": "status-expiring",
    Interested: "status-active",
    Converted: "border-violet-500/40 bg-violet-500/10 text-violet-400",
    Lost: "status-expired",
  };
  return <span className={`status-badge ${classes[status] ?? "status-inactive"}`}>{status}</span>;
}
