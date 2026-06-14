import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/layout/AppShell";
import { useState } from "react";

export const Route = createFileRoute("/member/workout")({
  head: () => ({ meta: [{ title: "My Workout — Fit Force Gym" }] }),
  component: Workout,
});

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const plan: Record<string, { name: string; sets: string }[]> = {
  Mon: [{ name: "Bench Press", sets: "4 × 10" }, { name: "Incline Dumbbell Press", sets: "3 × 12" }, { name: "Tricep Pushdown", sets: "3 × 15" }],
  Tue: [{ name: "Deadlift", sets: "4 × 6" }, { name: "Barbell Row", sets: "4 × 10" }, { name: "Bicep Curls", sets: "3 × 12" }],
  Wed: [{ name: "Rest / Light Cardio", sets: "30 min" }],
  Thu: [{ name: "Squat", sets: "4 × 8" }, { name: "Leg Press", sets: "3 × 12" }, { name: "Calf Raise", sets: "4 × 15" }],
  Fri: [{ name: "Shoulder Press", sets: "4 × 10" }, { name: "Lateral Raise", sets: "3 × 15" }, { name: "Face Pulls", sets: "3 × 15" }],
  Sat: [{ name: "Cardio HIIT", sets: "20 min" }, { name: "Core", sets: "3 × 20" }],
  Sun: [{ name: "Rest Day", sets: "Recover well 💤" }],
};

function Workout() {
  const [day, setDay] = useState("Mon");
  const [done, setDone] = useState<Record<string, boolean>>({});
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">My Workout Plan</h1>
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {days.map((d) => (
          <button key={d} onClick={() => setDay(d)} className={`px-4 py-2 rounded-lg text-xs whitespace-nowrap ${day === d ? "bg-primary text-primary-foreground font-semibold" : "bg-secondary text-muted-foreground"}`}>{d}</button>
        ))}
      </div>
      <Card className="!p-2">
        {plan[day].map((ex, i) => {
          const k = `${day}-${i}`;
          return (
            <label key={k} className="flex items-center gap-3 p-3 border-b last:border-0 border-border/50 cursor-pointer">
              <input type="checkbox" checked={!!done[k]} onChange={(e) => setDone({ ...done, [k]: e.target.checked })} className="w-5 h-5 accent-primary" />
              <div className="flex-1">
                <div className={`font-semibold text-sm ${done[k] ? "line-through text-muted-foreground" : ""}`}>{ex.name}</div>
                <div className="text-xs text-muted-foreground">{ex.sets}</div>
              </div>
            </label>
          );
        })}
      </Card>
    </div>
  );
}
