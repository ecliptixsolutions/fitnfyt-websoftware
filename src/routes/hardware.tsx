import { createFileRoute } from "@tanstack/react-router";
import {
  Cpu,
  Edit3,
  Fingerprint,
  PlugZap,
  Plus,
  RefreshCw,
  Router,
  ScanFace,
  Trash2,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import { dmy, inr } from "@/lib/format";
import { useApp, type BiometricDevice } from "@/store/app";

export const Route = createFileRoute("/hardware")({
  head: () => ({ meta: [{ title: "Biometric Devices - Fit & Fyt GymOS" }] }),
  component: Hardware,
});

const recommended = [
  {
    name: "ESSL K30 Pro WiFi",
    price: 8000,
    tag: "Budget pick",
    icon: Fingerprint,
    specs: [
      "Fingerprint only",
      "2,000 fingerprint capacity",
      "WiFi connectivity",
      "Best for small gyms",
    ],
  },
  {
    name: "ESSL X990",
    price: 13000,
    tag: "Best performance",
    icon: Cpu,
    specs: [
      "Fingerprint + RFID",
      "10,000 fingerprint capacity",
      "TCP/IP + USB",
      "Best for 200-1000 members",
    ],
  },
  {
    name: "ESSL Aiface-Orcus",
    price: 12500,
    tag: "Face + biometric",
    icon: ScanFace,
    specs: ["Face + fingerprint", "AI recognition", "Card support", "Best for premium gyms"],
  },
];

function Hardware() {
  const branches = useApp((state) => state.branches);
  const devices = useApp((state) => state.biometricDevices ?? []);
  const attendance = useApp((state) => state.attendance ?? []);
  const addDevice = useApp((state) => state.addBiometricDevice);
  const updateDevice = useApp((state) => state.updateBiometricDevice);
  const deleteDevice = useApp((state) => state.deleteBiometricDevice);
  const testDevice = useApp((state) => state.testBiometricDevice);
  const syncDevice = useApp((state) => state.syncBiometricDevice);
  const [editing, setEditing] = useState<BiometricDevice | null>(null);
  const [form, setForm] = useState({
    name: "",
    model: "ESSL K30 Pro WiFi",
    branchId: branches[0]?.id ?? "b1",
    ipAddress: "",
    port: "4370",
  });

  const openForm = (device?: BiometricDevice) => {
    setEditing(device ?? null);
    setForm({
      name: device?.name ?? "",
      model: device?.model ?? "ESSL K30 Pro WiFi",
      branchId: device?.branchId ?? branches[0]?.id ?? "b1",
      ipAddress: device?.ipAddress ?? "",
      port: device?.port ?? "4370",
    });
  };
  const save = () => {
    if (!form.name.trim() || !form.ipAddress.trim())
      return toast.error("Device name and IP address are required");
    if (editing) {
      updateDevice(editing.id, form);
      toast.success("Device updated");
    } else {
      addDevice(form);
      toast.success("Device added");
    }
    setEditing(null);
    setForm({
      name: "",
      model: "ESSL K30 Pro WiFi",
      branchId: branches[0]?.id ?? "b1",
      ipAddress: "",
      port: "4370",
    });
  };

  return (
    <AppShell
      title="Biometric Devices"
      description="Manage attendance devices now. Real API sync can be connected later."
      actions={
        <button onClick={() => openForm()} className="btn-primary text-xs">
          <Plus className="h-4 w-4" />
          Add device
        </button>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Metric label="Devices" value={devices.length} />
        <Metric
          label="Connected"
          value={devices.filter((device) => device.status === "Connected").length}
        />
        <Metric
          label="Mapped users"
          value={devices.reduce((sum, device) => sum + device.usersMapped, 0)}
        />
        <Metric
          label="Biometric punches"
          value={attendance.filter((record) => record.source === "Biometric").length}
        />
      </div>

      {(editing || form.name || form.ipAddress) && (
        <Card className="mb-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold">{editing ? "Edit device" : "Add device"}</h2>
            <button
              onClick={() => {
                setEditing(null);
                setForm({
                  name: "",
                  model: "ESSL K30 Pro WiFi",
                  branchId: branches[0]?.id ?? "b1",
                  ipAddress: "",
                  port: "4370",
                });
              }}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              Cancel
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Device name">
              <input
                className="input-field"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="Model">
              <input
                className="input-field"
                value={form.model}
                onChange={(event) => setForm({ ...form, model: event.target.value })}
              />
            </Field>
            <Field label="Branch">
              <select
                className="input-field"
                value={form.branchId}
                onChange={(event) => setForm({ ...form, branchId: event.target.value })}
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="IP address">
              <input
                className="input-field"
                placeholder="192.168.1.201"
                value={form.ipAddress}
                onChange={(event) => setForm({ ...form, ipAddress: event.target.value })}
              />
            </Field>
            <Field label="Port">
              <input
                className="input-field"
                value={form.port}
                onChange={(event) => setForm({ ...form, port: event.target.value })}
              />
            </Field>
          </div>
          <button onClick={save} className="btn-primary mt-4 w-full">
            Save device
          </button>
        </Card>
      )}

      <div className="mb-5 grid gap-4 xl:grid-cols-2">
        {devices.map((device) => {
          const branch = branches.find((item) => item.id === device.branchId);
          const devicePunches = attendance.filter(
            (record) =>
              record.source === "Biometric" && (record.branchId ?? "b1") === device.branchId,
          );
          return (
            <Card key={device.id}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-md bg-primary/15">
                  <Fingerprint className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">{device.name}</h2>
                    <span
                      className={`status-badge ${device.status === "Connected" ? "status-active" : "status-inactive"}`}
                    >
                      {device.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {device.model} - {branch?.name ?? "No branch"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Router className="h-3 w-3" />
                      {device.ipAddress}:{device.port}
                    </span>
                    <span>{device.usersMapped} users mapped</span>
                    <span>{devicePunches.length} punches</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openForm(device)}
                    className="icon-button"
                    aria-label={`Edit ${device.name}`}
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm(`Remove ${device.name}?`)) return;
                      deleteDevice(device.id);
                      toast.success("Device removed");
                    }}
                    className="icon-button text-destructive"
                    aria-label={`Delete ${device.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
                <Mini
                  label="Last sync"
                  value={
                    device.lastSync
                      ? `${dmy(device.lastSync)} ${new Date(device.lastSync).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                      : "Never"
                  }
                />
                <Mini label="Mode" value="Local simulated" />
                <Mini
                  label="Connection"
                  value={device.status}
                  accent={device.status === "Connected"}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    testDevice(device.id);
                    toast.success("Connection test passed locally");
                  }}
                  className="subtle-button flex-1"
                >
                  <PlugZap className="h-4 w-4" />
                  Test
                </button>
                <button
                  onClick={() => {
                    syncDevice(device.id);
                    toast.success("Simulated biometric punches synced");
                  }}
                  className="btn-primary flex-1 text-xs"
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync logs
                </button>
              </div>
            </Card>
          );
        })}
        {!devices.length && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No biometric devices added yet.
          </Card>
        )}
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Wifi className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">Recommended devices</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {recommended.map((device) => {
            const Icon = device.icon;
            return (
              <div key={device.name} className="rounded-md border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-primary">{device.tag}</div>
                    <div className="text-sm font-bold">{device.name}</div>
                  </div>
                </div>
                <div className="mt-3 text-2xl font-black text-amber-400">{inr(device.price)}</div>
                <ul className="mt-3 space-y-1">
                  {device.specs.map((spec) => (
                    <li key={spec} className="text-xs text-muted-foreground">
                      - {spec}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="!p-4">
      <div className="section-label">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </Card>
  );
}

function Mini({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-bold ${accent ? "text-emerald-400" : ""}`}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}
