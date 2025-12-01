export type FinanceCategory = string;

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  grossProfit: number;
  netProfit: number;
  totalSalesRevenue: number;
  totalCOGS: number;
  totalRefunds: number;
  inventoryValue: number;
  transactionCount: number;
}

export interface FinancialRecord {
  id: string;
  type: "income" | "expense" | "transfer" | "asset";
  category: FinanceCategory;
  subcategory?: string | null;
  amount: number;
  paymentMethod?: string | null;
  createdAt: string;
  reference?: string | null;
  referenceType?: string | null;
  journalId?: string | null;
}

export interface JournalLine {
  id?: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  journalNumber: string;
  date: string;
  lines: JournalLine[];
  reference?: string | null;
  referenceType?: string | null;
}

export interface FinanceDateRange {
  startDate: string;
  endDate: string;
}
