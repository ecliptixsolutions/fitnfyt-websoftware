import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  Cpu,
  Crown,
  Download,
  LifeBuoy,
  LogOut,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import { downloadCsv, downloadExcel } from "@/lib/export";
import { useApp, type GymSettings, type NotificationSettings } from "@/store/app";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings - Fit & Fyt GymOS" }] }),
  component: Settings,
});

function Settings() {
  const logout = useApp((state) => state.logout);
  const gymSettings = useApp((state) => state.gymSettings);
  const notificationSettings = useApp((state) => state.notificationSettings);
  const updateGymSettings = useApp((state) => state.updateGymSettings);
  const updateNotificationSettings = useApp((state) => state.updateNotificationSettings);
  const resetWorkspace = useApp((state) => state.resetWorkspace);
  const members = useApp((state) => state.members);
  const payments = useApp((state) => state.payments);
  const attendance = useApp((state) => state.attendance ?? []);
  const leads = useApp((state) => state.leads);
  const staff = useApp((state) => state.staff);
  const branches = useApp((state) => state.branches);
  const devices = useApp((state) => state.biometricDevices ?? []);
  const navigate = useNavigate();
  const [profile, setProfile] = useState<GymSettings>(gymSettings);
  const [confirmText, setConfirmText] = useState("");

  const exporters = [
    {
      label: "Members",
      headers: ["ID", "Name", "Phone", "Email", "Plan", "Status", "Branch"],
      rows: members.map((member) => [
        member.id,
        member.name,
        member.phone,
        member.email ?? "",
        member.plan,
        member.status,
        branches.find((branch) => branch.id === (member.branchId ?? "b1"))?.name ?? "",
      ]),
    },
    {
      label: "Payments",
      headers: ["Date", "Member ID", "Plan", "Mode", "Status", "Type", "Amount"],
      rows: payments.map((payment) => [
        payment.date.slice(0, 10),
        payment.memberId,
        payment.plan,
        payment.mode,
        payment.status,
        payment.type ?? "payment",
        payment.amount,
      ]),
    },
    {
      label: "Attendance",
      headers: ["Date", "Subject", "Type", "Punch In", "Punch Out", "Source", "Branch"],
      rows: attendance.map((record) => [
        record.date,
        record.subjectId,
        record.subjectType,
        record.punchIn,
        record.punchOut ?? "",
        record.source,
        branches.find((branch) => branch.id === (record.branchId ?? "b1"))?.name ?? "",
      ]),
    },
    {
      label: "Leads",
      headers: ["Name", "Phone", "Source", "Status", "Enquiry", "Follow Up"],
      rows: leads.map((lead) => [
        lead.name,
        lead.phone,
        lead.source,
        lead.status,
        lead.enquiry,
        lead.followUp.slice(0, 10),
      ]),
    },
    {
      label: "Staff",
      headers: ["Name", "Phone", "Role", "Salary", "Active", "Branch"],
      rows: staff.map((person) => [
        person.name,
        person.phone,
        person.role,
        person.salary,
        person.active ? "Active" : "Inactive",
        branches.find((branch) => branch.id === (person.branchId ?? "b1"))?.name ?? "",
      ]),
    },
  ];

  return (
    <AppShell
      title="Settings"
      description="Gym profile, access shortcuts, exports, notifications, and admin safety."
    >
      <Card className="mb-5">
        <div className="mb-4 text-xs font-bold uppercase tracking-wider text-primary">
          Gym profile
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Gym name">
            <input
              className="input-field"
              value={profile.name}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
            />
          </Field>
          <Field label="Brand tagline">
            <input
              className="input-field"
              value={profile.brandTagline}
              onChange={(event) => setProfile({ ...profile, brandTagline: event.target.value })}
            />
          </Field>
          <Field label="Address">
            <input
              className="input-field"
              value={profile.address}
              onChange={(event) => setProfile({ ...profile, address: event.target.value })}
            />
          </Field>
          <Field label="Phone">
            <input
              className="input-field"
              value={profile.phone}
              onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              className="input-field"
              type="email"
              value={profile.email}
              onChange={(event) => setProfile({ ...profile, email: event.target.value })}
            />
          </Field>
          <Field label="Support WhatsApp number">
            <input
              className="input-field"
              value={profile.supportWhatsApp}
              onChange={(event) => setProfile({ ...profile, supportWhatsApp: event.target.value })}
            />
          </Field>
        </div>
        <button
          onClick={() => {
            updateGymSettings(profile);
            toast.success("Gym profile saved");
          }}
          className="btn-primary mt-4 w-full"
        >
          Save changes
        </button>
      </Card>

      <Card className="mb-5 !p-2">
        {[
          {
            to: "/branches",
            icon: Building2,
            label: "Branch Management",
            detail: `${branches.length} branches`,
          },
          {
            to: "/staff",
            icon: Users,
            label: "Staff & Access",
            detail: `${staff.length} staff users`,
          },
          {
            to: "/hardware",
            icon: Cpu,
            label: "Biometric Devices",
            detail: `${devices.length} configured`,
          },
          { to: "/pricing", icon: Crown, label: "Plan & Billing", detail: "Subscription plans" },
        ].map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-3 rounded-md border-b border-border/50 p-3 hover:bg-secondary/40 last:border-0"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="flex-1 text-sm font-semibold">{link.label}</span>
              <span className="text-xs text-muted-foreground">{link.detail}</span>
            </Link>
          );
        })}
      </Card>

      <Card className="mb-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
          <Bell className="h-4 w-4" />
          Notifications
        </div>
        {[
          ["whatsapp", "WhatsApp alerts"],
          ["sms", "SMS alerts"],
          ["push", "Push notifications"],
          ["expiryReminders", "Expiry reminders"],
          ["paymentReminders", "Payment reminders"],
        ].map(([key, label]) => (
          <Toggle
            key={key}
            label={label}
            checked={notificationSettings[key as keyof NotificationSettings]}
            onChange={(checked) => {
              updateNotificationSettings({ [key]: checked } as Partial<NotificationSettings>);
              toast.success(`${label} ${checked ? "enabled" : "disabled"}`);
            }}
          />
        ))}
      </Card>

      <Card className="mb-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
          <Download className="h-4 w-4" />
          Backup & export
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {exporters.map((exporter) => (
            <div key={exporter.label} className="rounded-md border border-border p-2">
              <div className="mb-2 text-xs font-semibold">{exporter.label}</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    downloadCsv(
                      `fitfyt-${exporter.label.toLowerCase()}`,
                      exporter.headers,
                      exporter.rows,
                    )
                  }
                  className="subtle-button !min-h-8 !p-1 text-[10px]"
                >
                  CSV
                </button>
                <button
                  onClick={() =>
                    downloadExcel(
                      `fitfyt-${exporter.label.toLowerCase()}`,
                      exporter.headers,
                      exporter.rows,
                    )
                  }
                  className="subtle-button !min-h-8 !p-1 text-[10px]"
                >
                  Excel
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">
          Exports are generated from the current browser-persisted workspace data.
        </p>
      </Card>

      <Card className="mb-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
          <LifeBuoy className="h-4 w-4" />
          Support
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <a href={`tel:${profile.supportPhone}`} className="subtle-button justify-start">
            Call support: {profile.supportPhone}
          </a>
          <a
            href={`https://wa.me/${profile.supportWhatsApp}`}
            target="_blank"
            rel="noreferrer"
            className="subtle-button justify-start"
          >
            WhatsApp support
          </a>
        </div>
      </Card>

      <Card className="border-destructive/40">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-destructive">
          <ShieldAlert className="h-4 w-4" />
          Danger zone
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <input
            className="input-field"
            placeholder='Type "RESET" to reset local app data'
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
          />
          <button
            disabled={confirmText !== "RESET"}
            onClick={() => {
              resetWorkspace();
              setConfirmText("");
              toast.success("Workspace reset to seed data");
            }}
            className={`subtle-button text-destructive ${confirmText !== "RESET" ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <Trash2 className="h-4 w-4" />
            Reset local data
          </button>
          <button
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
            className="subtle-button"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </Card>
    </AppShell>
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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 border-t border-border py-3 text-sm first:border-0">
      {label}
      <span className="relative inline-block h-5 w-9">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-secondary transition peer-checked:bg-primary" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
      </span>
    </label>
  );
}
