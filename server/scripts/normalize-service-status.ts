import 'dotenv/config';
import { Client } from 'pg';

const LEGACY_STATUS_MAP: Record<string, string> = {
  'sedang-dicek': 'pending',
  'menunggu-konfirmasi': 'waiting-confirmation',
  'menunggu-sparepart': 'waiting-parts',
  'sedang-dikerjakan': 'in-progress',
  'selesai': 'completed',
  'sudah-diambil': 'delivered',
  'cencel': 'cancelled',
  'menunggu-teknisi': 'waiting-technician',
};

const VALID_ENUM_VALUES = [
  'pending',
  'checking',
  'in-progress',
  'waiting-technician',
  'testing',
  'waiting-confirmation',
  'waiting-parts',
  'completed',
  'delivered',
  'cancelled',
];

async function normalizeServiceStatus() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL is not set. Unable to normalize service status column.');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  let hasTransaction = false;

  try {
    await client.connect();

    const statusColumnInfo = await client.query<{
      udt_name: string;
    }>(
      `
      SELECT udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'service_tickets'
        AND column_name = 'status'
      LIMIT 1;
    `,
    );

    if (statusColumnInfo.rowCount === 0) {
      console.log('service_tickets.status column not found. Skipping normalization.');
      return;
    }

    const currentType = statusColumnInfo.rows[0].udt_name;

    if (currentType === 'service_status') {
      console.log('service_tickets.status already uses the service_status enum.');
      return;
    }

    const enumExists = await client.query(`
      SELECT 1
      FROM pg_type
      WHERE typname = 'service_status'
      LIMIT 1;
    `);

    if (enumExists.rowCount === 0) {
      console.log('service_status enum type does not exist yet. Skipping normalization.');
      return;
    }

    await client.query('BEGIN');
    hasTransaction = true;

    await client.query(`
      UPDATE service_tickets
      SET status = regexp_replace(lower(trim(status)), '[\\s_]+', '-', 'g')
      WHERE status IS NOT NULL;
    `);

    await client.query(
      `
      UPDATE service_tickets
      SET status = CASE status
        ${Object.entries(LEGACY_STATUS_MAP)
          .map(([legacy, target]) => `WHEN '${legacy}' THEN '${target}'`)
          .join('\n        ')}
        ELSE status
      END
      WHERE status = ANY($1::text[]);
    `,
      [Object.keys(LEGACY_STATUS_MAP)],
    );

    await client.query(
      `
      ALTER TABLE service_tickets
      ALTER COLUMN status TYPE service_status
      USING CASE
        WHEN status IS NULL THEN NULL
        WHEN status = ANY($1::text[]) THEN status::service_status
        WHEN status = 'menunggu-teknisi' THEN 'waiting-technician'::service_status
        ELSE 'pending'::service_status
      END;
    `,
      [VALID_ENUM_VALUES],
    );

    await client.query('COMMIT');
    hasTransaction = false;

    console.log('Normalized service_tickets.status values and converted column to service_status enum.');
  } catch (error) {
    if (hasTransaction) {
      await client.query('ROLLBACK').catch(() => undefined);
    }

    console.error('Failed to normalize service status column before Drizzle push.');
    throw error;
  } finally {
    await client.end();
  }
}

normalizeServiceStatus().catch((error) => {
  console.error(error);
  process.exit(1);
});
