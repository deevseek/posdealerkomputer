import { pgTable, text, timestamp, integer, boolean, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enums for SaaS system
export const clientStatusEnum = pgEnum('client_status', ['active', 'suspended', 'expired', 'trial']);
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['basic', 'pro', 'premium']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'cancelled']);

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
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Subscriptions table - Track client subscriptions
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  plan: subscriptionPlanEnum('plan').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
  amount: integer('amount').notNull(), // Amount in cents
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

// Plan features table - Define what each plan includes
export const planFeatures = pgTable('plan_features', {
  id: uuid('id').primaryKey().defaultRandom(),
  plan: subscriptionPlanEnum('plan').notNull(),
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

// Types
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type PlanFeature = typeof planFeatures.$inferSelect;
export type TenantSession = typeof tenantSessions.$inferSelect;
export type SaasAuditLog = typeof saasAuditLog.$inferSelect;