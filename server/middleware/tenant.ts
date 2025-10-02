import { Request, Response, NextFunction } from 'express';
import { primaryDb, ensureTenantDbForSettings, setTenantDbForRequest, TenantProvisioningError } from '../db';
import { clients, subscriptions } from '../../shared/saas-schema';
import { eq, and } from 'drizzle-orm';

// Extend Express Request to include tenant info
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        subdomain: string;
      name: string;
      status: string;
      subscription?: any;
      settings?: any;
      database?: {
        connectionString: string;
      };
      };
      isSuperAdmin?: boolean;
    }
  }
}

// Middleware to detect tenant from subdomain
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const host = req.headers.host || '';
    console.log('Host header:', host);
    
    // IMMEDIATE CHECK: In development, if accessing admin routes, grant super admin access
    if ((host.includes('.replit.dev') || host.includes('.replit.app') || host.includes('localhost')) && req.path.startsWith('/api/admin')) {
      console.log('Development admin route detected, granting super admin access');
      req.isSuperAdmin = true;
      return next();
    }
    
    // Extract subdomain
    let subdomain = '';
    
    // Handle different environments
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      // Development: check for subdomain in query param or header, skip tenant detection if not specified
      subdomain = req.query.tenant as string || req.headers['x-tenant'] as string;
      
      // If no tenant specified in localhost, skip tenant middleware entirely
      if (!subdomain) {
        console.log('Localhost development: No tenant specified, skipping tenant middleware');
        return next();
      }
    } else if (host.includes('.ngrok.io') || host.includes('.ngrok-free.app')) {
      // Ngrok: Use query param or header for tenant
      subdomain = req.query.tenant as string || req.headers['x-tenant'] as string || 'demo';
    } else if (host.includes('.replit.dev') || host.includes('.replit.app')) {
      // Replit development environment: Use query param or header, or skip tenant detection
      subdomain = req.query.tenant as string || req.headers['x-tenant'] as string;
      
      // If no tenant specified in Replit, skip tenant middleware entirely
      if (!subdomain) {
        console.log('Replit development: No tenant specified, skipping tenant middleware');
        return next();
      }
    } else {
      // Production: extract subdomain from domain
      const parts = host.split('.');
      
      // Handle known base domains correctly
      const knownBaseDomains = ['profesionalservis.my.id'];
      const isKnownBaseDomain = knownBaseDomains.some(baseDomain => host === baseDomain || host === `www.${baseDomain}`);
      
      if (isKnownBaseDomain) {
        // This is the main domain, not a subdomain
        subdomain = 'main';
      } else if (parts.length >= 4) {
        // Real subdomain: subdomain.profesionalservis.my.id
        subdomain = parts[0];
      } else if (parts.length === 3) {
        // Could be subdomain.domain.com or domain.co.id
        // Check if it matches our base domain pattern
        const possibleBaseDomain = parts.slice(1).join('.');
        if (knownBaseDomains.includes(possibleBaseDomain)) {
          subdomain = parts[0]; // Real subdomain like client.profesionalservis.my.id
        } else {
          subdomain = 'main'; // Main domain like domain.co.id
        }
      } else {
        // Main domain - might be super admin or landing page
        subdomain = 'main';
      }
    }

    console.log('Detected subdomain:', subdomain);

    // Special handling for super admin routes
    if (subdomain === 'admin' || subdomain === 'main' || req.path.startsWith('/api/admin')) {
      req.isSuperAdmin = true;
      return next();
    }

    // Skip tenant detection for certain routes and original app routes
    const skipRoutes = [
      '/api/auth', 
      '/api/health', 
      '/api/saas/register', 
      '/api/saas/plans', 
      '/api/saas/payment', 
      '/api/payment-webhook',
      '/api/users',
      '/api/customers',
      '/api/products',
      '/api/transactions',
      '/api/service-tickets',
      '/api/suppliers',
      '/api/reports',
      '/api/financial',
      '/api/whatsapp'
    ];
    
    // Admin routes remain super-admin only, but allow setup routes for tenant onboarding
    const superAdminOnlyRoutes = ['/api/admin'];

    if (superAdminOnlyRoutes.some(route => req.path.startsWith(route))) {
      if (subdomain !== 'admin' && subdomain !== 'main' && !req.path.startsWith('/api/admin')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Admin panel hanya dapat diakses oleh super admin.'
        });
      }
      req.isSuperAdmin = true;
      return next();
    }
    
    if (skipRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }

    // Find client by subdomain
    const client = await primaryDb
      .select()
      .from(clients)
      .where(eq(clients.subdomain, subdomain))
      .limit(1);

    if (!client.length) {
      return res.status(404).json({ 
        error: 'Tenant not found',
        subdomain,
        message: 'This subdomain is not registered or has been suspended.'
      });
    }

    const clientData = client[0];

    // Check client status
    if (clientData.status === 'suspended') {
      return res.status(403).json({ 
        error: 'Account suspended',
        message: 'This account has been suspended. Please contact support.'
      });
    }

    if (clientData.status === 'expired') {
      return res.status(402).json({ 
        error: 'Subscription expired',
        message: 'Your subscription has expired. Please renew to continue using the service.',
        renewUrl: `/renew?client=${clientData.id}`
      });
    }

    // Get active subscription
    const subscription = await primaryDb
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.clientId, clientData.id),
          eq(subscriptions.paymentStatus, 'paid')
        )
      )
      .orderBy(subscriptions.endDate)
      .limit(1);

    // Check subscription expiry
    if (subscription.length && subscription[0].endDate < new Date()) {
      // Update client status to expired
      await primaryDb
        .update(clients)
        .set({
          status: 'expired',
          updatedAt: new Date()
        })
        .where(eq(clients.id, clientData.id));

      return res.status(402).json({ 
        error: 'Subscription expired',
        message: 'Your subscription has expired. Please renew to continue using the service.',
        renewUrl: `/renew?client=${clientData.id}`
      });
    }

    // Parse settings
    let settings: any = {};
    try {
      settings = clientData.settings ? JSON.parse(clientData.settings) : {};
    } catch (e) {
      console.error('Error parsing client settings:', e);
    }

    const normalizedSettings = typeof settings === 'object' && settings !== null ? settings : {};

    const shouldAutoProvision = (process.env.TENANT_DB_AUTO_PROVISION ?? 'true').toLowerCase() !== 'false';

    try {
      const { db: tenantDb, connectionString, created, databaseName } = await ensureTenantDbForSettings(
        clientData.subdomain,
        normalizedSettings as Record<string, unknown>,

        { autoProvision: shouldAutoProvision },

        { autoProvision: true },

      );

      const existingDatabaseSettings =
        normalizedSettings.database && typeof normalizedSettings.database === 'object'
          ? (normalizedSettings.database as Record<string, unknown>)
          : {};

      const existingDatabaseName =
        typeof existingDatabaseSettings === 'object' && existingDatabaseSettings !== null && 'name' in existingDatabaseSettings
          ? existingDatabaseSettings.name
          : undefined;

      const existingConnectionString =
        typeof existingDatabaseSettings === 'object' && existingDatabaseSettings !== null &&
        'connectionString' in existingDatabaseSettings
          ? existingDatabaseSettings.connectionString
          : undefined;

      const settingsMissingConnection =
        !existingConnectionString || existingConnectionString !== connectionString;

      if (settingsMissingConnection || created) {
        const updatedDatabaseSettings = {
          ...existingDatabaseSettings,
          connectionString,
          name: databaseName ?? (existingDatabaseName as string | undefined),
          autoProvisioned: true,
        };

        normalizedSettings.database = updatedDatabaseSettings;

        await primaryDb
          .update(clients)
          .set({ settings: JSON.stringify(normalizedSettings) })
          .where(eq(clients.id, clientData.id));
      }

      setTenantDbForRequest(tenantDb, { clientId: clientData.id, connectionString });
      req.tenant = {
        id: clientData.id,
        subdomain: clientData.subdomain,
        name: clientData.name,
        status: clientData.status,
        subscription: subscription[0] || null,
        settings: normalizedSettings,
        database: {
          connectionString,
        },
      };
    } catch (dbError) {
      console.error('Failed to establish tenant database connection:', dbError);

      if (dbError instanceof TenantProvisioningError) {
        return res.status(503).json({
          error: 'Tenant database provisioning failed',
          message: dbError.message,
          code: dbError.code,
        });
      }

      return res.status(500).json({
        error: 'Tenant database unavailable',
        message: 'Konfigurasi database tenant tidak valid atau database tidak dapat dihubungi.'
      });
    }

    // Tenant information already attached with database context above

    console.log('Tenant loaded:', req.tenant.name, req.tenant.subdomain);
    next();

  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({ 
      error: 'Tenant detection failed',
      message: 'Unable to determine tenant. Please try again.'
    });
  }
};

// Middleware to require valid tenant
export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  if (!req.tenant && !req.isSuperAdmin) {
    return res.status(400).json({ 
      error: 'No tenant context',
      message: 'This operation requires a valid tenant context.'
    });
  }
  next();
};

// Middleware to require super admin access
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  console.log('RequireSuperAdmin middleware check:', { 
    isSuperAdmin: req.isSuperAdmin, 
    path: req.path,
    host: req.headers.host 
  });
  if (!req.isSuperAdmin) {
    console.log('Access denied - not super admin');
    return res.status(403).json({ 
      error: 'Super admin required',
      message: 'This operation requires super admin privileges.'
    });
  }
  console.log('Super admin access granted');
  next();
};

// Middleware to check subscription limits and feature access
export const checkSubscriptionLimits = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.isSuperAdmin) {
      return next(); // Super admin bypasses limits
    }

    if (!req.tenant?.subscription) {
      return res.status(402).json({
        error: 'No active subscription',
        message: 'An active subscription is required for this feature.'
      });
    }

    try {
      // Get the subscription plan and check if feature is enabled
      const subscription = req.tenant.subscription;
      
      // If subscription is expired
      if (subscription.endDate && new Date(subscription.endDate) < new Date()) {
        return res.status(402).json({
          error: 'Subscription expired',
          message: 'Your subscription has expired. Please renew to continue using this feature.'
        });
      }

      // Check if feature is enabled in the plan
      if (subscription.plan?.features) {
        const planFeatures = JSON.parse(subscription.plan.features);
        
        if (!planFeatures.includes(feature)) {
          return res.status(403).json({
            error: 'Feature not available',
            message: `The '${feature}' feature is not available in your current plan. Please upgrade to access this feature.`,
            requiredFeature: feature,
            currentPlan: subscription.planName
          });
        }
      }

      // Check usage limits if applicable
      if (subscription.plan?.limits) {
        const planLimits = JSON.parse(subscription.plan.limits);
        
        // Example: Check user count limit
        if (feature === 'users' && planLimits.maxUsers) {
          // This would require a query to count current users
          // For now, we'll pass through but this can be extended
        }
        
        // Example: Check transaction limits
        if (feature === 'pos' && planLimits.maxTransactionsPerMonth) {
          // This would require checking current month's transactions
          // For now, we'll pass through but this can be extended
        }
      }

      next();
    } catch (error) {
      console.error('Error checking subscription limits:', error);
      res.status(500).json({
        error: 'Subscription check failed',
        message: 'Unable to verify subscription status.'
      });
    }
  };
};

// Middleware to check specific feature access
export const requireFeature = (featureName: string) => {
  return checkSubscriptionLimits(featureName);
};

// Helper function to check if a client has access to a feature
export const hasFeatureAccess = async (clientId: string, feature: string): Promise<boolean> => {
  try {
    // Import here to avoid circular dependencies
    const { db } = await import('../db');
    const { clients, subscriptions, plans } = await import('../../shared/saas-schema');
    const { eq, and } = await import('drizzle-orm');
    
    const result = await db
      .select({
        planFeatures: plans.features,
        subscriptionEnd: subscriptions.endDate
      })
      .from(clients)
      .leftJoin(subscriptions, and(
        eq(subscriptions.clientId, clients.id),
        eq(subscriptions.paymentStatus, 'paid')
      ))
      .leftJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!result.length || !result[0].planFeatures) {
      return false; // No active subscription or plan
    }

    // Check if subscription is still active
    if (result[0].subscriptionEnd && new Date(result[0].subscriptionEnd) < new Date()) {
      return false; // Subscription expired
    }

    const planFeatures = JSON.parse(result[0].planFeatures);
    return planFeatures.includes(feature);
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
};