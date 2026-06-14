import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  IndianRupee,
  MessageSquareText,
  UserPlus,
  Users,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { AppShell, Card, StatusBadge } from "@/components/layout/AppShell";
import { colorFromName, daysBetween, dmy, initials, inr } from "@/lib/format";
import { useApp } from "@/store/app";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - Fit & Fyt GymOS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { auth, members, payments, leads } = useApp();
  const now = new Date();
  const active = members.filter((m) => m.status === "active" || m.status === "expiring").length;
  const paidPayments = payments.filter(
    (payment) => payment.status === "Paid" && payment.type !== "refund",
  );
  const monthRevenue = paidPayments
    .filter((payment) => {
      const date = new Date(payment.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, payment) => sum + payment.amount, 0);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousRevenue = paidPayments
    .filter((payment) => {
      const date = new Date(payment.date);
      return (
        date.getMonth() === previousMonth.getMonth() &&
        date.getFullYear() === previousMonth.getFullYear()
      );
    })
    .reduce((sum, payment) => sum + payment.amount, 0);
  const revenueChange =
    previousRevenue === 0
      ? null
      : Math.round(((monthRevenue - previousRevenue) / previousRevenue) * 100);
  const joinedThisMonth = members.filter((member) => {
    const date = new Date(member.startDate);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const revenueData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      month: date.toLocaleDateString("en-IN", { month: "short" }),
      revenue: paidPayments
        .filter((payment) => {
          const paidAt = new Date(payment.date);
          return (
            paidAt.getMonth() === date.getMonth() && paidAt.getFullYear() === date.getFullYear()
          );
        })
        .reduce((sum, payment) => sum + payment.amount, 0),
    };
  });
  const expiring = members.filter((m) => {
    const days = daysBetween(now, new Date(m.expiryDate));
    return days > 0 && days <= 7;
  }).length;
  const todayCheckins = members.filter((m) =>
    m.checkIns.some((checkIn) => new Date(checkIn).toDateString() === now.toDateString()),
  ).length;

  const stats = [
    {
      label: "Total Members",
      value: members.length,
      detail: `${joinedThisMonth} joined this month`,
      icon: Users,
    },
    {
      label: "Active Members",
      value: active,
      detail: `${members.length ? Math.round((active / members.length) * 100) : 0}% retention`,
      icon: CheckCircle2,
    },
    {
      label: "Revenue (MTD)",
      value: inr(monthRevenue),
      detail:
        revenueChange === null
          ? "No revenue last month"
          : `${revenueChange >= 0 ? "+" : ""}${revenueChange}% vs last month`,
      icon: IndianRupee,
    },
    { label: "Expiring in 7d", value: expiring, detail: "Send reminders", icon: CalendarClock },
  ];

  const actions = (
    <>
      <Link to="/attendance" className="subtle-button">
        <CalendarClock className="h-4 w-4" />
        Today
      </Link>
      <Link to="/members/add" className="btn-primary text-xs">
        <UserPlus className="h-4 w-4" />
        Add member
      </Link>
    </>
  );

  return (
    <AppShell
      title={`Welcome back, ${auth?.name ?? "Owner"}`}
      description="Here's how Fit & Fyt is performing today."
      actions={actions}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="relative overflow-hidden">
              <div className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="section-label">{stat.label}</div>
              <div className="mt-4 text-3xl font-black">{stat.value}</div>
              <div className="mt-2 text-xs text-emerald-400">{stat.detail}</div>
            </Card>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-bold">Revenue trend</h2>
              <p className="mt-1 text-xs text-muted-foreground">Last 6 months</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                  formatter={(value) => inr(Number(value))}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-bold">Action queue</h2>
              <p className="mt-1 text-xs text-muted-foreground">Items needing attention</p>
            </div>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-4 space-y-1">
            <QueueItem
              label={`${expiring} plans expiring this week`}
              action="Remind"
              to="/members"
            />
            <QueueItem
              label={`${payments.filter((p) => p.status === "Pending").length} payments overdue`}
              action="Collect"
              to="/finance/dues"
            />
            <QueueItem
              label={`${leads.filter((lead) => lead.status === "New").length} new leads to follow up`}
              action="Assign"
              to="/leads"
            />
            <QueueItem label="Send attendance follow-ups" action="SMS" to="/messages" />
            <div className="flex items-center justify-between gap-3 border-t border-border py-3 text-xs">
              <span className="text-muted-foreground">Daily backup scheduled · 2:00 AM</span>
              <span className="status-badge status-active">Ready</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-5 !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="text-sm font-bold">Recent members</h2>
            <p className="mt-1 text-xs text-muted-foreground">Latest memberships and renewals</p>
          </div>
          <Link to="/members" className="text-xs font-semibold text-primary">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Check-ins</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {[...members]
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                .slice(0, 6)
                .map((member) => (
                  <tr key={member.id}>
                    <td>
                      <Link
                        to="/members/$id"
                        params={{ id: member.id }}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={`grid h-8 w-8 place-items-center rounded-full text-[10px] font-bold text-white ${colorFromName(member.name)}`}
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
                    <td>{member.plan}</td>
                    <td>
                      <StatusBadge status={member.status} />
                    </td>
                    <td>{member.checkIns.length}</td>
                    <td className="text-muted-foreground">{dmy(member.expiryDate)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Link to="/attendance" className="subtle-button justify-start">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          {todayCheckins} checked in today
        </Link>
        <Link to="/members/add" className="subtle-button justify-start">
          <UserPlus className="h-4 w-4 text-primary" />
          Add a new member
        </Link>
        <Link to="/messages" className="subtle-button justify-start">
          <MessageSquareText className="h-4 w-4 text-primary" />
          Message members
        </Link>
      </div>
    </AppShell>
  );
}

function QueueItem({ label, action, to }: { label: string; action: string; to: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border py-3 text-xs first:border-0">
      <span>{label}</span>
      <Link
        to={to as never}
        className="rounded-full border border-primary/40 px-2 py-1 text-[10px] font-semibold text-primary"
      >
        {action}
      </Link>
    </div>
  );
}
