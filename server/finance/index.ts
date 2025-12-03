import { and, eq, inArray, sql, sum } from "drizzle-orm";
import { db, getCurrentTenantContext } from "../db";
import {
  accounts,
  financialRecords,
  journalEntries,
  journalEntryLines,
  products,
  type FinancialRecord,
  type InsertFinancialRecord,
  type InsertJournalEntry,
  type InsertJournalEntryLine,
  type JournalEntry,
} from "@shared/schema";
import { defaultAccounts } from "../defaultAccounts";

export type JournalLineInput = {
  accountCode: string;
  description?: string;
  debitAmount?: number;
  creditAmount?: number;
};

const ACCOUNT_CODES = {
  CASH: "1111",
  BANK: "1112",
  ACCOUNTS_RECEIVABLE: "1120",
  INVENTORY: "1130",
  SALES_REVENUE: "4110",
  SERVICE_REVENUE: "4210",
  COGS: "5110",
};

const FINANCIAL_CATEGORIES = {
  SALES_REVENUE: "sales_revenue",
  SERVICE_REVENUE: "service_revenue",
  COGS: "cogs",
  EXPENSE: "expense",
  INVENTORY: "inventory",
  INVENTORY_PURCHASE: "inventory_purchase",
} as const;

type SettlementMethod = "cash" | "bank_transfer" | "credit_card" | "accounts_receivable" | string;

function resolveClientId(clientId?: string | null) {
  const ctx = getCurrentTenantContext();
  return clientId || ctx?.clientId || null;
}

export function resolveSettlementAccount(method?: SettlementMethod): string {
  const normalized = method?.toLowerCase();
  if (normalized === "bank" || normalized === "bank_transfer") return ACCOUNT_CODES.BANK;
  if (normalized === "credit_card") return ACCOUNT_CODES.BANK;
  if (normalized === "accounts_receivable") return ACCOUNT_CODES.ACCOUNTS_RECEIVABLE;
  return ACCOUNT_CODES.CASH;
}

async function findAccountsByCode(codes: string[], clientId?: string | null, tx?: any) {
  if (!codes.length) return new Map<string, typeof accounts.$inferSelect>();
  const executor = tx || db;
  const rows = await executor
    .select()
    .from(accounts)
    .where(
      clientId
        ? and(eq(accounts.clientId, clientId), inArray(accounts.code, codes))
        : inArray(accounts.code, codes),
    );
  return new Map(rows.map((row) => [row.code, row]));
}

async function ensureDefaultAccounts(codes: string[], clientId?: string | null, tx?: any) {
  const executor = tx || db;
  const defaultsByCode = new Map(defaultAccounts.map((acc) => [acc.code, acc]));
  const requiredCodes = new Set<string>();

  codes.forEach((code) => {
    let current = defaultsByCode.get(code);
    while (current) {
      requiredCodes.add(current.code);
      if (!current.parentCode) break;
      current = defaultsByCode.get(current.parentCode);
    }
  });

  if (!requiredCodes.size) return;

  const requiredList = Array.from(requiredCodes);
  const existingRows = await findAccountsByCode(requiredList, clientId, executor);
  const created = new Map(existingRows);

  for (const account of defaultAccounts) {
    if (!requiredCodes.has(account.code) || created.has(account.code)) continue;

    const parentId = account.parentCode ? created.get(account.parentCode)?.id || null : null;
    const [row] = await executor
      .insert(accounts)
      .values({
        code: account.code,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        normalBalance: account.normalBalance,
        parentId,
        description: account.description || null,
        clientId: clientId || null,
      })
      .returning();

    created.set(account.code, row);
  }
}

export async function createJournalEntry(
  type: string,
  lines: JournalLineInput[],
  options?: {
    description?: string;
    reference?: string | null;
    referenceType?: string | null;
    userId?: string | null;
    clientId?: string | null;
    tx?: any;
  },
): Promise<JournalEntry & { lines: InsertJournalEntryLine[] }> {
  const tx = options?.tx || db;
  const debitTotal = lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0);
  const creditTotal = lines.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0);

  if (Number(debitTotal.toFixed(2)) !== Number(creditTotal.toFixed(2))) {
    throw new Error(`Journal entry for ${type} must be balanced. Debit ${debitTotal} != Credit ${creditTotal}`);
  }

  const clientId = resolveClientId(options?.clientId);

  await ensureDefaultAccounts(lines.map((l) => l.accountCode), clientId, tx);
  const accountMap = await findAccountsByCode(lines.map((l) => l.accountCode), clientId, tx);
  lines.forEach((line) => {
    if (!accountMap.has(line.accountCode)) {
      throw new Error(`Account with code ${line.accountCode} not found`);
    }
  });

  const journalNumber = `JRN-${Date.now()}`;

  const [entry] = await tx
    .insert(journalEntries)
    .values({
      journalNumber,
      description: options?.description || type,
      reference: options?.reference || null,
      referenceType: options?.referenceType || null,
      totalAmount: debitTotal.toFixed(2),
      status: "posted",
      userId: options?.userId || null,
      clientId,
    } satisfies InsertJournalEntry)
    .returning();

  const linePayloads: InsertJournalEntryLine[] = lines.map((line) => {
    const account = accountMap.get(line.accountCode)!;
    return {
      journalEntryId: entry.id,
      accountId: account.id,
      description: line.description || options?.description || type,
      debitAmount: (line.debitAmount || 0).toFixed(2),
      creditAmount: (line.creditAmount || 0).toFixed(2),
      clientId,
    } satisfies InsertJournalEntryLine;
  });

  await tx.insert(journalEntryLines).values(linePayloads as any);
  return { ...entry, lines: linePayloads } as any;
}

export async function recordFinancialEvent(record: Omit<InsertFinancialRecord, "id">, tx?: any): Promise<FinancialRecord> {
  const clientId = resolveClientId(record.clientId);
  const payload: InsertFinancialRecord = {
    ...record,
    clientId,
    status: record.status || "confirmed",
  } as InsertFinancialRecord;
  const executor = tx || db;
  const [row] = await executor.insert(financialRecords).values(payload as any).returning();
  return row as FinancialRecord;
}

export async function processPOSTransaction(
  data: {
    transaction: any;
    items: Array<{ productId: string; quantity: number; totalPrice: number }>;
  },
  tx?: any,
) {
  const executor = tx || db;
  const clientId = resolveClientId(data.transaction?.clientId);
  const productIds = [...new Set(data.items.map((item) => item.productId))];
  const productsById = new Map<string, any>();

  if (productIds.length) {
    const rows = await executor
      .select({ id: products.id, purchasePrice: products.averageCost ?? products.lastPurchasePrice })
      .from(products)
      .where(clientId ? and(eq(products.clientId, clientId), inArray(products.id, productIds)) : inArray(products.id, productIds));
    rows.forEach((row) => productsById.set(row.id, row));
  }

  let revenue = 0;
  let cogs = 0;

  for (const item of data.items) {
    const net = Number(item.totalPrice || 0);
    revenue += net;
    const product = productsById.get(item.productId);
    const purchasePrice = Number(product?.purchasePrice || 0);
    cogs += Number(item.quantity) * purchasePrice;
  }

  const settlementAccount = resolveSettlementAccount(data.transaction?.paymentMethod || "cash");

  await createJournalEntry(
    "pos_sale",
    [
      { accountCode: settlementAccount, debitAmount: revenue },
      { accountCode: ACCOUNT_CODES.SALES_REVENUE, creditAmount: revenue },
      { accountCode: ACCOUNT_CODES.COGS, debitAmount: cogs },
      { accountCode: ACCOUNT_CODES.INVENTORY, creditAmount: cogs },
    ],
    {
      description: `POS ${data.transaction?.transactionNumber || data.transaction?.id}`,
      reference: data.transaction?.id,
      referenceType: "pos_sale",
      userId: data.transaction?.userId || null,
      clientId,
      tx: executor,
    },
  );

  await recordFinancialEvent(
    {
      type: "income",
      category: FINANCIAL_CATEGORIES.SALES_REVENUE,
      amount: revenue.toFixed(2),
      description: `POS ${data.transaction?.transactionNumber || ""}`.trim(),
      reference: data.transaction?.id,
      referenceType: "pos_sale",
      paymentMethod: data.transaction?.paymentMethod || "cash",
      userId: data.transaction?.userId || null,
      clientId,
    },
    executor,
  );

  await recordFinancialEvent(
    {
      type: "expense",
      category: FINANCIAL_CATEGORIES.COGS,
      amount: cogs.toFixed(2),
      description: `HPP POS ${data.transaction?.transactionNumber || ""}`.trim(),
      reference: data.transaction?.id,
      // Mark COGS as an expense tied to POS so dashboards pick it up correctly
      referenceType: "pos_cogs",
      paymentMethod: "inventory",
      userId: data.transaction?.userId || null,
      clientId,
    },
    executor,
  );

  return { revenue, cogs };
}

export async function processServiceTransaction(
  data: {
    ticket: any;
    parts?: Array<{ productId: string; quantity: number; totalPrice?: number }>;
    partsCost?: number;
    partsRevenue?: number;
    userId?: string | null;
  },
  tx?: any,
) {
  const executor = tx || db;
  const clientId = resolveClientId(data.ticket?.clientId);
  let partsRevenue = Number(data.partsRevenue || 0);
  let partsCost = Number(data.partsCost || 0);

  if (data.parts && data.parts.length > 0) {
    const ids = [...new Set(data.parts.map((p) => p.productId))];
    const productsById = await executor
      .select({ id: products.id, purchasePrice: products.averageCost ?? products.lastPurchasePrice })
      .from(products)
      .where(clientId ? and(eq(products.clientId, clientId), inArray(products.id, ids)) : inArray(products.id, ids));
    const map = new Map(productsById.map((p) => [p.id, p]));

    partsRevenue = 0;
    partsCost = 0;
    for (const part of data.parts) {
      const item = map.get(part.productId);
      const cost = Number(item?.purchasePrice || 0);
      partsRevenue += Number(part.totalPrice || 0);
      partsCost += Number(part.quantity) * cost;
    }
  }

  const laborRevenue = Number(data.ticket?.laborCost || 0);
  const totalRevenue = laborRevenue + partsRevenue;
  const settlementAccount = resolveSettlementAccount((data.ticket as any)?.paymentMethod || "cash");

  await createJournalEntry(
    "service_revenue",
    [
      { accountCode: settlementAccount, debitAmount: totalRevenue },
      { accountCode: ACCOUNT_CODES.SERVICE_REVENUE, creditAmount: laborRevenue },
      { accountCode: ACCOUNT_CODES.SALES_REVENUE, creditAmount: partsRevenue },
      { accountCode: ACCOUNT_CODES.COGS, debitAmount: partsCost },
      { accountCode: ACCOUNT_CODES.INVENTORY, creditAmount: partsCost },
    ],
    {
      description: `Service ${data.ticket?.ticketNumber || data.ticket?.id}`,
      reference: data.ticket?.id,
      referenceType: "service_ticket",
      userId: data.userId || data.ticket?.userId || null,
      clientId,
      tx: executor,
    },
  );

  await recordFinancialEvent(
    {
      type: "income",
      category: FINANCIAL_CATEGORIES.SERVICE_REVENUE,
      amount: laborRevenue.toFixed(2),
      description: `Pendapatan jasa ${data.ticket?.ticketNumber || ""}`.trim(),
      reference: data.ticket?.id,
      referenceType: "service_labor",
      paymentMethod: (data.ticket as any)?.paymentMethod || "cash",
      userId: data.userId || data.ticket?.userId || null,
      clientId,
    },
    executor,
  );

  if (partsRevenue > 0) {
    await recordFinancialEvent(
      {
        type: "income",
        category: FINANCIAL_CATEGORIES.SALES_REVENUE,
        amount: partsRevenue.toFixed(2),
        description: `Pendapatan sparepart ${data.ticket?.ticketNumber || ""}`.trim(),
        reference: data.ticket?.id,
        referenceType: "service_parts",
        paymentMethod: (data.ticket as any)?.paymentMethod || "cash",
        userId: data.userId || data.ticket?.userId || null,
        clientId,
      },
      executor,
    );
  }

  if (partsCost > 0) {
    await recordFinancialEvent(
      {
        type: "expense",
        category: FINANCIAL_CATEGORIES.COGS,
        amount: partsCost.toFixed(2),
        description: `HPP sparepart ${data.ticket?.ticketNumber || ""}`.trim(),
        reference: data.ticket?.id,
        // Ensure service part costs are treated as expenses from HPP
        referenceType: "service_parts_cost",
        paymentMethod: "inventory",
        userId: data.userId || data.ticket?.userId || null,
        clientId,
      },
      executor,
    );
  }

  return { revenue: totalRevenue, cogs: partsCost };
}

export async function recordInventoryPurchase(
  data: {
    purchaseId: string;
    supplier?: string | null;
    totalCost: number;
    paymentMethod?: SettlementMethod;
    userId?: string | null;
    clientId?: string | null;
  },
  tx?: any,
) {
  const executor = tx || db;
  const clientId = resolveClientId(data.clientId);
  const settlementAccount = resolveSettlementAccount(data.paymentMethod || "cash");
  const amount = Number(data.totalCost || 0);

  if (amount <= 0) return null;

  await createJournalEntry(
    "inventory_purchase",
    [
      { accountCode: ACCOUNT_CODES.INVENTORY, debitAmount: amount },
      { accountCode: settlementAccount, creditAmount: amount },
    ],
    {
      description: data.supplier
        ? `Inventory purchase from ${data.supplier}`
        : "Inventory purchase",
      reference: data.purchaseId,
      referenceType: "inventory_purchase",
      userId: data.userId || null,
      clientId,
      tx: executor,
    },
  );

  await recordFinancialEvent(
    {
      type: "asset",
      category: FINANCIAL_CATEGORIES.INVENTORY,
      amount: amount.toFixed(2),
      description: data.supplier
        ? `Inventory purchase from ${data.supplier}`
        : "Inventory purchase",
      reference: data.purchaseId,
      referenceType: "inventory_purchase",
      paymentMethod: data.paymentMethod || "cash",
      userId: data.userId || null,
      clientId,
    },
    executor,
  );

  return { amount };
}

export async function getFinancialSummary(startDate: Date, endDate: Date, tx?: any) {
  const executor = tx || db;
  const clientId = resolveClientId();
  const rows = await executor
    .select({
      category: financialRecords.category,
      total: sum(sql`CAST(${financialRecords.amount} AS decimal)`),
    })
    .from(financialRecords)
    .where(
      and(
        sql`${financialRecords.createdAt} >= ${startDate}`,
        sql`${financialRecords.createdAt} <= ${endDate}`,
        clientId ? eq(financialRecords.clientId, clientId) : sql`true`,
      ),
    )
    .groupBy(financialRecords.category);

  return rows.reduce(
    (acc, row) => ({ ...acc, [row.category]: row.total ? Number(row.total) : 0 }),
    {} as Record<string, number>,
  );
}

export const FinanceConstants = { ACCOUNT_CODES, FINANCIAL_CATEGORIES };
