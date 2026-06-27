import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Clock3, Filter, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, Card } from "@/components/layout/AppShell";
import { dmy } from "@/lib/format";
import { useApp, type ReaderConnectionEvent } from "@/store/app";

export const Route = createFileRoute("/reader-history")({
  head: () => ({ meta: [{ title: "Reader Connection History - Fit & Fyt" }] }),
  component: ReaderHistoryPage,
});

function ReaderHistoryPage() {
  const devices = useApp((state) => state.biometricDevices ?? []);
  const events = useApp((state) => state.readerConnectionEvents ?? []);
  const [readerId, setReaderId] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTime = to ? new Date(`${to}T23:59:59`).getTime() : null;
    return events.filter((event) => {
      const eventTime = new Date(event.at).getTime();
      if (readerId !== "all" && event.readerId !== readerId) return false;
      if (status !== "all" && event.eventType !== status) return false;
      if (fromTime && eventTime < fromTime) return false;
      if (toTime && eventTime > toTime) return false;
      return true;
    });
  }, [events, from, readerId, status, to]);

  return (
    <AppShell
      title="Reader Connection History"
      description="Connection, disconnection, and communication error events for biometric readers."
      actions={
        <Link to="/reader-status" className="btn-primary text-xs">
          <Clock3 className="h-4 w-4" />
          Status
        </Link>
      }
    >
      <Card className="mb-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">Filters</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <Field label="Reader">
            <select className="input-field" value={readerId} onChange={(event) => setReaderId(event.target.value)}>
              <option value="all">All readers</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className="input-field" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="Connected">Connected</option>
              <option value="Disconnected">Disconnected</option>
              <option value="Error">Communication Error</option>
            </select>
          </Field>
          <Field label="From date">
            <input className="input-field" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field label="To date">
            <input className="input-field" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              className="subtle-button w-full justify-center"
              onClick={() => {
                setReaderId("all");
                setStatus("all");
                setFrom("");
                setTo("");
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-bold">Connection events</h2>
            <p className="mt-1 text-xs text-muted-foreground">{filtered.length} records shown</p>
          </div>
          <CalendarDays className="h-4 w-4 text-primary" />
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Reader</th>
                <th>Reader ID</th>
                <th>IP Address</th>
                <th>Event Type</th>
                <th>Duration</th>
                <th>Error Message</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => (
                <tr key={event.id}>
                  <td>{formatDateTime(event.at)}</td>
                  <td className="font-semibold">{event.readerName}</td>
                  <td className="font-mono text-xs">{event.readerId}</td>
                  <td>{event.readerIp}</td>
                  <td><EventBadge event={event} /></td>
                  <td>{formatDuration(event.durationSeconds)}</td>
                  <td className="max-w-xs truncate text-xs text-muted-foreground">{event.errorMessage ?? "-"}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No connection history found for these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}

function EventBadge({ event }: { event: ReaderConnectionEvent }) {
  const className =
    event.eventType === "Connected"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : event.eventType === "Error"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
        : "border-rose-500/40 bg-rose-500/10 text-rose-300";
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-bold ${className}`}>{event.eventType}</span>;
}

function formatDateTime(value: string) {
  return `${dmy(value)} ${new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatDuration(seconds?: number) {
  if (!seconds) return "-";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes < 60) return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const minuteRemainder = minutes % 60;
  return minuteRemainder ? `${hours}h ${minuteRemainder}m` : `${hours}h`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}
