import { db, getCurrentTenantContext } from "./db";
import {
  createJournalEntry,
  processPOSTransaction,
  processServiceTransaction,
  recordFinancialEvent,
  resolveSettlementAccount,
  FinanceConstants,
} from "./finance";
import { accounts, financialRecords, journalEntries } from "@shared/schema";
import { and, desc, eq, gte, lte, sql, sum } from "drizzle-orm";

export class FinanceManager {
  async processPOSTransaction(data: Parameters<typeof processPOSTransaction>[0], tx?: any) {
    return processPOSTransaction(data, tx);
  }

  async processServiceTransaction(data: Parameters<typeof processServiceTransaction>[0], tx?: any) {
    return processServiceTransaction(data, tx);
  }

  async createJournalEntry(type: string, lines: any[], options?: any) {
    return createJournalEntry(type, lines, options);
  }

  async createCombinedJournal(data: { description: string; reference?: string; referenceType?: string; lines: any[]; userId?: string; clientId?: string }, tx?: any) {
    return createJournalEntry(data.description, data.lines, {
      description: data.description,
      reference: data.reference,
      referenceType: data.referenceType,
      userId: data.userId,
      clientId: data.clientId,
      tx,
    });
  }

  async recordFinancialEvent(record: any, tx?: any) {
    return recordFinancialEvent(record, tx);
  }

  resolveSettlementAccount(method?: string) {
    return resolveSettlementAccount(method);
  }

  async getTransactions(filters: { type?: string; category?: string; startDate?: Date; endDate?: Date; referenceType?: string }) {
    const tenantId = getCurrentTenantContext()?.clientId;
    const whereClauses = [eq(financialRecords.status, "confirmed")] as any[];
    if (filters.startDate) whereClauses.push(gte(financialRecords.createdAt, filters.startDate));
    if (filters.endDate) whereClauses.push(lte(financialRecords.createdAt, filters.endDate));
    if (filters.type) whereClauses.push(eq(financialRecords.type, filters.type));
    if (filters.category) whereClauses.push(eq(financialRecords.category, filters.category));
    if (filters.referenceType) whereClauses.push(eq(financialRecords.referenceType, filters.referenceType));
    if (tenantId) whereClauses.push(eq(financialRecords.clientId, tenantId));

    const where = and(...whereClauses);

    return db
      .select()
      .from(financialRecords)
      .where(where)
      .orderBy(desc(financialRecords.createdAt));
  }

  async createTransaction(data: any) {
    return recordFinancialEvent({ ...data, status: data.status || "confirmed" });
  }

  async getSummary(startDate: Date, endDate: Date) {
    const tenantId = getCurrentTenantContext()?.clientId;
    const conditions = [
      gte(financialRecords.createdAt, startDate),
      lte(financialRecords.createdAt, endDate),
      eq(financialRecords.status, "confirmed"),
    ] as any[];

    if (tenantId) conditions.push(eq(financialRecords.clientId, tenantId));

    const where = and(...conditions);

    const groupedTotals = await db
      .select({
        type: financialRecords.type,
        category: financialRecords.category,
        total: sum(financialRecords.amount),
      })
      .from(financialRecords)
      .where(where)
      .groupBy(financialRecords.type, financialRecords.category);

    const getTotalByType = (type: string) =>
      groupedTotals
        .filter((row) => row.type === type)
        .reduce((acc, row) => acc + Number(row.total || 0), 0);

    const getTotalByCategory = (category: string) =>
      groupedTotals
        .filter((row) => row.category === category)
        .reduce((acc, row) => acc + Number(row.total || 0), 0);

    const [refundResult] = await db
      .select({ total: sum(financialRecords.amount) })
      .from(financialRecords)
      .where(and(where, eq(financialRecords.referenceType, "refund")));

    const [transactionCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(financialRecords)
      .where(where);

    const [inventorySummary] = await db
      .select({ totalValue: sql<number>`SUM(COALESCE(${accounts.balance}, 0))` })
      .from(accounts)
      .where(tenantId ? and(eq(accounts.type, "asset"), eq(accounts.clientId, tenantId)) : eq(accounts.type, "asset"));

    const totalIncome = getTotalByType("income");
    const totalExpense = getTotalByType("expense");
    const totalSalesRevenue = getTotalByCategory(FinanceConstants.FINANCIAL_CATEGORIES.SALES_REVENUE);
    const totalCOGS = getTotalByCategory(FinanceConstants.FINANCIAL_CATEGORIES.COGS);
    const totalRefunds = Number(refundResult?.total || 0);
    const grossProfit = totalSalesRevenue - totalCOGS;
    const netProfit = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      grossProfit,
      netProfit,
      totalSalesRevenue,
      totalCOGS,
      totalRefunds,
      inventoryValue: Number(inventorySummary?.totalValue || 0),
      transactionCount: Number(transactionCount?.count || 0),
    };
  }

  async getJournalEntry(id: string) {
    const entry = await db.query.journalEntries.findFirst({
      where: eq(journalEntries.id, id),
      with: {
        lines: {
          with: {
            account: true,
          },
        },
      },
    });

    if (!entry) return null;

    return {
      id: entry.id,
      journalNumber: entry.journalNumber,
      date: entry.date?.toISOString?.() ?? (entry as any).date,
      reference: entry.reference,
      referenceType: entry.referenceType,
      lines: entry.lines.map((line) => ({
        id: line.id,
        accountCode: line.account?.code || "",
        accountName: line.account?.name || "",
        debit: Number(line.debitAmount || 0),
        credit: Number(line.creditAmount || 0),
      })),
    };
  }

  async recordServiceCancellationBeforeCompleted(
    serviceId: string,
    fee: string,
    reason: string,
    userId?: string,
    tx?: any,
  ) {
    const amount = Number(fee || 0);
    if (amount <= 0) return { success: true };

    const settlementAccount = this.resolveSettlementAccount("cash");
    await this.createJournalEntry(
      "service_cancellation_before_completed",
      [
        { accountCode: settlementAccount, debitAmount: amount },
        { accountCode: FinanceConstants.ACCOUNT_CODES.SERVICE_REVENUE, creditAmount: amount },
      ],
      { description: `Cancellation fee ${reason || "service"}`, reference: serviceId, referenceType: "service_cancel", userId, tx },
    );

    await this.recordFinancialEvent(
      {
        type: "income",
        category: FinanceConstants.FINANCIAL_CATEGORIES.SERVICE_REVENUE,
        amount: amount.toFixed(2),
        description: `Cancellation fee ${reason || "service"}`,
        reference: serviceId,
        referenceType: "service_cancel",
        paymentMethod: "cash",
        userId,
      },
      tx,
    );

    return { success: true };
  }

  async recordServiceCancellationAfterCompleted(
    serviceId: string,
    fee: string,
    reason: string,
    userId?: string,
    tx?: any,
  ) {
    return this.recordServiceCancellationBeforeCompleted(serviceId, fee, reason, userId, tx);
  }

  async recordServiceCancellationWarrantyRefund(
    serviceId: string,
    amount: string,
    reason: string,
    userId?: string,
    tx?: any,
  ) {
    const value = Number(amount || 0);
    if (value <= 0) return { success: true };

    const settlementAccount = this.resolveSettlementAccount("cash");
    await this.createJournalEntry(
      "service_warranty_refund",
      [
        { accountCode: FinanceConstants.ACCOUNT_CODES.SERVICE_REVENUE, debitAmount: value },
        { accountCode: settlementAccount, creditAmount: value },
      ],
      { description: `Warranty refund ${reason || "service"}`, reference: serviceId, referenceType: "service_refund", userId, tx },
    );

    await this.recordFinancialEvent(
      {
        type: "expense",
        category: FinanceConstants.FINANCIAL_CATEGORIES.EXPENSE,
        amount: value.toFixed(2),
        description: `Warranty refund ${reason || "service"}`,
        reference: serviceId,
        referenceType: "service_refund",
        paymentMethod: "cash",
        userId,
      },
      tx,
    );

    return { success: true };
  }
}

export const financeManager = new FinanceManager();
export { FinanceConstants };
