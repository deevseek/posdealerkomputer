import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import {
  clients,
  subscriptions,
  plans,
  payments,
  resolvePlanConfiguration,
  safeParseJson,
  ensurePlanCode,
} from '../../shared/saas-schema';
import { eq, and } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';
// Note: Stripe will be added when user provides API keys

const router = Router();

// Super admin middleware
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

// 💳 STRIPE PAYMENT PROCESSING
// ============================

// Create payment intent for subscription
const createPaymentSchema = z.object({
  clientId: z.string().min(1, 'Client ID required'),
  planId: z.string().min(1, 'Plan ID required'),
  paymentMethod: z.enum(['stripe', 'bank_transfer', 'manual']).default('stripe')
});

router.post('/payments/create-intent', async (req, res) => {
  try {
    const { clientId, planId, paymentMethod } = createPaymentSchema.parse(req.body);

    // Get client and plan
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    const [plan] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);

    if (!client || !plan) {
      return res.status(404).json({ message: 'Client or plan not found' });
    }

    // For now, simulate payment creation without Stripe
    // When Stripe keys are provided, this will use real Stripe API
    const mockPaymentIntent = {
      id: `pi_mock_${Date.now()}`,
      clientSecret: `pi_mock_${Date.now()}_secret_mock`,
      amount: plan.price,
      currency: 'idr',
      status: 'requires_payment_method'
    };

    // Create payment record
    const [payment] = await db
      .insert(payments)
      .values({
        subscriptionId: null as any, // Will be set after subscription creation
        clientId: client.id,
        amount: plan.price,
        currency: 'IDR',
        status: 'pending',
        paymentMethod,
        transactionId: mockPaymentIntent.id,
        gatewayResponse: JSON.stringify(mockPaymentIntent)
      })
      .returning();

    res.json({
      paymentIntent: mockPaymentIntent,
      payment,
      message: 'Payment intent created (mock mode - provide Stripe keys for real payments)'
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to create payment intent' });
  }
});

// Confirm payment and activate subscription
router.post('/payments/confirm/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { paymentIntentId } = req.body;

    // Get payment record
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update payment status to paid
    await db
      .update(payments)
      .set({ 
        status: 'paid',
        paidAt: new Date(),
        gatewayResponse: JSON.stringify({ 
          paymentIntentId,
          confirmedAt: new Date().toISOString() 
        })
      })
      .where(eq(payments.id, paymentId));

    // Get client and create/update subscription
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, payment.clientId))
      .limit(1);

    if (client) {
      // Cancel existing active subscriptions
      await db
        .update(subscriptions)
        .set({ 
          paymentStatus: 'cancelled',
          cancelledAt: new Date()
        })
        .where(and(
          eq(subscriptions.clientId, client.id),
          eq(subscriptions.paymentStatus, 'paid')
        ));

      // Find the plan for this payment amount
      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.price, payment.amount))
        .limit(1);

      if (plan) {
      const {
        planCode: canonicalPlanCode,
        normalizedLimits,
        normalizedLimitsJson,
        shouldPersistNormalizedLimits,
      } = resolvePlanConfiguration(plan);

      const subscriptionPlan = ensurePlanCode(canonicalPlanCode, {
        fallbackName: typeof plan.name === 'string' ? plan.name : undefined,
      });

      const normalizedPlanLimits = {
        ...normalizedLimits,
        planCode: subscriptionPlan,
      };

        if (shouldPersistNormalizedLimits) {
          await db
            .update(plans)
            .set({ limits: normalizedLimitsJson })
            .where(eq(plans.id, plan.id));
        }

        const parsedPlanFeatures = safeParseJson<unknown>(plan.features);

        // Create new active subscription
        const [newSubscription] = await db
          .insert(subscriptions)
          .values({
            clientId: client.id,
            planId: plan.id,
            planName: plan.name,
            plan: subscriptionPlan,
            amount: payment.amount.toString(),
            paymentStatus: 'paid',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            autoRenew: true
          })
          .returning();

        // Update payment with subscription ID
        await db
          .update(payments)
          .set({ subscriptionId: newSubscription.id })
          .where(eq(payments.id, paymentId));

        const existingSettings = safeParseJson<Record<string, unknown>>(client.settings);
        const updatedSettings: Record<string, unknown> = {
          ...(existingSettings ?? {}),
          planId: plan.id,
          planName: plan.name,
          planCode: subscriptionPlan,
          limits: normalizedPlanLimits,
        };

        if (parsedPlanFeatures !== undefined) {
          updatedSettings.features = parsedPlanFeatures;
        } else if (plan.features) {
          updatedSettings.features = plan.features;
        }

        // Update client status to active
        await db
          .update(clients)
          .set({
            status: 'active',
            settings: JSON.stringify(updatedSettings),
            updatedAt: new Date()
          })
          .where(eq(clients.id, client.id));
      }
    }

    res.json({ 
      message: 'Payment confirmed and subscription activated',
      paymentId,
      status: 'paid'
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ message: 'Failed to confirm payment' });
  }
});

// Get payment history for a client
router.get('/clients/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;

    const paymentHistory = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        paymentMethod: payments.paymentMethod,
        transactionId: payments.transactionId,
        paidAt: payments.paidAt,
        createdAt: payments.createdAt,
        subscriptionId: payments.subscriptionId
      })
      .from(payments)
      .where(eq(payments.clientId, id))
      .orderBy(payments.createdAt);

    res.json(paymentHistory);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Failed to fetch payment history' });
  }
});

// 📊 BILLING & INVOICING SYSTEM
// =============================

// Generate invoice for subscription
router.post('/invoices/generate/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    // Get subscription with client and plan details
    const [subscription] = await db
      .select({
        id: subscriptions.id,
        clientId: subscriptions.clientId,
        planName: subscriptions.planName,
        amount: subscriptions.amount,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        clientName: clients.name,
        clientEmail: clients.email,
        clientAddress: clients.address
      })
      .from(subscriptions)
      .leftJoin(clients, eq(clients.id, subscriptions.clientId))
      .where(eq(subscriptions.id, subscriptionId))
      .limit(1);

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Generate invoice (in real implementation, you'd create PDF)
    const invoice = {
      invoiceNumber: `INV-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      client: {
        name: subscription.clientName,
        email: subscription.clientEmail,
        address: subscription.clientAddress
      },
      items: [{
        description: `${subscription.planName} Subscription`,
        period: `${subscription.startDate?.toISOString().split('T')[0]} - ${subscription.endDate?.toISOString().split('T')[0]}`,
        amount: parseInt(subscription.amount),
        currency: 'IDR'
      }],
      total: parseInt(subscription.amount),
      currency: 'IDR'
    };

    res.json({
      message: 'Invoice generated successfully',
      invoice
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ message: 'Failed to generate invoice' });
  }
});

// Get billing summary for all clients
router.get('/billing/summary', async (req, res) => {
  try {
    const billingSummary = await db
      .select({
        clientId: clients.id,
        clientName: clients.name,
        planName: subscriptions.planName,
        monthlyAmount: subscriptions.amount,
        status: subscriptions.paymentStatus,
        nextBilling: subscriptions.endDate,
        autoRenew: subscriptions.autoRenew
      })
      .from(clients)
      .leftJoin(subscriptions, and(
        eq(subscriptions.clientId, clients.id),
        eq(subscriptions.paymentStatus, 'paid')
      ))
      .where(eq(clients.status, 'active'));

    res.json(billingSummary);
  } catch (error) {
    console.error('Error fetching billing summary:', error);
    res.status(500).json({ message: 'Failed to fetch billing summary' });
  }
});

export default router;