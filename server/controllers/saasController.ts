import { Request, Response } from 'express';
import { db } from '../db';
import { clients, subscriptions, payments, planFeatures } from '../../shared/saas-schema';
import { insertClientSchema, insertSubscriptionSchema } from '../../shared/saas-schema';
import { eq, and, desc, count } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { storage } from '../storage';

export class SaasController {
  
  // Client registration
  static async registerClient(req: Request, res: Response) {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      
      // Check if subdomain is available
      const existingClient = await db
        .select()
        .from(clients)
        .where(eq(clients.subdomain, validatedData.subdomain))
        .limit(1);

      if (existingClient.length > 0) {
        return res.status(400).json({
          error: 'Subdomain not available',
          message: 'This subdomain is already taken. Please choose another.'
        });
      }

      // Check if email is already registered
      const existingEmail = await db
        .select()
        .from(clients)
        .where(eq(clients.email, validatedData.email))
        .limit(1);

      if (existingEmail.length > 0) {
        return res.status(400).json({
          error: 'Email already registered',
          message: 'This email is already associated with another account.'
        });
      }

      // Create client
      const newClient = await db
        .insert(clients)
        .values({
          ...validatedData,
          status: 'trial'
        })
        .returning();

      // Create trial subscription (7 days)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);

      await db.insert(subscriptions).values({
        clientId: newClient[0].id,
        plan: 'basic',
        startDate: new Date(),
        endDate: trialEndDate,
        paymentStatus: 'paid',
        amount: 0,
        currency: 'IDR',
        autoRenew: false
      });

      // Create default admin user for the tenant
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await storage.createUser({
        id: `admin-${newClient[0].id}`,
        clientId: newClient[0].id, // Add client_id to user
        username: 'admin',
        email: validatedData.email,
        firstName: 'Admin',
        lastName: 'User',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });

      res.status(201).json({
        success: true,
        client: {
          id: newClient[0].id,
          name: newClient[0].name,
          subdomain: newClient[0].subdomain,
          status: newClient[0].status
        },
        message: 'Client registered successfully. You have 7 days of free trial.',
        accessUrl: `http://${validatedData.subdomain}.laptoppos.com`
      });

    } catch (error) {
      console.error('Client registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: 'Unable to create client account. Please try again.'
      });
    }
  }

  // Get client info
  static async getClientInfo(req: Request, res: Response) {
    try {
      if (!req.tenant) {
        return res.status(400).json({ error: 'No tenant context' });
      }

      const clientInfo = await db
        .select()
        .from(clients)
        .where(eq(clients.id, req.tenant.id))
        .limit(1);

      if (!clientInfo.length) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Get active subscription
      const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.clientId, req.tenant.id))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);

      res.json({
        client: clientInfo[0],
        subscription: subscription[0] || null
      });

    } catch (error) {
      console.error('Get client info error:', error);
      res.status(500).json({ error: 'Unable to fetch client information' });
    }
  }

  // Create subscription
  static async createSubscription(req: Request, res: Response) {
    try {
      if (!req.tenant) {
        return res.status(400).json({ error: 'No tenant context' });
      }

      const { plan, duration } = req.body; // duration in months

      // Define pricing
      const pricing = {
        basic: { monthly: 99000, yearly: 990000 },
        pro: { monthly: 199000, yearly: 1990000 },
        premium: { monthly: 399000, yearly: 3990000 }
      };

      if (!pricing[plan as keyof typeof pricing]) {
        return res.status(400).json({ error: 'Invalid plan' });
      }

      const isYearly = duration === 12;
      const planPricing = pricing[plan as keyof typeof pricing];
      const amount = isYearly ? planPricing.yearly : planPricing.monthly;

      // Calculate dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + duration);

      // Create subscription
      const newSubscription = await db
        .insert(subscriptions)
        .values({
          clientId: req.tenant.id,
          plan,
          startDate,
          endDate,
          paymentStatus: 'pending',
          amount,
          currency: 'IDR',
          autoRenew: true
        })
        .returning();

      res.status(201).json({
        success: true,
        subscription: newSubscription[0],
        paymentUrl: `/payment?subscription=${newSubscription[0].id}`,
        message: 'Subscription created. Please complete payment to activate.'
      });

    } catch (error) {
      console.error('Create subscription error:', error);
      res.status(500).json({ error: 'Unable to create subscription' });
    }
  }

  // Mock payment endpoint
  static async processPayment(req: Request, res: Response) {
    try {
      const { subscriptionId, paymentMethod = 'bank_transfer' } = req.body;

      // Get subscription
      const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, subscriptionId))
        .limit(1);

      if (!subscription.length) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      const sub = subscription[0];

      // Create payment record
      const payment = await db
        .insert(payments)
        .values({
          subscriptionId: sub.id,
          clientId: sub.clientId,
          amount: sub.amount,
          currency: sub.currency,
          status: 'paid', // Mock payment always succeeds
          paymentMethod,
          transactionId: `mock_${Date.now()}`,
          paidAt: new Date()
        })
        .returning();

      // Update subscription status
      await db
        .update(subscriptions)
        .set({ 
          paymentStatus: 'paid',
          updatedAt: new Date()
        })
        .where(eq(subscriptions.id, sub.id));

      // Update client status to active
      await db
        .update(clients)
        .set({ 
          status: 'active',
          updatedAt: new Date()
        })
        .where(eq(clients.id, sub.clientId));

      res.json({
        success: true,
        payment: payment[0],
        message: 'Payment processed successfully. Your subscription is now active!'
      });

    } catch (error) {
      console.error('Payment processing error:', error);
      res.status(500).json({ error: 'Payment processing failed' });
    }
  }

  // Get subscription plans
  static async getPlans(req: Request, res: Response) {
    try {
      const plans = await db
        .select()
        .from(planFeatures)
        .orderBy(planFeatures.plan);

      // Group features by plan
      const planData = {
        basic: {
          name: 'Basic',
          price: { monthly: 99000, yearly: 990000 },
          features: plans.filter(p => p.plan === 'basic')
        },
        pro: {
          name: 'Pro', 
          price: { monthly: 199000, yearly: 1990000 },
          features: plans.filter(p => p.plan === 'pro')
        },
        premium: {
          name: 'Premium',
          price: { monthly: 399000, yearly: 3990000 },
          features: plans.filter(p => p.plan === 'premium')
        }
      };

      res.json({ plans: planData });

    } catch (error) {
      console.error('Get plans error:', error);
      res.status(500).json({ error: 'Unable to fetch plans' });
    }
  }

  // Super Admin: Get all clients
  static async getAllClients(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const allClients = await db
        .select()
        .from(clients)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(clients.createdAt));

      const totalClients = await db
        .select({ count: count() })
        .from(clients);

      res.json({
        clients: allClients,
        pagination: {
          page,
          limit,
          total: totalClients[0].count,
          pages: Math.ceil(totalClients[0].count / limit)
        }
      });

    } catch (error) {
      console.error('Get all clients error:', error);
      res.status(500).json({ error: 'Unable to fetch clients' });
    }
  }

  // Super Admin: Update client status
  static async updateClientStatus(req: Request, res: Response) {
    try {
      const { clientId } = req.params;
      const { status } = req.body;

      if (!['active', 'suspended', 'expired', 'trial'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      await db
        .update(clients)
        .set({ 
          status,
          updatedAt: new Date()
        })
        .where(eq(clients.id, clientId));

      res.json({
        success: true,
        message: `Client status updated to ${status}`
      });

    } catch (error) {
      console.error('Update client status error:', error);
      res.status(500).json({ error: 'Unable to update client status' });
    }
  }

  // Super Admin: Get dashboard stats
  static async getDashboardStats(req: Request, res: Response) {
    try {
      const totalClients = await db
        .select({ count: count() })
        .from(clients);

      const activeClients = await db
        .select({ count: count() })
        .from(clients)
        .where(eq(clients.status, 'active'));

      const trialClients = await db
        .select({ count: count() })
        .from(clients)
        .where(eq(clients.status, 'trial'));

      const totalRevenue = await db
        .select()
        .from(payments)
        .where(eq(payments.status, 'paid'));

      const revenue = totalRevenue.reduce((sum, payment) => sum + payment.amount, 0);

      res.json({
        stats: {
          totalClients: totalClients[0].count,
          activeClients: activeClients[0].count,
          trialClients: trialClients[0].count,
          suspendedClients: totalClients[0].count - activeClients[0].count - trialClients[0].count,
          totalRevenue: revenue,
          avgRevenuePerClient: activeClients[0].count > 0 ? revenue / activeClients[0].count : 0
        }
      });

    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ error: 'Unable to fetch dashboard stats' });
    }
  }
}