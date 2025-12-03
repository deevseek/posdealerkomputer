import { db } from "./db";
import {
  createJournalEntry,
  processPOSTransaction,
  processServiceTransaction,
  recordFinancialEvent,
  resolveSettlementAccount,
  FinanceConstants,
} from "./finance";
import { accounts, financialRecords, journalEntries } from "@shared/schema";
import { and, desc, eq, gte, lte, or, ilike, sql, sum } from "drizzle-orm";

export class FinanceManager {
  async processPOSTransaction(data: Parameters<typeof processPOSTransaction>[0], tx?: any) {
    return processPOSTransaction(data, tx);
  }

  async calculatePOSFinance(data: Parameters<typeof processPOSTransaction>[0], tx?: any) {
    return this.processPOSTransaction(data, tx);
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
    const whereClauses = [] as any[];
    if (filters.startDate) whereClauses.push(gte(financialRecords.createdAt, filters.startDate));
    if (filters.endDate) whereClauses.push(lte(financialRecords.createdAt, filters.endDate));
    if (filters.type) whereClauses.push(eq(financialRecords.type, filters.type));
    if (filters.category) whereClauses.push(eq(financialRecords.category, filters.category));
    if (filters.referenceType) whereClauses.push(eq(financialRecords.referenceType, filters.referenceType));

    const where = whereClauses.length ? and(...whereClauses) : undefined;

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
    const dateConditions = [gte(financialRecords.createdAt, startDate), lte(financialRecords.createdAt, endDate)];

    const cogsCategoryCondition = or(
      eq(financialRecords.category, FinanceConstants.FINANCIAL_CATEGORIES.COGS),
      ilike(financialRecords.category, "%hpp%"),
      ilike(financialRecords.category, "%harga pokok%"),
      eq(financialRecords.referenceType, "pos_cogs"),
      eq(financialRecords.referenceType, "service_parts_cost")
    );

    const [incomeResult] = await db
      .select({ total: sum(financialRecords.amount) })
      .from(financialRecords)
      .where(and(eq(financialRecords.type, "income"), ...dateConditions));

    const [expenseResult] = await db
      .select({ total: sum(financialRecords.amount) })
      .from(financialRecords)
      .where(and(eq(financialRecords.type, "expense"), ...dateConditions));

    const [salesRevenueResult] = await db
      .select({ total: sum(financialRecords.amount) })
      .from(financialRecords)
      .where(and(eq(financialRecords.category, FinanceConstants.FINANCIAL_CATEGORIES.SALES_REVENUE), ...dateConditions));

    const [cogsResult] = await db
      .select({ total: sum(financialRecords.amount) })
      .from(financialRecords)
      .where(and(eq(financialRecords.type, "expense"), cogsCategoryCondition, ...dateConditions));

    const [refundResult] = await db
      .select({ total: sum(financialRecords.amount) })
      .from(financialRecords)
      .where(and(eq(financialRecords.referenceType, "refund"), ...dateConditions));

    const [transactionCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(financialRecords)
      .where(and(...dateConditions));

    const [inventorySummary] = await db
      .select({ totalValue: sql<number>`SUM(COALESCE(${accounts.balance}, 0))` })
      .from(accounts)
      .where(eq(accounts.type, "asset"));

    const totalIncome = Number(incomeResult?.total || 0);
    const totalExpense = Number(expenseResult?.total || 0);
    const totalSalesRevenue = Number(salesRevenueResult?.total || 0);
    const totalCOGS = Number(cogsResult?.total || 0);
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
