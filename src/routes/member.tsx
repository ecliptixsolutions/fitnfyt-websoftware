import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Calendar, IndianRupee, Dumbbell, User, LogOut } from "lucide-react";
import { useApp } from "@/store/app";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/member")({ component: MemberLayout });

const tabs = [
  { to: "/member/home", label: "Home", icon: Home },
  { to: "/member/attendance", label: "Attend", icon: Calendar },
  { to: "/member/payments", label: "Pay", icon: IndianRupee },
  { to: "/member/workout", label: "Workout", icon: Dumbbell },
];

function MemberLayout() {
  const auth = useApp((s) => s.auth);
  const logout = useApp((s) => s.logout);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && !auth) navigate({ to: "/login", replace: true });
  }, [auth, navigate, ready]);
  if (!ready || !auth) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Dumbbell className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <Link to="/member/home" className="font-black text-foreground">
            FIT <span className="text-primary">&</span> FYT
          </Link>
          <button
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
            className="p-2 text-muted-foreground"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 pt-4">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border">
        <div className="max-w-2xl mx-auto grid grid-cols-5">
          {tabs.map((t) => {
            const I = t.icon;
            const active = path.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to} className="flex flex-col items-center py-2.5 text-xs">
                <I className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span
                  className={`mt-0.5 ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}
                >
                  {t.label}
                </span>
              </Link>
            );
          })}
          <Link to="/login" className="flex flex-col items-center py-2.5 text-xs">
            <User className="w-5 h-5 text-muted-foreground" />
            <span className="mt-0.5 text-muted-foreground">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
