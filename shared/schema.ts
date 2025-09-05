import { z } from "zod";

// Installation wizard step status
export const installationStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "failed"]),
  progress: z.number().min(0).max(100),
  features: z.array(z.string()),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// Discount configuration for transactions
export const discountConfigSchema = z.object({
  id: z.string(),
  type: z.enum(["percentage", "rupiah"]),
  maxValue: z.number(),
  minTransactionAmount: z.number(),
  isActive: z.boolean().default(true),
  description: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
});

// Online tracking configuration
export const trackingConfigSchema = z.object({
  id: z.string(),
  baseUrl: z.string(),
  autoGenerateLinks: z.boolean().default(true),
  linkFormat: z.string(), // e.g., "/track/{serviceId}"
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
});

// WhatsApp API configuration and status
export const whatsappConfigSchema = z.object({
  id: z.string(),
  apiUrl: z.string(),
  apiKey: z.string(),
  webhookUrl: z.string().optional(),
  status: z.enum(["connected", "disconnected", "error"]),
  lastMessageSent: z.date().optional(),
  messagesSentToday: z.number().default(0),
  pendingMessages: z.number().default(0),
  failedMessages: z.number().default(0),
  retryAttempts: z.number().default(3),
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// Print layout configuration
export const printLayoutSchema = z.object({
  id: z.string(),
  type: z.enum(["service_receipt", "payment_receipt", "sales_receipt"]),
  paperSize: z.enum(["a4", "a5", "thermal_58", "thermal_80"]),
  fontSize: z.enum(["small", "normal", "large"]),
  logoPosition: z.enum(["center_top", "left_top", "right_top"]),
  template: z.string(), // HTML template
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
});

// Daily expense categories and tracking
export const expenseCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  icon: z.string(), // Font Awesome class
  color: z.string(), // Tailwind color class
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
});

export const dailyExpenseSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  amount: z.number(),
  description: z.string(),
  date: z.date(),
  time: z.string(),
  userId: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
});

// Types for frontend use
export type InstallationStep = z.infer<typeof installationStepSchema>;
export type DiscountConfig = z.infer<typeof discountConfigSchema>;
export type TrackingConfig = z.infer<typeof trackingConfigSchema>;
export type WhatsappConfig = z.infer<typeof whatsappConfigSchema>;
export type PrintLayout = z.infer<typeof printLayoutSchema>;
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;
export type DailyExpense = z.infer<typeof dailyExpenseSchema>;

// Insert schemas
export const insertInstallationStepSchema = installationStepSchema.omit({
  createdAt: true,
  updatedAt: true,
});

export const insertDiscountConfigSchema = discountConfigSchema.omit({
  id: true,
  createdAt: true,
});

export const insertTrackingConfigSchema = trackingConfigSchema.omit({
  id: true,
  createdAt: true,
});

export const insertWhatsappConfigSchema = whatsappConfigSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPrintLayoutSchema = printLayoutSchema.omit({
  id: true,
  createdAt: true,
});

export const insertExpenseCategorySchema = expenseCategorySchema.omit({
  id: true,
  createdAt: true,
});

export const insertDailyExpenseSchema = dailyExpenseSchema.omit({
  id: true,
  createdAt: true,
});

// Insert types
export type InsertInstallationStep = z.infer<typeof insertInstallationStepSchema>;
export type InsertDiscountConfig = z.infer<typeof insertDiscountConfigSchema>;
export type InsertTrackingConfig = z.infer<typeof insertTrackingConfigSchema>;
export type InsertWhatsappConfig = z.infer<typeof insertWhatsappConfigSchema>;
export type InsertPrintLayout = z.infer<typeof insertPrintLayoutSchema>;
export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;
export type InsertDailyExpense = z.infer<typeof insertDailyExpenseSchema>;
