import { useState, useEffect } from "react";
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
import { Plus, TrendingUp, TrendingDown, DollarSign, Users, Calendar, Eye } from "lucide-react";
import { format } from "date-fns";
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
  netProfit: string;
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
  ]
};

const PAYMENT_METHODS = [
  'cash',
  'bank_transfer',
  'credit_card',
  'debit_card',
  'e_wallet',
  'check'
];

export default function FinanceNew() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Transaction Form State
  const [transactionForm, setTransactionForm] = useState({
    type: 'income' as 'income' | 'expense' | 'transfer',
    category: '',
    subcategory: '',
    amount: '',
    description: '',
    paymentMethod: 'cash',
    tags: [] as string[]
  });

  // Employee Form State
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    position: '',
    department: '',
    salary: '',
    salaryType: 'monthly' as 'monthly' | 'weekly' | 'daily' | 'hourly',
    joinDate: new Date().toISOString().split('T')[0],
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
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
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
      return fetch(`/api/finance/summary?${params}`).then(res => res.json());
    }
  });

  // Fetch transactions
  const { data: transactions } = useQuery<FinancialTransaction[]>({
    queryKey: ['/api/finance/transactions', dateFilter.startDate, dateFilter.endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('startDate', dateFilter.startDate);
      if (dateFilter.endDate) params.append('endDate', dateFilter.endDate);
      return fetch(`/api/finance/transactions?${params}`).then(res => res.json());
    }
  });

  // Fetch employees
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
    queryFn: () => fetch('/api/employees').then(res => res.json())
  });

  // Fetch payroll records
  const { data: payrolls } = useQuery<PayrollRecord[]>({
    queryKey: ['/api/payroll'],
    queryFn: () => fetch('/api/payroll').then(res => res.json())
  });

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: typeof transactionForm) => {
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
        tags: []
      });
    },
    onError: () => {
      toast({ title: "Gagal membuat transaksi", variant: "destructive" });
    }
  });

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
        joinDate: new Date().toISOString().split('T')[0],
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
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const getStatusBadge = (status: string, type?: string) => {
    const statusConfig = {
      'confirmed': { variant: 'default' as const, text: 'Confirmed' },
      'pending': { variant: 'secondary' as const, text: 'Pending' },
      'cancelled': { variant: 'destructive' as const, text: 'Cancelled' },
      'draft': { variant: 'secondary' as const, text: 'Draft' },
      'approved': { variant: 'default' as const, text: 'Approved' },
      'paid': { variant: 'default' as const, text: 'Paid' },
      'active': { variant: 'default' as const, text: 'Active' },
      'inactive': { variant: 'secondary' as const, text: 'Inactive' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { variant: 'outline' as const, text: status };

    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  // Helper function untuk menampilkan transaksi dengan benar (aset = positif, expense = negatif)
  const getTransactionDisplay = (transaction: FinancialTransaction) => {
    if (transaction.type === 'income') {
      return {
        sign: '+',
        color: 'text-green-600',
        badge: 'default',
        label: 'Pemasukan'
      };
    } else {
      // Cek apakah ini transaksi aset atau expense berdasarkan kategori dan deskripsi
      const isAsset = [
        // Kategori inventory/persediaan
        'Cost of Goods Sold', 'Inventory', 'Persediaan', 'Stock', 'Barang',
        // Kategori aset fisik
        'Peralatan', 'Equipment', 'Kendaraan', 'Vehicle', 'Furniture', 
        'Aset', 'Assets', 'Fixed Asset',
        // Kategori kas dan bank
        'Kas', 'Cash', 'Bank', 'Tunai',
        // Kategori piutang
        'Piutang', 'Receivable', 'Tagihan'
      ].some(keyword => 
        transaction.category?.toLowerCase().includes(keyword.toLowerCase()) || 
        transaction.subcategory?.toLowerCase().includes(keyword.toLowerCase()) || 
        transaction.description?.toLowerCase().includes(keyword.toLowerCase())
      ) || transaction.category === 'Cost of Goods Sold' || transaction.category === 'Inventory Purchase';
      
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
            <div className="flex justify-between items-center">
        <div className="flex gap-2">
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.totalIncome || '0')}
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
              {formatCurrency(summary?.totalExpense || '0')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary?.netProfit || '0')}
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
              {formatCurrency(summary?.inventoryValue || '0')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary?.inventoryCount || 0} item stok
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Karyawan</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {employees?.length || 0}
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
                {Object.entries(summary.breakdown.categories).map(([category, data]) => (
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
                      Net: {formatCurrency((data.income - data.expense).toString())}
                    </div>
                  </div>
                ))}
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
                        {source === 'service' ? 'Service/Repair' :
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
                {Object.entries(summary.breakdown.subcategories).map(([subcategory, data]) => (
                  <div key={subcategory} className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{subcategory}</span>
                      <span className="text-xs text-muted-foreground">
                        {data.count} transaksi
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={`text-sm font-medium ${
                        data.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {data.type === 'income' ? '+' : '-'}{formatCurrency(data.amount.toString())}
                      </div>
                      <Badge variant={data.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                        {data.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                      </Badge>
                    </div>
                  </div>
                ))}
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
                        {data.stock} stok • {formatCurrency(data.avgCost.toString())} avg
                      </span>
                    </div>
                    <div className="text-sm font-medium text-orange-600">
                      {formatCurrency(data.value.toString())}
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
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Transaksi Keuangan</h2>
            <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
              <DialogTrigger asChild>
                <Button>
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
                        setTransactionForm(prev => ({ ...prev, type: value, category: '' }))
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
                        setTransactionForm(prev => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSACTION_CATEGORIES[transactionForm.type]?.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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
                            {method.replace('_', ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowTransactionDialog(false)}
                      className="flex-1"
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={() => createTransactionMutation.mutate(transactionForm)}
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
                  {Array.isArray(transactions) ? transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {format(new Date(transaction.createdAt), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const display = getTransactionDisplay(transaction);
                          return (
                            <Badge variant={display.badge as any}>
                              {display.label}
                            </Badge>
                          );
                        })()}
                        {transaction.paymentMethod && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {transaction.paymentMethod === 'cash' ? 'Tunai' :
                             transaction.paymentMethod === 'transfer' ? 'Transfer' :
                             transaction.paymentMethod === 'bank_transfer' ? 'Transfer Bank' :
                             transaction.paymentMethod === 'inventory' ? 'Stok/Persediaan' : transaction.paymentMethod}
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
                      <TableCell className={getTransactionDisplay(transaction).color}>
                        {getTransactionDisplay(transaction).sign}{formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Tidak ada transaksi
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
                        {format(new Date(employee.joinDate), 'dd/MM/yyyy')}
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
            <h2 className="text-xl font-semibold">Payroll Management</h2>
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
                        {employees?.find(e => e.id === payroll.employeeId)?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(payroll.periodStart), 'dd/MM')} - {format(new Date(payroll.periodEnd), 'dd/MM/yyyy')}
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
                            Approve
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