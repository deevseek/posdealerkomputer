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

function mapToPlanSlug(planName: string | null | undefined): SubscriptionPlanSlug | null {
  const normalizedName = (planName ?? '').toLowerCase().trim();

  if (!normalizedName) {
    return null;
  }

  if (normalizedName in PLAN_NAME_MAP) {
    return PLAN_NAME_MAP[normalizedName];
  }

  for (const [key, value] of Object.entries(PLAN_NAME_MAP)) {
    if (normalizedName.includes(key)) {
      return value;
    }
  }

  if ((subscriptionPlanEnum.enumValues as readonly string[]).includes(normalizedName as SubscriptionPlanSlug)) {
    return normalizedName as SubscriptionPlanSlug;
  }

  return null;
}

export function normalizeSubscriptionPlan(planName: string | null | undefined): SubscriptionPlanSlug {
  return mapToPlanSlug(planName) ?? 'basic';
}

export function resolveSubscriptionPlanSlug(
  ...planNames: Array<string | null | undefined>
): SubscriptionPlanSlug {
  for (const name of planNames) {
    const slug = mapToPlanSlug(name);
    if (slug) {
      return slug;
    }
  }

  return 'basic';
}

export function getSubscriptionPlanDisplayName(planNameOrSlug: string | null | undefined): string {
  const planSlug = normalizeSubscriptionPlan(planNameOrSlug);
  return DISPLAY_NAME_MAP[planSlug];
}

export type { SubscriptionPlanSlug };
