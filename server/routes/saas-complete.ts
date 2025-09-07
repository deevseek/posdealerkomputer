import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { clients, subscriptions, plans, payments } from '../../shared/saas-schema';
import { users } from '../../shared/schema';
import { eq, count, and, desc, gte, lt, sql, sum, isNull, or } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';

const router = Router();

// Super admin middleware for development
const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'development') {
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

router.use(requireSuperAdmin);

// 🎯 COMPREHENSIVE SaaS MANAGEMENT FEATURES

// 1. CLIENT MANAGEMENT CRUD
// ===========================

// Route moved to admin.ts to fix routing conflicts

// Create new client with trial period
const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subdomain: z.string().min(1, 'Subdomain is required').regex(/^[a-z0-9-]+$/, 'Invalid subdomain format'),
  email: z.string().email('Valid email is required'),
  planId: z.string().min(1, 'Plan is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  trialDays: z.number().default(7)
});

router.post('/clients', async (req, res) => {
  try {
    const validatedData = createClientSchema.parse(req.body);
    const { name, subdomain, email, planId, phone, address, trialDays } = validatedData;

    // Check subdomain availability
    const [existingClient] = await db
      .select()
      .from(clients)
      .where(eq(clients.subdomain, subdomain))
      .limit(1);

    if (existingClient) {
      return res.status(400).json({ message: 'Subdomain already exists' });
    }

    // Get plan details
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, planId))
      .limit(1);

    if (!plan) {
      return res.status(400).json({ message: 'Plan not found' });
    }

    // Calculate trial end date
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Create client
    const [newClient] = await db
      .insert(clients)
      .values({
        name,
        subdomain,
        email,
        phone,
        address,
        status: 'trial',
        trialEndsAt,
        settings: JSON.stringify({
          planId: plan.id,
          planName: plan.name,
          maxUsers: plan.maxUsers || 10,
          maxStorage: plan.maxStorageGB || 1,
          features: JSON.parse(plan.features || '[]')
        })
      })
      .returning();

    // Create initial subscription (trial)
    await db
      .insert(subscriptions)
      .values({
        clientId: newClient.id,
        planId: plan.id,
        planName: plan.name,
        plan: 'basic',
        amount: '0', // Trial is free
        paymentStatus: 'paid',
        startDate: new Date(),
        endDate: trialEndsAt,
        trialEndDate: trialEndsAt,
        autoRenew: false
      });

    res.json({
      message: 'Client created successfully with trial period',
      client: newClient,
      trialEndsAt
    });
  } catch (error) {
    console.error('Error creating client:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to create client' });
  }
});

// Update client
router.put('/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, status, customDomain } = req.body;

    const [updatedClient] = await db
      .update(clients)
      .set({ 
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(address && { address }),
        ...(status && { status }),
        ...(customDomain && { customDomain }),
        updatedAt: new Date()
      })
      .where(eq(clients.id, id))
      .returning();

    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({ message: 'Client updated successfully', client: updatedClient });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Failed to update client' });
  }
});

// Suspend/Activate client
router.patch('/clients/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

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

    // Log status change
    console.log(`Client ${updatedClient.name} status changed to ${status}. Reason: ${reason || 'No reason provided'}`);

    res.json({
      message: `Client status updated to ${status}`,
      client: updatedClient
    });
  } catch (error) {
    console.error('Error updating client status:', error);
    res.status(500).json({ message: 'Failed to update client status' });
  }
});

// Delete client (soft delete)
router.delete('/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Update status to expired instead of hard delete
    const [deletedClient] = await db
      .update(clients)
      .set({ 
        status: 'expired',
        updatedAt: new Date()
      })
      .where(eq(clients.id, id))
      .returning();

    if (!deletedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Cancel all active subscriptions
    await db
      .update(subscriptions)
      .set({ 
        paymentStatus: 'cancelled',
        cancelledAt: new Date()
      })
      .where(and(
        eq(subscriptions.clientId, id),
        eq(subscriptions.paymentStatus, 'paid')
      ));

    res.json({ message: 'Client deactivated successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Failed to delete client' });
  }
});

// 2. ANALYTICS & REPORTING DASHBOARD
// ===================================

// Comprehensive analytics
router.get('/analytics/overview', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Client metrics
    const [totalClientsResult] = await db.select({ count: count() }).from(clients);
    const [activeClientsResult] = await db.select({ count: count() }).from(clients).where(eq(clients.status, 'active'));
    const [trialClientsResult] = await db.select({ count: count() }).from(clients).where(eq(clients.status, 'trial'));
    const [suspendedClientsResult] = await db.select({ count: count() }).from(clients).where(eq(clients.status, 'suspended'));

    // Trial expiring soon
    const [expiringTrialsResult] = await db
      .select({ count: count() })
      .from(clients)
      .where(and(
        eq(clients.status, 'trial'),
        lt(clients.trialEndsAt, sevenDaysFromNow)
      ));

    // Revenue metrics
    const [monthlyRevenueResult] = await db
      .select({ 
        total: sql<number>`sum(cast(${subscriptions.amount} as numeric))`.as('total')
      })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.paymentStatus, 'paid'),
        gte(subscriptions.startDate, thirtyDaysAgo)
      ));

    // Growth metrics (new clients this month)
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [newClientsThisMonthResult] = await db
      .select({ count: count() })
      .from(clients)
      .where(gte(clients.createdAt, firstDayOfMonth));

    // Popular plans
    const popularPlans = await db
      .select({
        planName: subscriptions.planName,
        count: count(),
        revenue: sql<number>`sum(cast(${subscriptions.amount} as numeric))`.as('revenue')
      })
      .from(subscriptions)
      .where(eq(subscriptions.paymentStatus, 'paid'))
      .groupBy(subscriptions.planName)
      .orderBy(desc(count()));

    // Client distribution by status
    const clientsByStatus = await db
      .select({
        status: clients.status,
        count: count()
      })
      .from(clients)
      .groupBy(clients.status);

    res.json({
      clients: {
        total: totalClientsResult.count,
        active: activeClientsResult.count,
        trial: trialClientsResult.count,
        suspended: suspendedClientsResult.count,
        newThisMonth: newClientsThisMonthResult.count,
        expiringTrials: expiringTrialsResult.count
      },
      revenue: {
        monthlyTotal: monthlyRevenueResult.total || 0,
        currency: 'IDR'
      },
      insights: {
        popularPlans,
        clientsByStatus
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

// Revenue analytics with time series
router.get('/analytics/revenue', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Daily revenue
    const dailyRevenue = await db
      .select({
        date: sql<string>`date(${subscriptions.startDate})`.as('date'),
        revenue: sql<number>`sum(cast(${subscriptions.amount} as numeric))`.as('revenue'),
        newSubscriptions: count()
      })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.paymentStatus, 'paid'),
        gte(subscriptions.startDate, startDate)
      ))
      .groupBy(sql`date(${subscriptions.startDate})`)
      .orderBy(sql`date(${subscriptions.startDate})`);

    // MRR calculation
    const [mrrResult] = await db
      .select({
        mrr: sql<number>`sum(cast(${subscriptions.amount} as numeric))`.as('mrr')
      })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.paymentStatus, 'paid'),
        eq(subscriptions.autoRenew, true)
      ));

    res.json({
      period,
      dailyRevenue,
      mrr: mrrResult.mrr || 0,
      currency: 'IDR'
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ message: 'Failed to fetch revenue analytics' });
  }
});

// 3. SUBSCRIPTION LIFECYCLE MANAGEMENT
// ====================================

// Get subscription details for a client
router.get('/clients/:id/subscriptions', async (req, res) => {
  try {
    const { id } = req.params;

    const subscriptionHistory = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.clientId, id))
      .orderBy(desc(subscriptions.createdAt));

    res.json(subscriptionHistory);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ message: 'Failed to fetch subscriptions' });
  }
});

// Upgrade/Downgrade subscription
router.post('/clients/:id/upgrade', async (req, res) => {
  try {
    const { id } = req.params;
    const { planId, paymentMethod = 'manual' } = req.body;

    // Get new plan
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, planId))
      .limit(1);

    if (!plan) {
      return res.status(400).json({ message: 'Plan not found' });
    }

    // Cancel current active subscription
    await db
      .update(subscriptions)
      .set({ 
        paymentStatus: 'cancelled',
        cancelledAt: new Date()
      })
      .where(and(
        eq(subscriptions.clientId, id),
        eq(subscriptions.paymentStatus, 'paid')
      ));

    // Create new subscription
    const [newSubscription] = await db
      .insert(subscriptions)
      .values({
        clientId: id,
        planId: plan.id,
        planName: plan.name,
        plan: plan.name.toLowerCase() as 'basic' | 'pro' | 'premium',
        amount: plan.price.toString(),
        paymentStatus: paymentMethod === 'manual' ? 'paid' : 'pending',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        autoRenew: true
      })
      .returning();

    // Update client status to active
    await db
      .update(clients)
      .set({ 
        status: 'active',
        settings: sql`jsonb_set(
          settings::jsonb, 
          '{planName}', 
          '"${plan.name}"'
        )`,
        updatedAt: new Date()
      })
      .where(eq(clients.id, id));

    res.json({
      message: `Subscription upgraded to ${plan.name}`,
      subscription: newSubscription
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    res.status(500).json({ message: 'Failed to upgrade subscription' });
  }
});

// 4. USER MANAGEMENT PER CLIENT
// =============================

// Get users for a specific client
router.get('/clients/:id/users', async (req, res) => {
  try {
    const { id } = req.params;

    const clientUsers = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        email: users.email,
        isActive: users.isActive,
        lastLogin: sql<Date | null>`null`.as('last_login'),
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.clientId, id))
      .orderBy(desc(users.createdAt));

    res.json(clientUsers);
  } catch (error) {
    console.error('Error fetching client users:', error);
    res.status(500).json({ message: 'Failed to fetch client users' });
  }
});

// Create user for client
const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  email: z.string().email('Valid email required'),
  role: z.enum(['admin', 'kasir', 'teknisi', 'owner', 'purchasing', 'finance'])
});

router.post('/clients/:id/users', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = createUserSchema.parse(req.body);
    const { username, password, email, role } = validatedData;

    // Check client exists and get limits
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check user limit
    const [userCountResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.clientId, id));

    const settings = JSON.parse(client.settings || '{}');
    const maxUsers = settings.maxUsers || 3;

    if (userCountResult.count >= maxUsers) {
      return res.status(400).json({ 
        message: `User limit reached. Maximum ${maxUsers} users allowed for this plan.` 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        email,
        role,
        clientId: id,
        isActive: true
      })
      .returning();

    res.json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// 5. TRIAL EXPIRY NOTIFICATIONS
// =============================

// Get trials expiring soon
router.get('/notifications/expiring-trials', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Number(days));

    const expiringTrials = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        subdomain: clients.subdomain,
        trialEndsAt: clients.trialEndsAt,
        daysRemaining: sql<number>`date_part('day', ${clients.trialEndsAt} - now())`.as('days_remaining')
      })
      .from(clients)
      .where(and(
        eq(clients.status, 'trial'),
        lt(clients.trialEndsAt, futureDate)
      ))
      .orderBy(clients.trialEndsAt);

    res.json(expiringTrials);
  } catch (error) {
    console.error('Error fetching expiring trials:', error);
    res.status(500).json({ message: 'Failed to fetch expiring trials' });
  }
});

// Send trial expiry reminder
router.post('/notifications/remind-trial/:id', async (req, res) => {
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

    // In a real implementation, you would send email here
    console.log(`Trial reminder sent to ${client.email} for ${client.name}`);
    
    res.json({ 
      message: `Trial reminder sent to ${client.name}`,
      client: client.name,
      email: client.email
    });
  } catch (error) {
    console.error('Error sending trial reminder:', error);
    res.status(500).json({ message: 'Failed to send trial reminder' });
  }
});

// PLAN FEATURES CONFIGURATION API
// ===================================

// Get plan features for a specific plan
router.get('/plan-features/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    
    const plan = await db
      .select()
      .from(plans)
      .where(eq(plans.id, planId))
      .limit(1);
    
    if (!plan.length) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    const planData = plan[0];
    const features = planData.features ? JSON.parse(planData.features) : [];
    const limits = planData.limits ? JSON.parse(planData.limits) : {};
    
    res.json({
      planId: planData.id,
      planName: planData.name,
      features,
      limits: {
        maxUsers: limits.maxUsers || planData.maxUsers,
        maxTransactionsPerMonth: limits.maxTransactionsPerMonth || planData.maxTransactionsPerMonth,
        maxStorageGB: limits.maxStorageGB || planData.maxStorageGB,
        ...limits
      }
    });
  } catch (error) {
    console.error('Error fetching plan features:', error);
    res.status(500).json({ error: 'Failed to fetch plan features' });
  }
});

// Update plan features and limits
router.put('/plans/:planId/features', async (req, res) => {
  try {
    const { planId } = req.params;
    const { features, limits } = req.body;
    
    // Validate input
    if (!Array.isArray(features)) {
      return res.status(400).json({ error: 'Features must be an array' });
    }
    
    if (typeof limits !== 'object') {
      return res.status(400).json({ error: 'Limits must be an object' });
    }
    
    // Update plan with new features and limits
    const updatedPlan = await db
      .update(plans)
      .set({
        features: JSON.stringify(features),
        limits: JSON.stringify(limits),
        maxUsers: limits.maxUsers || null,
        maxTransactionsPerMonth: limits.maxTransactionsPerMonth || null,
        maxStorageGB: limits.maxStorageGB || null,
        whatsappIntegration: features.includes('whatsapp'),
        customBranding: features.includes('custom_branding'),
        apiAccess: features.includes('api_access'),
        prioritySupport: features.includes('priority_support'),
        updatedAt: new Date()
      })
      .where(eq(plans.id, planId))
      .returning();
    
    if (!updatedPlan.length) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    res.json({
      success: true,
      message: 'Plan features updated successfully',
      plan: updatedPlan[0]
    });
  } catch (error) {
    console.error('Error updating plan features:', error);
    res.status(500).json({ error: 'Failed to update plan features' });
  }
});

// Get available features list
router.get('/available-features', async (req, res) => {
  try {
    const availableFeatures = [
      'dashboard', 'pos', 'service', 'inventory', 'purchasing', 'finance',
      'customers', 'suppliers', 'users', 'roles', 'reports', 'stock_movements',
      'settings', 'whatsapp', 'custom_branding', 'api_access', 'priority_support'
    ];
    
    res.json({ features: availableFeatures });
  } catch (error) {
    console.error('Error fetching available features:', error);
    res.status(500).json({ error: 'Failed to fetch available features' });
  }
});

export default router;