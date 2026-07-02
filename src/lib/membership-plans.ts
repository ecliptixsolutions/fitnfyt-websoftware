export type MembershipPlan = {
  name: string;
  shortName: string;
  durationLabel: string;
  months: number;
  price: number;
  badge?: string;
  features: readonly string[];
};

export const membershipPlans: readonly MembershipPlan[] = [
  {
    name: "1 Month Starter",
    shortName: "Starter",
    durationLabel: "1 Month",
    months: 1,
    price: 2000,
    features: ["Gym Access", "Trainer Guidance", "Locker Facility"],
  },
  {
    name: "3 Months Most Popular",
    shortName: "Most Popular",
    durationLabel: "3 Months",
    months: 3,
    price: 5000,
    badge: "MOST POPULAR",
    features: ["Gym Access", "Trainer Guidance", "Progress Monitoring"],
  },
  {
    name: "6 Months Serious Results",
    shortName: "Serious Results",
    durationLabel: "6 Months",
    months: 6,
    price: 8000,
    features: ["Gym Access", "Fitness Assessment", "Progress Tracking", "Priority Support"],
  },
  {
    name: "12 Months Transformation",
    shortName: "Transformation",
    durationLabel: "12 Months",
    months: 12,
    price: 12000,
    badge: "BEST VALUE",
    features: [
      "Full Gym Access",
      "Long-Term Transformation",
      "Regular Assessments",
      "Premium Support",
    ],
  },
];

export const defaultMembershipPlan = membershipPlans[1];

export function getMembershipPlan(name: string) {
  return membershipPlans.find((plan) => plan.name === name) ?? defaultMembershipPlan;
}

export function addPlanMonths(value: string | Date, months: number) {
  const date = new Date(value);
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDayOfTargetMonth = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  date.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return date;
}
