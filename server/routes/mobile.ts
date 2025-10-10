import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import type { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { authenticateUser } from '../auth';
import { storage } from '../storage';
import {
  db,
  primaryDb,
  ensureTenantDbForSettings,
  setTenantDbForRequest,
  TenantProvisioningError,
} from '../db';
import { clients } from '../../shared/saas-schema';
import { products, categories, storeConfig as storeConfigTable } from '../../shared/schema';
import { and, or, ilike, eq, count, asc, type SQL } from 'drizzle-orm';

type MobileJwtPayload = JwtPayload & {
  sub: string;
  clientId: string;
  role?: string;
  username?: string;
};

type SanitizedStoreConfig = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxRate: number | null;
  setupCompleted: boolean;
  whatsappEnabled: boolean;
  whatsappConnected: boolean;
};

declare global {
  namespace Express {
    interface Request {
      mobileUser?: {
        id: string;
        clientId: string;
        role?: string;
        username?: string;
      };
      mobileClient?: {
        id: string;
        name: string;
        subdomain: string;
        status: string;
      };
    }
  }
}

const router = Router();

const jwtSecret: Secret =
  process.env.MOBILE_JWT_SECRET || process.env.SESSION_SECRET || 'laptoppos-mobile-secret';
const jwtExpiresIn = process.env.MOBILE_JWT_EXPIRES_IN || '12h';
const autoProvisionTenants = (process.env.TENANT_DB_AUTO_PROVISION ?? 'true').toLowerCase() !== 'false';
const jwtSignOptions: SignOptions = { expiresIn: jwtExpiresIn as StringValue };

class HttpError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'HttpError';
  }
}

const parseClientSettings = (raw: unknown): Record<string, unknown> => {
  if (!raw) {
    return {};
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch (error) {
      console.error('Failed to parse client settings for mobile API:', error);
    }
    return {};
  }

  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  return {};
};

const resolveTenantContext = async (clientId: string) => {
  const [client] = await primaryDb.select().from(clients).where(eq(clients.id, clientId)).limit(1);

  if (!client) {
    throw new HttpError('Tenant not found for user', 404);
  }

  if (client.status === 'suspended' || client.status === 'expired') {
    throw new HttpError('Tenant subscription is not active', 403);
  }

  const settings = parseClientSettings(client.settings);

  const { db: tenantDb, connectionString } = await ensureTenantDbForSettings(
    client.subdomain,
    settings,
    { autoProvision: autoProvisionTenants },
  );

  return { client, settings, tenantDb, connectionString };
};

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
});

const productParamsSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
});

const sanitizeUser = (user: any) => ({
  id: user.id,
  clientId: user.clientId ?? null,
  username: user.username ?? null,
  email: user.email ?? null,
  firstName: user.firstName ?? null,
  lastName: user.lastName ?? null,
  role: user.role ?? null,
  isActive: user.isActive ?? null,
  createdAt: user.createdAt ?? null,
  updatedAt: user.updatedAt ?? null,
});

const sanitizeStoreConfig = (config: typeof storeConfigTable.$inferSelect | undefined | null): SanitizedStoreConfig | null => {
  if (!config) {
    return null;
  }

  const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'number') {
      return value;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  return {
    id: config.id,
    name: config.name,
    address: config.address ?? null,
    phone: config.phone ?? null,
    email: config.email ?? null,
    taxRate: toNumber(config.taxRate),
    setupCompleted: Boolean(config.setupCompleted),
    whatsappEnabled: Boolean(config.whatsappEnabled),
    whatsappConnected: Boolean(config.whatsappConnected),
  };
};

router.post('/login', async (req: Request, res: Response) => {
  try {
    const credentials = loginSchema.parse(req.body);
    const user = await authenticateUser(credentials);

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    if (!user.clientId) {
      return res.status(403).json({ message: 'User is not associated with a tenant' });
    }

    const { client, tenantDb, connectionString } = await resolveTenantContext(user.clientId);

    setTenantDbForRequest(tenantDb, { clientId: client.id, connectionString });

    const storeConfig = await storage.getStoreConfig(client.id);

    const token = jwt.sign(
      {
        sub: user.id,
        clientId: client.id,
        role: user.role,
        username: user.username,
      },
      jwtSecret,
      jwtSignOptions,
    );

    return res.json({
      token,
      user: sanitizeUser(user),
      tenant: {
        id: client.id,
        name: client.name,
        subdomain: client.subdomain,
        status: client.status,
        trialEndsAt: client.trialEndsAt,
      },
      store: sanitizeStoreConfig(storeConfig),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.flatten(),
      });
    }

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    if (error instanceof TenantProvisioningError) {
      return res.status(503).json({
        message: 'Tenant database is not available. Please try again shortly.',
      });
    }

    console.error('Mobile login error:', error);
    return res.status(500).json({ message: 'Failed to login' });
  }
});

const mobileAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      return res.status(401).json({ message: 'Authorization header is required' });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return res.status(401).json({ message: 'Authorization token is missing' });
    }

    const decoded = jwt.verify(token, jwtSecret) as MobileJwtPayload | string;

    if (typeof decoded === 'string') {
      return res.status(401).json({ message: 'Invalid authorization token' });
    }

    if (!decoded.sub || typeof decoded.clientId !== 'string') {
      return res.status(401).json({ message: 'Invalid authorization token payload' });
    }

    const { client, settings, tenantDb, connectionString } = await resolveTenantContext(decoded.clientId);

    setTenantDbForRequest(tenantDb, { clientId: client.id, connectionString });

    req.mobileUser = {
      id: decoded.sub,
      clientId: client.id,
      role: typeof decoded.role === 'string' ? decoded.role : undefined,
      username: typeof decoded.username === 'string' ? decoded.username : undefined,
    };

    req.mobileClient = {
      id: client.id,
      name: client.name,
      subdomain: client.subdomain,
      status: client.status,
    };

    req.tenant = {
      id: client.id,
      subdomain: client.subdomain,
      name: client.name,
      status: client.status,
      settings,
      database: {
        connectionString,
      },
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Authorization token has expired' });
    }

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    if (error instanceof TenantProvisioningError) {
      return res.status(503).json({
        message: 'Tenant database is not available. Please try again shortly.',
      });
    }

    console.error('Mobile authentication error:', error);
    return res.status(401).json({ message: 'Invalid or expired authorization token' });
  }
};

router.use(mobileAuth);

router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = req.mobileUser?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User context is missing' });
    }

    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Failed to fetch mobile user profile:', error);
    return res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const stats = await storage.getDashboardStats();

    const toNumber = (value: unknown): number => {
      if (value === null || value === undefined) {
        return 0;
      }

      if (typeof value === 'number') {
        return value;
      }

      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : 0;
    };

    return res.json({
      summary: {
        todaySales: toNumber(stats.todaySales),
        todayRevenue: toNumber(stats.todayRevenue),
        activeServices: stats.activeServices,
        lowStockCount: stats.lowStockCount,
        monthlyProfit: toNumber(stats.monthlyProfit),
        monthlySalesProfit: toNumber(stats.monthlySalesProfit),
        monthlyServiceProfit: toNumber(stats.monthlyServiceProfit),
        whatsappConnected: stats.whatsappConnected,
      },
    });
  } catch (error) {
    console.error('Failed to fetch mobile dashboard summary:', error);
    return res.status(500).json({ message: 'Failed to fetch dashboard summary' });
  }
});

router.get('/store', async (req: Request, res: Response) => {
  try {
    const clientId = req.mobileUser?.clientId;
    const config = await storage.getStoreConfig(clientId);
    return res.json({ store: sanitizeStoreConfig(config) });
  } catch (error) {
    console.error('Failed to fetch mobile store configuration:', error);
    return res.status(500).json({ message: 'Failed to fetch store configuration' });
  }
});

router.get('/categories', async (req: Request, res: Response) => {
  try {
    const conditions: SQL[] = [];

    if (req.mobileUser?.clientId) {
      conditions.push(eq(categories.clientId, req.mobileUser.clientId));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const data = whereClause
      ? await db
          .select({
            id: categories.id,
            name: categories.name,
            description: categories.description,
          })
          .from(categories)
          .where(whereClause)
          .orderBy(asc(categories.name))
      : await db
          .select({
            id: categories.id,
            name: categories.name,
            description: categories.description,
          })
          .from(categories)
          .orderBy(asc(categories.name));

    return res.json({
      categories: data.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description ?? null,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch mobile categories:', error);
    return res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

router.get('/products', async (req: Request, res: Response) => {
  try {
    const { page, limit, search } = productQuerySchema.parse(req.query);
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (req.mobileUser?.clientId) {
      conditions.push(eq(products.clientId, req.mobileUser.clientId));
    }

    if (search) {
      const pattern = `%${search}%`;
      const searchCondition = or(
        ilike(products.name, pattern),
        ilike(products.sku, pattern),
        ilike(products.brand, pattern),
        ilike(products.model, pattern),
      ) as SQL;
      conditions.push(searchCondition);
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const baseProductSelect = db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        sku: products.sku,
        barcode: products.barcode,
        brand: products.brand,
        model: products.model,
        unit: products.unit,
        sellingPrice: products.sellingPrice,
        averageCost: products.averageCost,
        stock: products.stock,
        availableStock: products.availableStock,
        reservedStock: products.reservedStock,
        minStock: products.minStock,
        maxStock: products.maxStock,
        categoryId: products.categoryId,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id));

    const baseCountSelect = db.select({ value: count() }).from(products);

    const items = whereClause
      ? await baseProductSelect
          .where(whereClause)
          .orderBy(asc(products.name))
          .limit(limit)
          .offset(offset)
      : await baseProductSelect
          .orderBy(asc(products.name))
          .limit(limit)
          .offset(offset);

    const totalResult = whereClause
      ? await baseCountSelect.where(whereClause)
      : await baseCountSelect;

    const total = Number(totalResult[0]?.value ?? 0);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const toNumber = (value: unknown): number | null => {
      if (value === null || value === undefined) {
        return null;
      }

      if (typeof value === 'number') {
        return value;
      }

      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    return res.json({
      data: items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? null,
        sku: item.sku,
        barcode: item.barcode ?? null,
        brand: item.brand ?? null,
        model: item.model ?? null,
        unit: item.unit ?? 'pcs',
        sellingPrice: toNumber(item.sellingPrice),
        averageCost: toNumber(item.averageCost),
        stock: item.stock ?? 0,
        availableStock: item.availableStock ?? item.stock ?? 0,
        reservedStock: item.reservedStock ?? 0,
        minStock: item.minStock ?? 0,
        maxStock: item.maxStock ?? null,
        categoryId: item.categoryId ?? null,
        categoryName: item.categoryName ?? null,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid query parameters',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile products:', error);
    return res.status(500).json({ message: 'Failed to fetch products' });
  }
});

router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = productParamsSchema.parse(req.params);

    const conditions = [eq(products.id, id)];

    if (req.mobileUser?.clientId) {
      conditions.push(eq(products.clientId, req.mobileUser.clientId));
    }

    const productResult = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        sku: products.sku,
        barcode: products.barcode,
        brand: products.brand,
        model: products.model,
        unit: products.unit,
        sellingPrice: products.sellingPrice,
        averageCost: products.averageCost,
        lastPurchasePrice: products.lastPurchasePrice,
        stock: products.stock,
        availableStock: products.availableStock,
        reservedStock: products.reservedStock,
        minStock: products.minStock,
        maxStock: products.maxStock,
        reorderPoint: products.reorderPoint,
        reorderQuantity: products.reorderQuantity,
        specifications: products.specifications,
        categoryId: products.categoryId,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .limit(1);

    const product = productResult[0];

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const toNumber = (value: unknown): number | null => {
      if (value === null || value === undefined) {
        return null;
      }

      if (typeof value === 'number') {
        return value;
      }

      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const parseJsonField = (value: unknown) => {
      if (typeof value !== 'string') {
        return null;
      }

      try {
        const parsed = JSON.parse(value);
        return parsed;
      } catch {
        return null;
      }
    };

    return res.json({
      product: {
        id: product.id,
        name: product.name,
        description: product.description ?? null,
        sku: product.sku,
        barcode: product.barcode ?? null,
        brand: product.brand ?? null,
        model: product.model ?? null,
        unit: product.unit ?? 'pcs',
        sellingPrice: toNumber(product.sellingPrice),
        averageCost: toNumber(product.averageCost),
        lastPurchasePrice: toNumber(product.lastPurchasePrice),
        stock: product.stock ?? 0,
        availableStock: product.availableStock ?? product.stock ?? 0,
        reservedStock: product.reservedStock ?? 0,
        minStock: product.minStock ?? 0,
        maxStock: product.maxStock ?? null,
        reorderPoint: product.reorderPoint ?? null,
        reorderQuantity: product.reorderQuantity ?? null,
        specifications: parseJsonField(product.specifications),
        categoryId: product.categoryId ?? null,
        categoryName: product.categoryName ?? null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid product identifier',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile product detail:', error);
    return res.status(500).json({ message: 'Failed to fetch product detail' });
  }
});

export default router;
