import { db } from "./db";
import {
  createJournalEntry,
  processPOSTransaction,
  processServiceTransaction,
  recordFinancialEvent,
  resolveSettlementAccount,
  FinanceConstants,
} from "./finance";
import { financialRecords } from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";

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

  async getTransactions(filters: { type?: string; category?: string; startDate: Date; endDate: Date; referenceType?: string }) {
    const whereClauses = [sql`${financialRecords.createdAt} >= ${filters.startDate}`, sql`${financialRecords.createdAt} <= ${filters.endDate}`];
    if (filters.type) whereClauses.push(eq(financialRecords.type, filters.type));
    if (filters.category) whereClauses.push(eq(financialRecords.category, filters.category));
    if (filters.referenceType) whereClauses.push(eq(financialRecords.referenceType, filters.referenceType));

    return db.select().from(financialRecords).where(and(...whereClauses));
  }

  async createTransaction(data: any) {
    return recordFinancialEvent({ ...data, status: data.status || "confirmed" });
  }

  async getSummary(startDate: Date, endDate: Date) {
    const rows = await db
      .select({
        category: financialRecords.category,
        total: sql`SUM(CAST(${financialRecords.amount} AS decimal))`,
      })
      .from(financialRecords)
      .where(and(sql`${financialRecords.createdAt} >= ${startDate}`, sql`${financialRecords.createdAt} <= ${endDate}`))
      .groupBy(financialRecords.category);

    return rows.reduce(
      (acc, row: any) => ({ ...acc, [row.category]: row.total ? Number(row.total) : 0 }),
      {} as Record<string, number>,
    );
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
