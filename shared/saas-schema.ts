import { pgTable, text, timestamp, integer, boolean, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enums for SaaS system
export const clientStatusEnum = pgEnum('client_status', ['active', 'suspended', 'expired', 'trial']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'cancelled']);

export const PLAN_CODE_VALUES = ['basic', 'pro', 'premium'] as const;
export type SubscriptionPlan = (typeof PLAN_CODE_VALUES)[number];

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