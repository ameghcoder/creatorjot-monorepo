/**
 * Subscription Plans — Single Source of Truth
 *
 * All plan metadata lives here. Consumed by:
 * - Homepage pricing section
 * - /pricing page
 * - Onboarding plan selector
 *
 * Icon names reference lucide-react icon component names.
 * The rendering component is responsible for mapping these to actual icons.
 */

export type PlanFeature = {
  /** lucide-react icon name (e.g. 'Zap') OR 'siX' for simple-icons Twitter */
  icon: string;
  text: string;
};

export type SubscriptionPlan = {
  /** Matches the plan_type value in user_active_plan */
  id: "free" | "pro";
  name: string;
  price: number;
  interval: string;
  description: string;
  popular: boolean;
  features: PlanFeature[];
  cta: {
    label: string;
    href: string;
  };
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: "mo",
    description: "Get started with basic content generation.",
    popular: false,
    features: [
      { icon: "Zap", text: "2 generations per month" },
      { icon: "siX", text: "Twitter posts only" },
    ],
    cta: {
      label: "Start Free",
      href: "/auth/signup",
    },
  },
  {
    id: "pro",
    name: "Pro",
    price: 19,
    interval: "mo",
    description: "Unlock multi-platform content and advanced features.",
    popular: true,
    features: [
      { icon: "Infinity", text: "120 credits per month" },
      { icon: "Users", text: "Multi-platform content" },
      { icon: "SlidersHorizontal", text: "Advanced tone controls" },
      { icon: "Lightbulb", text: "Viral hooks & insights" },
    ],
    cta: {
      label: "Get Now",
      href: "/auth/signup",
    },
  },
];

/** Helper to get a plan by its id */
export function getPlanById(id: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.id === id);
}
