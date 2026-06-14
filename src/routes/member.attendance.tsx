import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/layout/AppShell";
import { useApp } from "@/store/app";
import { dmy } from "@/lib/format";

export const Route = createFileRoute("/member/attendance")({
  head: () => ({ meta: [{ title: "My Attendance — Fit Force Gym" }] }),
  component: MyAttendance,
});

function MyAttendance() {
  const member = useApp((s) => s.members[0]);
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i)); return d;
  });
  const checkedSet = new Set(member.checkIns.map((c) => new Date(c).toDateString()));
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">My Attendance</h1>
      <Card className="mb-4">
        <div className="grid grid-cols-7 gap-2">
          {days.map((d, i) => {
            const checked = checkedSet.has(d.toDateString());
            const today = d.toDateString() === new Date().toDateString();
            return (
              <div key={i} className={`aspect-square rounded-lg grid place-items-center text-xs ${checked ? "bg-primary text-primary-foreground font-bold" : today ? "ring-2 ring-primary" : "bg-secondary text-muted-foreground"}`}>
                {d.getDate()}
              </div>
            );
          })}
        </div>
      </Card>
      <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Recent Check-ins</h3>
      <Card className="!p-2">
        {member.checkIns.length === 0 && <div className="p-4 text-sm text-center text-muted-foreground">No check-ins yet</div>}
        {member.checkIns.slice(0, 10).map((c, i) => (
          <div key={i} className="flex justify-between p-3 border-b last:border-0 border-border/50 text-sm">
            <span>{dmy(c)}</span>
            <span className="text-muted-foreground">{new Date(c).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
