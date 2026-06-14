import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, MessageSquarePlus, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import { dmy } from "@/lib/format";
import { useApp, type Lead } from "@/store/app";
import { LeadBadge } from "./leads.index";

export const Route = createFileRoute("/leads/$id")({
  head: () => ({ meta: [{ title: "Lead Profile - Fit & Fyt GymOS" }] }),
  component: LeadDetail,
});

function LeadDetail() {
  const { id } = Route.useParams();
  const leads = useApp((state) => state.leads);
  const staff = useApp((state) => state.staff);
  const updateLead = useApp((state) => state.updateLead);
  const addActivity = useApp((state) => state.addLeadActivity);
  const convertLead = useApp((state) => state.convertLead);
  const lead = leads.find((item) => item.id === id);
  const [note, setNote] = useState("");
  if (!lead)
    return (
      <AppShell title="Lead profile">
        <Card>Lead not found</Card>
      </AppShell>
    );
  return (
    <AppShell
      title={lead.name}
      description={`${lead.phone} - ${lead.source}`}
      actions={<LeadBadge status={lead.status} />}
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="section-label">Enquiry</div>
          <div className="mt-2 font-bold">{lead.enquiry}</div>
        </Card>
        <Card>
          <div className="section-label">Next follow-up</div>
          <div className="mt-2 font-bold">{dmy(lead.followUp)}</div>
        </Card>
        <Card>
          <div className="section-label">Assigned staff</div>
          <div className="mt-2 font-bold">
            {staff.find((person) => person.id === lead.assignedStaffId)?.name ?? "Unassigned"}
          </div>
        </Card>
      </div>
      <Card className="mb-5">
        <h2 className="mb-4 text-sm font-bold">Manage lead</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted-foreground">
            Status
            <select
              className="input-field mt-1"
              value={lead.status}
              onChange={(event) => {
                updateLead(lead.id, { status: event.target.value as Lead["status"] });
                addActivity(lead.id, `Status changed to ${event.target.value}`);
              }}
            >
              {["New", "Follow-up", "Interested", "Converted", "Lost"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Follow-up date
            <input
              type="date"
              className="input-field mt-1"
              value={lead.followUp.slice(0, 10)}
              onChange={(event) => {
                updateLead(lead.id, {
                  followUp: new Date(event.target.value).toISOString(),
                  status: "Follow-up",
                });
                addActivity(lead.id, `Follow-up scheduled for ${event.target.value}`);
              }}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Assign staff
            <select
              className="input-field mt-1"
              value={lead.assignedStaffId ?? ""}
              onChange={(event) => {
                updateLead(lead.id, { assignedStaffId: event.target.value });
                addActivity(
                  lead.id,
                  `Assigned to ${staff.find((person) => person.id === event.target.value)?.name ?? "nobody"}`,
                );
              }}
            >
              <option value="">Unassigned</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {lead.status !== "Converted" && (
          <button
            onClick={() => {
              convertLead(lead.id);
              toast.success("Lead converted into a trial member");
            }}
            className="btn-primary mt-4 text-xs"
          >
            <UserCheck className="h-4 w-4" />
            Convert to member
          </button>
        )}
      </Card>
      <Card>
        <h2 className="mb-4 text-sm font-bold">Activity timeline</h2>
        <div className="mb-4 flex gap-2">
          <input
            className="input-field"
            placeholder="Add call note, message, or follow-up result"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <button
            onClick={() => {
              if (!note.trim()) return;
              addActivity(lead.id, note.trim());
              setNote("");
              toast.success("Activity added");
            }}
            className="icon-button shrink-0"
            aria-label="Add activity"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        </div>
        {[...(lead.activities ?? [])].reverse().map((activity) => (
          <div
            key={activity.id}
            className="flex gap-3 border-t border-border py-3 text-xs first:border-0"
          >
            <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <div>{activity.note}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {dmy(activity.date)} -{" "}
                {new Date(activity.date).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}
        {!(lead.activities ?? []).length && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            No activity recorded yet.
          </div>
        )}
      </Card>
    </AppShell>
  );
}
