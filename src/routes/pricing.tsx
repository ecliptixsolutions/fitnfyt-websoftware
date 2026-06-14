import { createFileRoute } from "@tanstack/react-router";
import { Check, Crown, IndianRupee, Sparkles, Users } from "lucide-react";
import { useState, type ComponentType } from "react";
import { AppShell, Card } from "@/components/layout/AppShell";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Plans - Fit & Fyt GymOS" }] }),
  component: Pricing,
});

type Duration = "6m" | "1y" | "2y";

type Plan = {
  name: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  popular?: boolean;
  active?: boolean;
  prices: Record<Duration, number>;
  features: readonly string[];
};

const plans: Plan[] = [
  {
    name: "Basic",
    subtitle: "For growing neighbourhood gyms",
    icon: Users,
    prices: { "6m": 4999, "1y": 8999, "2y": 16999 },
    features: [
      "Unlimited members",
      "Staff management",
      "Finance and leads",
      "2,000 SMS credits",
      "Up to 3 logins",
    ],
  },
  {
    name: "Premium",
    subtitle: "For teams ready to automate",
    icon: Sparkles,
    popular: true,
    prices: { "6m": 6999, "1y": 11999, "2y": 21499 },
    features: [
      "Everything in Basic",
      "Member app branding",
      "One biometric device",
      "Multi-branch portal",
      "Up to 8 logins",
    ],
  },
  {
    name: "Premium Plus",
    subtitle: "For multi-branch fitness businesses",
    icon: Crown,
    active: true,
    prices: { "6m": 13499, "1y": 24999, "2y": 44999 },
    features: [
      "Everything in Premium",
      "Multiple biometric devices",
      "Daily email backup",
      "10,000 SMS credits",
      "Up to 25 logins",
    ],
  },
];

function Pricing() {
  const [duration, setDuration] = useState<Duration>("1y");

  return (
    <AppShell
      title="Plans"
      description="Choose the right operating plan for your gym."
      actions={
        <div className="flex rounded-md bg-input p-1">
          {(["6m", "1y", "2y"] as Duration[]).map((value) => (
            <button
              key={value}
              onClick={() => setDuration(value)}
              className={`rounded px-4 py-2 text-xs ${
                duration === value ? "bg-primary font-bold text-white" : "text-muted-foreground"
              }`}
            >
              {value === "6m" ? "6 Months" : value === "1y" ? "1 Year" : "2 Years"}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="section-label">Current plan</div>
          <div className="mt-3 flex items-center gap-2 text-lg font-bold">
            <Crown className="h-5 w-5 text-primary" />
            Premium Plus
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Renews on 12 June 2027</div>
        </Card>
        <Card>
          <div className="section-label">Billing cycle</div>
          <div className="mt-3 text-lg font-bold">Annual</div>
          <div className="mt-1 text-xs text-emerald-400">Saving 18% yearly</div>
        </Card>
        <Card>
          <div className="section-label">Next invoice</div>
          <div className="mt-3 flex items-center gap-2 text-lg font-bold">
            <IndianRupee className="h-5 w-5 text-primary" />
            {inr(24999)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Taxes calculated at checkout</div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card
              key={plan.name}
              className={`relative flex min-h-[430px] flex-col ${
                plan.popular ? "border-primary/70" : ""
              }`}
            >
              {plan.popular && (
                <span className="absolute right-4 top-4 rounded-full bg-primary px-2 py-1 text-[9px] font-bold text-white">
                  MOST POPULAR
                </span>
              )}
              <div className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-xl font-black">{plan.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{plan.subtitle}</p>
              <div className="mt-6 text-3xl font-black">{inr(plan.prices[duration])}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">+ applicable taxes</div>
              <div className="my-6 h-px bg-border" />
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs">
                    <Check className="h-4 w-4 text-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                disabled={plan.active}
                className={`mt-auto min-h-10 rounded-md text-xs font-bold ${
                  plan.active
                    ? "cursor-not-allowed border border-border bg-secondary text-muted-foreground"
                    : plan.popular
                      ? "bg-primary text-white"
                      : "border border-border hover:bg-secondary"
                }`}
              >
                {plan.active ? "CURRENT PLAN" : "CHOOSE PLAN"}
              </button>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
