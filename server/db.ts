import 'dotenv/config';
import { AsyncLocalStorage } from 'async_hooks';
import { exec } from 'child_process';
import { createHash } from 'crypto';
import { existsSync } from 'fs';
import path from 'path';
import pkg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { promisify } from 'util';
import * as schema from "@shared/schema";

const { Pool } = pkg;
const execAsync = promisify(exec);

const MAX_DATABASE_NAME_LENGTH = 63; // PostgreSQL limitation

type ParsedDatabaseUrl = {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
};


export class TenantProvisioningError extends Error {
  constructor(
    message: string,
    public code?: string,
    public detail?: string,
  ) {
    super(message);
    this.name = 'TenantProvisioningError';
  }
}

const provisionedTenantDatabases = new Set<string>();

type ProvisionFailureRecord = {
  error: TenantProvisioningError;
  lastAttempt: number;
  attempts: number;
};

const failedTenantProvisionAttempts = new Map<string, ProvisionFailureRecord>();
const DEFAULT_PROVISION_RETRY_DELAY_MS = 60_000;

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

const sanitizeTenantIdentifier = (identifier: string) => {
  const normalized = identifier.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const trimmed = normalized.replace(/^_+|_+$/g, '');
  return trimmed || 'tenant';
};

const generateTenantDatabaseName = (tenantIdentifier: string) => {
  const sanitized = sanitizeTenantIdentifier(tenantIdentifier);
  const hash = createHash('sha256').update(tenantIdentifier).digest('hex').slice(0, 6);
  let base = sanitized ? `${sanitized}_${hash}` : hash;
  base = base.replace(/^_+|_+$/g, '') || hash;

  const candidate = `tenant_${base}`;
  if (candidate.length <= MAX_DATABASE_NAME_LENGTH) {
    return candidate;
  }

  const available = Math.max(
    MAX_DATABASE_NAME_LENGTH - 'tenant_'.length - hash.length - 1,
    3,
  );
  const truncated = sanitized.slice(0, available);
  return `tenant_${truncated}_${hash}`.replace(/_+$/g, '');
};

const parseDatabaseUrlParts = (connectionString: string): ParsedDatabaseUrl => {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get('sslmode');
    let ssl: boolean | undefined;
    if (sslMode) {
      ssl = sslMode !== 'disable';
    } else if (url.searchParams.has('ssl')) {
      const sslParam = url.searchParams.get('ssl');
      ssl = !(sslParam === 'false' || sslParam === '0');
    }

    return {
      host: url.hostname || undefined,
      port: url.port ? Number(url.port) : undefined,
      database: url.pathname ? url.pathname.replace(/^\//, '') || undefined : undefined,
      user: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      ssl,
    };
  } catch {
    return {};
  }
};

const quoteIdentifier = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;

const getDrizzleCliCommand = () => {
  const cwd = process.cwd();
  const unixPath = path.join(cwd, 'node_modules', '.bin', 'drizzle-kit');
  const windowsPath = path.join(cwd, 'node_modules', '.bin', 'drizzle-kit.cmd');

  if (process.platform === 'win32') {
    if (existsSync(windowsPath)) {
      return `"${windowsPath}" push --force`;
    }
    return 'npx.cmd drizzle-kit push --force';
  }

  if (existsSync(unixPath)) {
    return `"${unixPath}" push --force`;
  }

  return 'npx drizzle-kit push --force';
};

const runDrizzlePush = async (connectionString: string) => {
  const command = getDrizzleCliCommand();
  await execAsync(command, {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: connectionString },
  });
};

const primaryConnectionParts = parseDatabaseUrlParts(process.env.DATABASE_URL!);

const resolveProvisionerConnectionString = () => {
  const envConnection =
    process.env.TENANT_DATABASE_ADMIN_URL ||
    process.env.TENANT_DATABASE_PROVISIONER_URL ||
    process.env.TENANT_DB_ADMIN_URL;

  if (envConnection) {
    return envConnection;
  }

  return (
    buildConnectionStringFromParts({
      host: primaryConnectionParts.host,
      port: primaryConnectionParts.port,
      database: primaryConnectionParts.database || 'postgres',
      user: primaryConnectionParts.user,
      password: primaryConnectionParts.password,
      ssl: primaryConnectionParts.ssl,
    }) ?? process.env.DATABASE_URL!
  );
};

const toTenantProvisioningError = (error: unknown, databaseName: string) => {
  if (error instanceof TenantProvisioningError) {
    return error;
  }

  const code = typeof (error as any)?.code === 'string' ? ((error as any).code as string) : undefined;
  const detail = typeof (error as any)?.detail === 'string' ? ((error as any).detail as string) : undefined;

  let message = `Failed to provision tenant database "${databaseName}".`;

  if (code === '42501') {
    message +=
      ' The configured database role does not have permission to create databases. ' +
      'Grant the role CREATEDB privileges or provide a superuser connection string via TENANT_DATABASE_ADMIN_URL.';
  }

  if (error instanceof Error && error.message) {
    message += ` ${error.message}`;
  }

  return new TenantProvisioningError(message.trim(), code, detail);
};


export const buildDefaultTenantConnection = (tenantIdentifier: string) => {
  const databaseName = generateTenantDatabaseName(tenantIdentifier);
  const connectionString = buildConnectionStringFromParts({
    host: primaryConnectionParts.host,
    port: primaryConnectionParts.port,
    database: databaseName,
    user: primaryConnectionParts.user,
    password: primaryConnectionParts.password,
    ssl: primaryConnectionParts.ssl,
  });

  if (!connectionString) {
    return undefined;
  }

  return { connectionString, databaseName };
};

export const autoProvisionTenantDatabase = async (
  tenantIdentifier: string,
  options: { databaseName?: string } = {},
): Promise<{ connectionString: string; databaseName: string; created: boolean }> => {
  let fallback: { connectionString: string; databaseName: string } | undefined;

  if (options.databaseName) {
    const derived = buildConnectionStringFromParts({
      host: primaryConnectionParts.host,
      port: primaryConnectionParts.port,
      database: options.databaseName,
      user: primaryConnectionParts.user,
      password: primaryConnectionParts.password,
      ssl: primaryConnectionParts.ssl,
    });

    if (derived) {
      fallback = { connectionString: derived, databaseName: options.databaseName };
    }
  } else {
    fallback = buildDefaultTenantConnection(tenantIdentifier);
  }

  if (!fallback || !fallback.connectionString) {
    throw new Error(`Unable to determine tenant database connection for ${tenantIdentifier}`);
  }

  const { connectionString, databaseName } = fallback;

  const previousFailure = failedTenantProvisionAttempts.get(databaseName);
  if (previousFailure) {
    const retryDelay = Number(process.env.TENANT_DB_PROVISION_RETRY_MS ?? DEFAULT_PROVISION_RETRY_DELAY_MS);
    if (Number.isNaN(retryDelay) || retryDelay < 0) {
      failedTenantProvisionAttempts.delete(databaseName);
    } else if (Date.now() - previousFailure.lastAttempt < retryDelay) {
      throw previousFailure.error;
    } else {
      failedTenantProvisionAttempts.delete(databaseName);
    }
  }



  if (provisionedTenantDatabases.has(databaseName)) {
    return { connectionString, databaseName, created: false };
  }

  const adminConnectionString = resolveProvisionerConnectionString();
  let created = false;

  try {
    const adminPool = new Pool({ connectionString: adminConnectionString });
    try {
      const existing = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
      if (existing.rowCount === 0) {
        await adminPool.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
        created = true;
      }
    } finally {
      await adminPool.end();
    }

    await runDrizzlePush(connectionString);
    provisionedTenantDatabases.add(databaseName);
    failedTenantProvisionAttempts.delete(databaseName);

    return { connectionString, databaseName, created };
  } catch (error) {
    const provisioningError = toTenantProvisioningError(error, databaseName);
    const existing = failedTenantProvisionAttempts.get(databaseName);
    failedTenantProvisionAttempts.set(databaseName, {
      error: provisioningError,
      lastAttempt: Date.now(),
      attempts: existing ? existing.attempts + 1 : 1,
    });
    throw provisioningError;
  }
};

export type TenantDbResolutionResult = {
  connectionString?: string;
  error?: string;
};

export const ensureTenantDbForSettings = async (
  tenantIdentifier: string,
  settings: Record<string, unknown> | null | undefined,
  options: { autoProvision?: boolean } = {},
): Promise<{ db: ReturnType<typeof drizzle>; connectionString: string; created?: boolean; databaseName?: string }> => {
  let connectionString = resolveTenantConnectionString(tenantIdentifier, settings);
  let created: boolean | undefined;
  let databaseName: string | undefined;


  const autoProvisionEnabled =
    options.autoProvision ?? ((process.env.TENANT_DB_AUTO_PROVISION ?? 'true').toLowerCase() !== 'false');

  if (!connectionString && autoProvisionEnabled) {
    const provisionResult = await autoProvisionTenantDatabase(tenantIdentifier);
    connectionString = provisionResult.connectionString;
    created = provisionResult.created;
    databaseName = provisionResult.databaseName;
  }

  if (!connectionString) {
    throw new Error(`Unable to resolve database connection for tenant ${tenantIdentifier}`);
  }

  const tenantDb = await getTenantDb(connectionString);
  return { db: tenantDb, connectionString, created, databaseName };
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
