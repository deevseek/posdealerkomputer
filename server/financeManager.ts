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
import { categoryToAccountMapping } from "./defaultAccounts";
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
  OTHER_REVENUE: '4300', // Pendapatan Lainnya

  // Expenses (Beban)
  COST_OF_GOODS_SOLD: '5110', // Harga Pokok Penjualan
  WARRANTY_EXPENSE: '5120', // Beban Garansi
  DAMAGED_GOODS_LOSS: '5130', // Kerugian Barang Rusak
  PAYROLL_EXPENSE: '5210', // Beban Gaji
  RENT_EXPENSE: '5220', // Beban Sewa
  UTILITY_EXPENSE: '5230', // Beban Utilitas
  COMMUNICATION_EXPENSE: '5240', // Beban Komunikasi
  MARKETING_EXPENSE: '5250', // Beban Pemasaran
  TRANSPORT_EXPENSE: '5260', // Beban Transportasi
  SUPPLIES_EXPENSE: '5270', // Beban Perlengkapan
  OTHER_EXPENSE: '5290', // Beban Lain-lain
  TAX_EXPENSE: '5320', // Beban Pajak
};

export class FinanceManager {
  // Helper method to get account by code
  private async getAccountByCode(code: string): Promise<Account | null> {
    const [account] = await db.select().from(accounts).where(eq(accounts.code, code)).limit(1);
    return account || null;
  }

  private normalizeText(value?: string | null): string {
    return (value || '').toLowerCase().trim();
  }

  private resolvePaymentAccount(paymentMethod?: string | null): string {
    const method = this.normalizeText(paymentMethod);

    switch (method) {
      case 'cash':
      case 'tunai':
        return ACCOUNT_CODES.CASH;
      case 'inventory':
      case 'system':
        return ACCOUNT_CODES.INVENTORY;
      case 'accounts_receivable':
      case 'piutang':
      case 'piutang usaha':
        return ACCOUNT_CODES.ACCOUNTS_RECEIVABLE;
      case 'accounts_payable':
      case 'hutang':
      case 'hutang usaha':
        return ACCOUNT_CODES.ACCOUNTS_PAYABLE;
      case 'customer_deposit':
      case 'customer_deposits':
      case 'uang_muka':
      case 'uang muka':
        return ACCOUNT_CODES.CUSTOMER_DEPOSITS;
      case 'bank':
      case 'bank_transfer':
      case 'transfer':
      case 'credit_card':
      case 'debit_card':
      case 'e_wallet':
      case 'ewallet':
      case 'giro':
      case 'check':
      case 'cheque':
      default:
        return ACCOUNT_CODES.BANK;
    }
  }

  private resolveAccountAlias(alias?: string | null): string {
    const normalized = this.normalizeText(alias);

    if (!normalized) {
      return ACCOUNT_CODES.BANK;
    }

    switch (normalized) {
      case 'cash':
      case 'tunai':
        return ACCOUNT_CODES.CASH;
      case 'bank':
      case 'bank_transfer':
        return ACCOUNT_CODES.BANK;
      case 'inventory':
      case 'persediaan':
        return ACCOUNT_CODES.INVENTORY;
      case 'accounts_receivable':
      case 'piutang':
      case 'piutang usaha':
        return ACCOUNT_CODES.ACCOUNTS_RECEIVABLE;
      case 'accounts_payable':
      case 'hutang':
      case 'hutang usaha':
        return ACCOUNT_CODES.ACCOUNTS_PAYABLE;
      case 'customer_deposit':
      case 'customer_deposits':
      case 'uang muka':
      case 'uang_muka':
        return ACCOUNT_CODES.CUSTOMER_DEPOSITS;
      default:
        return this.resolvePaymentAccount(alias);
    }
  }

  private extractTransferTag(tags: string[] | null | undefined, type: 'from' | 'to'): string | undefined {
    if (!tags || tags.length === 0) {
      return undefined;
    }

    const prefix = `transfer:${type}=`;
    const match = tags.find((tag) => this.normalizeText(tag).startsWith(prefix));
    if (!match) {
      return undefined;
    }

    const [, value] = match.split('=');
    return value;
  }

  private getTransferAccountCodes(data: {
    sourceAccount?: string;
    destinationAccount?: string;
    tags?: string[];
  }): { from: string; to: string } {
    const fromAlias = data.sourceAccount ?? this.extractTransferTag(data.tags, 'from') ?? 'cash';
    const toAlias = data.destinationAccount ?? this.extractTransferTag(data.tags, 'to') ?? 'bank';

    return {
      from: this.resolveAccountAlias(fromAlias),
      to: this.resolveAccountAlias(toAlias),
    };
  }

  private getIncomeAccount(category: string, subcategory?: string | null): string {
    const normalizedCategory = this.normalizeText(category);
    const normalizedSubcategory = this.normalizeText(subcategory);
    const mapping = categoryToAccountMapping as Record<string, string>;

    if (normalizedCategory.includes('service cancellation') || normalizedCategory.includes('service revenue reversal')) {
      return ACCOUNT_CODES.SERVICE_REVENUE;
    }

    if (normalizedCategory.includes('parts revenue') || normalizedCategory.includes('returns and allowances')) {
      return ACCOUNT_CODES.SALES_REVENUE;
    }

    if (normalizedCategory.includes('service') || normalizedSubcategory.includes('service') || normalizedSubcategory.includes('labor')) {
      return ACCOUNT_CODES.SERVICE_REVENUE;
    }

    if (normalizedCategory.includes('labor') || normalizedCategory.includes('jasa')) {
      return ACCOUNT_CODES.SERVICE_REVENUE;
    }

    if (normalizedCategory.includes('parts') || normalizedCategory.includes('sales') || normalizedSubcategory.includes('sales') || normalizedSubcategory.includes('parts')) {
      return ACCOUNT_CODES.SALES_REVENUE;
    }

    if (normalizedCategory.includes('rental') || normalizedCategory.includes('invest') || normalizedCategory.includes('other')) {
      return ACCOUNT_CODES.OTHER_REVENUE;
    }

    if (mapping[category]) {
      return mapping[category];
    }

    if (subcategory && mapping[subcategory]) {
      return mapping[subcategory];
    }

    return ACCOUNT_CODES.SALES_REVENUE;
  }

  private getExpenseAccount(category: string, subcategory?: string | null): { accountCode: string; treatment: 'expense' | 'asset' | 'contra_revenue' } {
    const normalizedCategory = this.normalizeText(category);
    const normalizedSubcategory = this.normalizeText(subcategory);
    const combined = `${normalizedCategory} ${normalizedSubcategory}`.trim();
    const mapping = categoryToAccountMapping as Record<string, string>;

    if (combined.includes('cost of goods sold') || combined.includes('cogs') || combined.includes('hpp')) {
      return { accountCode: ACCOUNT_CODES.COST_OF_GOODS_SOLD, treatment: 'expense' };
    }

    if (combined.includes('inventory purchase') || combined.includes('inventory adjustment') || combined.includes('persediaan') || combined.includes('stock')) {
      return { accountCode: ACCOUNT_CODES.INVENTORY, treatment: 'asset' };
    }

    if (combined.includes('warranty')) {
      return { accountCode: ACCOUNT_CODES.WARRANTY_EXPENSE, treatment: 'expense' };
    }

    if (combined.includes('kerugian barang rusak') || combined.includes('damaged goods')) {
      return { accountCode: ACCOUNT_CODES.DAMAGED_GOODS_LOSS, treatment: 'expense' };
    }

    if (combined.includes('service cancellation') || combined.includes('service revenue reversal')) {
      return { accountCode: ACCOUNT_CODES.SERVICE_REVENUE, treatment: 'contra_revenue' };
    }

    if (combined.includes('parts revenue reversal') || combined.includes('returns and allowances') || combined.includes('refund')) {
      return { accountCode: ACCOUNT_CODES.SALES_REVENUE, treatment: 'contra_revenue' };
    }

    if (combined.includes('payroll') || combined.includes('salary') || combined.includes('gaji')) {
      return { accountCode: ACCOUNT_CODES.PAYROLL_EXPENSE, treatment: 'expense' };
    }

    if (combined.includes('rent') || combined.includes('sewa')) {
      return { accountCode: ACCOUNT_CODES.RENT_EXPENSE, treatment: 'expense' };
    }

    if (combined.includes('listrik') || combined.includes('air')) {
      return { accountCode: ACCOUNT_CODES.UTILITY_EXPENSE, treatment: 'expense' };
    }

    if (combined.includes('telepon') || combined.includes('internet') || combined.includes('komunikasi')) {
      return { accountCode: ACCOUNT_CODES.COMMUNICATION_EXPENSE, treatment: 'expense' };
    }

    if (combined.includes('marketing') || combined.includes('promosi') || combined.includes('iklan')) {
      return { accountCode: ACCOUNT_CODES.MARKETING_EXPENSE, treatment: 'expense' };
    }

    if (combined.includes('transport') || combined.includes('bensin') || combined.includes('travel')) {
      return { accountCode: ACCOUNT_CODES.TRANSPORT_EXPENSE, treatment: 'expense' };
    }

    if (combined.includes('perlengkapan') || combined.includes('supplies')) {
      return { accountCode: ACCOUNT_CODES.SUPPLIES_EXPENSE, treatment: 'expense' };
    }

    if (combined.includes('tax') || combined.includes('pajak')) {
      return { accountCode: ACCOUNT_CODES.TAX_EXPENSE, treatment: 'expense' };
    }

    if (mapping[category]) {
      return { accountCode: mapping[category], treatment: 'expense' };
    }

    if (subcategory && mapping[subcategory]) {
      return { accountCode: mapping[subcategory], treatment: 'expense' };
    }

    return { accountCode: ACCOUNT_CODES.OTHER_EXPENSE, treatment: 'expense' };
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
      sourceAccount?: string;
      destinationAccount?: string;
      userId: string;
    },
    tx?: any
  ): Promise<{ success: boolean; transaction?: FinancialRecord; error?: string }> {
    const dbClient = tx || db;
    try {
      const amountValue = Math.abs(Number(data.amount));
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        return { success: false, error: 'Invalid amount for financial transaction' };
      }

      const formattedAmount = amountValue.toFixed(2);
      const paymentMethod = data.type === 'transfer' ? (data.paymentMethod || 'transfer') : data.paymentMethod;

      let tags = data.tags;
      let sourceAlias: string | undefined;
      let destinationAlias: string | undefined;

      if (data.type === 'transfer') {
        sourceAlias = data.sourceAccount ?? this.extractTransferTag(data.tags, 'from') ?? 'cash';
        destinationAlias = data.destinationAccount ?? this.extractTransferTag(data.tags, 'to') ?? 'bank';
        tags = [`transfer:from=${sourceAlias}`, `transfer:to=${destinationAlias}`];
      }

      // Create the financial record
      const [transaction] = await dbClient.insert(financialRecords).values({
        type: data.type,
        category: data.category,
        subcategory: data.subcategory,
        amount: formattedAmount,
        description: data.description,
        reference: data.reference,
        referenceType: data.referenceType,
        paymentMethod,
        tags,
        status: 'confirmed',
        userId: data.userId
      }).returning();

      // Create corresponding journal entries
      let journalLines: Array<{
        accountCode: string;
        description: string;
        debitAmount?: string;
        creditAmount?: string;
      }> = [];
      let linkedAccountCode: string | null = null;

      if (data.type === 'income') {
        const settlementAccount = this.resolvePaymentAccount(paymentMethod);
        const revenueAccount = this.getIncomeAccount(data.category, data.subcategory);

        journalLines = [
          {
            accountCode: settlementAccount,
            description: `Pembayaran diterima - ${data.description}`,
            debitAmount: formattedAmount
          },
          {
            accountCode: revenueAccount,
            description: data.description,
            creditAmount: formattedAmount
          }
        ];
        linkedAccountCode = revenueAccount;
      } else if (data.type === 'expense') {
        const expenseInfo = this.getExpenseAccount(data.category, data.subcategory);
        const settlementAccount = this.resolvePaymentAccount(paymentMethod);
        linkedAccountCode = expenseInfo.accountCode;

        if (expenseInfo.treatment === 'contra_revenue') {
          journalLines = [
            {
              accountCode: expenseInfo.accountCode,
              description: data.description,
              debitAmount: formattedAmount
            },
            {
              accountCode: settlementAccount,
              description: `Pengembalian dana - ${data.description}`,
              creditAmount: formattedAmount
            }
          ];
        } else {
          const creditDescription = settlementAccount === ACCOUNT_CODES.INVENTORY
            ? `Penyesuaian persediaan - ${data.description}`
            : expenseInfo.treatment === 'asset'
              ? `Pengeluaran kas - ${data.description}`
              : `Pembayaran - ${data.description}`;

          journalLines = [
            {
              accountCode: expenseInfo.accountCode,
              description: data.description,
              debitAmount: formattedAmount
            },
            {
              accountCode: settlementAccount,
              description: creditDescription,
              creditAmount: formattedAmount
            }
          ];
        }
      } else if (data.type === 'transfer') {
        const transferAccounts = this.getTransferAccountCodes({
          sourceAccount: sourceAlias,
          destinationAccount: destinationAlias,
          tags
        });

        if (transferAccounts.from === transferAccounts.to) {
          return { success: false, error: 'Sumber dan tujuan transfer tidak boleh sama' };
        }

        journalLines = [
          {
            accountCode: transferAccounts.to,
            description: `Transfer masuk - ${data.description}`,
            debitAmount: formattedAmount
          },
          {
            accountCode: transferAccounts.from,
            description: `Transfer keluar - ${data.description}`,
            creditAmount: formattedAmount
          }
        ];
        linkedAccountCode = transferAccounts.to;
      }

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
          const updateData: Partial<FinancialRecord> = {
            journalEntryId: journalResult.journalEntry?.id
          };

          if (linkedAccountCode) {
            const linkedAccount = await this.getAccountByCode(linkedAccountCode);
            if (linkedAccount) {
              updateData.accountId = linkedAccount.id;
            }
          }

          await dbClient.update(financialRecords)
            .set(updateData)
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
      sourceAccount?: string;
      destinationAccount?: string;
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
    grossProfit: string;
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

    // Only consider confirmed operational records for supporting breakdowns
    const confirmedCondition = eq(financialRecords.status, 'confirmed');
    const whereClauseWithStatus = whereClause ? and(confirmedCondition, whereClause) : confirmedCondition;

    // Ledger activity based on posted journal entries (standard accounting)
    const journalConditions = [eq(journalEntries.status, 'posted')];
    if (startDate) journalConditions.push(gte(journalEntries.date, startDate));
    if (endDate) journalConditions.push(lte(journalEntries.date, endDate));

    const journalWhere = journalConditions.length > 1 ? and(...journalConditions) : journalConditions[0];

    const ledgerLines = await db
      .select({
        journalEntryId: journalEntries.id,
        accountCode: accounts.code,
        accountName: accounts.name,
        accountType: accounts.type,
        accountSubtype: accounts.subtype,
        normalBalance: accounts.normalBalance,
        debitAmount: journalEntryLines.debitAmount,
        creditAmount: journalEntryLines.creditAmount,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
      .where(journalWhere);

    type LedgerAggregate = {
      code: string;
      name: string;
      type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
      subtype: string | null;
      normalBalance: 'debit' | 'credit';
      netAmount: number;
      entryIds: Set<string>;
    };

    const accountTotals = new Map<string, LedgerAggregate>();
    const journalEntryIds = new Set<string>();

    for (const line of ledgerLines) {
      const debit = Number(line.debitAmount ?? 0);
      const credit = Number(line.creditAmount ?? 0);
      const normalBalance = line.normalBalance as 'debit' | 'credit';
      const signedAmount = normalBalance === 'debit' ? debit - credit : credit - debit;

      const existing = accountTotals.get(line.accountCode) ?? {
        code: line.accountCode,
        name: line.accountName,
        type: line.accountType as LedgerAggregate['type'],
        subtype: line.accountSubtype,
        normalBalance,
        netAmount: 0,
        entryIds: new Set<string>(),
      };

      existing.netAmount += signedAmount;
      existing.entryIds.add(line.journalEntryId);
      accountTotals.set(line.accountCode, existing);
      journalEntryIds.add(line.journalEntryId);
    }

    let totalRevenue = 0;
    let totalExpenseNet = 0;
    let totalSalesRevenue = 0;
    let totalCOGS = 0;
    let totalRefunds = 0;

    const formatCategoryName = (key: string | null) => {
      if (!key) {
        return 'Uncategorized';
      }
      return key
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    };

    const categoryTotals = new Map<string, { income: number; expense: number; entryIds: Set<string> }>();
    const subcategoryTotals = new Map<string, { netAmount: number; accountType: LedgerAggregate['type']; entryIds: Set<string> }>();

    accountTotals.forEach((aggregate) => {
      if (aggregate.type !== 'revenue' && aggregate.type !== 'expense') {
        return;
      }

      const categoryKey = formatCategoryName(aggregate.subtype || aggregate.type);
      const categoryRecord = categoryTotals.get(categoryKey) ?? { income: 0, expense: 0, entryIds: new Set<string>() };

      if (aggregate.type === 'revenue') {
        totalRevenue += aggregate.netAmount;
        if (aggregate.netAmount >= 0) {
          categoryRecord.income += aggregate.netAmount;
        } else {
          const refundAmount = Math.abs(aggregate.netAmount);
          categoryRecord.expense += refundAmount;
          totalRefunds += refundAmount;
        }
        if (aggregate.subtype === 'sales_revenue') {
          totalSalesRevenue += aggregate.netAmount;
        }
      } else {
        totalExpenseNet += aggregate.netAmount;
        if (aggregate.netAmount >= 0) {
          categoryRecord.expense += aggregate.netAmount;
        } else {
          categoryRecord.income += Math.abs(aggregate.netAmount);
        }
        if (aggregate.subtype === 'cost_of_goods_sold') {
          totalCOGS += aggregate.netAmount;
        }
      }

      aggregate.entryIds.forEach((id) => categoryRecord.entryIds.add(id));
      categoryTotals.set(categoryKey, categoryRecord);

      const subcategoryRecord = subcategoryTotals.get(aggregate.name) ?? {
        netAmount: 0,
        accountType: aggregate.type,
        entryIds: new Set<string>(),
      };
      subcategoryRecord.netAmount += aggregate.netAmount;
      subcategoryRecord.accountType = aggregate.type;
      aggregate.entryIds.forEach((id) => subcategoryRecord.entryIds.add(id));
      subcategoryTotals.set(aggregate.name, subcategoryRecord);
    });

    const categories: { [key: string]: { income: number; expense: number; count: number } } = {};
    categoryTotals.forEach((value, key) => {
      categories[key] = {
        income: Number(value.income.toFixed(2)),
        expense: Number(value.expense.toFixed(2)),
        count: value.entryIds.size,
      };
    });

    const subcategories: { [key: string]: { amount: number; type: string; count: number } } = {};
    subcategoryTotals.forEach((value, name) => {
      const netAmount = value.netAmount;
      const amount = Number(Math.abs(netAmount).toFixed(2));
      let type: 'income' | 'expense';
      if (value.accountType === 'revenue') {
        type = netAmount >= 0 ? 'income' : 'expense';
      } else if (value.accountType === 'expense') {
        type = netAmount >= 0 ? 'expense' : 'income';
      } else {
        type = netAmount >= 0 ? 'income' : 'expense';
      }

      subcategories[name] = {
        amount,
        type,
        count: value.entryIds.size,
      };
    });

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

    const totalIncomeValue = Number(totalRevenue.toFixed(2));
    const totalExpenseValue = Number(totalExpenseNet.toFixed(2));
    const netProfitValue = Number((totalIncomeValue - totalExpenseValue).toFixed(2));
    const grossProfitValue = Number((totalSalesRevenueValue - totalCOGSValue).toFixed(2));
    const totalSalesRevenueValue = Number(totalSalesRevenue.toFixed(2));
    const totalCOGSValue = Number(totalCOGS.toFixed(2));
    const totalRefundsValue = Number(totalRefunds.toFixed(2));

    return {
      totalIncome: totalIncomeValue.toString(),
      totalExpense: totalExpenseValue.toString(),
      netProfit: netProfitValue.toString(),
      grossProfit: grossProfitValue.toString(),
      totalSalesRevenue: totalSalesRevenueValue.toString(),
      totalCOGS: totalCOGSValue.toString(),
      totalRefunds: totalRefundsValue.toString(),
      transactionCount: journalEntryIds.size,
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