import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import {
  clients,
  subscriptions,
  plans,
  PLAN_CODE_VALUES as SHARED_PLAN_CODES,
  resolvePlanConfiguration,
  safeParseJson,
} from '../../shared/saas-schema';
import { users } from '../../shared/schema';
import { eq, count, and, desc, gte, lt, sql } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';

// Local super admin check since these routes bypass tenant middleware
const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  // In development, always allow admin access
  if (process.env.NODE_ENV === 'development') {
    req.isSuperAdmin = true;
    console.log('Development mode: Granting super admin access');
    return next();
  }

  // Debug log session user info
  if (req.session && req.session.user) {
    console.log('Session user:', req.session.user);
  }

  // In production, check for proper super admin status
  // Cek session user dan role
  if (req.session && req.session.user && (req.session.user.role === 'super_admin' || req.session.user.role === 'admin')) {
    req.isSuperAdmin = true;
    return next();
  }

  if (!req.isSuperAdmin) {
    return res.status(403).json({ 
      error: 'Super admin required',
      message: 'This operation requires super admin privileges.'
    });
  }
  next();
};

const router = Router();

// All admin routes require super admin access
router.use(requireSuperAdmin);

const PLAN_CODE_VALUES = SHARED_PLAN_CODES;

const coerceLimitsPayload = (input: unknown): Record<string, unknown> | undefined => {
  if (!input) {
    return undefined;
  }

  if (typeof input === 'string') {
    const parsed = safeParseJson<Record<string, unknown>>(input);
    return parsed ? { ...parsed } : undefined;
  }

  if (typeof input === 'object' && !Array.isArray(input)) {
    return { ...(input as Record<string, unknown>) };
  }

  return undefined;
};

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    // Total clients
    const [totalClientsResult] = await db
      .select({ count: count() })
      .from(clients);
    const totalClients = totalClientsResult.count;

    // Active clients
    const [activeClientsResult] = await db
      .select({ count: count() })
      .from(clients)
      .where(eq(clients.status, 'active'));
    const activeClients = activeClientsResult.count;

    // New clients this month
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [newClientsResult] = await db
      .select({ count: count() })
      .from(clients)
      .where(gte(clients.createdAt, firstDayOfMonth));
    const newClientsThisMonth = newClientsResult.count;

    // Monthly revenue (mock for now)
    const monthlyRevenue = activeClients * 299000; // Assuming average 299k per month

    // Expiring trials (trials ending in next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const [expiringTrialsResult] = await db
      .select({ count: count() })
      .from(clients)
      .where(
        and(
          eq(clients.status, 'trial'),
          lt(clients.trialEndsAt, nextWeek)
        )
      );
    const expiringTrials = expiringTrialsResult.count;

    res.json({
      totalClients,
      activeClients,
      newClientsThisMonth,
      monthlyRevenue,
      revenueGrowth: 15, // Mock growth percentage
      expiringTrials
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

// Get all clients with their subscriptions
router.get('/clients', async (req, res) => {
  try {
    const clientsWithSubscriptions = await db
      .select({
        id: clients.id,
        name: clients.name,
        subdomain: clients.subdomain,
        email: clients.email,
        status: clients.status,
        createdAt: clients.createdAt,
        subscription: {
          id: subscriptions.id,
          planName: subscriptions.planName,
          paymentStatus: subscriptions.paymentStatus,
          startDate: subscriptions.startDate,
          endDate: subscriptions.endDate,
          amount: subscriptions.amount
        }
      })
      .from(clients)
      .leftJoin(
        subscriptions, 
        and(
          eq(subscriptions.clientId, clients.id),
          eq(subscriptions.paymentStatus, 'paid')
        )
      )
      .orderBy(desc(clients.createdAt));

    res.json(clientsWithSubscriptions);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Failed to fetch clients' });
  }
});

// Create new client
const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subdomain: z
    .string()
    .min(1, 'Subdomain is required')
    .regex(/^[a-z0-9-]+$/i, 'Subdomain hanya boleh berisi huruf, angka, dan tanda hubung'),
  email: z.string().email('Valid email is required'),
  planId: z.string().uuid('Plan is required'),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  trialDays: z.coerce.number().min(0).max(90).optional().default(7),
});

router.post('/clients', async (req, res) => {
  try {
    const parsed = createClientSchema.parse(req.body);

    const name = parsed.name.trim();
    const subdomain = parsed.subdomain.trim().toLowerCase();
    const email = parsed.email.trim().toLowerCase();
    const phone = parsed.phone?.trim();
    const address = parsed.address?.trim();
    const trialDays = parsed.trialDays ?? 7;
    const { planId } = parsed;

    if (!name) {
      return res.status(400).json({ message: 'Client name is required' });
    }

    if (!subdomain) {
      return res.status(400).json({ message: 'Subdomain is required' });
    }

    const fullDomain = `${subdomain}.profesionalservis.my.id`;

    const [existingSubdomain] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.subdomain, subdomain))
      .limit(1);

    if (existingSubdomain) {
      return res.status(400).json({ message: 'Subdomain already exists' });
    }

    const [existingEmail] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.email, email))
      .limit(1);

    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, planId))
      .limit(1);

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const {
      planCode: canonicalPlanCode,
      normalizedLimits,
      normalizedLimitsJson,
      shouldPersistNormalizedLimits,
    } = resolvePlanConfiguration(plan);

    const normalizedPlanLimits = {
      ...normalizedLimits,
      planCode: canonicalPlanCode,
    };

    if (shouldPersistNormalizedLimits) {
      await db
        .update(plans)
        .set({ limits: normalizedLimitsJson })
        .where(eq(plans.id, plan.id));
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    const settingsPayload: Record<string, unknown> = {
      planId: plan.id,
      planName: plan.name,
      planCode: canonicalPlanCode,
      maxUsers: plan.maxUsers ?? undefined,
      maxStorage: plan.maxStorageGB ?? undefined,
      domain: fullDomain,
    };

    if (plan.features) {
      const parsedFeatures = safeParseJson<unknown>(plan.features);
      settingsPayload.features = parsedFeatures ?? plan.features;
    }

    if (Object.keys(normalizedPlanLimits).length > 0) {
      settingsPayload.limits = normalizedPlanLimits;
    }

    const [newClient] = await db
      .insert(clients)
      .values({
        name,
        subdomain,
        email,
        phone: phone || null,
        address: address || null,
        customDomain: fullDomain,
        status: 'trial',
        trialEndsAt,
        settings: JSON.stringify(settingsPayload),
      })
      .returning();

    const subscriptionStart = new Date();
    const subscriptionEnd = new Date(subscriptionStart);
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

    await db.insert(subscriptions).values({
      clientId: newClient.id,
      planId: plan.id,
      planName: plan.name,
      plan: canonicalPlanCode,
      amount: plan.price.toString(),
      currency: plan.currency ?? 'IDR',
      paymentStatus: 'pending',
      startDate: subscriptionStart,
      endDate: subscriptionEnd,
      trialEndDate: trialEndsAt,
    });

    res.json({
      message: 'Client created successfully',
      client: newClient,
    });
  } catch (error) {
    console.error('Error creating client:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
      });
    }
    res.status(500).json({ message: 'Failed to create client' });
  }
});

// Update client status
router.patch('/clients/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'expired', 'trial'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const [updatedClient] = await db
      .update(clients)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(clients.id, id))
      .returning();

    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({
      message: 'Client status updated successfully',
      client: updatedClient
    });
  } catch (error) {
    console.error('Error updating client status:', error);
    res.status(500).json({ message: 'Failed to update client status' });
  }
});

// Plan management
const planBaseSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().default('').optional(),
  price: z.number().min(0, 'Price must be non-negative'),
  currency: z.string().default('IDR').optional(),
  billingPeriod: z.enum(['monthly', 'yearly']).default('monthly').optional(),
  maxUsers: z.number().min(1, 'Max users must be at least 1').optional(),
  maxTransactionsPerMonth: z.number().min(0, 'Max transactions must be non-negative').optional(),
  maxStorageGB: z.number().min(0, 'Max storage must be non-negative').optional(),
  whatsappIntegration: z.boolean().optional(),
  customBranding: z.boolean().optional(),
  apiAccess: z.boolean().optional(),
  prioritySupport: z.boolean().optional(),
  isActive: z.boolean().optional(),
  planCode: z.enum(PLAN_CODE_VALUES).optional(),
  features: z.union([z.array(z.string()), z.string()]).optional(),
  limits: z.union([z.record(z.any()), z.string()]).optional(),
});

const createPlanSchema = planBaseSchema;

router.post('/plans', async (req, res) => {
  try {
    const validatedData = createPlanSchema.parse(req.body);

    const {
      planCode: requestedPlanCode,
      limits,
      features,
      description,
      currency,
      billingPeriod,
      whatsappIntegration,
      customBranding,
      apiAccess,
      prioritySupport,
      isActive,
      ...coreData
    } = validatedData;

    const planConfigurationInput = {
      name: coreData.name,
      limits: limits ?? null,
      ...(requestedPlanCode ? { planCode: requestedPlanCode } : {}),
    };

    const {
      planCode: effectivePlanCode,
      normalizedLimits,
      normalizedLimitsJson,
    } = resolvePlanConfiguration(planConfigurationInput, {
      fallbackCode: requestedPlanCode,
    });

    const normalizedFeatures =
      features !== undefined
        ? Array.isArray(features)
          ? JSON.stringify(features)
          : features
        : undefined;

    const [newPlan] = await db
      .insert(plans)
      .values({
        name: coreData.name,
        description: description?.trim() ?? '',
        price: coreData.price,
        currency: currency ?? 'IDR',
        billingPeriod: billingPeriod ?? 'monthly',
        maxUsers: coreData.maxUsers,
        maxTransactionsPerMonth: coreData.maxTransactionsPerMonth,
        maxStorageGB: coreData.maxStorageGB,
        whatsappIntegration: whatsappIntegration ?? false,
        customBranding: customBranding ?? false,
        apiAccess: apiAccess ?? false,
        prioritySupport: prioritySupport ?? false,
        isActive: isActive ?? true,
        features: normalizedFeatures,
        limits: normalizedLimitsJson,
      })
      .returning();

    res.status(201).json({
      message: 'Plan created successfully',
      plan: {
        ...newPlan,
        planCode: effectivePlanCode,
        limits: normalizedLimitsJson,
        normalizedLimits,
      },
    });
  } catch (error) {
    console.error('Error creating plan:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
      });
    }
    res.status(500).json({ message: 'Failed to create plan' });
  }
});

// Get all subscription plans
router.get('/plans', async (req, res) => {
  try {
    const allPlans = await db
      .select()
      .from(plans)
      .orderBy(plans.price);

    res.json(allPlans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ message: 'Failed to fetch plans' });
  }
});

// Update plan pricing and details
const updatePlanSchema = planBaseSchema.partial();

router.put('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updatePlanSchema.parse(req.body);

    const {
      planCode: requestedPlanCode,
      limits,
      features,
      ...restUpdates
    } = validatedData;

    const updatePayload: Record<string, any> = {
      ...restUpdates,
      updatedAt: new Date(),
    };

    if (features !== undefined) {
      updatePayload.features = Array.isArray(features)
        ? JSON.stringify(features)
        : features;
    }

    // Check if plan exists
    const [existingPlan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, id))
      .limit(1);

    if (!existingPlan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const existingConfiguration = resolvePlanConfiguration(existingPlan);
    const incomingLimitsRecord = coerceLimitsPayload(limits);

    let mergedLimitsSource: Record<string, unknown> | undefined;

    if (incomingLimitsRecord) {
      mergedLimitsSource = {
        ...existingConfiguration.normalizedLimits,
        ...incomingLimitsRecord,
      };
    } else if (limits !== undefined) {
      mergedLimitsSource = { ...existingConfiguration.normalizedLimits };
    }

    const planConfigurationInput = {
      name: existingPlan.name,
      limits: mergedLimitsSource ?? existingPlan.limits,
      ...(requestedPlanCode ? { planCode: requestedPlanCode } : {}),
    };

    const canonicalConfiguration = resolvePlanConfiguration(planConfigurationInput, {
      fallbackCode: requestedPlanCode ?? existingConfiguration.planCode,
    });

    if (
      limits !== undefined ||
      requestedPlanCode !== undefined ||
      existingConfiguration.shouldPersistNormalizedLimits ||
      canonicalConfiguration.shouldPersistNormalizedLimits
    ) {
      updatePayload.limits = canonicalConfiguration.normalizedLimitsJson;
    }

    // Update plan
    const [updatedPlan] = await db
      .update(plans)
      .set(updatePayload)
      .where(eq(plans.id, id))
      .returning();

    res.json({
      message: 'Plan updated successfully',
      plan: {
        ...updatedPlan,
        planCode: canonicalConfiguration.planCode,
        normalizedLimits: canonicalConfiguration.normalizedLimits,
      }
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to update plan' });
  }
});

// IMPORTANT: Put specific routes BEFORE parameter routes to avoid conflicts
// Move /clients/detailed from saas-complete.ts to here and put it BEFORE /clients/:id

// Get all clients with detailed subscription info (moved from saas-complete.ts)
router.get('/clients/detailed', async (req, res) => {
  try {
    const clientsData = await db
      .select({
        id: clients.id,
        name: clients.name,
        subdomain: clients.subdomain,
        email: clients.email,
        status: clients.status,
        phone: clients.phone,
        address: clients.address,
        logo: clients.logo,
        customDomain: clients.customDomain,
        settings: clients.settings,
        trialEndsAt: clients.trialEndsAt,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
        // Subscription info
        subscriptionId: subscriptions.id,
        planName: subscriptions.planName,
        planAmount: subscriptions.amount,
        subscriptionStatus: subscriptions.paymentStatus,
        subscriptionStart: subscriptions.startDate,
        subscriptionEnd: subscriptions.endDate,
        autoRenew: subscriptions.autoRenew,
        // User count
        userCount: sql<number>`count(${users.id})`.as('user_count')
      })
      .from(clients)
      .leftJoin(subscriptions, and(
        eq(subscriptions.clientId, clients.id),
        eq(subscriptions.paymentStatus, 'paid')
      ))
      .leftJoin(users, sql`${users.clientId}::uuid = ${clients.id}`)
      .groupBy(
        clients.id, 
        subscriptions.id,
        subscriptions.planName,
        subscriptions.amount,
        subscriptions.paymentStatus,
        subscriptions.startDate,
        subscriptions.endDate,
        subscriptions.autoRenew
      )
      .orderBy(desc(clients.createdAt));

    res.json(clientsData);
  } catch (error) {
    console.error('Error fetching detailed clients:', error);
    res.status(500).json({ message: 'Failed to fetch client details' });
  }
});

// Get client details with subscription history (parameter route - must be AFTER specific routes)
router.get('/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Get subscription history
    const subscriptionHistory = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.clientId, id))
      .orderBy(desc(subscriptions.createdAt));

    // Get user count for this client
    const [userCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.clientId, id));

    res.json({
      ...client,
      subscriptionHistory,
      userCount: userCount.count
    });
  } catch (error) {
    console.error('Error fetching client details:', error);
    res.status(500).json({ message: 'Failed to fetch client details' });
  }
});

export default router;