import { pgTable, text, timestamp, integer, boolean, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enums for SaaS system
export const clientStatusEnum = pgEnum('client_status', ['active', 'suspended', 'expired', 'trial']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'cancelled']);

export const PLAN_CODE_VALUES = ['basic', 'pro', 'premium'] as const;
export type SubscriptionPlan = (typeof PLAN_CODE_VALUES)[number];

const PLAN_CODE_ALIAS_MAP: Record<string, SubscriptionPlan> = {
  basic: 'basic',
  starter: 'basic',
  standard: 'basic',
  entry: 'basic',
  lite: 'basic',
  core: 'basic',
  pro: 'pro',
  professional: 'pro',
  bisnis: 'pro',
  business: 'pro',
  growth: 'pro',
  advanced: 'pro',
  premium: 'premium',
  enterprise: 'premium',
  ultimate: 'premium',
  elite: 'premium',
  unlimited: 'premium',
};

export const normalizePlanCode = (value: unknown): SubscriptionPlan | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  return PLAN_CODE_ALIAS_MAP[normalized];
};

export const derivePlanCodeFromName = (
  planName: string,
  fallback: SubscriptionPlan = 'basic',
): SubscriptionPlan => {
  const normalized = planName.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  const directMatch = normalizePlanCode(normalized);
  if (directMatch) {
    return directMatch;
  }

  for (const [keyword, code] of Object.entries(PLAN_CODE_ALIAS_MAP)) {
    if (normalized.includes(keyword)) {
      return code;
    }
  }

  return fallback;
};

export const ensurePlanCode = (
  candidate: unknown,
  options: { fallbackName?: string; defaultCode?: SubscriptionPlan } = {},
): SubscriptionPlan => {
  const direct = normalizePlanCode(candidate);
  if (direct) {
    return direct;
  }

  const { fallbackName, defaultCode = 'basic' } = options;

  if (typeof fallbackName === 'string') {
    return derivePlanCodeFromName(fallbackName, defaultCode);
  }

  return defaultCode;
};

const PLAN_LIMIT_CODE_KEYS = ['planCode', 'plan_code', 'plan', 'code', 'tier', 'level'] as const;
const PLAN_LIMIT_CODE_KEY_SET = new Set<string>(PLAN_LIMIT_CODE_KEYS);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const safeParseJson = <T>(value: string | null | undefined): T | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return undefined;
  }
};

const coerceLimitsRecord = (input: unknown): Record<string, unknown> | undefined => {
  if (!input) {
    return undefined;
  }

  if (typeof input === 'string') {
    const parsed = safeParseJson<Record<string, unknown>>(input);
    return parsed ? { ...parsed } : undefined;
  }

  if (isPlainObject(input)) {
    return { ...(input as Record<string, unknown>) };
  }

  return undefined;
};

const sanitizeLimitsRecord = (
  record: Record<string, unknown> | undefined,
  planCode: SubscriptionPlan,
): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};

  if (record) {
    for (const [key, value] of Object.entries(record)) {
      if (PLAN_LIMIT_CODE_KEY_SET.has(key)) {
        continue;
      }

      if (value !== undefined) {
        sanitized[key] = value;
      }
    }
  }

  sanitized.planCode = planCode;
  return sanitized;
};

const stableStringify = (value: Record<string, unknown>): string =>
  JSON.stringify(value, Object.keys(value).sort());

// Clients table - Each tenant/customer
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  subdomain: text('subdomain').notNull().unique(),
  status: clientStatusEnum('status').notNull().default('trial'),
  phone: text('phone'),
  address: text('address'),
  logo: text('logo'), // URL to logo
  customDomain: text('custom_domain'), // Optional custom domain
  settings: text('settings'), // JSON settings
  trialEndsAt: timestamp('trial_ends_at'), // Trial end date
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Subscriptions table - Track client subscriptions
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  planId: uuid('plan_id').references(() => plans.id),
  planName: text('plan_name').notNull(),
  plan: text('plan').notNull().$type<SubscriptionPlan>(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
  amount: text('amount').notNull(), // Amount as string to handle different currencies
  currency: text('currency').notNull().default('IDR'),
  autoRenew: boolean('auto_renew').notNull().default(true),
  trialEndDate: timestamp('trial_end_date'),
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Payments table - Track payment history
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('IDR'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  paymentMethod: text('payment_method'), // bank_transfer, credit_card, etc
  transactionId: text('transaction_id'), // External payment gateway transaction ID
  gatewayResponse: text('gateway_response'), // JSON response from payment gateway
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Subscription plans table - Define available plans
export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  price: integer('price').notNull(), // Price in cents/rupiah
  currency: text('currency').notNull().default('IDR'),
  billingPeriod: text('billing_period').notNull().default('monthly'), // monthly, yearly
  isActive: boolean('is_active').notNull().default(true),
  features: text('features'), // JSON array of features
  limits: text('limits'), // JSON object with plan limits
  maxUsers: integer('max_users').default(5),
  maxTransactionsPerMonth: integer('max_transactions_per_month').default(1000),
  maxStorageGB: integer('max_storage_gb').default(1),
  whatsappIntegration: boolean('whatsapp_integration').default(false),
  customBranding: boolean('custom_branding').default(false),
  apiAccess: boolean('api_access').default(false),
  prioritySupport: boolean('priority_support').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

type PlanRow = typeof plans.$inferSelect;

const collectPlanCodeCandidates = (
  record: Record<string, unknown> | undefined,
  plan: Partial<Record<string, unknown>>,
): string[] => {
  const candidates: string[] = [];

  if (record) {
    for (const key of PLAN_LIMIT_CODE_KEYS) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        candidates.push(value);
      }
    }
  }

  for (const key of PLAN_LIMIT_CODE_KEYS) {
    const value = plan[key];
    if (typeof value === 'string' && value.trim()) {
      candidates.push(value);
    }
  }

  return candidates;
};

const findFirstPlanCodeAlias = (
  record: Record<string, unknown> | undefined,
  plan: Partial<Record<string, unknown>>,
): string | undefined => {
  if (record) {
    for (const key of PLAN_LIMIT_CODE_KEYS) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
  }

  for (const key of PLAN_LIMIT_CODE_KEYS) {
    const value = plan[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return undefined;
};

type PlanConfigurationInput = {
  name: string;
  limits?: PlanRow['limits'] | Record<string, unknown> | null;
} & Partial<Record<string, unknown>>;

export const resolvePlanConfiguration = (
  plan: PlanConfigurationInput,
  options: { fallbackCode?: SubscriptionPlan } = {},
) => {
  const rawLimits = coerceLimitsRecord(plan.limits);
  const planRecord = plan as Partial<Record<string, unknown>>;
  const planCodeCandidates = collectPlanCodeCandidates(rawLimits, planRecord);

  const derivedPlanCode =
    planCodeCandidates.reduce<SubscriptionPlan | undefined>((resolved, candidate) => {
      if (resolved) {
        return resolved;
      }

      return normalizePlanCode(candidate);
    }, undefined) ?? derivePlanCodeFromName(plan.name, options.fallbackCode ?? 'basic');

  const canonicalPlanCode = ensurePlanCode(derivedPlanCode, {
    fallbackName: plan.name,
    defaultCode: options.fallbackCode ?? 'basic',
  });

  const normalizedLimits = sanitizeLimitsRecord(rawLimits, canonicalPlanCode);
  const normalizedLimitsJson = stableStringify(normalizedLimits);

  let shouldPersistNormalizedLimits = false;

  if (plan.limits == null) {
    shouldPersistNormalizedLimits = Object.keys(normalizedLimits).length > 0;
  } else if (typeof plan.limits === 'string') {
    const parsed = safeParseJson<Record<string, unknown>>(plan.limits);
    if (!parsed) {
      shouldPersistNormalizedLimits = true;
    } else {
      const existingNormalized = sanitizeLimitsRecord(parsed, canonicalPlanCode);
      const existingJson = stableStringify(existingNormalized);
      shouldPersistNormalizedLimits = existingJson !== normalizedLimitsJson;
    }
  } else if (isPlainObject(plan.limits)) {
    const existingNormalized = sanitizeLimitsRecord(
      plan.limits as Record<string, unknown>,
      canonicalPlanCode,
    );
    const existingJson = stableStringify(existingNormalized);
    shouldPersistNormalizedLimits = existingJson !== normalizedLimitsJson;
  } else {
    shouldPersistNormalizedLimits = true;
  }

  const aliasSource = findFirstPlanCodeAlias(rawLimits, planRecord);
  if (typeof aliasSource === 'string') {
    const normalizedAlias = normalizePlanCode(aliasSource);
    const aliasLower = aliasSource.trim().toLowerCase();

    if (!normalizedAlias || normalizedAlias !== aliasLower || normalizedAlias !== canonicalPlanCode) {
      shouldPersistNormalizedLimits = true;
    }
  }

  return {
    planCode: canonicalPlanCode,
    normalizedLimits,
    normalizedLimitsJson,
    shouldPersistNormalizedLimits,
  };
};

// Plan features table - Define what each plan includes (legacy, keeping for compatibility)
export const planFeatures = pgTable('plan_features', {
  id: uuid('id').primaryKey().defaultRandom(),
  plan: text('plan').notNull().$type<SubscriptionPlan>(),
  featureName: text('feature_name').notNull(),
  featureValue: text('feature_value'), // Can be boolean, number, or text
  maxUsers: integer('max_users').default(5),
  maxTransactionsPerMonth: integer('max_transactions_per_month').default(1000),
  maxStorageGB: integer('max_storage_gb').default(1),
  whatsappIntegration: boolean('whatsapp_integration').default(false),
  customBranding: boolean('custom_branding').default(false),
  apiAccess: boolean('api_access').default(false),
  prioritySupport: boolean('priority_support').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tenant-aware user sessions (for multi-tenant auth)
export const tenantSessions = pgTable('tenant_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  userId: uuid('user_id').notNull(), // References users.id from main schema
  sessionToken: text('session_token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Audit log for SaaS operations
export const saasAuditLog = pgTable('saas_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id),
  userId: uuid('user_id'), // Admin or user who performed action
  action: text('action').notNull(), // create_client, update_subscription, etc
  resourceType: text('resource_type').notNull(), // client, subscription, payment
  resourceId: text('resource_id'),
  details: text('details'), // JSON details of the action
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Zod schemas for validation
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type PlanFeature = typeof planFeatures.$inferSelect;
export type TenantSession = typeof tenantSessions.$inferSelect;
export type SaasAuditLog = typeof saasAuditLog.$inferSelect;