import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { clients, subscriptions, plans } from '../../shared/saas-schema';
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
  
  // In production, check for proper super admin status
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
          clients.trialEndsAt <= nextWeek
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
        trialEndsAt: clients.trialEndsAt,
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
  subdomain: z.string().min(1, 'Subdomain is required'),
  email: z.string().email('Valid email is required'),
  planId: z.string().min(1, 'Plan is required')
});

router.post('/clients', async (req, res) => {
  try {
    const { name, subdomain, email, planId } = createClientSchema.parse(req.body);

    // Check if subdomain already exists
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

    // Calculate trial end date (7 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    // Create client
    const [newClient] = await db
      .insert(clients)
      .values({
        name,
        subdomain,
        email,
        status: 'trial',
        trialEndsAt,
        settings: JSON.stringify({
          planId: plan.id,
          planName: plan.name,
          maxUsers: plan.limits?.maxUsers || 10,
          maxStorage: plan.limits?.maxStorage || 1000
        })
      })
      .returning();

    // Create initial subscription record (pending payment)
    await db
      .insert(subscriptions)
      .values({
        clientId: newClient.id,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price.toString(),
        paymentStatus: 'pending',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });

    res.json({
      message: 'Client created successfully',
      client: newClient
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

// Get all subscription plans
router.get('/plans', async (req, res) => {
  try {
    const allPlans = await db
      .select()
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(plans.price);

    res.json(allPlans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ message: 'Failed to fetch plans' });
  }
});

// Get client details with subscription history
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