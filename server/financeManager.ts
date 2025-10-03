import { db } from "./db";
import { 
  financialRecords, 
  employees, 
  payrollRecords, 
  attendanceRecords,
  products,
  accounts,
  journalEntries,
  journalEntryLines,
  transactions,
  transactionItems,
  serviceTickets,
  type InsertFinancialRecord,
  type FinancialRecord,
  type InsertEmployee,
  type Employee,
  type InsertPayrollRecord,
  type PayrollRecord,
  type InsertAttendanceRecord,
  type AttendanceRecord,
  type JournalEntry,
  type InsertJournalEntry,
  type JournalEntryLine,
  type InsertJournalEntryLine,
  type Account
} from "@shared/schema";
import { eq, and, gte, lte, desc, sum, count, sql } from "drizzle-orm";

// Default Chart of Accounts codes - Enhanced with Indonesian accounting terminology
const ACCOUNT_CODES = {
  // Assets (Aset)
  CASH: '1111', // Kas
  BANK: '1112', // Bank
  ACCOUNTS_RECEIVABLE: '1120', // Piutang Dagang
  INVENTORY: '1130', // Persediaan Barang
  DAMAGED_GOODS_INVENTORY: '1135', // Persediaan Barang Rusak
  
  // Liabilities (Kewajiban)
  ACCOUNTS_PAYABLE: '2110', // Hutang Dagang
  CUSTOMER_DEPOSITS: '2120', // Uang Muka Pelanggan
  
  // Revenue (Pendapatan)
  SALES_REVENUE: '4110', // Pendapatan Penjualan
  SERVICE_REVENUE: '4210', // Pendapatan Jasa Service
  
  // Expenses (Beban)
  COST_OF_GOODS_SOLD: '5110', // Harga Pokok Penjualan
  WARRANTY_EXPENSE: '5120', // Beban Garansi
  DAMAGED_GOODS_LOSS: '5130', // Kerugian Barang Rusak
  PAYROLL_EXPENSE: '5210', // Beban Gaji
  OTHER_EXPENSE: '5290', // Beban Lain-lain
};

export class FinanceManager {
  // Helper method to get account by code
  private async getAccountByCode(code: string): Promise<Account | null> {
    const [account] = await db.select().from(accounts).where(eq(accounts.code, code)).limit(1);
    return account || null;
  }

  // Initialize default chart of accounts
  async initializeDefaultAccounts(): Promise<{ success: boolean; message: string; accountsCreated: number }> {
    try {
      const { defaultAccounts } = await import('./defaultAccounts');
      
      let accountsCreated = 0;
      
      for (const account of defaultAccounts) {
        try {
          // Check if account already exists
          const existing = await this.getAccountByCode(account.code);
          
          if (!existing) {
            // Insert new account
            await db.insert(accounts).values({
              code: account.code,
              name: account.name,
              type: account.type,
              subtype: account.subtype,
              normalBalance: account.normalBalance,
              parentCode: account.parentCode || null,
              description: account.description,
              balance: '0'
            });
            accountsCreated++;
            console.log(`✅ Created account: ${account.code} - ${account.name}`);
          }
        } catch (error) {
          console.error(`❌ Error creating account ${account.code}:`, error);
          // Continue with other accounts
        }
      }
      
      return {
        success: true,
        message: `Successfully initialized chart of accounts. Created ${accountsCreated} new accounts.`,
        accountsCreated
      };
    } catch (error) {
      console.error('Error initializing default accounts:', error);
      return {
        success: false,
        message: `Failed to initialize default accounts: ${(error as Error).message}`,
        accountsCreated: 0
      };
    }
  }
  
  // Create Journal Entry with double-entry bookkeeping
  async createJournalEntry(
    data: {
      description: string;
      reference?: string;
      referenceType?: string;
      lines: {
        accountCode: string;
        description: string;
        debitAmount?: string;
        creditAmount?: string;
      }[];
      userId: string;
    },
    tx?: any
  ): Promise<{ success: boolean; journalEntry?: JournalEntry; error?: string }> {
    const dbClient = tx || db;
    try {
      // Validate that debits equal credits
      const totalDebits = data.lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0);
      const totalCredits = data.lines.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0);
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return {
          success: false,
          error: `Debits (${totalDebits}) must equal Credits (${totalCredits})`
        };
      }
      
      const totalAmount = totalDebits;
      const journalNumber = `JE-${Date.now()}`;
      
      // Create journal entry
      const [journalEntry] = await dbClient.insert(journalEntries).values({
        journalNumber,
        date: new Date(),
        description: data.description,
        reference: data.reference,
        referenceType: data.referenceType,
        totalAmount: totalAmount.toString(),
        status: 'posted',
        userId: data.userId
      }).returning();
      
      // Create journal entry lines and update account balances
      for (const lineData of data.lines) {
        const account = await this.getAccountByCode(lineData.accountCode);
        if (!account) {
          return {
            success: false,
            error: `Account with code ${lineData.accountCode} not found`
          };
        }
        
        // Create journal entry line
        await dbClient.insert(journalEntryLines).values({
          journalEntryId: journalEntry.id,
          accountId: account.id,
          description: lineData.description,
          debitAmount: lineData.debitAmount || '0',
          creditAmount: lineData.creditAmount || '0'
        });
        
        // Update account balance based on normal balance
        const debitAmount = Number(lineData.debitAmount || 0);
        const creditAmount = Number(lineData.creditAmount || 0);
        let balanceChange = 0;
        
        if (account.normalBalance === 'debit') {
          balanceChange = debitAmount - creditAmount;
        } else {
          balanceChange = creditAmount - debitAmount;
        }
        
        await dbClient.update(accounts)
          .set({ 
            balance: sql`${accounts.balance} + ${balanceChange}`,
            updatedAt: new Date()
          })
          .where(eq(accounts.id, account.id));
      }
      
      return { success: true, journalEntry };
      
    } catch (error) {
      console.error('Error creating journal entry:', error);
      return {
        success: false,
        error: `Failed to create journal entry: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  // Enhanced transaction creation with automatic journal entries
  async createTransactionWithJournal(
    data: {
      type: 'income' | 'expense' | 'transfer';
      category: string;
      subcategory?: string;
      amount: string;
      description: string;
      referenceType?: string;
      reference?: string;
      paymentMethod?: string;
      tags?: string[];
      userId: string;
    },
    tx?: any
  ): Promise<{ success: boolean; transaction?: FinancialRecord; error?: string }> {
    const dbClient = tx || db;
    try {
      // Create the financial record
      const [transaction] = await dbClient.insert(financialRecords).values({
        type: data.type,
        category: data.category,
        subcategory: data.subcategory,
        amount: data.amount,
        description: data.description,
        reference: data.reference,
        referenceType: data.referenceType,
        paymentMethod: data.paymentMethod,
        tags: data.tags,
        status: 'confirmed',
        userId: data.userId
      }).returning();
      
      // Create corresponding journal entries
      const amount = Number(data.amount);
      let journalLines: Array<{
        accountCode: string;
        description: string;
        debitAmount?: string;
        creditAmount?: string;
      }> = [];
      
      // Map categories to accounts and create journal entries
      if (data.type === 'income') {
        // Income: Debit Cash/Bank, Credit Revenue
        const cashAccount = data.paymentMethod === 'cash' ? ACCOUNT_CODES.CASH : ACCOUNT_CODES.BANK;
        const revenueAccount = data.category === 'Service Revenue' ? ACCOUNT_CODES.SERVICE_REVENUE : ACCOUNT_CODES.SALES_REVENUE;
        
        journalLines = [
          {
            accountCode: cashAccount,
            description: `Receive payment - ${data.description}`,
            debitAmount: amount.toString()
          },
          {
            accountCode: revenueAccount,
            description: data.description,
            creditAmount: amount.toString()
          }
        ];
      } else if (data.type === 'expense') {
        // Expense: Debit Expense, Credit Cash/Bank
        const cashAccount = data.paymentMethod === 'cash' ? ACCOUNT_CODES.CASH : ACCOUNT_CODES.BANK;
        const expenseAccount = data.category === 'Payroll' ? ACCOUNT_CODES.PAYROLL_EXPENSE : ACCOUNT_CODES.OTHER_EXPENSE;
        
        journalLines = [
          {
            accountCode: expenseAccount,
            description: data.description,
            debitAmount: amount.toString()
          },
          {
            accountCode: cashAccount,
            description: `Payment - ${data.description}`,
            creditAmount: amount.toString()
          }
        ];
      }
      
      // Create journal entry if we have lines
      if (journalLines.length > 0) {
        const journalResult = await this.createJournalEntry({
          description: `${data.type.toUpperCase()}: ${data.description}`,
          reference: transaction.id,
          referenceType: 'financial_transaction',
          lines: journalLines,
          userId: data.userId
        }, tx);
        
        if (!journalResult.success) {
          console.warn('Failed to create journal entry:', journalResult.error);
        } else {
          // Link the journal entry to the financial record
          await dbClient.update(financialRecords)
            .set({ journalEntryId: journalResult.journalEntry?.id })
            .where(eq(financialRecords.id, transaction.id));
        }
      }
      
      return { success: true, transaction };
      
    } catch (error) {
      console.error('Error creating transaction with journal:', error);
      return {
        success: false,
        error: `Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  // Standard Accounting Reports
  async getBalanceSheet(asOfDate?: Date): Promise<{
    assets: { [category: string]: { accounts: Array<{ name: string; balance: number; code: string }>, total: number } },
    liabilities: { [category: string]: { accounts: Array<{ name: string; balance: number; code: string }>, total: number } },
    equity: { [category: string]: { accounts: Array<{ name: string; balance: number; code: string }>, total: number } },
    totalAssets: number,
    totalLiabilities: number,
    totalEquity: number,
    balanceCheck: boolean
  }> {
    const asOf = asOfDate || new Date();
    
    // Get all accounts with their current balances
    const allAccounts = await db.select({
      id: accounts.id,
      code: accounts.code,
      name: accounts.name,
      type: accounts.type,
      subtype: accounts.subtype,
      balance: accounts.balance,
      normalBalance: accounts.normalBalance
    })
    .from(accounts)
    .where(and(
      eq(accounts.isActive, true),
      sql`${accounts.type} IN ('asset', 'liability', 'equity')`
    ))
    .orderBy(accounts.code);
    
    const assets: any = {};
    const liabilities: any = {};
    const equity: any = {};
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    
    allAccounts.forEach(account => {
      const balance = Number(account.balance);
      const accountInfo = {
        name: account.name,
        balance: balance,
        code: account.code
      };
      
      if (account.type === 'asset') {
        const category = account.subtype || 'Other Assets';
        if (!assets[category]) {
          assets[category] = { accounts: [], total: 0 };
        }
        assets[category].accounts.push(accountInfo);
        assets[category].total += balance;
        totalAssets += balance;
      } else if (account.type === 'liability') {
        const category = account.subtype || 'Other Liabilities';
        if (!liabilities[category]) {
          liabilities[category] = { accounts: [], total: 0 };
        }
        liabilities[category].accounts.push(accountInfo);
        liabilities[category].total += balance;
        totalLiabilities += balance;
      } else if (account.type === 'equity') {
        const category = account.subtype || 'Owner Equity';
        if (!equity[category]) {
          equity[category] = { accounts: [], total: 0 };
        }
        equity[category].accounts.push(accountInfo);
        equity[category].total += balance;
        totalEquity += balance;
      }
    });
    
    const balanceCheck = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;
    
    return {
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      balanceCheck
    };
  }
  
  async getIncomeStatement(startDate?: Date, endDate?: Date): Promise<{
    revenue: { [category: string]: { accounts: Array<{ name: string; amount: number; code: string }>, total: number } },
    expenses: { [category: string]: { accounts: Array<{ name: string; amount: number; code: string }>, total: number } },
    totalRevenue: number,
    totalExpenses: number,
    grossProfit: number,
    netIncome: number
  }> {
    const start = startDate || new Date(new Date().getFullYear(), 0, 1); // Beginning of year
    const end = endDate || new Date();
    
    // Get revenue and expense accounts with their activity in the period
    const revenueAndExpenseAccounts = await db.select({
      id: accounts.id,
      code: accounts.code,
      name: accounts.name,
      type: accounts.type,
      subtype: accounts.subtype,
      normalBalance: accounts.normalBalance
    })
    .from(accounts)
    .where(and(
      eq(accounts.isActive, true),
      sql`${accounts.type} IN ('revenue', 'expense')`
    ))
    .orderBy(accounts.code);

    const revenue: any = {};
    const expenses: any = {};
    let totalRevenue = 0;
    let totalExpenses = 0;

    // Calculate account activity for the period, ONLY for 'confirmed' financial records
    for (const account of revenueAndExpenseAccounts) {
      // Get journal entry lines for this account in the period
      const activityQuery = await db.select({
        debitAmount: journalEntryLines.debitAmount,
        creditAmount: journalEntryLines.creditAmount
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(and(
        eq(journalEntryLines.accountId, account.id),
        gte(journalEntries.date, start),
        lte(journalEntries.date, end),
        eq(journalEntries.status, 'posted')
      ));

      // Filter only 'confirmed' financial records for this account
      // ...existing code...
      let periodActivity = 0;
      activityQuery.forEach((line) => {
        const debit = Number(line.debitAmount ?? 0);
        const credit = Number(line.creditAmount ?? 0);
        if (account.normalBalance === 'credit') {
          periodActivity += credit - debit;
        } else {
          periodActivity += debit - credit;
        }
      });

      // Only include accounts with activity
      if (Math.abs(periodActivity) > 0.01) {
        const accountInfo = {
          name: account.name,
          amount: periodActivity,
          code: account.code
        };

        if (account.type === 'revenue') {
          const category = account.subtype || 'Other Revenue';
          if (!revenue[category]) {
            revenue[category] = { accounts: [], total: 0 };
          }
          revenue[category].accounts.push(accountInfo);
          revenue[category].total += periodActivity;
          totalRevenue += periodActivity;
        } else if (account.type === 'expense') {
          const category = account.subtype || 'Other Expenses';
          if (!expenses[category]) {
            expenses[category] = { accounts: [], total: 0 };
          }
          expenses[category].accounts.push(accountInfo);
          expenses[category].total += periodActivity;
          totalExpenses += periodActivity;
        }
      }
    }

    // Calculate gross profit (Revenue - COGS)
    const cogs = expenses['cost_of_goods_sold']?.total || 0;
    const grossProfit = totalRevenue - cogs;
    const netIncome = totalRevenue - totalExpenses;

    return {
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      grossProfit,
      netIncome
    };
  }
  
  // Get Chart of Accounts
  async getChartOfAccounts(): Promise<Account[]> {
    return await db.select().from(accounts)
      .where(eq(accounts.isActive, true))
      .orderBy(accounts.code);
  }
  
  // Financial Transactions (Enhanced)
  async createTransaction(
    data: {
      type: 'income' | 'expense' | 'transfer';
      category: string;
      subcategory?: string;
      amount: string;
      description: string;
      referenceType?: string;
      reference?: string;
      paymentMethod?: string;
      tags?: string[];
      userId: string;
    },
    tx?: any
  ): Promise<FinancialRecord> {
    // Use the enhanced method that creates journal entries
    const result = await this.createTransactionWithJournal(data, tx);
    
    if (!result.success || !result.transaction) {
      throw new Error(result.error || 'Failed to create transaction');
    }
    
    return result.transaction;
  }

  async getTransactions(filters?: {
    type?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    referenceType?: string;
  }): Promise<FinancialRecord[]> {
    const conditions = [];
    if (filters?.type) conditions.push(eq(financialRecords.type, filters.type));
    if (filters?.category) conditions.push(eq(financialRecords.category, filters.category));
    if (filters?.referenceType) conditions.push(eq(financialRecords.referenceType, filters.referenceType));
    if (filters?.startDate) conditions.push(gte(financialRecords.createdAt, filters.startDate));
    if (filters?.endDate) conditions.push(lte(financialRecords.createdAt, filters.endDate));
    
    if (conditions.length > 0) {
      return await db
        .select()
        .from(financialRecords)
        .where(and(...conditions))
        .orderBy(desc(financialRecords.createdAt));
    }
    
    return await db
      .select()
      .from(financialRecords)
      .orderBy(desc(financialRecords.createdAt));
  }

  async getSummary(startDate?: Date, endDate?: Date): Promise<{
    totalIncome: string;
    totalExpense: string;
    netProfit: string;
    totalSalesRevenue: string;
    totalCOGS: string;
    totalRefunds: string;
    transactionCount: number;
    inventoryValue: string;
    inventoryCount: number;
    breakdown: {
      categories: { [key: string]: { income: number; expense: number; count: number } };
      paymentMethods: { [key: string]: number };
      sources: { [key: string]: { amount: number; count: number } };
      subcategories: { [key: string]: { amount: number; type: string; count: number } };
      inventory: { [key: string]: { value: number; stock: number; avgCost: number } };
    };
  }> {
    const conditions = [];
    if (startDate) conditions.push(gte(financialRecords.createdAt, startDate));
    if (endDate) conditions.push(lte(financialRecords.createdAt, endDate));
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Tambahkan filter status 'confirmed' ke semua query
    const confirmedCondition = eq(financialRecords.status, 'confirmed');
    const whereClauseWithStatus = whereClause ? and(confirmedCondition, whereClause) : confirmedCondition;

    // Total income - EXCLUDE refunds from revenue calculation for accounting accuracy
    const [incomeResult] = await db
      .select({ total: sum(financialRecords.amount) })
      .from(financialRecords)
      .where(and(
        eq(financialRecords.type, 'income'),
        sql`${financialRecords.category} NOT LIKE '%Refund%'`,
        sql`${financialRecords.category} != 'Returns and Allowances'`,
        sql`${financialRecords.description} NOT LIKE '%Refund%'`,
        whereClauseWithStatus
      ));

    // Get service cancellation expenses to subtract from revenue for accurate NET revenue calculation
    const [cancellationExpenseResult] = await db
      .select({ total: sum(financialRecords.amount) })
      .from(financialRecords)
      .where(and(
        eq(financialRecords.type, 'expense'),
        sql`${financialRecords.category} IN ('Service Cancellation', 'Warranty Refund')`,
        whereClauseWithStatus
      ));

    // Total expense - calculate properly excluding asset purchases
    const allExpenses = await db
      .select({
        category: financialRecords.category,
        amount: financialRecords.amount
      })
      .from(financialRecords)
      .where(and(eq(financialRecords.type, 'expense'), whereClauseWithStatus));

    // Exclude inventory purchases AND cancellation expenses from expense calculation 
    // (cancellation expenses are already netted from revenue above)
    const actualExpenses = allExpenses.filter((expense: { category: string; amount: string }) =>
      expense.category !== 'Inventory Purchase' &&
      expense.category !== 'Service Cancellation' &&
      expense.category !== 'Warranty Refund' &&
      !expense.category?.toLowerCase().includes('purchase') &&
      !expense.category?.toLowerCase().includes('asset')
    );

    const totalExpenseAmount = actualExpenses.reduce((sum: number, expense: { amount: string }) => sum + Number(expense.amount), 0);

    const grossIncome = Number(incomeResult.total || 0);
    const cancellationExpenses = Number(cancellationExpenseResult.total || 0);
    const totalIncome = grossIncome - cancellationExpenses; // Net revenue after cancellations
    const totalExpense = totalExpenseAmount;

    const [cogsResult] = await db
      .select({ total: sum(financialRecords.amount) })
      .from(financialRecords)
      .where(and(
        eq(financialRecords.type, 'expense'),
        sql`LOWER(${financialRecords.category}) = 'cost of goods sold'`,
        whereClauseWithStatus
      ));

    const totalSalesRevenue = totalIncome;
    const totalCOGS = Number(cogsResult?.total || 0);

    // Count
    const [countResult] = await db
      .select({ count: count() })
      .from(financialRecords)
      .where(whereClauseWithStatus);

    // Breakdown by category
    const categoryBreakdown = await db
      .select({
        category: financialRecords.category,
        type: financialRecords.type,
        total: sum(financialRecords.amount),
        count: count()
      })
      .from(financialRecords)
      .where(whereClauseWithStatus)
      .groupBy(financialRecords.category, financialRecords.type);

    // Breakdown by subcategory
    const subcategoryBreakdown = await db
      .select({
        subcategory: financialRecords.subcategory,
        type: financialRecords.type,
        total: sum(financialRecords.amount),
        count: count()
      })
      .from(financialRecords)
      .where(whereClauseWithStatus)
      .groupBy(financialRecords.subcategory, financialRecords.type);

    // Breakdown by payment method
    const paymentBreakdown = await db
      .select({
        paymentMethod: financialRecords.paymentMethod,
        total: sum(financialRecords.amount)
      })
      .from(financialRecords)
      .where(whereClauseWithStatus)
      .groupBy(financialRecords.paymentMethod);

    // Breakdown by source/reference type
    const sourceBreakdown = await db
      .select({
        referenceType: financialRecords.referenceType,
        total: sum(financialRecords.amount),
        count: count()
      })
      .from(financialRecords)
      .where(whereClauseWithStatus)
      .groupBy(financialRecords.referenceType);

    // Inventory value calculation
    const inventoryBreakdown = await db
      .select({
        name: products.name,
        stock: products.stock,
        averageCost: products.averageCost,
        sellingPrice: products.sellingPrice,
        totalValue: sql<number>`${products.stock} * COALESCE(${products.averageCost}, 0)`,
      })
      .from(products)
      .where(and(eq(products.isActive, true), gte(products.stock, 0)));

    type InventoryBreakdownRow = {
      name: string | null;
      stock: number | null;
      averageCost: string | null;
      sellingPrice: string | null;
      totalValue: number | null;
    };

    const inventoryBreakdownRows = inventoryBreakdown as InventoryBreakdownRow[];

    const totalInventoryValue = inventoryBreakdownRows.reduce(
      (total, item) => total + Number(item.totalValue ?? 0),
      0
    );

    const totalInventoryCount = inventoryBreakdownRows.reduce(
      (total, item) => total + Number(item.stock ?? 0),
      0
    );

    // Get total refunds separately for proper accounting
    const [refundResult] = await db
      .select({ total: sum(financialRecords.amount) })
      .from(financialRecords)
      .where(and(
        sql`${financialRecords.type} = 'refund_recovery' OR ${financialRecords.category} = 'Returns and Allowances'`,
        whereClauseWithStatus
      ));

    const totalRefunds = Number(refundResult.total || 0);

    // Process category breakdown
    const categories: { [key: string]: { income: number; expense: number; count: number } } = {};
    categoryBreakdown.forEach((item) => {
      if (!item.category) {
        return;
      }

      if (!categories[item.category]) {
        categories[item.category] = { income: 0, expense: 0, count: 0 };
      }
      if (item.type === 'income') {
        categories[item.category].income = Number(item.total ?? 0);
      } else {
        categories[item.category].expense = Number(item.total ?? 0);
      }
      categories[item.category].count += item.count;
    });

    // Process subcategory breakdown
    const subcategories: { [key: string]: { amount: number; type: string; count: number } } = {};
    subcategoryBreakdown.forEach((item) => {
      if (item.subcategory) {
        subcategories[item.subcategory] = {
          amount: Number(item.total ?? 0),
          type: item.type,
          count: item.count
        };
      }
    });

    // Process payment method breakdown
    const paymentMethods: { [key: string]: number } = {};
    paymentBreakdown.forEach((item) => {
      if (item.paymentMethod) {
        paymentMethods[item.paymentMethod] = Number(item.total ?? 0);
      }
    });

    // Process source breakdown
    const sources: { [key: string]: { amount: number; count: number } } = {};
    sourceBreakdown.forEach((item) => {
      if (item.referenceType) {
        sources[item.referenceType] = {
          amount: Number(item.total ?? 0),
          count: item.count
        };
      }
    });

    // Process inventory breakdown
    const inventory: { [key: string]: { value: number; stock: number; avgCost: number } } = {};
    inventoryBreakdownRows.forEach((item) => {
      if (!item.name) {
        return;
      }

      inventory[item.name] = {
        value: Number(item.totalValue ?? 0),
        stock: Number(item.stock ?? 0),
        avgCost: Number(item.averageCost ?? 0)
      };
    });

    return {
      totalIncome: totalIncome.toString(),
      totalExpense: totalExpense.toString(),
      netProfit: (totalSalesRevenue - totalCOGS).toString(),
      totalSalesRevenue: totalSalesRevenue.toString(),
      totalCOGS: totalCOGS.toString(),
      totalRefunds: totalRefunds.toString(),
      transactionCount: countResult.count,
      inventoryValue: totalInventoryValue.toString(),
      inventoryCount: totalInventoryCount,
      breakdown: {
        categories,
        paymentMethods,
        sources,
        subcategories,
        inventory
      }
    };
  }

  // Employee Management
  async createEmployee(data: InsertEmployee): Promise<Employee> {
    const employeeNumber = `EMP${Date.now().toString().slice(-6)}`;
    
    // Convert string date to Date object if needed
    const processedData = {
      ...data,
      employeeNumber,
      joinDate: typeof data.joinDate === 'string' ? new Date(data.joinDate) : data.joinDate,
      endDate: data.endDate && typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate
    };
    
    const [employee] = await db.insert(employees).values(processedData).returning();
    return employee;
  }

  async getEmployees(includeInactive = false): Promise<Employee[]> {
    if (!includeInactive) {
      return await db
        .select()
        .from(employees)
        .where(eq(employees.status, 'active'))
        .orderBy(employees.name);
    }
    
    return await db
      .select()
      .from(employees)
      .orderBy(employees.name);
  }

  async getEmployeeById(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee> {
    // Convert string dates to Date objects if needed
    const processedData = {
      ...data,
      updatedAt: new Date(),
      joinDate: data.joinDate && typeof data.joinDate === 'string' ? new Date(data.joinDate) : data.joinDate,
      endDate: data.endDate && typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate
    };
    
    const [employee] = await db
      .update(employees)
      .set(processedData)
      .where(eq(employees.id, id))
      .returning();
    return employee;
  }

  // Payroll Management
  async createPayroll(data: {
    employeeId: string;
    periodStart: Date | string;
    periodEnd: Date | string;
    baseSalary: string;
    overtime?: string;
    bonus?: string;
    allowances?: string;
    taxDeduction?: string;
    socialSecurity?: string;
    healthInsurance?: string;
    otherDeductions?: string;
    userId: string;
  }): Promise<PayrollRecord> {
    const payrollNumber = `PAY${Date.now().toString().slice(-8)}`;
    
    // Convert string dates to Date objects if needed
    const periodStart = typeof data.periodStart === 'string' ? new Date(data.periodStart) : data.periodStart;
    const periodEnd = typeof data.periodEnd === 'string' ? new Date(data.periodEnd) : data.periodEnd;
    
    const baseSalary = Number(data.baseSalary);
    const overtime = Number(data.overtime || 0);
    const bonus = Number(data.bonus || 0);
    const allowances = Number(data.allowances || 0);
    const grossPay = baseSalary + overtime + bonus + allowances;
    
    const taxDeduction = Number(data.taxDeduction || 0);
    const socialSecurity = Number(data.socialSecurity || 0);
    const healthInsurance = Number(data.healthInsurance || 0);
    const otherDeductions = Number(data.otherDeductions || 0);
    const totalDeductions = taxDeduction + socialSecurity + healthInsurance + otherDeductions;
    
    const netPay = grossPay - totalDeductions;
    
    const [payroll] = await db.insert(payrollRecords).values({
      employeeId: data.employeeId,
      payrollNumber,
      periodStart,
      periodEnd,
      baseSalary: data.baseSalary,
      overtime: data.overtime || "0",
      bonus: data.bonus || "0",
      allowances: data.allowances || "0",
      grossPay: grossPay.toString(),
      taxDeduction: data.taxDeduction || "0",
      socialSecurity: data.socialSecurity || "0",
      healthInsurance: data.healthInsurance || "0",
      otherDeductions: data.otherDeductions || "0",
      netPay: netPay.toString(),
      status: 'draft',
      userId: data.userId
    }).returning();
    
    return payroll;
  }

  async getPayrollRecords(employeeId?: string): Promise<PayrollRecord[]> {
    if (employeeId) {
      return await db
        .select()
        .from(payrollRecords)
        .where(eq(payrollRecords.employeeId, employeeId))
        .orderBy(desc(payrollRecords.createdAt));
    }
    
    return await db
      .select()
      .from(payrollRecords)
      .orderBy(desc(payrollRecords.createdAt));
  }

  async updatePayrollStatus(id: string, status: 'draft' | 'approved' | 'paid'): Promise<PayrollRecord> {
    const [payroll] = await db
      .update(payrollRecords)
      .set({ 
        status, 
        paidDate: status === 'paid' ? new Date() : null,
        updatedAt: new Date() 
      })
      .where(eq(payrollRecords.id, id))
      .returning();
    
    // Create financial record when marked as paid
    if (status === 'paid' && payroll) {
      const existingRecord = await db
        .select()
        .from(financialRecords)
        .where(and(
          eq(financialRecords.referenceType, 'payroll'),
          eq(financialRecords.reference, payroll.id)
        ));
      
      if (existingRecord.length === 0) {
        await this.createTransaction({
          type: 'expense',
          category: 'Payroll',
          subcategory: 'Salary',
          amount: payroll.netPay,
          description: `Gaji ${payroll.payrollNumber}`,
          referenceType: 'payroll',
          reference: payroll.id,
          paymentMethod: 'bank_transfer',
          userId: payroll.userId || 'a4fb9372-ec01-4825-b035-81de75a18053'
        });
      }
    }
    
    return payroll;
  }

  // Attendance Management
  async createAttendance(data: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const [attendance] = await db.insert(attendanceRecords).values(data).returning();
    return attendance;
  }

  async getAttendanceRecords(employeeId?: string, startDate?: Date, endDate?: Date): Promise<AttendanceRecord[]> {
    const conditions = [];
    if (employeeId) conditions.push(eq(attendanceRecords.employeeId, employeeId));
    if (startDate) conditions.push(gte(attendanceRecords.date, startDate));
    if (endDate) conditions.push(lte(attendanceRecords.date, endDate));
    
    if (conditions.length > 0) {
      return await db
        .select()
        .from(attendanceRecords)
        .where(and(...conditions))
        .orderBy(desc(attendanceRecords.date));
    }
    
    return await db
      .select()
      .from(attendanceRecords)
      .orderBy(desc(attendanceRecords.date));
  }

  // Service Integration
  async recordServiceIncome(serviceId: string, amount: string, description: string, userId: string): Promise<void> {
    // Check if record already exists
    const existingRecord = await db
      .select()
      .from(financialRecords)
      .where(and(
        eq(financialRecords.referenceType, 'service'),
        eq(financialRecords.reference, serviceId),
        eq(financialRecords.type, 'income')
      ));
    
    if (existingRecord.length === 0) {
      await this.createTransaction({
        type: 'income',
        category: 'Service Revenue',
        subcategory: 'Repair Service',
        amount,
        description,
        referenceType: 'service',
        reference: serviceId,
        paymentMethod: 'cash',
        userId
      });
    }
  }

  async recordPartsCost(serviceId: string, partName: string, quantity: number, modalPrice: string, sellingPrice: string, userId: string): Promise<void> {
    // Record parts cost (modal/purchase price) as expense
    const modalAmount = (Number(modalPrice) * quantity).toString();
    const existingModalRecord = await db
      .select()
      .from(financialRecords)
      .where(and(
        eq(financialRecords.referenceType, 'service_parts_cost'),
        eq(financialRecords.reference, serviceId),
        eq(financialRecords.description, `Biaya modal ${partName} (${quantity}x)`)
      ));

    if (existingModalRecord.length === 0) {
      await this.createTransaction({
        type: 'expense',
        category: 'Cost of Goods Sold',
        subcategory: 'Parts Cost',
        amount: modalAmount,
        description: `Biaya modal ${partName} (${quantity}x)`,
        referenceType: 'service_parts_cost',
        reference: serviceId,
        paymentMethod: 'inventory',
        userId
      });
    }

    // Record parts revenue (selling price) as income
    const sellingAmount = (Number(sellingPrice) * quantity).toString();
    const existingSellingRecord = await db
      .select()
      .from(financialRecords)
      .where(and(
        eq(financialRecords.referenceType, 'service_parts_revenue'),
        eq(financialRecords.reference, serviceId),
        eq(financialRecords.description, `Penjualan ${partName} (${quantity}x)`)
      ));

    if (existingSellingRecord.length === 0) {
      await this.createTransaction({
        type: 'income',
        category: 'Service Revenue',
        subcategory: 'Parts Sales',
        amount: sellingAmount,
        description: `Penjualan ${partName} (${quantity}x)`,
        referenceType: 'service_parts_revenue',
        reference: serviceId,
        paymentMethod: 'cash',
        userId
      });
    }
  }

  async recordLaborCost(serviceId: string, laborCost: string, description: string, userId: string): Promise<void> {
    // Check if record already exists
    const existingRecord = await db
      .select()
      .from(financialRecords)
      .where(and(
        eq(financialRecords.referenceType, 'service_labor'),
        eq(financialRecords.reference, serviceId),
        eq(financialRecords.type, 'income')
      ));
    
    if (existingRecord.length === 0 && Number(laborCost) > 0) {
      await this.createTransaction({
        type: 'income',
        category: 'Service Revenue',
        subcategory: 'Labor Charge',
        amount: laborCost,
        description: `Ongkos tenaga kerja - ${description}`,
        referenceType: 'service_labor',
        reference: serviceId,
        paymentMethod: 'cash',
        userId
      });
    }
  }

  // Categories and Analytics
  async getFinancialCategories(): Promise<{
    incomeCategories: string[];
    expenseCategories: string[];
  }> {
    const records = await db.select().from(financialRecords);
    
    const incomeSet = new Set<string>();
    const expenseSet = new Set<string>();
    
    records.forEach((r: { type: string; category: string }) => {
      if (r.type === 'income') {
        incomeSet.add(r.category);
      } else if (r.type === 'expense') {
        expenseSet.add(r.category);
      }
    });
    
    return { 
      incomeCategories: Array.from(incomeSet),
      expenseCategories: Array.from(expenseSet)
    };
  }

  // Service Cancellation Methods - Updated with proper journal entries and transaction support
  async recordServiceCancellationBeforeCompleted(
    serviceId: string, 
    cancellationFee: string, 
    reason: string, 
    userId: string,
    tx?: any
  ): Promise<{ success: boolean; error?: string }> {
    const dbClient = tx || db;
    try {
      // Record cancellation fee using proper financial record + journal entries
      if (Number(cancellationFee) > 0) {
        // First create financial record (for finance page)
        await dbClient.insert(financialRecords).values({
          type: 'income',
          category: 'Service Revenue',
          amount: cancellationFee,
          description: `Service cancellation fee - ${reason}`,
          reference: serviceId,
          referenceType: 'service_cancellation',
          paymentMethod: 'cash',
          status: 'confirmed',
          userId: userId
        });

        // Then create journal entry (for accounting)
        const journalResult = await this.createJournalEntry({
          description: `Service Cancellation Fee - ${reason}`,
          reference: serviceId,
          referenceType: 'service_cancellation',
          lines: [
            {
              accountCode: ACCOUNT_CODES.CASH,
              description: `Cancellation fee received - ${reason}`,
              debitAmount: cancellationFee
            },
            {
              accountCode: ACCOUNT_CODES.SERVICE_REVENUE,
              description: `Service cancellation fee - ${reason}`,
              creditAmount: cancellationFee
            }
          ],
          userId
        }, tx);
        
        if (!journalResult.success) {
          return { success: false, error: journalResult.error };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error recording cancellation before completed:', error);
      return { success: false, error: 'Failed to record cancellation fee' };
    }
  }

  async recordServiceCancellationAfterCompleted(
    serviceId: string, 
    cancellationFee: string, 
    reason: string, 
    partsUsed: Array<{ name: string; quantity: number; sellingPrice: string; costPrice?: string }>,
    userId: string,
    tx?: any
  ): Promise<{ success: boolean; error?: string }> {
    const dbClient = tx || db;
    try {
      // 1. Create financial record for cancellation fee as income (ONLY income for this transaction)
      if (Number(cancellationFee) > 0) {
        await dbClient.insert(financialRecords).values({
          type: 'income',
          category: 'Service Revenue',
          amount: cancellationFee,
          description: `Service cancellation fee (after completion) - ${reason}`,
          reference: serviceId,
          referenceType: 'service_cancellation_after_completed',
          paymentMethod: 'cash',
          status: 'confirmed',
          userId: userId
        });
      }

      // 2. Get original service ticket to find service revenue that needs to be reversed
      const [serviceTicket] = await dbClient
        .select()
        .from(serviceTickets)
        .where(eq(serviceTickets.id, serviceId));
      
      if (serviceTicket) {
        // Create EXPENSE record to PROPERLY REVERSE original service revenue (labor cost)
        const originalServiceRevenue = serviceTicket.laborCost || '0';
        if (Number(originalServiceRevenue) > 0) {
          await dbClient.insert(financialRecords).values({
            type: 'expense',
            category: 'Service Cancellation',
            amount: originalServiceRevenue,
            description: `Service revenue reversal (labor cost) - ${reason}`,
            reference: serviceId,
            referenceType: 'service_cancellation_service_reversal',
            paymentMethod: 'cash',
            status: 'confirmed',
            userId: userId
          });
        }
      }

      // 3. Create EXPENSE records to PROPERLY REVERSE parts revenue
      for (const part of partsUsed) {
        const partRevenue = (Number(part.sellingPrice) * part.quantity).toString();
        
        // Create EXPENSE record to properly reverse parts revenue
        await dbClient.insert(financialRecords).values({
          type: 'expense',
          category: 'Service Cancellation',
          amount: partRevenue,
          description: `Parts revenue reversal - ${part.name} (${part.quantity}x) - ${reason}`,
          reference: serviceId,
          referenceType: 'service_cancellation_parts_reversal',
          paymentMethod: 'cash',
          status: 'confirmed',
          userId: userId
        });
      }

      const journalLines = [];
      
      // Record cancellation fee as income
      if (Number(cancellationFee) > 0) {
        journalLines.push(
          {
            accountCode: ACCOUNT_CODES.CASH,
            description: `Cancellation fee received - ${reason}`,
            debitAmount: cancellationFee
          },
          {
            accountCode: ACCOUNT_CODES.SERVICE_REVENUE,
            description: `Service cancellation fee - ${reason}`,
            creditAmount: cancellationFee
          }
        );
      }

      // Reverse parts revenue using proper sales returns contra account
      for (const part of partsUsed) {
        const partRevenue = (Number(part.sellingPrice) * part.quantity).toString();
        const costPrice = part.costPrice || '0';
        const partCost = (Number(costPrice) * part.quantity).toString();
        
        // Reverse the sales revenue
        journalLines.push(
          {
            accountCode: ACCOUNT_CODES.SALES_REVENUE, // Debit to reduce revenue
            description: `Sales return reversal - ${part.name} (${part.quantity}x)`,
            debitAmount: partRevenue
          },
          {
            accountCode: ACCOUNT_CODES.CASH, // Credit cash refund
            description: `Cash refund for returned parts - ${part.name}`,
            creditAmount: partRevenue
          }
        );
        
        // Return inventory at cost
        if (Number(partCost) > 0) {
          journalLines.push(
            {
              accountCode: ACCOUNT_CODES.INVENTORY,
              description: `Inventory returned - ${part.name} (${part.quantity}x)`,
              debitAmount: partCost
            },
            {
              accountCode: ACCOUNT_CODES.COST_OF_GOODS_SOLD,
              description: `COGS reversal - ${part.name}`,
              creditAmount: partCost
            }
          );
        }
      }

      if (journalLines.length > 0) {
        const journalResult = await this.createJournalEntry({
          description: `Service Cancellation After Completion - ${reason}`,
          reference: serviceId,
          referenceType: 'service_cancellation_after_completed',
          lines: journalLines,
          userId
        }, tx);
        
        if (!journalResult.success) {
          return { success: false, error: journalResult.error };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error recording cancellation after completed:', error);
      return { success: false, error: 'Failed to record cancellation with parts reversal' };
    }
  }

  async recordServiceCancellationWarrantyRefund(
    serviceId: string, 
    cancellationFee: string, 
    originalLaborCost: string,
    originalPartsCost: string,
    reason: string, 
    partsUsed: Array<{ name: string; quantity: number; sellingPrice: string; costPrice?: string }>,
    userId: string,
    tx?: any
  ): Promise<{ success: boolean; error?: string }> {
    const dbClient = tx || db;
    try {
      // First create financial record for cancellation fee (for finance page)
      if (Number(cancellationFee) > 0) {
        await dbClient.insert(financialRecords).values({
          type: 'income',
          category: 'Service Revenue',
          amount: cancellationFee,
          description: `Warranty cancellation fee - ${reason}`,
          reference: serviceId,
          referenceType: 'service_cancellation_warranty_refund',
          paymentMethod: 'cash',
          status: 'confirmed',
          userId: userId
        });
      }

      // Reverse OMSET & LABA BERSIH dari service yang dibatalkan garansi
      // Hapus/mengurangi pendapatan service (labor dan parts) yang sudah tercatat sebelumnya
      // Labor cost reversal (pendapatan jasa)
      if (Number(originalLaborCost) > 0) {
        // Cari dan update record pendapatan labor agar statusnya 'reversed'
        await dbClient.update(financialRecords)
          .set({ status: 'reversed' })
          .where(and(
            eq(financialRecords.referenceType, 'service_labor'),
            eq(financialRecords.reference, serviceId),
            eq(financialRecords.type, 'income')
          ));
        // Catat expense reversal
        await dbClient.insert(financialRecords).values({
          type: 'expense',
          category: 'Service Revenue Reversal',
          amount: originalLaborCost,
          description: `Reversal omset jasa service karena refund garansi - ${reason}`,
          reference: serviceId,
          referenceType: 'warranty_labor_reversal',
          paymentMethod: 'cash',
          status: 'confirmed',
          userId: userId
        });
      }
      // Parts cost reversal (pendapatan sparepart)
      if (Number(originalPartsCost) > 0) {
        // Cari dan update record pendapatan parts agar statusnya 'reversed'
        await dbClient.update(financialRecords)
          .set({ status: 'reversed' })
          .where(and(
            eq(financialRecords.referenceType, 'service_parts_revenue'),
            eq(financialRecords.reference, serviceId),
            eq(financialRecords.type, 'income')
          ));
        // Catat expense reversal
        await dbClient.insert(financialRecords).values({
          type: 'expense',
          category: 'Parts Revenue Reversal',
          amount: originalPartsCost,
          description: `Reversal omset sparepart service karena refund garansi - ${reason}`,
          reference: serviceId,
          referenceType: 'warranty_parts_reversal',
          paymentMethod: 'cash',
          status: 'confirmed',
          userId: userId
        });
      }

      const journalLines = [];
      
      // Record cancellation fee as income (if any)
      if (Number(cancellationFee) > 0) {
        journalLines.push(
          {
            accountCode: ACCOUNT_CODES.CASH,
            description: `Warranty cancellation fee - ${reason}`,
            debitAmount: cancellationFee
          },
          {
            accountCode: ACCOUNT_CODES.SERVICE_REVENUE,
            description: `Warranty cancellation fee - ${reason}`,
            creditAmount: cancellationFee
          }
        );
      }

      // Refund original labor cost
      if (Number(originalLaborCost) > 0) {
        journalLines.push(
          {
            accountCode: ACCOUNT_CODES.WARRANTY_EXPENSE,
            description: `Warranty labor refund - ${reason}`,
            debitAmount: originalLaborCost
          },
          {
            accountCode: ACCOUNT_CODES.CASH,
            description: `Cash refund for labor - ${reason}`,
            creditAmount: originalLaborCost
          }
        );
      }

      // Handle parts refund and damaged goods
      if (Number(originalPartsCost) > 0) {
        // Refund parts cost to customer
        journalLines.push(
          {
            accountCode: ACCOUNT_CODES.WARRANTY_EXPENSE,
            description: `Warranty parts refund - ${reason}`,
            debitAmount: originalPartsCost
          },
          {
            accountCode: ACCOUNT_CODES.CASH,
            description: `Cash refund for parts - ${reason}`,
            creditAmount: originalPartsCost
          }
        );

        // Record damaged goods loss for parts
        for (const part of partsUsed) {
          const costPrice = part.costPrice || part.sellingPrice; // Fallback to selling price if cost not available
          const partCostValue = (Number(costPrice) * part.quantity).toString();
          
          journalLines.push(
            {
              accountCode: ACCOUNT_CODES.DAMAGED_GOODS_LOSS,
              description: `Damaged goods loss - ${part.name} (${part.quantity}x)`,
              debitAmount: partCostValue
            },
            {
              accountCode: ACCOUNT_CODES.DAMAGED_GOODS_INVENTORY,
              description: `Transfer to damaged goods inventory - ${part.name}`,
              creditAmount: partCostValue
            }
          );
        }
      }

      if (journalLines.length > 0) {
        const journalResult = await this.createJournalEntry({
          description: `Service Warranty Refund - ${reason}`,
          reference: serviceId,
          referenceType: 'warranty_refund',
          lines: journalLines,
          userId
        }, tx);
        
        if (!journalResult.success) {
          return { success: false, error: journalResult.error };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error recording warranty cancellation refund:', error);
      return { success: false, error: 'Failed to record warranty refund' };
    }
  }
}

export const financeManager = new FinanceManager();