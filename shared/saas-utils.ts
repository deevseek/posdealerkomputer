import { subscriptionPlanEnum } from './saas-schema';

type SubscriptionPlanSlug = (typeof subscriptionPlanEnum.enumValues)[number];

const PLAN_NAME_MAP: Record<string, SubscriptionPlanSlug> = {
  basic: 'basic',
  starter: 'basic',
  pro: 'pro',
  professional: 'pro',
  premium: 'premium',
  enterprise: 'premium'
};

const DISPLAY_NAME_MAP: Record<SubscriptionPlanSlug, string> = {
  basic: 'Basic',
  pro: 'Professional',
  premium: 'Enterprise'
};

export function normalizeSubscriptionPlan(planName: string | null | undefined): SubscriptionPlanSlug {
  const normalizedName = (planName ?? '').toLowerCase().trim();

  if (normalizedName in PLAN_NAME_MAP) {
    return PLAN_NAME_MAP[normalizedName];
  }

  if ((subscriptionPlanEnum.enumValues as readonly string[]).includes(normalizedName as SubscriptionPlanSlug)) {
    return normalizedName as SubscriptionPlanSlug;
  }

  return 'basic';
}

export function getSubscriptionPlanDisplayName(planName: string | null | undefined): string {
  const planSlug = normalizeSubscriptionPlan(planName);
  return DISPLAY_NAME_MAP[planSlug];
}

export type { SubscriptionPlanSlug };
