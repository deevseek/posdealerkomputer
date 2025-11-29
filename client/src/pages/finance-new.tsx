import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Plus, TrendingUp, TrendingDown, DollarSign, Users, Calendar, RotateCcw } from "lucide-react";
import { formatDateShort, createDatabaseTimestamp } from '@shared/utils/timezone';
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

interface FinancialTransaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  subcategory?: string;
  amount: string;
  description: string;
  referenceType?: string;
  reference?: string;
  paymentMethod?: string;
  tags?: string[];
  status: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface FinancialSummary {
  totalIncome: string;
  totalExpense: string;
  totalRefunds: string; // Track refunds separately from income
  netProfit: string;
  grossProfit: string;
  totalSalesRevenue: string;
  totalCOGS: string;
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
}

interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  position: string;
  department?: string;
  salary: string;
  salaryType: string;
  status: string;
  joinDate: string;
  phone?: string;
  createdAt: string;
}

interface PayrollRecord {
  id: string;
  employeeId: string;
  payrollNumber: string;
  periodStart: string;
  periodEnd: string;
  baseSalary: string;
  overtime: string;
  bonus: string;
  allowances: string;
  grossPay: string;
  taxDeduction: string;
  socialSecurity: string;
  healthInsurance: string;
  otherDeductions: string;
  netPay: string;
  status: 'draft' | 'approved' | 'paid';
  paidDate?: string;
  notes?: string;
  createdAt: string;
}

interface TransactionFormState {
  type: 'income' | 'expense' | 'transfer';
  category: string;
  subcategory: string;
  amount: string;
  description: string;
  paymentMethod: string;
  tags: string[];
  sourceAccount: string;
  destinationAccount: string;
}

interface CreateTransactionPayload {
  type: 'income' | 'expense' | 'transfer';
  category: string;
  subcategory?: string;
  amount: string;
  description: string;
  paymentMethod?: string;
  tags?: string[];
  sourceAccount?: string;
  destinationAccount?: string;
}

const TRANSACTION_CATEGORIES = {
  income: [
    'Sales Revenue',
    'Service Revenue', 
    'Rental Income',
    'Investment Income',
    'Other Income'
  ],
  expense: [
    'Operational Expense',
    'Daily Operations',
    'Payroll',
    'Rent & Utilities',
    'Marketing',
    'Travel & Transport',
    'Office Supplies',
    'Technology',
    'Professional Services',
    'Insurance',
    'Taxes',
    'Other Expense'
  ],
  transfer: [
    'Account Transfer',
    'Internal Transfer',
    'Cash Movement',
    'Bank Transfer'
  ]
};

const DAILY_OPERATIONS_SUBCATEGORIES = [
  'Listrik & Air',
  'Bensin & Transportasi',
  'Makan & Minum',
  'Salam Tempel (Gratifikasi)',
  'Titipan Dibawah Meja',
  'Perlengkapan Kantor',
  'Komunikasi & Internet',
  'Lain-lain'
];

const PAYMENT_METHODS = [
  'cash',
  'bank_transfer',
  'credit_card',
  'debit_card',
  'e_wallet',
  'check'
];

const TRANSFER_ACCOUNTS = [
  { value: 'cash', label: 'Kas' },
  { value: 'bank', label: 'Bank' },
  { value: 'inventory', label: 'Persediaan' },
  { value: 'accounts_receivable', label: 'Piutang Usaha' },
  { value: 'accounts_payable', label: 'Hutang Usaha' },
  { value: 'customer_deposits', label: 'Uang Muka Pelanggan' },
];

const ACCOUNT_LABELS: Record<string, string> = {
  cash: 'Kas',
  bank: 'Bank',
  bank_transfer: 'Bank',
  inventory: 'Persediaan',
  system: 'Persediaan',
  transfer: 'Transfer',
  accounts_receivable: 'Piutang Usaha',
  accounts_payable: 'Hutang Usaha',
  customer_deposit: 'Uang Muka Pelanggan',
  customer_deposits: 'Uang Muka Pelanggan',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Tunai',
  bank: 'Bank',
  bank_transfer: 'Transfer Bank',
  transfer: 'Transfer Internal',
  credit_card: 'Kartu Kredit',
  debit_card: 'Kartu Debit',
  e_wallet: 'Dompet Digital',
  check: 'Cek/Bilyet Giro',
  system: 'Penyesuaian Persediaan',
  inventory: 'Persediaan',
  accounts_receivable: 'Piutang Usaha',
  accounts_payable: 'Hutang Usaha',
  customer_deposit: 'Uang Muka Pelanggan',
  customer_deposits: 'Uang Muka Pelanggan',
};

export default function FinanceNew() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Transaction Form State
  const [transactionForm, setTransactionForm] = useState<TransactionFormState>({
    type: 'income',
    category: '',
    subcategory: '',
    amount: '',
    description: '',
    paymentMethod: 'cash',
    tags: [],
    sourceAccount: 'cash',
    destinationAccount: 'bank'
  });

  // Employee Form State
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    position: '',
    department: '',
    salary: '',
    salaryType: 'monthly' as 'monthly' | 'weekly' | 'daily' | 'hourly',
    joinDate: createDatabaseTimestamp().split('T')[0],
    phone: '',
    bankAccount: '',
    address: ''
  });

  // Payroll Form State
  const [payrollForm, setPayrollForm] = useState({
    employeeId: '',
    periodStart: '',
    periodEnd: '',
    baseSalary: '',
    overtime: '0',
    bonus: '0',
    allowances: '0',
    taxDeduction: '0',
    socialSecurity: '0',
    healthInsurance: '0',
    otherDeductions: '0'
  });

  // Date filters
  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  const monthStartIso = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState({
    startDate: monthStartIso,
    endDate: todayIso
  });

  // Dialog states
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);

  // Fetch financial summary
  const { data: summary } = useQuery<FinancialSummary>({
    queryKey: ['/api/finance/summary', dateFilter.startDate, dateFilter.endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('startDate', dateFilter.startDate);
      if (dateFilter.endDate) params.append('endDate', dateFilter.endDate);
      const query = params.toString();
      return apiRequest('GET', `/api/finance/summary${query ? `?${query}` : ''}`);
    }
  });

  // Fetch transactions
  const { data: transactions } = useQuery<FinancialTransaction[]>({
    queryKey: ['/api/finance/transactions', dateFilter.startDate, dateFilter.endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('startDate', dateFilter.startDate);
      if (dateFilter.endDate) params.append('endDate', dateFilter.endDate);
      const query = params.toString();
      return apiRequest('GET', `/api/finance/transactions${query ? `?${query}` : ''}`);
    }
  });

  // Fetch employees
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
    queryFn: () => apiRequest('GET', '/api/employees')
  });

  // Fetch payroll records
  const { data: payrolls } = useQuery<PayrollRecord[]>({
    queryKey: ['/api/payroll'],
    queryFn: () => apiRequest('GET', '/api/payroll')
  });

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: CreateTransactionPayload) => {
      return apiRequest('POST', '/api/finance/transactions', data);
    },
    onSuccess: () => {
      toast({ title: "Transaksi berhasil dibuat" });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/summary'] });
      setShowTransactionDialog(false);
      setTransactionForm({
        type: 'income',
        category: '',
        subcategory: '',
        amount: '',
        description: '',
        paymentMethod: 'cash',
        tags: [],
        sourceAccount: 'cash',
        destinationAccount: 'bank'
      });
    },
    onError: () => {
      toast({ title: "Gagal membuat transaksi", variant: "destructive" });
    }
  });

  const handleSaveTransaction = () => {
    if (!transactionForm.category) {
      toast({ title: 'Silakan pilih kategori transaksi', variant: 'destructive' });
      return;
    }

    const amountNumber = Number(transactionForm.amount);
    if (!transactionForm.amount || Number.isNaN(amountNumber) || amountNumber <= 0) {
      toast({ title: 'Jumlah transaksi tidak valid', variant: 'destructive' });
      return;
    }

    if (transactionForm.type === 'transfer' && transactionForm.sourceAccount === transactionForm.destinationAccount) {
      toast({ title: 'Sumber dan tujuan transfer harus berbeda', variant: 'destructive' });
      return;
    }

    const sanitizedAmount = Math.abs(amountNumber).toString();

    const payload: CreateTransactionPayload = {
      type: transactionForm.type,
      category: transactionForm.category,
      subcategory: transactionForm.subcategory || undefined,
      amount: sanitizedAmount,
      description: transactionForm.description,
      paymentMethod: transactionForm.type === 'transfer' ? undefined : transactionForm.paymentMethod,
      tags:
        transactionForm.type === 'transfer'
          ? [`transfer:from=${transactionForm.sourceAccount}`, `transfer:to=${transactionForm.destinationAccount}`]
          : transactionForm.tags.length > 0
            ? transactionForm.tags
            : undefined,
      sourceAccount: transactionForm.type === 'transfer' ? transactionForm.sourceAccount : undefined,
      destinationAccount: transactionForm.type === 'transfer' ? transactionForm.destinationAccount : undefined,
    };

    createTransactionMutation.mutate(payload);
  };

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: typeof employeeForm) => {
      return apiRequest('POST', '/api/employees', data);
    },
    onSuccess: () => {
      toast({ title: "Karyawan berhasil ditambahkan" });
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setShowEmployeeDialog(false);
      setEmployeeForm({
        name: '',
        position: '',
        department: '',
        salary: '',
        salaryType: 'monthly',
        joinDate: createDatabaseTimestamp().split('T')[0],
        phone: '',
        bankAccount: '',
        address: ''
      });
    },
    onError: () => {
      toast({ title: "Gagal menambahkan karyawan", variant: "destructive" });
    }
  });

  // Create payroll mutation
  const createPayrollMutation = useMutation({
    mutationFn: async (data: typeof payrollForm) => {
      return apiRequest('POST', '/api/payroll', data);
    },
    onSuccess: () => {
      toast({ title: "Payroll berhasil dibuat" });
      queryClient.invalidateQueries({ queryKey: ['/api/payroll'] });
      setShowPayrollDialog(false);
      setPayrollForm({
        employeeId: '',
        periodStart: '',
        periodEnd: '',
        baseSalary: '',
        overtime: '0',
        bonus: '0',
        allowances: '0',
        taxDeduction: '0',
        socialSecurity: '0',
        healthInsurance: '0',
        otherDeductions: '0'
      });
    },
    onError: () => {
      toast({ title: "Gagal membuat payroll", variant: "destructive" });
    }
  });

  // Update payroll status mutation
  const updatePayrollStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest('PUT', `/api/payroll/${id}/status`, { status });
    },
    onSuccess: () => {
      toast({ title: "Status payroll berhasil diupdate" });
      queryClient.invalidateQueries({ queryKey: ['/api/payroll'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/summary'] });
      // Invalidate all reports queries so payroll expenses appear immediately
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
    },
    onError: () => {
      toast({ title: "Gagal mengupdate status payroll", variant: "destructive" });
    }
  });

  const formatCurrency = (amount: string | number) => {
    const parsed = typeof amount === 'string' ? parseFloat(amount) : amount;
    const num = Number.isFinite(parsed) ? parsed : 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const parseAmount = (value?: string | number | null) => {
    if (value === null || value === undefined) {
      return 0;
    }
    const numeric = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const inventoryCostSourceLabels: Record<
    'averageCost' | 'lastPurchasePrice' | 'sellingPrice' | 'stockMovement' | 'none',
    string
  > = {
    averageCost: 'HPP rata-rata',
    lastPurchasePrice: 'Harga beli terakhir',
    sellingPrice: 'Harga jual (fallback)',
    stockMovement: 'Riwayat pembelian stok',
    none: 'Belum ada data modal'
  };

  const getInventoryCostSourceLabel = (
    source: FinancialSummary['breakdown']['inventory'][string]['costSource'] | undefined
  ) => inventoryCostSourceLabels[source ?? 'none'];

  const totalIncomeValue = parseAmount(summary?.totalIncome);
  const rawExpenseValue = parseAmount(summary?.totalExpense);
  const displayExpenseValue = Math.max(rawExpenseValue, 0);
  const totalRefundsValue = Math.max(parseAmount(summary?.totalRefunds), 0);
  const rawNetProfitValue = parseAmount(summary?.netProfit);
  const grossProfitValue = parseAmount(summary?.grossProfit);
  const totalSalesRevenueValue = parseAmount(summary?.totalSalesRevenue);
  const totalCOGSValue = Math.max(parseAmount(summary?.totalCOGS), 0);
  const inventoryValue = parseAmount(summary?.inventoryValue);
  const netProfitIsPositive = rawNetProfitValue >= 0;
  const netProfitTextClass = netProfitIsPositive ? 'text-emerald-600' : 'text-red-600';

  const categoriesBreakdown: Record<string, { income: number; expense: number; count: number }> =
    summary?.breakdown?.categories ?? {};
  const subcategoriesBreakdown: Record<string, { amount: number; type: string; count: number }> =
    summary?.breakdown?.subcategories ?? {};

  const hasAssetOrPurchaseKeyword = (value?: string | null) => {
    if (!value) return false;
    const normalized = value.toLowerCase();
    return (
      normalized.includes('inventory') ||
      normalized.includes('persediaan') ||
      normalized.includes('stock') ||
      normalized.includes('asset') ||
      normalized.includes('aset') ||
      normalized.includes('purchase') ||
      normalized.includes('pembelian')
    );
  };

  const shouldHideCategory = (name: string, data: { income: number; expense: number }) => {
    if (!name) return false;
    if (data.expense <= 0) {
      return false;
    }
    return hasAssetOrPurchaseKeyword(name);
  };

  const shouldHideSubcategory = (name: string, data: { amount: number; type: string }) => {
    if (!name) return false;
    if (data.type === 'income') {
      return false;
    }
    if (data.amount <= 0) {
      return false;
    }
    return hasAssetOrPurchaseKeyword(name);
  };

  const categoryEntries = Object.entries(categoriesBreakdown) as Array<[
    string,
    { income: number; expense: number; count: number }
  ]>;
  const filteredCategoryEntries = categoryEntries.filter(([name, data]) => !shouldHideCategory(name, data));
  const subcategoryEntries = Object.entries(subcategoriesBreakdown) as Array<[
    string,
    { amount: number; type: string; count: number }
  ]>;
  const filteredSubcategoryEntries = subcategoryEntries.filter(
    ([name, data]) => !shouldHideSubcategory(name, data)
  );

  const hasAssetAdjustments =
    filteredCategoryEntries.length !== categoryEntries.length ||
    filteredSubcategoryEntries.length !== subcategoryEntries.length;

  const incomeTransactionCount = filteredCategoryEntries.reduce(
    (sum, [, data]) => (data.income > 0 ? sum + data.count : sum),
    0
  );
  const expenseTransactionCount = filteredCategoryEntries.reduce(
    (sum, [, data]) => (data.expense > 0 ? sum + data.count : sum),
    0
  );

  const resolveAccountLabel = (value?: string) => {
    if (!value) return '-';
    const normalized = value.toLowerCase();
    return ACCOUNT_LABELS[normalized] || value;
  };

  const resolvePaymentMethodLabel = (value?: string) => {
    if (!value) return '-';
    const normalized = value.toLowerCase();
    return PAYMENT_METHOD_LABELS[normalized] || value.replace(/[_-]/g, ' ').toUpperCase();
  };

  const getTransferAccounts = (transaction: FinancialTransaction) => {
    const tags = transaction.tags || [];
    let from: string | undefined;
    let to: string | undefined;

    tags.forEach((tag) => {
      const lower = tag.toLowerCase();
      if (lower.startsWith('transfer:from=')) {
        from = tag.split('=')[1];
      } else if (lower.startsWith('transfer:to=')) {
        to = tag.split('=')[1];
      }
    });

    return { from, to };
  };

  const renderTransferDirection = (transaction: FinancialTransaction) => {
    const { from, to } = getTransferAccounts(transaction);
    if (!from && !to) {
      return 'Transfer internal';
    }

    const fromLabel = resolveAccountLabel(from);
    const toLabel = resolveAccountLabel(to);
    return `${fromLabel} → ${toLabel}`;
  };

  const getStatusBadge = (status: string, type?: string) => {
    const statusConfig = {
      'confirmed': { variant: 'default' as const, text: 'Dikonfirmasi' },
      'pending': { variant: 'secondary' as const, text: 'Menunggu' },
      'cancelled': { variant: 'destructive' as const, text: 'Dibatalkan' },
      'draft': { variant: 'secondary' as const, text: 'Konsep' },
      'approved': { variant: 'default' as const, text: 'Disetujui' },
      'paid': { variant: 'default' as const, text: 'Dibayar' },
      'active': { variant: 'default' as const, text: 'Aktif' },
      'inactive': { variant: 'secondary' as const, text: 'Tidak Aktif' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { variant: 'outline' as const, text: status };

    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  // Helper function untuk menampilkan transaksi dengan benar (aset = positif, expense = negatif)
  const getTransactionDisplay = (transaction: FinancialTransaction) => {
    if (transaction.type === 'transfer') {
      return {
        sign: '',
        color: 'text-blue-600',
        badge: 'outline',
        label: 'Transfer'
      };
    }

    const normalizedReferenceType = transaction.referenceType?.toLowerCase() || '';
    const normalizedCategory = transaction.category?.toLowerCase() || '';

    const isServiceCancellationExpense =
      transaction.type === 'expense' && (
        normalizedReferenceType.includes('service_cancellation') ||
        normalizedReferenceType.includes('warranty') ||
        normalizedCategory.includes('service cancellation')
      );

    if (isServiceCancellationExpense) {
      return {
        sign: '-',
        color: 'text-red-600',
        badge: 'destructive',
        label: 'Pengeluaran'
      };
    }

    // Handle refunds separately - they should NOT be shown as income
    if (transaction.category === 'Returns and Allowances' ||
        transaction.category?.includes('Refund') ||
        (transaction.description?.toLowerCase().includes('refund') && !isServiceCancellationExpense)) {
      return {
        sign: '-',
        color: 'text-orange-600',
        badge: 'secondary',
        label: 'Refund/Retur'
      };
    }
    
    if (transaction.type === 'income') {
      return {
        sign: '+',
        color: 'text-green-600',
        badge: 'default',
        label: 'Pemasukan'
      };
    } else {
      // Cek apakah ini transaksi aset atau expense berdasarkan kategori dan deskripsi
      const isAsset = 
        // Deteksi langsung berdasarkan kategori exact match
        transaction.category === 'Cost of Goods Sold' ||
        transaction.category === 'Inventory Purchase' ||
        transaction.subcategory === 'Cost of Goods Sold' ||
        transaction.subcategory === 'Inventory Purchase' ||
        // Deteksi berdasarkan kata kunci dalam kategori/deskripsi
        [
          'cost of goods sold', 'inventory', 'persediaan', 'stock', 'barang',
          'peralatan', 'equipment', 'kendaraan', 'vehicle', 'furniture', 
          'aset', 'assets', 'fixed asset', 'kas', 'cash', 'bank', 'tunai',
          'piutang', 'receivable', 'tagihan', 'purchase'
        ].some(keyword => 
          transaction.category?.toLowerCase().includes(keyword) || 
          transaction.subcategory?.toLowerCase().includes(keyword) || 
          transaction.description?.toLowerCase().includes(keyword)
        );
      
      if (isAsset) {
        return {
          sign: '+',
          color: 'text-blue-600',
          badge: 'secondary',
          label: 'Aset'
        };
      } else {
        return {
          sign: '-',
          color: 'text-red-600', 
          badge: 'destructive',
          label: 'Pengeluaran'
        };
      }
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Keuangan & Payroll" breadcrumb="Beranda / Keuangan & Payroll" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  placeholder="Tanggal Mulai"
                  className="w-40"
                />
                <Input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  placeholder="Tanggal Akhir"
                  className="w-40"
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDateFilter({ startDate: todayIso, endDate: todayIso })}
                    className="gap-2"
                  >
                    <Calendar className="w-4 h-4" /> Hari ini
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date();
                      const lastWeek = new Date(now);
                      lastWeek.setDate(now.getDate() - 6);
                      setDateFilter({
                        startDate: lastWeek.toISOString().split('T')[0],
                        endDate: now.toISOString().split('T')[0]
                      });
                    }}
                  >
                    7 hari terakhir
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDateFilter({
                        startDate: monthStartIso,
                        endDate: todayIso
                      });
                    }}
                  >
                    Bulan ini
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => setDateFilter({ startDate: monthStartIso, endDate: todayIso })}
                  >
                    <RotateCcw className="w-4 h-4" /> Reset ke bulan ini
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Data laporan kini otomatis menggunakan rentang bulan berjalan agar transaksi POS dan servis terbaru langsung terlihat. Gunakan tombol di atas untuk menyesuaikan periode jika diperlukan.
              </p>
            </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7"> 
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalIncomeValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(displayExpenseValue)}
            </div>
            {displayExpenseValue === 0 && totalIncomeValue > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Tidak ada pengeluaran tercatat pada periode ini setelah normalisasi data.
              </div>
            )}
            {hasAssetAdjustments && (
              <div className="text-xs text-muted-foreground mt-1">
                Pembelian persediaan/aset dikeluarkan dari total pengeluaran agar tidak menggandakan HPP.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Retur & Refund</CardTitle>
            <RotateCcw className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(totalRefundsValue)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Diklasifikasikan sebagai kontra pendapatan
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laba Kotor</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(grossProfitValue)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Penjualan bersih: {formatCurrency(totalSalesRevenueValue - totalRefundsValue)}
            </div>
            <div className="text-xs text-muted-foreground">
              HPP: {formatCurrency(totalCOGSValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfitTextClass}`}>
              {formatCurrency(rawNetProfitValue)}
            </div>
            {!netProfitIsPositive && (
              <div className="text-xs text-amber-600 mt-1">
                Pengeluaran lebih besar dari pemasukan pada periode ini.
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              Laba bersih dihitung dari total pemasukan dikurangi total pengeluaran.
            </div>
            <div className="text-xs text-muted-foreground">
              Laba penjualan merupakan selisih antara total harga jual dan HPP.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nilai Aset Inventory</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(inventoryValue)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary?.inventoryCount || 0} item stok
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Dihitung dari stok × harga modal (HPP rata-rata, harga beli terakhir, atau riwayat pembelian masuk).
            </div>
            {inventoryValue === 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Pastikan produk memiliki harga modal atau transaksi pembelian agar nilai aset tidak nol.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {summary?.transactionCount || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {`Income: ${incomeTransactionCount} | Expense: ${expenseTransactionCount}`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Finance Calculation Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Penjelasan Perhitungan Keuangan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">Sumber Pemasukan:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Ongkos tenaga kerja service</li>
                <li>• Penjualan spare parts (harga jual)</li>
                <li>• Transaksi penjualan langsung</li>
                <li>• Pendapatan lain-lain</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-red-600">Sumber Pengeluaran:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Biaya modal spare parts (harga beli)</li>
                <li>• Gaji karyawan (payroll)</li>
                <li>• Biaya operasional</li>
                <li>• Pengeluaran lain-lain</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Catatan:</strong> Saat service ticket diselesaikan, sistem otomatis mencatat 3 transaksi: 
                biaya modal parts sebagai pengeluaran, penjualan parts sebagai pemasukan, dan ongkos kerja sebagai pemasukan.
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Data Terkini:</strong> Total Pendapatan mencakup semua pemasukan dari penjualan produk (POS) dan layanan service.
                Saat ini ada {summary?.breakdown?.sources ?
                  Object.values(summary.breakdown.sources).reduce((sum, source) => sum + source.count, 0) : 0} transaksi pemasukan
                dengan total {formatCurrency(totalIncomeValue)}.
                Laba bersih dihitung dari total pendapatan dikurangi seluruh pengeluaran (termasuk HPP/biaya modal) sebesar {formatCurrency(displayExpenseValue)}.
                Total harga jual produk tercatat {formatCurrency(totalSalesRevenueValue)} dengan HPP {formatCurrency(totalCOGSValue)} sebagai bagian dari pengeluaran.
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>Nilai Aset Inventory:</strong> Dihitung berdasarkan jumlah stok × harga beli untuk setiap produk aktif. 
                Total ini menunjukkan berapa nilai modal yang tertanam dalam persediaan barang.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Detail */}
      {summary?.breakdown && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Categories Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Breakdown per Kategori</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredCategoryEntries.map(([category, data]) => (
                  <div key={category} className="flex flex-col space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{category}</span>
                      <span className="text-xs text-muted-foreground">({data.count} transaksi)</span>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-xs text-green-600">
                        +{formatCurrency(data.income.toString())}
                      </div>
                      <div className="text-xs text-red-600">
                        -{formatCurrency(data.expense.toString())}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Bersih: {formatCurrency((data.income - data.expense).toString())}
                    </div>
                  </div>
                ))}
                {filteredCategoryEntries.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    Tidak ada pengeluaran operasional yang perlu ditampilkan.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sources Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Breakdown per Sumber</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(summary.breakdown.sources).map(([source, data]) => (
                  <div key={source} className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {source === 'service' ? 'Service/Perbaikan' :
                         source === 'service_labor' ? 'Ongkos Kerja' :
                         source === 'service_parts_cost' ? 'Biaya Parts' :
                         source === 'service_parts_revenue' ? 'Penjualan Parts' :
                         source === 'payroll' ? 'Gaji Karyawan' : source}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {data.count} transaksi
                      </span>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(data.amount.toString())}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Subcategories Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Breakdown per Subkategori</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredSubcategoryEntries.map(([subcategory, data]) => (
                  <div key={subcategory} className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{subcategory}</span>
                      <span className="text-xs text-muted-foreground">
                        {data.count} transaksi
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={`text-sm font-medium ${
                        // Refund should NOT be treated as income
                        data.type === 'income' && subcategory !== 'Returns and Allowances' && !subcategory.includes('Refund') 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {data.type === 'income' && subcategory !== 'Returns and Allowances' && !subcategory.includes('Refund') 
                          ? '+' : '-'}{formatCurrency(data.amount.toString())}
                      </div>
                      <Badge variant={
                        data.type === 'income' && subcategory !== 'Returns and Allowances' && !subcategory.includes('Refund') 
                          ? 'default' 
                          : 'destructive'
                      } className="text-xs">
                        {data.type === 'income' && subcategory !== 'Returns and Allowances' && !subcategory.includes('Refund') 
                          ? 'Pemasukan' 
                          : subcategory === 'Returns and Allowances' || subcategory.includes('Refund') 
                            ? 'Refund/Retur' 
                            : 'Pengeluaran'}
                      </Badge>
                    </div>
                  </div>
                ))}
                {filteredSubcategoryEntries.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    Tidak ada subkategori pengeluaran operasional yang perlu ditampilkan.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Inventory Assets Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aset Inventory Detail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Object.entries(summary.breakdown.inventory).map(([productName, data]) => (
                  <div key={productName} className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium truncate max-w-32" title={productName}>
                        {productName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {data.stock} stok • {formatCurrency(data.avgCost.toString())} modal
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-sm font-medium text-orange-600">
                        {formatCurrency(data.value.toString())}
                      </div>
                      <Badge variant="outline" className="mt-1 text-[10px] uppercase tracking-wide">
                        {getInventoryCostSourceLabel(data.costSource)}
                      </Badge>
                    </div>
                  </div>
                ))}
                {Object.keys(summary.breakdown.inventory).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    Tidak ada inventory dengan stok
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transaksi Keuangan</TabsTrigger>
          <TabsTrigger value="employees">Karyawan</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          {/* Quick Daily Expense Entry */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pengeluaran Harian Cepat</CardTitle>
              <CardDescription>
                Tambah pengeluaran operasional sehari-hari dengan cepat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {DAILY_OPERATIONS_SUBCATEGORIES.map((subcat) => (
                  <Button
                    key={subcat}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center text-xs"
                    onClick={() => {
                      setTransactionForm({
                        type: 'expense',
                        category: 'Daily Operations',
                        subcategory: subcat,
                        amount: '',
                        description: subcat,
                        paymentMethod: 'cash',
                        tags: [],
                        sourceAccount: 'cash',
                        destinationAccount: 'bank'
                      });
                      setShowTransactionDialog(true);
                    }}
                    data-testid={`quick-expense-${subcat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  >
                    <span className="font-medium text-center">{subcat}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Transaksi Keuangan</h2>
            <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-transaction">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Transaksi
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Tambah Transaksi Keuangan</DialogTitle>
                  <DialogDescription>
                    Buat transaksi pemasukan atau pengeluaran baru
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="type">Tipe Transaksi</Label>
                    <Select
                      value={transactionForm.type}
                      onValueChange={(value: 'income' | 'expense' | 'transfer') =>
                        setTransactionForm(prev => ({
                          ...prev,
                          type: value,
                          category: '',
                          subcategory: '',
                          paymentMethod: value === 'transfer' ? 'transfer' : 'cash',
                          sourceAccount: value === 'transfer' ? 'cash' : prev.sourceAccount,
                          destinationAccount: value === 'transfer' ? 'bank' : prev.destinationAccount,
                          tags: value === 'transfer' ? prev.tags : []
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Pemasukan</SelectItem>
                        <SelectItem value="expense">Pengeluaran</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="category">Kategori</Label>
                    <Select
                      value={transactionForm.category}
                      onValueChange={(value) => 
                        setTransactionForm(prev => ({ ...prev, category: value, subcategory: '' }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSACTION_CATEGORIES[transactionForm.type]?.map((cat: string) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {transactionForm.category === 'Daily Operations' && (
                    <div>
                      <Label htmlFor="subcategory">Sub-Kategori</Label>
                      <Select
                        value={transactionForm.subcategory}
                        onValueChange={(value) => 
                          setTransactionForm(prev => ({ ...prev, subcategory: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih sub-kategori" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAILY_OPERATIONS_SUBCATEGORIES.map((subcat) => (
                            <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="amount">Jumlah</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={transactionForm.amount}
                      onChange={(e) => 
                        setTransactionForm(prev => ({ ...prev, amount: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Deskripsi</Label>
                    <Textarea
                      id="description"
                      value={transactionForm.description}
                      onChange={(e) => 
                        setTransactionForm(prev => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Deskripsi transaksi"
                    />
                  </div>

                  {transactionForm.type === 'transfer' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="sourceAccount">Sumber Dana</Label>
                        <Select
                          value={transactionForm.sourceAccount}
                          onValueChange={(value) =>
                            setTransactionForm(prev => ({ ...prev, sourceAccount: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TRANSFER_ACCOUNTS.map((account) => (
                              <SelectItem key={account.value} value={account.value}>
                                {account.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Akun ini akan dikreditkan (saldo berkurang).
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="destinationAccount">Tujuan Dana</Label>
                        <Select
                          value={transactionForm.destinationAccount}
                          onValueChange={(value) =>
                            setTransactionForm(prev => ({ ...prev, destinationAccount: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TRANSFER_ACCOUNTS.map((account) => (
                              <SelectItem key={account.value} value={account.value}>
                                {account.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Akun ini akan didebit (saldo bertambah).
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="paymentMethod">Metode Pembayaran</Label>
                      <Select
                        value={transactionForm.paymentMethod}
                        onValueChange={(value) =>
                          setTransactionForm(prev => ({ ...prev, paymentMethod: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((method) => (
                            <SelectItem key={method} value={method}>
                              {resolvePaymentMethodLabel(method)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowTransactionDialog(false)}
                      className="flex-1"
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={handleSaveTransaction}
                      disabled={createTransactionMutation.isPending}
                      className="flex-1"
                    >
                      {createTransactionMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(transactions) ? transactions.map((transaction) => {
                    const display = getTransactionDisplay(transaction);
                    const transferDirection = transaction.type === 'transfer'
                      ? renderTransferDirection(transaction)
                      : undefined;

                    return (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {formatDateShort(transaction.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={display.badge as any}>
                            {display.label}
                          </Badge>
                          {(transaction.type === 'transfer' || transaction.paymentMethod) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {transaction.type === 'transfer'
                                ? transferDirection
                                : resolvePaymentMethodLabel(transaction.paymentMethod)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{transaction.category}</div>
                          {transaction.subcategory && (
                            <div className="text-sm text-muted-foreground">{transaction.subcategory}</div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate font-medium">{transaction.description}</div>
                          {transaction.referenceType && (
                            <div className="text-xs text-blue-600 mt-1">
                              Dari: {transaction.referenceType === 'service' ? 'Service Ticket' :
                                    transaction.referenceType === 'service_labor' ? 'Ongkos Kerja Service' :
                                    transaction.referenceType === 'service_parts_cost' ? 'Biaya Parts Service' :
                                    transaction.referenceType === 'service_parts_revenue' ? 'Penjualan Parts Service' :
                                    transaction.referenceType === 'payroll' ? 'Payroll' : transaction.referenceType}
                              {transaction.reference && ` (${transaction.reference.slice(0, 8)}...)`}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className={display.color}>
                          {display.sign}{formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Tidak ada transaksi
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="px-4 py-3 text-xs text-muted-foreground border-t">
                Catatan: setiap transaksi otomatis membentuk jurnal debit/kredit sesuai akun sehingga laporan keuangan selalu
                mengikuti prinsip akuntansi double-entry.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Data Karyawan</h2>
            <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Karyawan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Tambah Karyawan Baru</DialogTitle>
                  <DialogDescription>
                    Tambahkan karyawan baru ke sistem payroll
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <Input
                      id="name"
                      value={employeeForm.name}
                      onChange={(e) => 
                        setEmployeeForm(prev => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Nama lengkap karyawan"
                    />
                  </div>

                  <div>
                    <Label htmlFor="position">Posisi</Label>
                    <Input
                      id="position"
                      value={employeeForm.position}
                      onChange={(e) => 
                        setEmployeeForm(prev => ({ ...prev, position: e.target.value }))
                      }
                      placeholder="Posisi/jabatan"
                    />
                  </div>

                  <div>
                    <Label htmlFor="department">Departemen</Label>
                    <Input
                      id="department"
                      value={employeeForm.department}
                      onChange={(e) => 
                        setEmployeeForm(prev => ({ ...prev, department: e.target.value }))
                      }
                      placeholder="Departemen"
                    />
                  </div>

                  <div>
                    <Label htmlFor="salary">Gaji</Label>
                    <Input
                      id="salary"
                      type="number"
                      value={employeeForm.salary}
                      onChange={(e) => 
                        setEmployeeForm(prev => ({ ...prev, salary: e.target.value }))
                      }
                      placeholder="Gaji pokok"
                    />
                  </div>

                  <div>
                    <Label htmlFor="salaryType">Tipe Gaji</Label>
                    <Select
                      value={employeeForm.salaryType}
                      onValueChange={(value: 'monthly' | 'weekly' | 'daily' | 'hourly') => 
                        setEmployeeForm(prev => ({ ...prev, salaryType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Bulanan</SelectItem>
                        <SelectItem value="weekly">Mingguan</SelectItem>
                        <SelectItem value="daily">Harian</SelectItem>
                        <SelectItem value="hourly">Per Jam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="joinDate">Tanggal Bergabung</Label>
                    <Input
                      id="joinDate"
                      type="date"
                      value={employeeForm.joinDate}
                      onChange={(e) => 
                        setEmployeeForm(prev => ({ ...prev, joinDate: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Nomor Telepon</Label>
                    <Input
                      id="phone"
                      value={employeeForm.phone}
                      onChange={(e) => 
                        setEmployeeForm(prev => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="Nomor telepon"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowEmployeeDialog(false)}
                      className="flex-1"
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={() => createEmployeeMutation.mutate(employeeForm)}
                      disabled={createEmployeeMutation.isPending}
                      className="flex-1"
                    >
                      {createEmployeeMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor Karyawan</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Posisi</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead>Gaji</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bergabung</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees?.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-mono">{employee.employeeNumber}</TableCell>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>{employee.department || '-'}</TableCell>
                      <TableCell>{formatCurrency(employee.salary)}</TableCell>
                      <TableCell>{getStatusBadge(employee.status)}</TableCell>
                      <TableCell>
                        {formatDateShort(employee.joinDate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Manajemen Gaji</h2>
            <Dialog open={showPayrollDialog} onOpenChange={setShowPayrollDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Payroll
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Buat Payroll Baru</DialogTitle>
                  <DialogDescription>
                    Buat payroll untuk periode tertentu
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="employeeId">Karyawan</Label>
                    <Select
                      value={payrollForm.employeeId}
                      onValueChange={(value) => 
                        setPayrollForm(prev => ({ ...prev, employeeId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih karyawan" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} - {employee.position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="periodStart">Periode Mulai</Label>
                      <Input
                        id="periodStart"
                        type="date"
                        value={payrollForm.periodStart}
                        onChange={(e) => 
                          setPayrollForm(prev => ({ ...prev, periodStart: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="periodEnd">Periode Akhir</Label>
                      <Input
                        id="periodEnd"
                        type="date"
                        value={payrollForm.periodEnd}
                        onChange={(e) => 
                          setPayrollForm(prev => ({ ...prev, periodEnd: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="baseSalary">Gaji Pokok</Label>
                    <Input
                      id="baseSalary"
                      type="number"
                      value={payrollForm.baseSalary}
                      onChange={(e) => 
                        setPayrollForm(prev => ({ ...prev, baseSalary: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="overtime">Lembur</Label>
                      <Input
                        id="overtime"
                        type="number"
                        value={payrollForm.overtime}
                        onChange={(e) => 
                          setPayrollForm(prev => ({ ...prev, overtime: e.target.value }))
                        }
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bonus">Bonus</Label>
                      <Input
                        id="bonus"
                        type="number"
                        value={payrollForm.bonus}
                        onChange={(e) => 
                          setPayrollForm(prev => ({ ...prev, bonus: e.target.value }))
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="allowances">Tunjangan</Label>
                    <Input
                      id="allowances"
                      type="number"
                      value={payrollForm.allowances}
                      onChange={(e) => 
                        setPayrollForm(prev => ({ ...prev, allowances: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="taxDeduction">Potongan Pajak</Label>
                      <Input
                        id="taxDeduction"
                        type="number"
                        value={payrollForm.taxDeduction}
                        onChange={(e) => 
                          setPayrollForm(prev => ({ ...prev, taxDeduction: e.target.value }))
                        }
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="socialSecurity">BPJS</Label>
                      <Input
                        id="socialSecurity"
                        type="number"
                        value={payrollForm.socialSecurity}
                        onChange={(e) => 
                          setPayrollForm(prev => ({ ...prev, socialSecurity: e.target.value }))
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPayrollDialog(false)}
                      className="flex-1"
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={() => createPayrollMutation.mutate(payrollForm)}
                      disabled={createPayrollMutation.isPending}
                      className="flex-1"
                    >
                      {createPayrollMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor Payroll</TableHead>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Gaji Kotor</TableHead>
                    <TableHead>Potongan</TableHead>
                    <TableHead>Gaji Bersih</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls?.map((payroll) => (
                    <TableRow key={payroll.id}>
                      <TableCell className="font-mono">{payroll.payrollNumber}</TableCell>
                      <TableCell>
                        {employees?.find(e => e.id === payroll.employeeId)?.name || 'Tidak Diketahui'}
                      </TableCell>
                      <TableCell>
                        {formatDateShort(payroll.periodStart)} - {formatDateShort(payroll.periodEnd)}
                      </TableCell>
                      <TableCell>{formatCurrency(payroll.grossPay)}</TableCell>
                      <TableCell>
                        {formatCurrency(
                          (Number(payroll.taxDeduction || 0) + 
                           Number(payroll.socialSecurity || 0) + 
                           Number(payroll.healthInsurance || 0) + 
                           Number(payroll.otherDeductions || 0)).toString()
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(payroll.netPay)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payroll.status)}</TableCell>
                      <TableCell>
                        {payroll.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updatePayrollStatusMutation.mutate({
                              id: payroll.id,
                              status: 'approved'
                            })}
                          >
                            Setujui
                          </Button>
                        )}
                        {payroll.status === 'approved' && (
                          <Button
                            size="sm"
                            onClick={() => updatePayrollStatusMutation.mutate({
                              id: payroll.id,
                              status: 'paid'
                            })}
                          >
                            Bayar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          </TabsContent>
        </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}