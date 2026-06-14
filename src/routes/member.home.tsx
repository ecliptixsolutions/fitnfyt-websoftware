import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/layout/AppShell";
import { useApp } from "@/store/app";
import { dmy, daysBetween } from "@/lib/format";

export const Route = createFileRoute("/member/home")({
  head: () => ({ meta: [{ title: "My Account — Fit Force Gym" }] }),
  component: MyHome,
});

function MyHome() {
  const auth = useApp((s) => s.auth);
  const member = useApp((s) => s.members[0]);
  const days = daysBetween(new Date(), new Date(member.expiryDate));
  const pct = Math.min(100, Math.max(0, (days / 365) * 100));
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Hello, {auth?.name} 💪</h1>
      <Card className="!p-5 mb-4 bg-gradient-to-br from-primary/30 to-primary/5 border-primary/40">
        <div className="text-xs uppercase tracking-wider text-primary font-semibold">{member.plan}</div>
        <div className="text-xs text-muted-foreground mt-1">Member since {dmy(member.startDate)} • Expires {dmy(member.expiryDate)}</div>
        <div className="mt-4 flex items-center gap-5">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--primary)" strokeWidth="3" strokeDasharray={`${pct}, 100`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 grid place-items-center"><div className="text-center"><div className="text-2xl font-black text-primary">{Math.max(days, 0)}</div><div className="text-[9px] text-muted-foreground">days left</div></div></div>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Active Membership</div>
            <div className="text-xs text-muted-foreground mt-1">Keep up the great work!</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="!p-4"><div className="text-3xl">🔥</div><div className="text-2xl font-black mt-1">{member.streak}</div><div className="text-[10px] uppercase text-muted-foreground">Day Streak</div></Card>
        <Card className="!p-4"><div className="text-3xl">🏆</div><div className="text-2xl font-black mt-1">23</div><div className="text-[10px] uppercase text-muted-foreground">Best Streak</div></Card>
      </div>

      <Card className="mb-4"><div className="text-sm font-semibold">This Month</div><div className="text-3xl font-black mt-2">{member.checkIns.length} <span className="text-xs text-muted-foreground font-normal">check-ins</span></div></Card>

      {days < 10 && days > 0 && <button className="btn-primary w-full">Renew Now — Only {days} days left!</button>}
    </div>
  );
}
