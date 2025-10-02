import 'dotenv/config';
import { AsyncLocalStorage } from 'async_hooks';
import pkg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const primaryPool = new Pool({ connectionString: process.env.DATABASE_URL });
export const primaryDb = drizzle(primaryPool, { schema });

type TenantContextValue = {
  db: ReturnType<typeof drizzle>;
  clientId?: string;
  connectionString?: string;
};

const dbContext = new AsyncLocalStorage<TenantContextValue>();

export const databaseContextMiddleware = (_req: any, _res: any, next: () => void) => {
  dbContext.run({ db: primaryDb }, () => next());
};

const tenantPools = new Map<string, pkg.Pool>();
const tenantDbs = new Map<string, ReturnType<typeof drizzle>>();

export const getCurrentDb = () => {
  return dbContext.getStore()?.db ?? primaryDb;
};

export const getCurrentTenantContext = () => dbContext.getStore();

export const setTenantDbForRequest = (db: ReturnType<typeof drizzle>, options: { clientId?: string; connectionString?: string } = {}) => {
  const store = dbContext.getStore();
  if (store) {
    store.db = db;
    store.clientId = options.clientId;
    store.connectionString = options.connectionString;
  }
};

const createTenantPool = (connectionString: string) => {
  const existingPool = tenantPools.get(connectionString);
  if (existingPool) {
    return existingPool;
  }

  const pool = new Pool({ connectionString });
  tenantPools.set(connectionString, pool);
  return pool;
};

export const getTenantDb = async (connectionString: string) => {
  if (!connectionString) {
    throw new Error('Tenant database connection string is required');
  }

  const cachedDb = tenantDbs.get(connectionString);
  if (cachedDb) {
    return cachedDb;
  }

  const pool = createTenantPool(connectionString);

  // Validate connection before caching
  const client = await pool.connect();
  client.release();

  const tenantDb = drizzle(pool, { schema });
  tenantDbs.set(connectionString, tenantDb);
  return tenantDb;
};

export const buildConnectionStringFromParts = (config: {
  host?: string;
  port?: number | string;
  database?: string;
  name?: string;
  user?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
}) => {
  const host = config.host;
  const database = config.database || config.name;
  const user = config.user || config.username;
  const password = config.password ?? '';
  if (!host || !database || !user) {
    return undefined;
  }

  const port = config.port ? Number(config.port) : undefined;
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  const portSegment = port ? `:${port}` : '';
  const authSegment = password ? `${encodedUser}:${encodedPassword}` : encodedUser;
  const sslQuery = config.ssl ? '?sslmode=require' : '';

  return `postgresql://${authSegment}@${host}${portSegment}/${database}${sslQuery}`;
};

export type TenantDatabaseSettings = {
  url?: string;
  connectionString?: string;
  connection_url?: string;
  host?: string;
  hostname?: string;
  port?: number | string;
  database?: string;
  name?: string;
  user?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
};

export const resolveTenantConnectionString = (
  tenantIdentifier: string,
  settings: Record<string, unknown> | null | undefined,
) => {
  if (!settings) {
    settings = {};
  }

  const normalized = settings as Record<string, unknown>;
  const databaseSettings = (normalized.database || normalized.db) as Record<string, unknown> | undefined;

  const directCandidates = [
    normalized.databaseUrl,
    normalized.databaseURL,
    normalized.database_url,
    normalized.databaseConnectionString,
    normalized.database_connection_string,
    databaseSettings?.connectionString,
    databaseSettings?.connection_string,
    databaseSettings?.url,
    databaseSettings?.connectionUrl,
    databaseSettings?.connection_url,
  ];

  const directConnection = directCandidates.find((value): value is string => typeof value === 'string' && value.length > 0);
  if (directConnection) {
    return directConnection;
  }

  const envKey = `TENANT_${tenantIdentifier.toUpperCase()}_DATABASE_URL`;
  if (process.env[envKey]) {
    return process.env[envKey] as string;
  }

  const host = (databaseSettings?.host || databaseSettings?.hostname || normalized.databaseHost) as string | undefined;
  const port = (databaseSettings?.port || normalized.databasePort) as number | string | undefined;
  const database = (databaseSettings?.database || databaseSettings?.name || normalized.databaseName) as string | undefined;
  const user = (databaseSettings?.user || databaseSettings?.username || normalized.databaseUser) as string | undefined;
  const password = (databaseSettings?.password || normalized.databasePassword) as string | undefined;
  const ssl = (databaseSettings?.ssl ?? normalized.databaseSsl ?? false) as boolean | undefined;

  const connection = buildConnectionStringFromParts({ host, port, database, user, password, ssl });
  return connection;
};

export type TenantDbResolutionResult = {
  connectionString?: string;
  error?: string;
};

export const ensureTenantDbForSettings = async (
  tenantIdentifier: string,
  settings: Record<string, unknown> | null | undefined,
): Promise<{ db: ReturnType<typeof drizzle>; connectionString: string }> => {
  const connectionString = resolveTenantConnectionString(tenantIdentifier, settings);
  if (!connectionString) {
    throw new Error(`Unable to resolve database connection for tenant ${tenantIdentifier}`);
  }

  const tenantDb = await getTenantDb(connectionString);
  return { db: tenantDb, connectionString };
};

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    const currentDb = getCurrentDb() as any;
    const value = Reflect.get(currentDb, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(currentDb);
    }
    return value;
  },
});
