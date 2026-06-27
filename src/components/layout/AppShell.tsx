import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  CalendarCheck,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Cpu,
  Crown,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Settings,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { initials } from "@/lib/format";
import { signOutSupabase } from "@/lib/supabase-auth";
import { useApp } from "@/store/app";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/members", label: "Members", icon: Users },
  { to: "/pricing", label: "Plans", icon: Crown },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/finance", label: "Finance", icon: CircleDollarSign },
  { to: "/leads", label: "Leads", icon: Sparkles },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/branches", label: "Branches", icon: Building2 },
  { to: "/hardware", label: "Biometric", icon: Cpu },
  { to: "/reader-status", label: "Reader Status", icon: Clock3 },
  { to: "/enrollment", label: "Enrollment", icon: UserRound },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const mobileItems = navItems.slice(0, 4);

function canUsePath(auth: { role: string | null; permissions?: string[] } | null, path: string) {
  if (!auth) return false;
  if (auth.role === "super" || auth.role === "owner" || auth.permissions?.includes("*"))
    return true;
  if (auth.role === "member") return path.startsWith("/member");
  const staffAllowed = [
    "/dashboard",
    "/members",
    "/attendance",
    "/leads",
    "/staff",
    "/messages",
    "/hardware",
    "/reader-status",
    "/reader-history",
    "/enrollment",
  ];
  return (
    staffAllowed.some((allowed) => path === allowed || path.startsWith(`${allowed}/`)) ||
    Boolean(auth.permissions?.some((permission) => path.startsWith(`/${permission}`)))
  );
}

function roleLabel(role: string | null | undefined) {
  if (role === "super") return "Super Admin";
  if (role === "owner") return "Owner";
  if (role === "staff") return "Staff";
  if (role === "member") return "Member";
  return "User";
}

export function AppShell({
  children,
  title,
  description,
  actions,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  const auth = useApp((state) => state.auth);
  const authReady = useApp((state) => state.authReady);
  const logout = useApp((state) => state.logout);
  const members = useApp((state) => state.members);
  const leads = useApp((state) => state.leads);
  const payments = useApp((state) => state.payments);
  const branches = useApp((state) => state.branches);
  const currentBranch = useApp((state) => state.currentBranch);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [accountMenu, setAccountMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (ready && authReady && !auth) navigate({ to: "/login", replace: true });
    if (ready && authReady && auth?.role === "member")
      navigate({ to: "/member/home", replace: true });
  }, [auth, authReady, navigate, ready]);

  const onLogout = async () => {
    await signOutSupabase();
    logout();
    navigate({ to: "/login" });
  };
  const normalizedSearch = search.trim().toLowerCase();
  const { memberResults, leadResults, planResults } = useMemo(() => {
    if (!normalizedSearch) {
      return { memberResults: [], leadResults: [], planResults: [] };
    }

    return {
      memberResults: members
        .filter((member) =>
          `${member.name} ${member.phone} ${member.email ?? ""} ${member.plan}`
            .toLowerCase()
            .includes(normalizedSearch),
        )
        .slice(0, 4),
      leadResults: leads
        .filter((lead) =>
          `${lead.name} ${lead.phone} ${lead.enquiry}`.toLowerCase().includes(normalizedSearch),
        )
        .slice(0, 2),
      planResults: [...new Set(members.map((member) => member.plan))]
        .filter((plan) => plan.toLowerCase().includes(normalizedSearch))
        .slice(0, 2),
    };
  }, [leads, members, normalizedSearch]);
  const notificationCount = useMemo(
    () =>
      members.filter((member) => member.status === "expiring").length +
      payments.filter((payment) => payment.status === "Pending").length +
      leads.filter((lead) => lead.status === "New").length,
    [leads, members, payments],
  );

  if (!ready || !authReady || !auth) return <AppLoading />;

  const activeBranch = branches.find((branch) => branch.id === (auth.branchId ?? currentBranch));
  const branchLabel = activeBranch?.name ?? "HQ Branch";
  const allowedHere = canUsePath(auth, pathname);
  if (!allowedHere) {
    return (
      <div className="min-h-screen bg-background px-6 py-10">
        <div className="mx-auto max-w-md card-surface p-6 text-center">
          <h1 className="text-xl font-black">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account does not have permission to open this section.
          </p>
          <button className="btn-primary mt-5" onClick={() => navigate({ to: "/dashboard" })}>
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  const renderNav = (compact: boolean) => (
    <nav className="space-y-1">
      {navItems
        .filter((item) => canUsePath(auth, item.to))
        .map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.to ||
            (item.to !== "/dashboard" && pathname.startsWith(`${item.to}/`));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setDrawer(false)}
              title={compact ? item.label : undefined}
              className={`sidebar-link ${compact ? "justify-center" : ""} ${active ? "sidebar-link-active" : ""}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!compact && <span>{item.label}</span>}
              {active && !compact && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
            </Link>
          );
        })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-sidebar transition-[width] lg:flex lg:flex-col ${collapsed ? "w-20" : "w-64"}`}
      >
        <Brand collapsed={collapsed} />
        <div className="flex-1 overflow-y-auto px-3 py-5">{renderNav(collapsed)}</div>
        <div className="border-t border-border p-4">
          <div className={`mb-3 flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <Avatar name={auth.name} />
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{auth.name}</div>
                <div className="truncate text-xs capitalize text-muted-foreground">
                  {roleLabel(auth.role)} - {branchLabel}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            className={`sidebar-link w-full text-destructive ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>

      <div className={`transition-[padding] ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <header className="sticky top-0 z-30 border-b border-border bg-background">
          <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
            <button
              onClick={() => {
                if (window.innerWidth >= 1024) setCollapsed((value) => !value);
                else setDrawer(true);
              }}
              className="icon-button"
              aria-label={collapsed ? "Expand menu" : "Toggle menu"}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden max-w-md flex-1 md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="input-field h-10 pl-9"
                  placeholder="Search members, plans, leads..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {normalizedSearch && (
                  <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-md border border-border bg-card shadow-xl">
                    {memberResults.map((member) => (
                      <Link
                        key={member.id}
                        to="/members/$id"
                        params={{ id: member.id }}
                        onClick={() => setSearch("")}
                        className="flex items-center gap-3 border-b border-border px-3 py-2.5 text-xs hover:bg-secondary"
                      >
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{member.name}</span>
                        <span className="ml-auto text-muted-foreground">{member.plan}</span>
                      </Link>
                    ))}
                    {planResults.map((plan) => (
                      <Link
                        key={plan}
                        to="/pricing"
                        onClick={() => setSearch("")}
                        className="flex items-center gap-3 border-b border-border px-3 py-2.5 text-xs hover:bg-secondary"
                      >
                        <Crown className="h-4 w-4 text-amber-400" />
                        <span className="font-semibold">{plan}</span>
                        <span className="ml-auto text-muted-foreground">Plan</span>
                      </Link>
                    ))}
                    {leadResults.map((lead) => (
                      <Link
                        key={lead.id}
                        to="/leads"
                        onClick={() => setSearch("")}
                        className="flex items-center gap-3 border-b border-border px-3 py-2.5 text-xs hover:bg-secondary"
                      >
                        <Sparkles className="h-4 w-4 text-sky-400" />
                        <span className="font-semibold">{lead.name}</span>
                        <span className="ml-auto text-muted-foreground">Lead</span>
                      </Link>
                    ))}
                    {memberResults.length + planResults.length + leadResults.length === 0 && (
                      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                        No matching members, plans, or leads
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Link to="/dashboard" className="brand-wordmark md:hidden">
              FIT <span>&</span> FYT
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <Link to="/notifications" className="icon-button relative" aria-label="Notifications">
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <span className="absolute right-0 top-0 grid min-h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[8px] font-bold text-white">
                    {notificationCount}
                  </span>
                )}
              </Link>
              <div className="relative">
                <button
                  onClick={() => setAccountMenu((value) => !value)}
                  className="flex items-center gap-2 rounded-md p-1 hover:bg-secondary"
                >
                  <div className="hidden text-right sm:block">
                    <div className="text-xs font-semibold">{auth.name}</div>
                    <div className="text-[11px] capitalize text-muted-foreground">
                      {roleLabel(auth.role)} - {branchLabel}
                    </div>
                  </div>
                  <Avatar name={auth.name} />
                </button>
                {accountMenu && (
                  <div className="absolute right-0 top-12 z-50 w-44 rounded-md border border-border bg-card p-1 shadow-xl">
                    <Link
                      to="/settings"
                      onClick={() => setAccountMenu(false)}
                      className="sidebar-link"
                    >
                      <UserRound className="h-4 w-4" />
                      Account settings
                    </Link>
                    <button onClick={onLogout} className="sidebar-link w-full text-destructive">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-6 pb-24 lg:px-6 lg:pb-8">
          {(title || actions) && (
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                {title && <h1 className="page-title">{title}</h1>}
                {description && <p className="page-description">{description}</p>}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/75"
            onClick={() => setDrawer(false)}
            aria-label="Close menu"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-sidebar">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                onClick={() => setDrawer(false)}
                className="icon-button mr-3"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-5">{renderNav(false)}</div>
            <button onClick={onLogout} className="sidebar-link m-3 text-destructive">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </aside>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-sidebar lg:hidden">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`mobile-nav-link ${active ? "text-primary" : ""}`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button onClick={() => setDrawer(true)} className="mobile-nav-link">
          <Menu className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      to="/dashboard"
      className={`flex h-20 items-center gap-3 border-b border-border px-5 ${collapsed ? "justify-center px-0" : ""}`}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-primary/40 bg-primary/10">
        <Dumbbell className="h-5 w-5 text-primary" />
      </div>
      {!collapsed && (
        <div>
          <div className="brand-wordmark">
            FIT <span>&</span> FYT
          </div>
          <div className="text-[9px] uppercase text-primary">MMA - Gym - Fitness</div>
        </div>
      )}
    </Link>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/15 text-xs font-bold text-primary">
      {initials(name)}
    </div>
  );
}

function AppLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-md border border-primary/40 bg-primary/10">
          <Dumbbell className="h-6 w-6 animate-pulse text-primary" />
        </div>
        <div className="brand-wordmark mt-3">
          FIT <span>&</span> FYT
        </div>
      </div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card-surface p-5 ${className}`}>{children}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "status-active",
    expired: "status-expired",
    expiring: "status-expiring",
    frozen: "status-frozen",
    inactive: "status-inactive",
  };
  const label: Record<string, string> = {
    active: "Active",
    expired: "Expired",
    expiring: "Expiring Soon",
    frozen: "Frozen",
    inactive: "Inactive",
  };
  return (
    <span className={`status-badge ${map[status] ?? "status-inactive"}`}>
      {label[status] ?? status}
    </span>
  );
}
