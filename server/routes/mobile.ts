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
import {
  products,
  categories,
  storeConfig as storeConfigTable,
  insertCategorySchema,
  insertProductSchema,
  insertCustomerSchema,
  insertSupplierSchema,
  insertTransactionSchema,
  insertTransactionItemSchema,
  insertServiceTicketSchema,
  insertServiceTicketPartSchema,
  insertStockMovementSchema,
  insertFinancialRecordSchema,
  insertWarrantyClaimSchema,
  generateSKU,
  generateBarcode,
  type InsertServiceTicketPart,
} from '../../shared/schema';
import { serviceCancellationSchema, validateCancellationBusinessRules } from '../../shared/service-cancellation-schema';
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

const DEFAULT_CLIENT_ID_ENV_KEYS = [
  'DEFAULT_MOBILE_CLIENT_ID',
  'DEFAULT_CLIENT_ID',
  'DEFAULT_TENANT_ID',
] as const;

const findFallbackClient = async () => {
  const seen = new Set<string>();

  for (const key of DEFAULT_CLIENT_ID_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed && !seen.has(trimmed)) {
        const [client] = await primaryDb
          .select()
          .from(clients)
          .where(eq(clients.id, trimmed))
          .limit(1);

        seen.add(trimmed);

        if (client) {
          return client;
        }
      }
    }
  }

  const statusFilter = or(eq(clients.status, 'active'), eq(clients.status, 'trial'));

  const [activeClient] = await primaryDb
    .select()
    .from(clients)
    .where(statusFilter)
    .orderBy(asc(clients.createdAt))
    .limit(1);

  if (activeClient) {
    return activeClient;
  }

  const [anyClient] = await primaryDb.select().from(clients).orderBy(asc(clients.createdAt)).limit(1);
  return anyClient ?? null;
};

const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
});

const productParamsSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
});

const categoryMutationSchema = insertCategorySchema.omit({ clientId: true });
const categoryParamsSchema = z.object({ id: z.string().min(1, 'Category ID is required') });

const productMutationSchema = insertProductSchema
  .omit({ clientId: true })
  .extend({
    sku: z.string().trim().min(1).optional(),
    barcode: z.string().trim().min(1).optional(),
  });
const productUpdateSchema = productMutationSchema.partial();

const customerMutationSchema = insertCustomerSchema.omit({ clientId: true });
const customerQuerySchema = z.object({ search: z.string().trim().min(1).optional() });
const customerParamsSchema = z.object({ id: z.string().min(1, 'Customer ID is required') });

const supplierMutationSchema = insertSupplierSchema.omit({ clientId: true });
const supplierParamsSchema = z.object({ id: z.string().min(1, 'Supplier ID is required') });

const transactionListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
const transactionCreateSchema = z.object({
  transaction: insertTransactionSchema.omit({ clientId: true }),
  items: z.array(insertTransactionItemSchema.omit({ clientId: true })).min(1),
});
const transactionParamsSchema = z.object({ id: z.string().min(1, 'Transaction ID is required') });

const serviceTicketListQuerySchema = z.object({ active: z.enum(['true', 'false']).optional() });
const serviceTicketParamsSchema = z.object({ id: z.string().min(1, 'Service ticket ID is required') });
const serviceTicketCreateSchema = insertServiceTicketSchema.omit({ clientId: true });
const serviceTicketUpdateSchema = insertServiceTicketSchema
  .omit({ clientId: true, ticketNumber: true })
  .partial();
const serviceTicketPartsSchema = z
  .array(insertServiceTicketPartSchema.omit({ clientId: true, serviceTicketId: true }))
  .optional();

const stockMovementQuerySchema = z.object({ productId: z.string().min(1).optional() });
const stockMovementCreateSchema = insertStockMovementSchema.omit({ clientId: true });

const financialRecordQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
const financialRecordCreateSchema = insertFinancialRecordSchema.omit({ clientId: true });

const dateRangeQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const warrantyClaimsQuerySchema = z.object({ status: z.string().trim().optional() });
const warrantyClaimParamsSchema = z.object({ id: z.string().min(1, 'Warranty claim ID is required') });
const warrantyClaimCreateSchema = insertWarrantyClaimSchema.omit({ clientId: true });
const warrantyClaimStatusSchema = z.object({
  status: z.string().trim().min(1),
  processedBy: z.string().trim().min(1).optional(),
  extra: z
    .object({
      returnCondition: z.enum(['normal_stock', 'damaged_stock']).optional(),
      notes: z.string().optional(),
      adminNotes: z.string().optional(),
      claimedItems: z.any().optional(),
      warrantyServiceTicketId: z.string().optional(),
    })
    .optional(),
});
const warrantyClaimProcessSchema = z.object({
  status: z.string().trim().min(1),
  returnCondition: z.enum(['normal_stock', 'damaged_stock']).optional(),
  adminNotes: z.string().optional(),
});
const warrantyEligibilitySchema = z
  .object({
    originalTransactionId: z.string().trim().optional(),
    originalServiceTicketId: z.string().trim().optional(),
  })
  .refine((data) => Boolean(data.originalTransactionId || data.originalServiceTicketId), {
    message: 'Provide at least a transaction ID or service ticket ID',
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

const ensureMobileClientId = (req: Request) => {
  const clientId = req.mobileUser?.clientId;

  if (!clientId) {
    throw new HttpError('Tenant context is not available', 403);
  }

  return clientId;
};

const ensureMobileUserId = (req: Request) => {
  const userId = req.mobileUser?.id;

  if (!userId) {
    throw new HttpError('User context is missing', 401);
  }

  return userId;
};

router.post('/login', async (req: Request, res: Response) => {
  try {
    const credentials = loginSchema.parse(req.body);
    let user = await authenticateUser(credentials);

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    if (!user.clientId) {
      const fallbackClient = await findFallbackClient();

      if (!fallbackClient) {
        return res.status(403).json({
          message: 'User is not associated with a tenant',
          hint: 'Create a tenant and associate the user before using the mobile API.',
        });
      }

      await storage.updateUser(user.id, { clientId: fallbackClient.id });
      user = { ...user, clientId: fallbackClient.id };
    }

    const { client, tenantDb, connectionString } = await resolveTenantContext(user.clientId!);

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

router.post('/categories', async (req: Request, res: Response) => {
  try {
    const clientId = ensureMobileClientId(req);
    const payload = categoryMutationSchema.parse(req.body);
    const category = await storage.createCategory({ ...payload, clientId });
    return res.status(201).json({ category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid category payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to create mobile category:', error);
    return res.status(500).json({ message: 'Failed to create category' });
  }
});

router.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = categoryParamsSchema.parse(req.params);
    const updateData = categoryMutationSchema.partial().parse(req.body ?? {});

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ message: 'Provide at least one field to update' });
    }

    const category = await storage.updateCategory(id, updateData);
    return res.json({ category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid category payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to update mobile category:', error);
    return res.status(500).json({ message: 'Failed to update category' });
  }
});

router.delete('/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = categoryParamsSchema.parse(req.params);
    await storage.deleteCategory(id);
    return res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid category identifier',
        errors: error.flatten(),
      });
    }

    console.error('Failed to delete mobile category:', error);
    return res.status(500).json({ message: 'Failed to delete category' });
  }
});

router.post('/products', async (req: Request, res: Response) => {
  try {
    const clientId = ensureMobileClientId(req);
    const parsed = productMutationSchema.parse(req.body ?? {});
    const { sku, barcode, ...data } = parsed;
    const productPayload = {
      ...data,
      clientId,
      sku: sku?.trim() || generateSKU(),
      barcode: barcode?.trim() || generateBarcode(),
    };

    const product = await storage.createProduct(productPayload as any);
    return res.status(201).json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid product payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to create mobile product:', error);
    return res.status(500).json({ message: 'Failed to create product' });
  }
});

router.put('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = productParamsSchema.parse(req.params);
    const updateData = productUpdateSchema.parse(req.body ?? {});

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ message: 'Provide at least one field to update' });
    }

    const product = await storage.updateProduct(id, updateData);
    return res.json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid product payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to update mobile product:', error);
    return res.status(500).json({ message: 'Failed to update product' });
  }
});

router.delete('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = productParamsSchema.parse(req.params);
    await storage.deleteProduct(id);
    return res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid product identifier',
        errors: error.flatten(),
      });
    }

    console.error('Failed to delete mobile product:', error);
    return res.status(500).json({ message: 'Failed to delete product' });
  }
});

router.get('/customers', async (req: Request, res: Response) => {
  try {
    const { search } = customerQuerySchema.parse(req.query);
    const customers = search ? await storage.searchCustomers(search) : await storage.getCustomers();
    return res.json({ customers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid query parameters',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile customers:', error);
    return res.status(500).json({ message: 'Failed to fetch customers' });
  }
});

router.get('/customers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = customerParamsSchema.parse(req.params);
    const customer = await storage.getCustomerById(id);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json({ customer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid customer identifier',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile customer detail:', error);
    return res.status(500).json({ message: 'Failed to fetch customer detail' });
  }
});

router.post('/customers', async (req: Request, res: Response) => {
  try {
    const clientId = ensureMobileClientId(req);
    const payload = customerMutationSchema.parse(req.body ?? {});
    const customer = await storage.createCustomer({ ...payload, clientId });
    return res.status(201).json({ customer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid customer payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to create mobile customer:', error);
    return res.status(500).json({ message: 'Failed to create customer' });
  }
});

router.put('/customers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = customerParamsSchema.parse(req.params);
    const updateData = customerMutationSchema.partial().parse(req.body ?? {});

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ message: 'Provide at least one field to update' });
    }

    const customer = await storage.updateCustomer(id, updateData);
    return res.json({ customer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid customer payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to update mobile customer:', error);
    return res.status(500).json({ message: 'Failed to update customer' });
  }
});

router.delete('/customers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = customerParamsSchema.parse(req.params);
    await storage.deleteCustomer(id);
    return res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid customer identifier',
        errors: error.flatten(),
      });
    }

    console.error('Failed to delete mobile customer:', error);
    return res.status(500).json({ message: 'Failed to delete customer' });
  }
});

router.get('/suppliers', async (_req: Request, res: Response) => {
  try {
    const suppliers = await storage.getSuppliers();
    return res.json({ suppliers });
  } catch (error) {
    console.error('Failed to fetch mobile suppliers:', error);
    return res.status(500).json({ message: 'Failed to fetch suppliers' });
  }
});

router.get('/suppliers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = supplierParamsSchema.parse(req.params);
    const supplier = await storage.getSupplierById(id);

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    return res.json({ supplier });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid supplier identifier',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile supplier detail:', error);
    return res.status(500).json({ message: 'Failed to fetch supplier detail' });
  }
});

router.post('/suppliers', async (req: Request, res: Response) => {
  try {
    const clientId = ensureMobileClientId(req);
    const payload = supplierMutationSchema.parse(req.body ?? {});
    const supplier = await storage.createSupplier({ ...payload, clientId });
    return res.status(201).json({ supplier });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid supplier payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to create mobile supplier:', error);
    return res.status(500).json({ message: 'Failed to create supplier' });
  }
});

router.put('/suppliers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = supplierParamsSchema.parse(req.params);
    const updateData = supplierMutationSchema.partial().parse(req.body ?? {});

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ message: 'Provide at least one field to update' });
    }

    const supplier = await storage.updateSupplier(id, updateData);
    return res.json({ supplier });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid supplier payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to update mobile supplier:', error);
    return res.status(500).json({ message: 'Failed to update supplier' });
  }
});

router.delete('/suppliers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = supplierParamsSchema.parse(req.params);
    await storage.deleteSupplier(id);
    return res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid supplier identifier',
        errors: error.flatten(),
      });
    }

    console.error('Failed to delete mobile supplier:', error);
    return res.status(500).json({ message: 'Failed to delete supplier' });
  }
});

router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const { limit } = transactionListQuerySchema.parse(req.query);
    const transactions = await storage.getTransactions(limit);
    return res.json({ transactions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid query parameters',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile transactions:', error);
    return res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

router.get('/transactions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = transactionParamsSchema.parse(req.params);
    const transaction = await storage.getTransactionById(id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    return res.json({ transaction });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid transaction identifier',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile transaction detail:', error);
    return res.status(500).json({ message: 'Failed to fetch transaction detail' });
  }
});

router.post('/transactions', async (req: Request, res: Response) => {
  try {
    const clientId = ensureMobileClientId(req);
    const userId = ensureMobileUserId(req);
    const { transaction: transactionData, items } = transactionCreateSchema.parse(req.body ?? {});

    const normalizeReference = (value?: string | null) => {
      if (value === null || value === undefined) {
        return null;
      }

      const trimmed = String(value).trim();
      return trimmed.length ? trimmed : null;
    };

    const normalizeDate = (value: unknown) => {
      if (!value) {
        return null;
      }

      if (value instanceof Date) {
        return value;
      }

      const parsed = new Date(value as string);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const transactionNumber = `TRX-${Date.now()}`;

    const transactionPayload = {
      ...transactionData,
      clientId,
      userId,
      transactionNumber,
      customerId: normalizeReference(transactionData.customerId),
      supplierId: normalizeReference(transactionData.supplierId),
      warrantyStartDate: normalizeDate(transactionData.warrantyStartDate),
      warrantyEndDate: normalizeDate(transactionData.warrantyEndDate),
    };

    const itemPayload = items.map((item) => ({
      ...item,
      clientId,
    }));

    const transaction = await storage.createTransaction(transactionPayload as any, itemPayload as any);
    return res.status(201).json({ transaction });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid transaction payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to create mobile transaction:', error);
    return res.status(500).json({ message: 'Failed to create transaction' });
  }
});

router.get('/service-tickets', async (req: Request, res: Response) => {
  try {
    const { active } = serviceTicketListQuerySchema.parse(req.query);
    const tickets = active === 'true' ? await storage.getActiveServiceTickets() : await storage.getServiceTickets();
    return res.json({ tickets });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid query parameters',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile service tickets:', error);
    return res.status(500).json({ message: 'Failed to fetch service tickets' });
  }
});

router.get('/service-tickets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = serviceTicketParamsSchema.parse(req.params);
    const ticket = await storage.getServiceTicketById(id);

    if (!ticket) {
      return res.status(404).json({ message: 'Service ticket not found' });
    }

    return res.json({ ticket });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid service ticket identifier',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile service ticket detail:', error);
    return res.status(500).json({ message: 'Failed to fetch service ticket detail' });
  }
});

router.get('/service-tickets/:id/parts', async (req: Request, res: Response) => {
  try {
    const { id } = serviceTicketParamsSchema.parse(req.params);
    const parts = await storage.getServiceTicketParts(id);
    return res.json({ parts });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid service ticket identifier',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile service ticket parts:', error);
    return res.status(500).json({ message: 'Failed to fetch service ticket parts' });
  }
});

router.post('/service-tickets', async (req: Request, res: Response) => {
  try {
    const clientId = ensureMobileClientId(req);
    const payload = serviceTicketCreateSchema.parse(req.body ?? {});
    const ticketNumber = payload.ticketNumber || `SVC-${Date.now()}`;
    const ticket = await storage.createServiceTicket({ ...payload, clientId, ticketNumber });
    return res.status(201).json({ ticket });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid service ticket payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to create mobile service ticket:', error);
    return res.status(500).json({ message: 'Failed to create service ticket' });
  }
});

router.put('/service-tickets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = serviceTicketParamsSchema.parse(req.params);
    const userId = ensureMobileUserId(req);
    const { parts, ...rawData } = (req.body ?? {}) as Record<string, unknown> & { parts?: unknown };
    const ticketData = serviceTicketUpdateSchema.parse(rawData);
    const parsedParts = parts !== undefined ? serviceTicketPartsSchema.parse(parts) : undefined;

    if (!Object.keys(ticketData).length && (!parsedParts || parsedParts.length === 0)) {
      return res.status(400).json({ message: 'Provide at least one field to update' });
    }

    const ticket = await storage.updateServiceTicket(id, ticketData, parsedParts as InsertServiceTicketPart[] | undefined, userId);
    return res.json({ ticket });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid service ticket payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to update mobile service ticket:', error);
    return res.status(500).json({ message: 'Failed to update service ticket' });
  }
});

router.delete('/service-tickets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = serviceTicketParamsSchema.parse(req.params);
    await storage.deleteServiceTicket(id);
    return res.json({ message: 'Service ticket deleted successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid service ticket identifier',
        errors: error.flatten(),
      });
    }

    console.error('Failed to delete mobile service ticket:', error);
    return res.status(500).json({ message: 'Failed to delete service ticket' });
  }
});

router.post('/service-tickets/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = serviceTicketParamsSchema.parse(req.params);
    const userId = ensureMobileUserId(req);
    const cancellationPayload = serviceCancellationSchema.parse({ ...req.body, userId });

    const existingTicket = await storage.getServiceTicketById(id);
    if (!existingTicket) {
      return res.status(404).json({ message: 'Service ticket not found' });
    }

    const eligibility = await validateCancellationBusinessRules.validateTicketEligibility(id, existingTicket);
    if (!eligibility.isValid) {
      return res.status(400).json({ message: 'Business rule validation failed', errors: eligibility.errors });
    }

    if (cancellationPayload.cancellationType === 'warranty_refund') {
      const warrantyEligibility = await validateCancellationBusinessRules.validateWarrantyEligibility(id, existingTicket);
      if (!warrantyEligibility.isValid) {
        return res.status(400).json({ message: 'Warranty validation failed', errors: warrantyEligibility.errors });
      }
    }

    if (
      cancellationPayload.cancellationType === 'after_completed' &&
      existingTicket.status !== 'completed' &&
      existingTicket.status !== 'delivered'
    ) {
      return res.status(400).json({
        message: "Cannot cancel with 'after_completed' type - service ticket is not completed",
      });
    }

    if (
      cancellationPayload.cancellationType === 'warranty_refund' &&
      existingTicket.status !== 'completed' &&
      existingTicket.status !== 'delivered'
    ) {
      return res.status(400).json({
        message: "Cannot cancel with 'warranty_refund' type - service ticket must be completed or delivered",
      });
    }

    const result = await storage.cancelServiceTicket(id, {
      cancellationFee: cancellationPayload.cancellationFee,
      cancellationReason: cancellationPayload.cancellationReason,
      cancellationType: cancellationPayload.cancellationType,
      userId,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message || 'Failed to cancel service ticket' });
    }

    return res.json({
      message: result.message || 'Service ticket cancelled successfully',
      cancellationType: cancellationPayload.cancellationType,
      cancellationFee: Number(cancellationPayload.cancellationFee),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid cancellation payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to cancel mobile service ticket:', error);
    return res.status(500).json({ message: 'Failed to cancel service ticket' });
  }
});

router.get('/stock-movements', async (req: Request, res: Response) => {
  try {
    const { productId } = stockMovementQuerySchema.parse(req.query);
    const movements = await storage.getStockMovements(productId);
    return res.json({ movements });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid query parameters',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile stock movements:', error);
    return res.status(500).json({ message: 'Failed to fetch stock movements' });
  }
});

router.post('/stock-movements', async (req: Request, res: Response) => {
  try {
    const clientId = ensureMobileClientId(req);
    const userId = ensureMobileUserId(req);
    const payload = stockMovementCreateSchema.parse(req.body ?? {});
    const movement = await storage.createStockMovement({ ...payload, clientId, userId });
    return res.status(201).json({ movement });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid stock movement payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to create mobile stock movement:', error);
    return res.status(500).json({ message: 'Failed to create stock movement' });
  }
});

router.get('/financial-records', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = financialRecordQuerySchema.parse(req.query);
    const records = await storage.getFinancialRecords(startDate, endDate);
    return res.json({ records });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid date range',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile financial records:', error);
    return res.status(500).json({ message: 'Failed to fetch financial records' });
  }
});

router.post('/financial-records', async (req: Request, res: Response) => {
  try {
    const clientId = ensureMobileClientId(req);
    const payload = financialRecordCreateSchema.parse(req.body ?? {});
    const record = await storage.createFinancialRecord({ ...payload, clientId });
    return res.status(201).json({ record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid financial record payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to create mobile financial record:', error);
    return res.status(500).json({ message: 'Failed to create financial record' });
  }
});

const resolveDateRange = (query: z.infer<typeof dateRangeQuerySchema>) => {
  const now = new Date();
  const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    start: query.startDate ?? defaultStart,
    end: query.endDate ?? now,
  };
};

router.get('/reports/sales', async (req: Request, res: Response) => {
  try {
    const range = resolveDateRange(dateRangeQuerySchema.parse(req.query));
    const report = await storage.getSalesReport(range.start, range.end);
    return res.json({ report });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid date range',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile sales report:', error);
    return res.status(500).json({ message: 'Failed to fetch sales report' });
  }
});

router.get('/reports/service', async (req: Request, res: Response) => {
  try {
    const range = resolveDateRange(dateRangeQuerySchema.parse(req.query));
    const report = await storage.getServiceReport(range.start, range.end);
    return res.json({ report });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid date range',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile service report:', error);
    return res.status(500).json({ message: 'Failed to fetch service report' });
  }
});

router.get('/reports/financial', async (req: Request, res: Response) => {
  try {
    const range = resolveDateRange(dateRangeQuerySchema.parse(req.query));
    const report = await storage.getFinancialReport(range.start, range.end);
    return res.json({ report });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid date range',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile financial report:', error);
    return res.status(500).json({ message: 'Failed to fetch financial report' });
  }
});

router.get('/reports/inventory', async (_req: Request, res: Response) => {
  try {
    const report = await storage.getInventoryReport();
    return res.json({ report });
  } catch (error) {
    console.error('Failed to fetch mobile inventory report:', error);
    return res.status(500).json({ message: 'Failed to fetch inventory report' });
  }
});

router.get('/reports/balance-sheet', async (req: Request, res: Response) => {
  try {
    const { endDate } = dateRangeQuerySchema.parse(req.query);
    const report = await storage.getBalanceSheet(endDate);
    return res.json({ report });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid date parameter',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile balance sheet:', error);
    return res.status(500).json({ message: 'Failed to fetch balance sheet' });
  }
});

router.get('/reports/income-statement', async (req: Request, res: Response) => {
  try {
    const range = resolveDateRange(dateRangeQuerySchema.parse(req.query));
    const report = await storage.getIncomeStatement(range.start, range.end);
    return res.json({ report });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid date range',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile income statement:', error);
    return res.status(500).json({ message: 'Failed to fetch income statement' });
  }
});

router.get('/reports/chart-of-accounts', async (_req: Request, res: Response) => {
  try {
    const accounts = await storage.getChartOfAccounts();
    return res.json({ accounts });
  } catch (error) {
    console.error('Failed to fetch mobile chart of accounts:', error);
    return res.status(500).json({ message: 'Failed to fetch chart of accounts' });
  }
});

router.get('/warranty-claims', async (req: Request, res: Response) => {
  try {
    const clientId = ensureMobileClientId(req);
    const { status } = warrantyClaimsQuerySchema.parse(req.query);
    const claims = await storage.getWarrantyClaims(status, clientId);
    return res.json({ claims });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid query parameters',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile warranty claims:', error);
    return res.status(500).json({ message: 'Failed to fetch warranty claims' });
  }
});

router.get('/warranty-claims/:id', async (req: Request, res: Response) => {
  try {
    const clientId = ensureMobileClientId(req);
    const { id } = warrantyClaimParamsSchema.parse(req.params);
    const claim = await storage.getWarrantyClaimById(id, clientId);

    if (!claim) {
      return res.status(404).json({ message: 'Warranty claim not found' });
    }

    return res.json({ claim });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid warranty claim identifier',
        errors: error.flatten(),
      });
    }

    console.error('Failed to fetch mobile warranty claim detail:', error);
    return res.status(500).json({ message: 'Failed to fetch warranty claim detail' });
  }
});

router.post('/warranty-claims', async (req: Request, res: Response) => {
  try {
    const clientId = ensureMobileClientId(req);
    const userId = ensureMobileUserId(req);
    const payload = warrantyClaimCreateSchema.parse(req.body ?? {});
    const claim = await storage.createWarrantyClaim({ ...payload, clientId }, { clientId, createdBy: userId });
    return res.status(201).json({ claim });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid warranty claim payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to create mobile warranty claim:', error);
    return res.status(500).json({ message: 'Failed to create warranty claim' });
  }
});

router.patch('/warranty-claims/:id/status', async (req: Request, res: Response) => {
  try {
    const userId = ensureMobileUserId(req);
    const { id } = warrantyClaimParamsSchema.parse(req.params);
    const { status, processedBy, extra } = warrantyClaimStatusSchema.parse(req.body ?? {});
    const claim = await storage.updateWarrantyClaimStatus(id, status, processedBy ?? userId, extra);
    return res.json({ claim });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid status payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to update mobile warranty claim status:', error);
    return res.status(500).json({ message: 'Failed to update warranty claim status' });
  }
});

router.post('/warranty-claims/:id/process', async (req: Request, res: Response) => {
  try {
    const userId = ensureMobileUserId(req);
    const { id } = warrantyClaimParamsSchema.parse(req.params);
    const { status, returnCondition, adminNotes } = warrantyClaimProcessSchema.parse(req.body ?? {});
    const claim = await storage.processWarrantyClaim(id, status, userId, {
      returnCondition,
      adminNotes,
    });
    return res.json({ claim });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid process payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to process mobile warranty claim:', error);
    return res.status(500).json({ message: 'Failed to process warranty claim' });
  }
});

router.post('/warranty-claims/validate', async (req: Request, res: Response) => {
  try {
    const clientId = ensureMobileClientId(req);
    const payload = warrantyEligibilitySchema.parse(req.body ?? {});
    const validation = await storage.validateWarrantyEligibility(
      payload.originalTransactionId,
      payload.originalServiceTicketId,
      clientId,
    );
    return res.json({ validation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid validation payload',
        errors: error.flatten(),
      });
    }

    console.error('Failed to validate mobile warranty eligibility:', error);
    return res.status(500).json({ message: 'Failed to validate warranty eligibility' });
  }
});

export default router;
