import 'dotenv/config';

import { primaryDb, resolveTenantConnectionString, runDrizzleCli, shutdownAllDbPools } from '../db';
import { clients } from '../../shared/saas-schema';

type TenantRow = {
  id: string;
  name: string;
  subdomain: string;
  settings: string | null;
};

type CliMode = 'push' | 'migrate';

const parseListArg = (value: string | undefined) => {
  if (!value) {
    return [] as string[];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => item.toLowerCase());
};

const parseSettings = (rawSettings: string | null) => {
  if (!rawSettings) {
    return {} as Record<string, unknown>;
  }

  try {
    const parsed = JSON.parse(rawSettings);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch (error) {
    console.warn('Unable to parse tenant settings JSON, falling back to empty object:', error);
  }

  return {} as Record<string, unknown>;
};

const main = async (): Promise<number> => {
  const argv = process.argv.slice(2);
  let mode: CliMode = 'push';
  let forcePush = true;
  let includePrimary = false;
  const explicitTenants = new Set<string>();
  const skippedTenants = new Set<string>();
  const forwardedArgs: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--push') {
      mode = 'push';
      continue;
    }

    if (arg === '--migrate') {
      mode = 'migrate';
      forcePush = false;
      continue;
    }

    if (arg === '--force') {
      forcePush = true;
      continue;
    }

    if (arg === '--no-force') {
      forcePush = false;
      continue;
    }

    if (arg === '--include-primary') {
      includePrimary = true;
      continue;
    }

    if (arg === '--tenant' || arg === '--tenants') {
      const value = argv[index + 1];
      index += 1;
      for (const tenant of parseListArg(value)) {
        explicitTenants.add(tenant);
      }
      continue;
    }

    if (arg.startsWith('--tenant=')) {
      const [, value] = arg.split('=');
      for (const tenant of parseListArg(value)) {
        explicitTenants.add(tenant);
      }
      continue;
    }

    if (arg === '--skip') {
      const value = argv[index + 1];
      index += 1;
      for (const tenant of parseListArg(value)) {
        skippedTenants.add(tenant);
      }
      continue;
    }

    if (arg.startsWith('--skip=')) {
      const [, value] = arg.split('=');
      for (const tenant of parseListArg(value)) {
        skippedTenants.add(tenant);
      }
      continue;
    }

    if (arg === '--') {
      forwardedArgs.push(...argv.slice(index + 1));
      break;
    }

    forwardedArgs.push(arg);
  }

  const successfulTenants: string[] = [];
  const failedTenants: { tenant: string; error: unknown }[] = [];
  const skipped: { tenant: string; reason: string }[] = [];

  try {
    if (includePrimary) {
      const primaryConnection = process.env.DATABASE_URL;
      if (!primaryConnection) {
        console.warn('DATABASE_URL is not set. Skipping primary database push.');
      } else {
        console.log(`Running drizzle ${mode} for primary database...`);
        try {
          await runDrizzleCli(primaryConnection, mode, {
            force: mode === 'push' ? forcePush : undefined,
            extraArgs: forwardedArgs,
          });
          successfulTenants.push('primary');
        } catch (error) {
          failedTenants.push({ tenant: 'primary', error });
          console.error('Primary database drizzle command failed:', error);
        }
      }
    }

    const tenantRows = await primaryDb
      .select({
        id: clients.id,
        name: clients.name,
        subdomain: clients.subdomain,
        settings: clients.settings,
      })
      .from(clients)
      .orderBy(clients.createdAt);

    for (const tenant of tenantRows as TenantRow[]) {
      const identifier = tenant.subdomain.toLowerCase();

      if (skippedTenants.has(identifier)) {
        skipped.push({ tenant: identifier, reason: 'Explicitly skipped via CLI argument' });
        continue;
      }

      if (explicitTenants.size > 0 && !explicitTenants.has(identifier)) {
        continue;
      }

      const settings = parseSettings(tenant.settings);
      const connectionString = resolveTenantConnectionString(identifier, settings);

      if (!connectionString) {
        skipped.push({ tenant: identifier, reason: 'No tenant database connection string available' });
        console.warn(`Skipping tenant ${identifier}: unable to resolve connection string from settings or environment.`);
        continue;
      }

      console.log(`Running drizzle ${mode} for tenant ${identifier} (${tenant.name})...`);

      try {
        await runDrizzleCli(connectionString, mode, {
          force: mode === 'push' ? forcePush : undefined,
          extraArgs: forwardedArgs,
        });
        successfulTenants.push(identifier);
      } catch (error) {
        failedTenants.push({ tenant: identifier, error });
        console.error(`Drizzle command failed for tenant ${identifier}:`, error);
      }
    }
  } finally {
    await shutdownAllDbPools();
  }

  if (successfulTenants.length > 0) {
    console.log(`Drizzle ${mode} succeeded for tenants: ${successfulTenants.join(', ')}`);
  }

  if (skipped.length > 0) {
    for (const entry of skipped) {
      console.log(`Skipped tenant ${entry.tenant}: ${entry.reason}`);
    }
  }

  if (failedTenants.length > 0) {
    for (const failure of failedTenants) {
      console.error(`Tenant ${failure.tenant} failed to run drizzle ${mode}.`, failure.error);
    }
    return 1;
  }

  return 0;
};

main()
  .then((exitCode) => {
    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  })
  .catch((error) => {
    console.error('Failed to execute tenant drizzle script:', error);
    process.exit(1);
  });

