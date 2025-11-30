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
  transactions,
  transactionItems,
  stockMovements,
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
import { eq, and, gte, lte, desc, sum, count, sql, inArray, isNotNull } from "drizzle-orm";
import { getCurrentTenantContext } from "./db";

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
  WARRANTY_EXPENSE: '5140', // Beban Garansi
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
  private resolveClientId(explicitClientId?: string | null) {
    if (typeof explicitClientId !== 'undefined') {
      return explicitClientId;
    }

    const tenantContext = getCurrentTenantContext();
    return tenantContext?.clientId ?? null;
  }

  // Helper method to get account by code with optional client scoping
  private async getAccountByCode(code: string, clientId?: string | null, tx?: any): Promise<Account | null> {
    const dbClient = tx || db;

    if (clientId) {
      const [scopedAccount] = await dbClient
        .select()
        .from(accounts)
        .where(and(eq(accounts.code, code), eq(accounts.clientId, clientId)))
        .limit(1);

      if (scopedAccount) {
        return scopedAccount;
      }
    }

    const [account] = await dbClient.select().from(accounts).where(eq(accounts.code, code)).limit(1);
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

  // Expose a safe helper for other modules that need the mapped settlement account
  public resolveSettlementAccount(paymentMethod?: string | null): string {
    return this.resolvePaymentAccount(paymentMethod);
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
      clientId?: string | null;
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
      const [journalEntry] = await dbClient
        .insert(journalEntries)
        .values({
          journalNumber,
          date: new Date(),
          description: data.description,
          reference: data.reference,
          referenceType: data.referenceType,
          totalAmount: totalAmount.toString(),
          status: 'posted',
          userId: data.userId,
          clientId: data.clientId ?? null
        })
        .returning();

      // Create journal entry lines and update account balances
      for (const lineData of data.lines) {
        const account = await this.getAccountByCode(lineData.accountCode, data.clientId ?? null, dbClient);
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
          creditAmount: lineData.creditAmount || '0',
          clientId: data.clientId ?? account.clientId ?? null
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
  async createCombinedJournal(
    data: {
      description: string;
      reference?: string;
      referenceType?: string;
      tags?: string[];
      lines: Array<{ accountCode: string; description: string; debitAmount?: string; creditAmount?: string }>;
      userId: string;
      clientId?: string | null;
      date?: Date;
    },
    tx?: any
  ): Promise<{ success: boolean; journalEntry?: any; error?: string }> {
    const totalDebit = data.lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0);

    // Ensure the journal entry stays balanced
    if (Number(totalDebit.toFixed(2)) !== Number(totalCredit.toFixed(2))) {
      return { success: false, error: 'Journal entry is not balanced' };
    }

    return this.createJournalEntry({
      description: data.description,
      date: data.date ?? new Date(),
      status: 'posted',
      reference: data.reference,
      referenceType: data.referenceType,
      tags: data.tags,
      lines: data.lines,
      userId: data.userId,
      clientId: this.resolveClientId(data.clientId),
    }, tx);
  }

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
      clientId?: string | null;
    },
    tx?: any
  ): Promise<{ success: boolean; transaction?: FinancialRecord; error?: string }> {
    const dbClient = tx || db;
    try {
      const resolvedClientId = this.resolveClientId(data.clientId);
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
        userId: data.userId,
        clientId: resolvedClientId,
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
          userId: data.userId,
          clientId: resolvedClientId
        }, tx);

        if (!journalResult.success) {
          console.warn('Failed to create journal entry:', journalResult.error);
        } else {
          const updateData: Partial<FinancialRecord> = {
            journalEntryId: journalResult.journalEntry?.id
          };

          if (linkedAccountCode) {
            const linkedAccount = await this.getAccountByCode(linkedAccountCode, resolvedClientId, dbClient);
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
    .where(buildWhereClause([
      eq(accounts.isActive, true),
      sql`${accounts.type} IN ('asset', 'liability', 'equity')`,
      clientId ? eq(accounts.clientId, clientId) : undefined,
    ]) ?? undefined)
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

    const revenue: any = {};
    const expenses: any = {};
    let totalRevenue = 0;
    let totalExpenses = 0;

    // Pull all posted revenue & expense activity for the period in a single query to avoid
    // under/over counting and to keep the calculation consistent with ledger data.
    const ledgerRows = await db
      .select({
        accountId: accounts.id,
        code: accounts.code,
        name: accounts.name,
        type: accounts.type,
        subtype: accounts.subtype,
        normalBalance: accounts.normalBalance,
        debitAmount: journalEntryLines.debitAmount,
        creditAmount: journalEntryLines.creditAmount
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
      .where(and(
        eq(journalEntries.status, 'posted'),
        gte(journalEntries.date, start),
        lte(journalEntries.date, end),
        eq(accounts.isActive, true),
        sql`${accounts.type} IN ('revenue', 'expense')`
      ))
      .orderBy(accounts.code);

    const accountActivity = new Map<string, {
      name: string;
      code: string;
      type: 'revenue' | 'expense';
      subtype: string | null;
      normalBalance: 'debit' | 'credit';
      amount: number;
    }>();

    ledgerRows.forEach((row) => {
      const debit = Number(row.debitAmount ?? 0);
      const credit = Number(row.creditAmount ?? 0);
      const signedAmount = row.normalBalance === 'credit' ? credit - debit : debit - credit;

      const existing = accountActivity.get(row.accountId) ?? {
        name: row.name,
        code: row.code,
        type: row.type as 'revenue' | 'expense',
        subtype: row.subtype,
        normalBalance: row.normalBalance as 'debit' | 'credit',
        amount: 0
      };

      existing.amount += signedAmount;
      accountActivity.set(row.accountId, existing);
    });

    // Summarize per account into the income statement buckets
    accountActivity.forEach((account) => {
      if (Math.abs(account.amount) <= 0.01) {
        return;
      }

      const accountInfo = {
        name: account.name,
        amount: Number(account.amount.toFixed(2)),
        code: account.code
      };

      if (account.type === 'revenue') {
        const category = account.subtype || 'Other Revenue';
        if (!revenue[category]) {
          revenue[category] = { accounts: [], total: 0 };
        }
        revenue[category].accounts.push(accountInfo);
        revenue[category].total += accountInfo.amount;
        totalRevenue += accountInfo.amount;
      } else if (account.type === 'expense') {
        const category = account.subtype || 'Other Expenses';
        if (!expenses[category]) {
          expenses[category] = { accounts: [], total: 0 };
        }
        expenses[category].accounts.push(accountInfo);
        expenses[category].total += accountInfo.amount;
        totalExpenses += accountInfo.amount;
      }
    });

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
      clientId?: string | null;
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
    const clientId = this.resolveClientId();
    const conditions = [];
    if (filters?.type) conditions.push(eq(financialRecords.type, filters.type));
    if (filters?.category) conditions.push(eq(financialRecords.category, filters.category));
    if (filters?.referenceType) conditions.push(eq(financialRecords.referenceType, filters.referenceType));
    if (filters?.startDate) conditions.push(gte(financialRecords.createdAt, filters.startDate));
    if (filters?.endDate) conditions.push(lte(financialRecords.createdAt, filters.endDate));
    if (clientId) conditions.push(eq(financialRecords.clientId, clientId));
    conditions.push(eq(financialRecords.status, 'confirmed'));
    
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
      inventory: {
        [key: string]: {
          value: number;
          stock: number;
          avgCost: number;
          costSource: 'averageCost' | 'lastPurchasePrice' | 'sellingPrice' | 'stockMovement' | 'none';
        };
      };
    };
  }> {
    const clientId = this.resolveClientId();

    const buildWhereClause = (clauses: any[]) => {
      const filteredClauses = clauses.filter(Boolean);
      if (filteredClauses.length === 0) {
        return undefined;
      }
      if (filteredClauses.length === 1) {
        return filteredClauses[0];
      }
      return and(...filteredClauses);
    };

    const dateRangeClauses = [];
    if (startDate) dateRangeClauses.push(gte(financialRecords.createdAt, startDate));
    if (endDate) dateRangeClauses.push(lte(financialRecords.createdAt, endDate));

    const baseRecordClauses = [eq(financialRecords.status, 'confirmed'), ...dateRangeClauses];
    if (clientId) baseRecordClauses.push(eq(financialRecords.clientId, clientId));
    const baseRecordWhere = buildWhereClause(baseRecordClauses);
    const withRecordClauses = (...extra: any[]) => buildWhereClause([...baseRecordClauses, ...extra]);

    // Ledger activity based on posted journal entries (standard accounting)
    const journalConditions = [eq(journalEntries.status, 'posted')];
    if (startDate) journalConditions.push(gte(journalEntries.date, startDate));
    if (endDate) journalConditions.push(lte(journalEntries.date, endDate));
    if (clientId) journalConditions.push(eq(journalEntries.clientId, clientId));

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
    let totalExpenseDebits = 0;
    let totalExpenseCredits = 0;
    let totalSalesRevenue = 0;
    let totalCOGS = 0;
    let totalRefunds = 0;
    let cogsCountedInExpenses = false;

    const formatCategoryName = (key: string | null) => {
      if (!key) {
        return 'Uncategorized';
      }
      return key
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    };

    const hasPurchaseKeyword = (value?: string | null) => {
      if (!value) {
        return false;
      }
      const normalized = value.toLowerCase();
      return normalized.includes('purchase') || normalized.includes('pembelian');
    };

    const hasAssetOrInventoryKeyword = (value?: string | null) => {
      if (!value) {
        return false;
      }
      const normalized = value.toLowerCase();
      return (
        normalized === 'inventory purchase' ||
        normalized.includes('inventory purchase') ||
        normalized.includes('inventory') ||
        normalized.includes('persediaan') ||
        normalized.includes('stock') ||
        normalized.includes('aset') ||
        normalized.includes('asset')
      );
    };

    const shouldTreatAsAssetExpense = (category?: string | null, subcategory?: string | null) => {
      if (hasAssetOrInventoryKeyword(category) || hasAssetOrInventoryKeyword(subcategory)) {
        return true;
      }
      return hasPurchaseKeyword(category) || hasPurchaseKeyword(subcategory);
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
        if (aggregate.netAmount >= 0) {
          totalExpenseDebits += aggregate.netAmount;
          categoryRecord.expense += aggregate.netAmount;
        } else {
          const creditAmount = Math.abs(aggregate.netAmount);
          totalExpenseCredits += creditAmount;
          categoryRecord.income += creditAmount;
        }
        if (aggregate.subtype === 'cost_of_goods_sold') {
          totalCOGS += aggregate.netAmount;
          cogsCountedInExpenses = true;
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

    const hasLedgerIncomeData = totalRevenue !== 0;
    const hasLedgerExpenseData = totalExpenseDebits !== 0 || totalExpenseCredits !== 0;

    let totalIncomeValue = Number(totalRevenue.toFixed(2));
    let totalExpenseValue = Number(totalExpenseDebits.toFixed(2));
    let netExpenseValue = Number((totalExpenseDebits - totalExpenseCredits).toFixed(2));
    let totalSalesRevenueValue = Number(totalSalesRevenue.toFixed(2));
    let totalCOGSValue = Number(totalCOGS.toFixed(2));
    let grossProfitValue = Number((totalSalesRevenueValue - totalCOGSValue).toFixed(2));
    let totalRefundsValue = Number(totalRefunds.toFixed(2));

    const recordAggregates = baseRecordWhere
      ? await db
          .select({
            type: financialRecords.type,
            total: sum(financialRecords.amount),
            count: count(),
          })
          .from(financialRecords)
          .where(baseRecordWhere)
          .groupBy(financialRecords.type)
      : [];

    const totalsByType = new Map<string, { total: number; count: number }>();
    recordAggregates.forEach((row) => {
      const typeKey = row.type ?? '';
      const existing = totalsByType.get(typeKey) ?? { total: 0, count: 0 };
      const rowTotal = Number(row.total ?? 0);
      const rowCount = Number(row.count ?? 0);
      totalsByType.set(typeKey, {
        total: existing.total + rowTotal,
        count: existing.count + rowCount,
      });
    });

    const expenseWhere = withRecordClauses(eq(financialRecords.type, 'expense'));
    type LegacyExpenseRow = {
      category: string | null;
      subcategory: string | null;
      amount: string | null;
    };

    const legacyExpenseRows: LegacyExpenseRow[] = expenseWhere
      ? await db
          .select({
            category: financialRecords.category,
            subcategory: financialRecords.subcategory,
            amount: financialRecords.amount,
          })
          .from(financialRecords)
          .where(expenseWhere)
      : [];

    const filteredLegacyExpenseRows = legacyExpenseRows.filter(
      (expense) => !shouldTreatAsAssetExpense(expense.category, expense.subcategory)
    );

    const fallbackIncomeTotal = totalsByType.get('income')?.total ?? 0;
    const fallbackExpenseTotal = filteredLegacyExpenseRows.reduce(
      (sumTotal, expense) => sumTotal + Math.abs(Number(expense.amount ?? 0)),
      0
    );

    if (fallbackIncomeTotal > 0 && !hasLedgerIncomeData) {
      totalIncomeValue = Number(fallbackIncomeTotal.toFixed(2));
    }

    if (fallbackExpenseTotal > 0 && !hasLedgerExpenseData) {
      totalExpenseValue = Number(fallbackExpenseTotal.toFixed(2));
      netExpenseValue = Number(fallbackExpenseTotal.toFixed(2));
    }

    const salesKeywordCondition = sql`
      (
        LOWER(${financialRecords.category}) LIKE '%sales%' OR
        LOWER(${financialRecords.category}) LIKE '%penjualan%' OR
        LOWER(${financialRecords.subcategory}) LIKE '%sales%' OR
        LOWER(${financialRecords.subcategory}) LIKE '%penjualan%' OR
        LOWER(${financialRecords.referenceType}) LIKE '%sale%' OR
        LOWER(${financialRecords.description}) LIKE '%penjualan%'
      )
    `;
    const salesWhere = withRecordClauses(eq(financialRecords.type, 'income'), salesKeywordCondition);
    if (salesWhere) {
      const [salesRow] = await db
        .select({ total: sum(financialRecords.amount) })
        .from(financialRecords)
        .where(salesWhere);
      const fallbackSalesTotal = Number(salesRow?.total ?? 0);
      if (fallbackSalesTotal > 0) {
        totalSalesRevenueValue = Number(Math.max(totalSalesRevenueValue, fallbackSalesTotal).toFixed(2));
      }
    }

    const cogsKeywordCondition = sql`
      (
        LOWER(${financialRecords.category}) LIKE '%cost of goods%' OR
        LOWER(${financialRecords.category}) LIKE '%hpp%' OR
        LOWER(${financialRecords.category}) LIKE '%harga pokok%' OR
        LOWER(${financialRecords.subcategory}) LIKE '%cost of goods%' OR
        LOWER(${financialRecords.subcategory}) LIKE '%hpp%' OR
        LOWER(${financialRecords.description}) LIKE '%harga pokok%'
      )
    `;
    const cogsWhere = withRecordClauses(eq(financialRecords.type, 'expense'), cogsKeywordCondition);
    if (cogsWhere) {
      const [cogsRow] = await db
        .select({ total: sum(financialRecords.amount) })
        .from(financialRecords)
        .where(cogsWhere);
      const fallbackCOGSTotal = Number(cogsRow?.total ?? 0);
      if (fallbackCOGSTotal > 0) {
        totalCOGSValue = Number(Math.max(totalCOGSValue, fallbackCOGSTotal).toFixed(2));
      }
    }

    // Fallback: derive sales revenue and HPP (COGS) directly from POS transaction items
    // when ledger/financial record data is missing or incomplete.
    if (totalSalesRevenueValue === 0 || totalCOGSValue === 0) {
      const salesDateClause = buildWhereClause([
        eq(transactions.type, 'sale'),
        startDate ? gte(transactions.createdAt, startDate) : undefined,
        endDate ? lte(transactions.createdAt, endDate) : undefined,
        clientId ? eq(transactions.clientId, clientId) : undefined,
      ]);

      const salesItemRows = await db
        .select({
          createdAt: transactions.createdAt,
          quantity: transactionItems.quantity,
          unitPrice: transactionItems.unitPrice,
          productAverageCost: products.averageCost,
          productLastPurchasePrice: products.lastPurchasePrice,
          productSellingPrice: products.sellingPrice,
        })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .leftJoin(products, eq(transactionItems.productId, products.id))
        .where(salesDateClause ?? undefined);

      let derivedSales = 0;
      let derivedCOGS = 0;

      for (const row of salesItemRows) {
        const quantity = Number(row.quantity ?? 0);
        const unitPrice = Number(row.unitPrice ?? 0);
        const costBasis = Number(
          row.productAverageCost ?? row.productLastPurchasePrice ?? row.productSellingPrice ?? 0
        );

        derivedSales += quantity * unitPrice;
        derivedCOGS += quantity * costBasis;
      }

      if (derivedSales > 0) {
        totalSalesRevenueValue = Number(Math.max(totalSalesRevenueValue, derivedSales).toFixed(2));
        // Ensure total income captures fallback POS revenue when ledger/financial records are missing
        if (totalIncomeValue === 0) {
          totalIncomeValue = Number(Math.max(totalIncomeValue, derivedSales).toFixed(2));

          // Seed fallback category and subcategory data so the UI doesn't show empty breakdowns
          const fallbackCategoryKey = 'Sales Revenue (POS Fallback)';
          categoryTotals.set(fallbackCategoryKey, {
            income: derivedSales,
            expense: 0,
            entryIds: new Set<string>(['pos-fallback-sales'])
          });

          const fallbackSubcategoryKey = 'POS Sales (Derived)';
          subcategoryTotals.set(fallbackSubcategoryKey, {
            netAmount: derivedSales,
            accountType: 'revenue',
            entryIds: new Set<string>(['pos-fallback-sales'])
          });
        }
      }

      if (derivedCOGS > 0) {
        totalCOGSValue = Number(Math.max(totalCOGSValue, derivedCOGS).toFixed(2));
      }
    }

    grossProfitValue = Number((totalSalesRevenueValue - totalCOGSValue).toFixed(2));

    const refundKeywordCondition = sql`
      (
        LOWER(${financialRecords.category}) LIKE '%refund%' OR
        LOWER(${financialRecords.category}) LIKE '%return%' OR
        LOWER(${financialRecords.category}) LIKE '%cancel%' OR
        LOWER(${financialRecords.category}) LIKE '%cancellation%' OR
        LOWER(${financialRecords.subcategory}) LIKE '%refund%' OR
        LOWER(${financialRecords.subcategory}) LIKE '%return%' OR
        LOWER(${financialRecords.subcategory}) LIKE '%cancel%' OR
        LOWER(${financialRecords.description}) LIKE '%refund%' OR
        LOWER(${financialRecords.description}) LIKE '%pengembalian%' OR
        LOWER(${financialRecords.referenceType}) LIKE '%refund%' OR
        LOWER(${financialRecords.referenceType}) LIKE '%reversal%' OR
        LOWER(${financialRecords.referenceType}) LIKE '%cancellation%'
      )
    `;
    const refundWhere = withRecordClauses(eq(financialRecords.type, 'expense'), refundKeywordCondition);
    if (refundWhere) {
      const [refundRow] = await db
        .select({ total: sum(financialRecords.amount) })
        .from(financialRecords)
        .where(refundWhere);
      const fallbackRefundTotal = Number(refundRow?.total ?? 0);
      if (fallbackRefundTotal > 0) {
        totalRefundsValue = Number(Math.max(totalRefundsValue, fallbackRefundTotal).toFixed(2));
      }
    }

    const recordTransactionCount = totalsByType.size > 0
      ? Array.from(totalsByType.values()).reduce((acc, value) => acc + value.count, 0)
      : 0;

    grossProfitValue = Number((totalSalesRevenueValue - totalCOGSValue).toFixed(2));

    let fallbackCategoryData:
      | Array<{ category: string | null; type: string | null; total: string | null; count: number }>
      | null = null;
    let fallbackSubcategoryData:
      | Array<{ subcategory: string | null; type: string | null; total: string | null; count: number }>
      | null = null;

    const cancellationExpenseReferenceTypes = [
      'service_cancellation_service_reversal',
      'service_cancellation_parts_reversal'
    ];

    const cancellationExpenseConditions = [
      eq(financialRecords.status, 'confirmed'),
      eq(financialRecords.type, 'expense'),
      inArray(financialRecords.referenceType, cancellationExpenseReferenceTypes)
    ];

    if (clientId) {
      cancellationExpenseConditions.push(eq(financialRecords.clientId, clientId));
    }

    if (startDate) {
      cancellationExpenseConditions.push(gte(financialRecords.createdAt, startDate));
    }

    if (endDate) {
      cancellationExpenseConditions.push(lte(financialRecords.createdAt, endDate));
    }

    const cancellationExpenseRows = await db
      .select({
        category: financialRecords.category,
        subcategory: financialRecords.subcategory,
        total: sum(financialRecords.amount),
        count: count()
      })
      .from(financialRecords)
      .where(and(...cancellationExpenseConditions))
      .groupBy(financialRecords.category, financialRecords.subcategory);

    const cancellationExpenseTotal = cancellationExpenseRows.reduce(
      (sumTotal, row) => sumTotal + Number(row.total ?? 0),
      0
    );

    if (cancellationExpenseTotal > 0) {
      totalExpenseValue = Number((totalExpenseValue + cancellationExpenseTotal).toFixed(2));
      netExpenseValue = Number((netExpenseValue + cancellationExpenseTotal).toFixed(2));
    }

    if (
      totalIncomeValue === 0 ||
      totalExpenseValue === 0 ||
      categoryTotals.size === 0 ||
      subcategoryTotals.size === 0
    ) {
      const needsIncomeFallback = totalIncomeValue === 0;
      const needsExpenseFallback =
        totalExpenseValue === 0 || categoryTotals.size === 0 || subcategoryTotals.size === 0;

      if (needsIncomeFallback) {
        const incomeWhere = withRecordClauses(eq(financialRecords.type, 'income'));
        const [legacyIncomeRow] = incomeWhere
          ? await db
              .select({ total: sum(financialRecords.amount) })
              .from(financialRecords)
              .where(incomeWhere)
          : [];

        const fallbackIncomeTotal = Number(legacyIncomeRow?.total ?? 0);
        if (fallbackIncomeTotal > 0) {
          totalIncomeValue = Number(fallbackIncomeTotal.toFixed(2));
        }
      }

      if (needsExpenseFallback) {
        const fallbackExpenseTotal = filteredLegacyExpenseRows.reduce(
          (sumTotal, expense) => sumTotal + Math.abs(Number(expense.amount ?? 0)),
          0
        );

        if (fallbackExpenseTotal > 0) {
          totalExpenseValue = Number(fallbackExpenseTotal.toFixed(2));
          netExpenseValue = totalExpenseValue;
        }

        if (categoryTotals.size === 0 || subcategoryTotals.size === 0) {
          fallbackCategoryData = baseRecordWhere
            ? await db
                .select({
                  category: financialRecords.category,
                  type: financialRecords.type,
                  total: sum(financialRecords.amount),
                  count: count(),
                })
                .from(financialRecords)
                .where(baseRecordWhere)
                .groupBy(financialRecords.category, financialRecords.type)
            : null;

          fallbackSubcategoryData = baseRecordWhere
            ? await db
                .select({
                  subcategory: financialRecords.subcategory,
                  type: financialRecords.type,
                  total: sum(financialRecords.amount),
                  count: count(),
                })
                .from(financialRecords)
                .where(baseRecordWhere)
                .groupBy(financialRecords.subcategory, financialRecords.type)
            : null;
        }
      }
    }

    const categories: { [key: string]: { income: number; expense: number; count: number } } = {};
    categoryTotals.forEach((value, key) => {
      categories[key] = {
        income: Number(value.income.toFixed(2)),
        expense: Number(value.expense.toFixed(2)),
        count: value.entryIds.size,
      };
    });

    if (fallbackCategoryData) {
      fallbackCategoryData.forEach((item) => {
        if (!item.category) {
          return;
        }
        if (shouldTreatAsAssetExpense(item.category, null)) {
          return;
        }
        const key = item.category;
        const existingCategory = categories[key] ?? { income: 0, expense: 0, count: 0 };
        const rawAmount = Number(item.total ?? 0);

        if (item.type === 'income') {
          existingCategory.income = Number((existingCategory.income + rawAmount).toFixed(2));
        } else if (item.type === 'expense') {
          const normalizedAmount = Math.abs(rawAmount);
          existingCategory.expense = Number((existingCategory.expense + normalizedAmount).toFixed(2));
        }

        existingCategory.count += item.count;
        categories[key] = existingCategory;
      });
    }

    if (cancellationExpenseRows.length > 0) {
      cancellationExpenseRows.forEach((row, index) => {
        const amount = Number(row.total ?? 0);
        if (amount <= 0) {
          return;
        }

        const categoryKey = row.category || 'Service Cancellation';
        const existingCategory = categories[categoryKey] ?? { income: 0, expense: 0, count: 0 };
        categories[categoryKey] = {
          income: existingCategory.income,
          expense: Number((existingCategory.expense + amount).toFixed(2)),
          count: existingCategory.count + Number(row.count ?? 0)
        };

        const subcategoryKey = row.subcategory || categoryKey;
        const existingSubcategory = subcategoryTotals.get(subcategoryKey) ?? {
          netAmount: 0,
          accountType: 'expense' as LedgerAggregate['type'],
          entryIds: new Set<string>(),
        };
        existingSubcategory.netAmount += amount;
        existingSubcategory.accountType = 'expense';
        existingSubcategory.entryIds.add(`manual-cancellation-${index}`);
        subcategoryTotals.set(subcategoryKey, existingSubcategory);
      });
    }

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

    if (fallbackSubcategoryData) {
      fallbackSubcategoryData.forEach((item) => {
        if (!item.subcategory) {
          return;
        }
        if (shouldTreatAsAssetExpense(null, item.subcategory)) {
          return;
        }

        const fallbackType = item.type ?? 'income';
        const rawAmount = Number(item.total ?? 0);
        const normalizedAmount =
          fallbackType === 'expense' ? Math.abs(rawAmount) : rawAmount;

        subcategories[item.subcategory] = {
          amount: Number(normalizedAmount.toFixed(2)),
          type: fallbackType,
          count: item.count,
        };
      });
    }

    // Breakdown by payment method
    const paymentBreakdown = baseRecordWhere
      ? await db
          .select({
            paymentMethod: financialRecords.paymentMethod,
            total: sum(financialRecords.amount)
          })
          .from(financialRecords)
          .where(baseRecordWhere)
          .groupBy(financialRecords.paymentMethod)
      : [];

    // Breakdown by source/reference type
    const sourceBreakdown = baseRecordWhere
      ? await db
          .select({
            referenceType: financialRecords.referenceType,
            total: sum(financialRecords.amount),
            count: count()
          })
          .from(financialRecords)
          .where(baseRecordWhere)
          .groupBy(financialRecords.referenceType)
      : [];

    // Inventory value calculation
    const inventoryWhere = buildWhereClause([
      eq(products.isActive, true),
      gte(products.stock, 0),
      clientId ? eq(products.clientId, clientId) : undefined,
    ]);

    const inventoryBreakdown = await db
      .select({
        id: products.id,
        name: products.name,
        stock: products.stock,
        averageCost: products.averageCost,
        lastPurchasePrice: products.lastPurchasePrice,
        sellingPrice: products.sellingPrice,
        effectiveCost: sql<number>`COALESCE(${products.averageCost}, ${products.lastPurchasePrice}, ${products.sellingPrice}, 0)`,
        costSource: sql<string>`CASE
          WHEN ${products.averageCost} IS NOT NULL THEN 'averageCost'
          WHEN ${products.lastPurchasePrice} IS NOT NULL THEN 'lastPurchasePrice'
          WHEN ${products.sellingPrice} IS NOT NULL THEN 'sellingPrice'
          ELSE 'none'
        END`,
        totalValue: sql<number>`${products.stock} * COALESCE(${products.averageCost}, ${products.lastPurchasePrice}, ${products.sellingPrice}, 0)`,
      })
      .from(products)
      .where(inventoryWhere ?? undefined);

    type InventoryBreakdownRow = {
      id: string;
      name: string | null;
      stock: number | null;
      averageCost: string | null;
      lastPurchasePrice: string | null;
      sellingPrice: string | null;
      effectiveCost: number | null;
      costSource: string | null;
      totalValue: number | null;
    };

    const inventoryBreakdownRows = inventoryBreakdown as InventoryBreakdownRow[];
    type StockMovementCostRow = {
      productId: string;
      totalCost: string | number | null;
      totalQuantity: string | number | null;
      latestCost: string | number | null;
    };

    const productIds = inventoryBreakdownRows.map((row) => row.id);

    const stockMovementCostRows: StockMovementCostRow[] =
      productIds.length === 0
        ? []
        : ((await db
            .select({
              productId: stockMovements.productId,
              totalCost: sql<string>`COALESCE(SUM(${stockMovements.quantity}::numeric * ${stockMovements.unitCost}::numeric), 0)`,
              totalQuantity: sql<string>`COALESCE(SUM(${stockMovements.quantity}), 0)`,
              latestCost: sql<string | null>`MAX(${stockMovements.unitCost})`
            })
            .from(stockMovements)
            .where(
              buildWhereClause([
                eq(stockMovements.movementType, 'in'),
                isNotNull(stockMovements.unitCost),
                inArray(stockMovements.productId, productIds),
                clientId ? eq(stockMovements.clientId, clientId) : undefined,
              ]) ?? undefined
            )
            .groupBy(stockMovements.productId)) as StockMovementCostRow[]);

    const parseNumeric = (value: unknown) => {
      const numeric = Number(value ?? 0);
      return Number.isFinite(numeric) ? numeric : 0;
    };

    const stockMovementCostMap = new Map<string, { avgCost: number; latestCost: number }>();
    stockMovementCostRows.forEach((row) => {
      const totalQuantity = parseNumeric(row.totalQuantity);
      const totalCost = parseNumeric(row.totalCost);
      const latestCost = parseNumeric(row.latestCost);
      const avgCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;

      if (avgCost > 0 || latestCost > 0) {
        stockMovementCostMap.set(row.productId, {
          avgCost: Number(avgCost.toFixed(2)),
          latestCost: Number(latestCost.toFixed(2))
        });
      }
    });

    type ProcessedInventoryRow = {
      id: string;
      name: string | null;
      stock: number;
      unitCost: number;
      value: number;
      costSource: 'averageCost' | 'lastPurchasePrice' | 'sellingPrice' | 'stockMovement' | 'none';
    };

    const processedInventoryRows: ProcessedInventoryRow[] = inventoryBreakdownRows.map((item) => {
      const productId = item.id;
      const normalizedStock = Math.max(parseNumeric(item.stock), 0);

      let costSource = (item.costSource ?? 'none') as ProcessedInventoryRow['costSource'];
      let unitCost = parseNumeric(
        item.effectiveCost ?? item.averageCost ?? item.lastPurchasePrice ?? item.sellingPrice
      );

      const movementFallback = stockMovementCostMap.get(productId);

      if ((unitCost <= 0 || !Number.isFinite(unitCost)) && movementFallback) {
        const fallbackCost = movementFallback.avgCost > 0 ? movementFallback.avgCost : movementFallback.latestCost;
        if (fallbackCost > 0) {
          unitCost = fallbackCost;
          costSource = 'stockMovement';
        }
      }

      let value = parseNumeric(item.totalValue);
      if (value <= 0 && normalizedStock > 0) {
        value = unitCost * normalizedStock;
      }

      if ((value <= 0 || !Number.isFinite(value)) && movementFallback && normalizedStock > 0) {
        const fallbackCost = movementFallback.avgCost > 0 ? movementFallback.avgCost : movementFallback.latestCost;
        if (fallbackCost > 0) {
          value = fallbackCost * normalizedStock;
          if (unitCost <= 0) {
            unitCost = fallbackCost;
          }
          costSource = 'stockMovement';
        }
      }

      return {
        id: productId,
        name: item.name,
        stock: normalizedStock,
        unitCost: Number(unitCost.toFixed(2)),
        value: Number(Math.max(value, 0).toFixed(2)),
        costSource
      };
    });

    const totalInventoryValue = processedInventoryRows.reduce((total, item) => total + item.value, 0);

    const totalInventoryCount = processedInventoryRows.reduce((total, item) => total + item.stock, 0);

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
    const inventory: {
      [key: string]: {
        value: number;
        stock: number;
        avgCost: number;
        costSource: 'averageCost' | 'lastPurchasePrice' | 'sellingPrice' | 'stockMovement' | 'none';
      };
    } = {};
    processedInventoryRows.forEach((item) => {
      if (!item.name) {
        return;
      }

      inventory[item.name] = {
        value: Number(item.value.toFixed(2)),
        stock: Number(item.stock.toFixed(2)),
        avgCost: Number(item.unitCost.toFixed(2)),
        costSource: item.costSource
      };
    });

    // Fallback to financial records when ledger-based COGS is missing (e.g. legacy data without journal entries)
    if (totalCOGSValue === 0) {
      const cogsConditions = [
        eq(financialRecords.status, 'confirmed'),
        eq(financialRecords.type, 'expense'),
        sql`(
          LOWER(${financialRecords.category}) LIKE '%cost of goods%' OR
          LOWER(${financialRecords.category}) LIKE '%hpp%' OR
          LOWER(${financialRecords.category}) LIKE '%harga pokok%' OR
          LOWER(${financialRecords.subcategory}) LIKE '%cost of goods%' OR
          LOWER(${financialRecords.subcategory}) LIKE '%hpp%' OR
          LOWER(${financialRecords.description}) LIKE '%harga pokok%'
        )`
      ];

      if (startDate) {
        cogsConditions.push(gte(financialRecords.createdAt, startDate));
      }

      if (endDate) {
        cogsConditions.push(lte(financialRecords.createdAt, endDate));
      }

      if (clientId) {
        cogsConditions.push(eq(financialRecords.clientId, clientId));
      }

      const [cogsFallback] = await db
        .select({
          total: sum(financialRecords.amount),
          count: count()
        })
        .from(financialRecords)
        .where(and(...cogsConditions));

      const fallbackCOGSTotal = Number(cogsFallback?.total ?? 0);

      if (fallbackCOGSTotal > 0) {
        const previousCOGSValue = totalCOGSValue;
        const resolvedCOGSValue = Number(Math.max(previousCOGSValue, fallbackCOGSTotal).toFixed(2));
        const cogsDelta = Number((resolvedCOGSValue - previousCOGSValue).toFixed(2));

        totalCOGSValue = resolvedCOGSValue;
        grossProfitValue = Number((totalSalesRevenueValue - totalCOGSValue).toFixed(2));

        if (cogsDelta > 0) {
          totalExpenseValue = Number((totalExpenseValue + cogsDelta).toFixed(2));
          netExpenseValue = Number((netExpenseValue + cogsDelta).toFixed(2));
          cogsCountedInExpenses = true;

          const cogsCategoryKey = 'Cost Of Goods Sold';
          const existingCategory = categories[cogsCategoryKey] ?? { income: 0, expense: 0, count: 0 };
          categories[cogsCategoryKey] = {
            income: existingCategory.income,
            expense: Number((existingCategory.expense + cogsDelta).toFixed(2)),
            count: existingCategory.count + Number(cogsFallback?.count ?? 0)
          };

          const fallbackSubcategoryKey = 'Cost Of Goods Sold (Fallback)';
          const existingSubcategory = subcategories[fallbackSubcategoryKey] ?? { amount: 0, type: 'expense', count: 0 };
          subcategories[fallbackSubcategoryKey] = {
            amount: Number((existingSubcategory.amount + cogsDelta).toFixed(2)),
            type: 'expense',
            count: existingSubcategory.count + Number(cogsFallback?.count ?? 0)
          };
        }
      }

      if (totalCOGSValue === 0) {
        const transactionConditions = [eq(transactions.type, 'sale')];

        if (clientId) {
          transactionConditions.push(eq(transactions.clientId, clientId));
        }

        if (startDate) {
          transactionConditions.push(gte(transactions.createdAt, startDate));
        }

        if (endDate) {
          transactionConditions.push(lte(transactions.createdAt, endDate));
        }

        const whereSales = transactionConditions.length > 1
          ? and(...transactionConditions)
          : transactionConditions[0];

        const [posSummary] = await db
          .select({
            totalSales: sql<number>`COALESCE(SUM(${transactionItems.totalPrice}), 0)`,
            totalCOGS: sql<number>`COALESCE(SUM(${transactionItems.quantity}::numeric * COALESCE(${products.averageCost}, ${products.lastPurchasePrice}, 0)::numeric), 0)`
          })
          .from(transactionItems)
          .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
          .innerJoin(products, eq(transactionItems.productId, products.id))
          .where(whereSales);

        const posCOGSTotal = Number(posSummary?.totalCOGS ?? 0);
        const posSalesTotal = Number(posSummary?.totalSales ?? 0);

        // Always anchor sales revenue to the POS gross sales so the revenue card
        // isn't understated (e.g. when sales are recorded net of HPP elsewhere).
        const alignedSalesRevenue = Math.max(totalSalesRevenueValue, posSalesTotal);
        if (alignedSalesRevenue > totalSalesRevenueValue) {
          const revenueDelta = Number((alignedSalesRevenue - totalSalesRevenueValue).toFixed(2));
          totalSalesRevenueValue = alignedSalesRevenue;
          totalIncomeValue = Number((totalIncomeValue + revenueDelta).toFixed(2));
          grossProfitValue = Number((totalSalesRevenueValue - totalCOGSValue).toFixed(2));
        }

        if (posCOGSTotal > 0) {
          const previousCOGSValue = totalCOGSValue;
          const resolvedCOGSValue = Number(Math.max(previousCOGSValue, posCOGSTotal).toFixed(2));
          const cogsDelta = Number((resolvedCOGSValue - previousCOGSValue).toFixed(2));

          totalCOGSValue = resolvedCOGSValue;

          if (totalSalesRevenueValue === 0 && posSalesTotal > 0) {
            totalSalesRevenueValue = Number(posSalesTotal.toFixed(2));
          }

          grossProfitValue = Number((totalSalesRevenueValue - totalCOGSValue).toFixed(2));

          if (cogsDelta > 0) {
            totalExpenseValue = Number((totalExpenseValue + cogsDelta).toFixed(2));
            netExpenseValue = Number((netExpenseValue + cogsDelta).toFixed(2));
            cogsCountedInExpenses = true;

            const cogsCategoryKey = 'Cost Of Goods Sold';
            const existingCategory = categories[cogsCategoryKey] ?? { income: 0, expense: 0, count: 0 };
            categories[cogsCategoryKey] = {
              income: existingCategory.income,
              expense: Number((existingCategory.expense + cogsDelta).toFixed(2)),
              count: existingCategory.count + 1
            };

            const fallbackSubcategoryKey = 'Cost Of Goods Sold (POS Fallback)';
            const existingSubcategory = subcategories[fallbackSubcategoryKey] ?? { amount: 0, type: 'expense', count: 0 };
            subcategories[fallbackSubcategoryKey] = {
              amount: Number((existingSubcategory.amount + cogsDelta).toFixed(2)),
              type: 'expense',
              count: existingSubcategory.count + 1
            };
          }
        }
      }
    }

    // If we successfully derived COGS but don't have any other expense data,
    // treat COGS as the minimum expense baseline so net profit isn't inflated
    // by missing expense rows.
    if (totalCOGSValue > 0 && !cogsCountedInExpenses) {
      totalExpenseValue = Number((totalExpenseValue + totalCOGSValue).toFixed(2));
      netExpenseValue = Number((netExpenseValue + totalCOGSValue).toFixed(2));
      cogsCountedInExpenses = true;
    }

    netExpenseValue = Number(Math.max(netExpenseValue, 0).toFixed(2));
    totalExpenseValue = Number(Math.max(totalExpenseValue, netExpenseValue).toFixed(2));

    return {
      totalIncome: totalIncomeValue.toString(),
      totalExpense: totalExpenseValue.toString(),
      netProfit: Number((totalIncomeValue - netExpenseValue).toFixed(2)).toString(),
      grossProfit: grossProfitValue.toString(),
      totalSalesRevenue: totalSalesRevenueValue.toString(),
      totalCOGS: totalCOGSValue.toString(),
      totalRefunds: totalRefundsValue.toString(),
      transactionCount: Math.max(journalEntryIds.size, recordTransactionCount),
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
    const clientId = this.resolveClientId();
    const whereClause = clientId ? eq(financialRecords.clientId, clientId) : undefined;

    const records = await db
      .select()
      .from(financialRecords)
      .where(whereClause ?? undefined);
    
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
          category: 'Warranty Cancellation Fee',
          amount: cancellationFee,
          description: `Pendapatan biaya cancel garansi - ${reason}`,
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
          category: 'Return Cancel Garansi',
          amount: originalLaborCost,
          description: `Return cancel garansi - pembalikan pendapatan jasa (${reason})`,
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
          category: 'Return Cancel Garansi',
          amount: originalPartsCost,
          description: `Return cancel garansi - pembalikan pendapatan sparepart (${reason})`,
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
            description: `Pendapatan biaya cancel garansi - ${reason}`,
            debitAmount: cancellationFee
          },
          {
            accountCode: ACCOUNT_CODES.SERVICE_REVENUE,
            description: `Pendapatan biaya cancel garansi - ${reason}`,
            creditAmount: cancellationFee
          }
        );
      }

      // Refund original labor cost
      if (Number(originalLaborCost) > 0) {
        journalLines.push(
          {
            accountCode: ACCOUNT_CODES.WARRANTY_EXPENSE,
            description: `Return cancel garansi - pembalikan pendapatan jasa (${reason})`,
            debitAmount: originalLaborCost
          },
          {
            accountCode: ACCOUNT_CODES.CASH,
            description: `Pengembalian dana jasa karena cancel garansi - ${reason}`,
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
            description: `Return cancel garansi - pembalikan pendapatan sparepart (${reason})`,
            debitAmount: originalPartsCost
          },
          {
            accountCode: ACCOUNT_CODES.CASH,
            description: `Pengembalian dana sparepart karena cancel garansi - ${reason}`,
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