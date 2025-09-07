import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
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
      if (parts.length >= 3) {
        subdomain = parts[0];
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
      '/api/setup', 
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
    
    if (skipRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }

    // Find client by subdomain
    const client = await db
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
    const subscription = await db
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
      await db
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
    let settings = {};
    try {
      settings = clientData.settings ? JSON.parse(clientData.settings) : {};
    } catch (e) {
      console.error('Error parsing client settings:', e);
    }

    // Attach tenant info to request
    req.tenant = {
      id: clientData.id,
      subdomain: clientData.subdomain,
      name: clientData.name,
      status: clientData.status,
      subscription: subscription[0] || null,
      settings
    };

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
  if (!req.isSuperAdmin) {
    return res.status(403).json({ 
      error: 'Super admin required',
      message: 'This operation requires super admin privileges.'
    });
  }
  next();
};

// Middleware to check subscription limits
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

    // TODO: Implement feature limit checking based on subscription plan
    // For now, just allow all features
    next();
  };
};