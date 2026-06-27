import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Clock3, Cpu, PlugZap, RefreshCw, Router, Settings2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import { dmy } from "@/lib/format";
import { useApp, type BiometricDevice, type ReaderStatus } from "@/store/app";

export const Route = createFileRoute("/reader-status")({
  head: () => ({ meta: [{ title: "Reader Status - Fit & Fyt" }] }),
  component: ReaderStatusPage,
});

function ReaderStatusPage() {
  const devices = useApp((state) => state.biometricDevices ?? []);
  const updateDevice = useApp((state) => state.updateBiometricDevice);
  const testDevice = useApp((state) => state.testBiometricDevice);
  const pollReaderStatuses = useApp((state) => state.pollReaderStatuses);
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [intervalSeconds, setIntervalSeconds] = useState(
    Math.max(10, devices[0]?.pollingIntervalSeconds ?? 30),
  );

  useEffect(() => {
    if (!pollingEnabled) return;
    pollReaderStatuses();
    const timer = window.setInterval(pollReaderStatuses, Math.max(10, intervalSeconds) * 1000);
    return () => window.clearInterval(timer);
  }, [intervalSeconds, pollingEnabled, pollReaderStatuses]);

  const stats = useMemo(
    () => ({
      total: devices.length,
      connected: devices.filter((device) => device.status === "Connected").length,
      disconnected: devices.filter((device) => device.status === "Disconnected").length,
      errors: devices.filter((device) => device.status === "Error").length,
    }),
    [devices],
  );

  const applyInterval = () => {
    devices.forEach((device) =>
      updateDevice(device.id, { pollingIntervalSeconds: Math.max(10, intervalSeconds) }),
    );
    toast.success("Reader polling interval updated");
  };

  return (
    <AppShell
      title="Reader Status"
      description="Live connection status for configured biometric readers."
      actions={
        <>
          <Link to="/reader-history" className="subtle-button">
            <Clock3 className="h-4 w-4" />
            History
          </Link>
          <button
            type="button"
            onClick={() => {
              pollReaderStatuses();
              toast.success("Reader status refreshed");
            }}
            className="btn-primary text-xs"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Cpu} label="Total Readers" value={stats.total} />
        <SummaryCard icon={Wifi} label="Connected Readers" value={stats.connected} tone="green" />
        <SummaryCard icon={WifiOff} label="Disconnected Readers" value={stats.disconnected} tone="red" />
        <SummaryCard icon={AlertTriangle} label="Communication Errors" value={stats.errors} tone="orange" />
      </div>

      <Card className="mb-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px] md:items-end">
          <div>
            <div className="section-label">Connection Monitoring</div>
            <p className="mt-2 text-xs text-muted-foreground">
              Status refreshes automatically while this page is open. The interval is saved on every configured reader.
            </p>
          </div>
          <label className="block space-y-1 text-xs text-muted-foreground">
            <span>Polling interval seconds</span>
            <input
              className="input-field"
              type="number"
              min={10}
              value={intervalSeconds}
              onChange={(event) => setIntervalSeconds(Number(event.target.value || 10))}
            />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={applyInterval} className="subtle-button flex-1 justify-center">
              <Settings2 className="h-4 w-4" />
              Save
            </button>
            <button
              type="button"
              onClick={() => setPollingEnabled((value) => !value)}
              className="subtle-button flex-1 justify-center"
            >
              {pollingEnabled ? "Pause" : "Start"}
            </button>
          </div>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reader ID</th>
                <th>Reader Name</th>
                <th>IP Address</th>
                <th>Current Status</th>
                <th>Last Communication</th>
                <th>Last Status Update</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id}>
                  <td className="font-mono text-xs">{device.id}</td>
                  <td className="font-semibold">{device.name}</td>
                  <td>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Router className="h-3 w-3" />
                      {device.ipAddress}:{device.port}
                    </span>
                  </td>
                  <td>
                    <ReaderStatusBadge status={device.status} />
                  </td>
                  <td>{formatDateTime(device.lastCommunicationAt)}</td>
                  <td>{formatDateTime(device.lastStatusUpdateAt)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => {
                        testDevice(device.id);
                        toast.success(`${device.name} checked`);
                      }}
                      className="subtle-button text-xs"
                    >
                      <PlugZap className="h-4 w-4" />
                      Test
                    </button>
                  </td>
                </tr>
              ))}
              {!devices.length && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No readers configured yet.
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

function SummaryCard({ icon: Icon, label, value, tone = "default" }: { icon: typeof Cpu; label: string; value: number; tone?: "default" | "green" | "red" | "orange" }) {
  const toneClass = tone === "green" ? "text-emerald-400" : tone === "red" ? "text-rose-400" : tone === "orange" ? "text-amber-400" : "text-primary";
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-md bg-primary/10 ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="section-label">{label}</div>
      <div className={`mt-4 text-3xl font-black ${toneClass}`}>{value}</div>
    </Card>
  );
}

function ReaderStatusBadge({ status }: { status: ReaderStatus }) {
  const className =
    status === "Connected"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : status === "Error"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
        : "border-rose-500/40 bg-rose-500/10 text-rose-300";
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-bold ${className}`}>{status}</span>;
}

function formatDateTime(value?: string) {
  if (!value) return "Never";
  return `${dmy(value)} ${new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}
