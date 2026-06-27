import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { AppShell, Card } from "@/components/layout/AppShell";
import { inr } from "@/lib/format";
import { membershipPlans } from "@/lib/membership-plans";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Membership Plans - Fit & Fyt GymOS" }] }),
  component: Pricing,
});

function Pricing() {
  return (
    <AppShell
      title="Membership Plans"
      description="FIT & FYT membership durations and current client prices."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {membershipPlans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative flex min-h-[390px] flex-col ${
              plan.badge === "MOST POPULAR" ? "border-primary/70" : ""
            }`}
          >
            {plan.badge && (
              <span className="absolute right-4 top-4 rounded bg-primary px-2 py-1 text-[9px] font-bold text-white">
                {plan.badge}
              </span>
            )}
            <div className="section-label">{plan.shortName}</div>
            <h2 className="mt-5 text-2xl font-black">{plan.durationLabel}</h2>
            <div className="mt-6 text-4xl font-black text-primary">{inr(plan.price)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {plan.months === 1 ? "per month" : `for ${plan.months} months`}
            </div>
            <div className="my-6 h-px bg-border" />
            <ul className="space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-400" />
                  {feature}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
