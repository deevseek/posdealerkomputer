import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Edit, Trash2, Filter, PiggyBank, Receipt } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInsertSchema } from "drizzle-zod";
import { financialRecords, type FinancialRecord } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

const financialFormSchema = createInsertSchema(financialRecords).omit({
  id: true,
  userId: true,
  createdAt: true,
});

const recordTypes = {
  income: { label: "Pemasukan", icon: TrendingUp, color: "text-green-600" },
  expense: { label: "Pengeluaran", icon: TrendingDown, color: "text-red-600" },
  asset: { label: "Aset", icon: PiggyBank, color: "text-blue-600" },
  liability: { label: "Kewajiban", icon: Receipt, color: "text-orange-600" },
};

const incomeCategories = [
  "Penjualan Laptop",
  "Servis Repair",
  "Konsultasi",
  "Aksesoris",
  "Garansi",
  "Lainnya"
];

const expenseCategories = [
  "Pembelian Stok",
  "Gaji Karyawan",
  "Sewa Toko",
  "Listrik & Internet",
  "Marketing",
  "Peralatan",
  "Transport",
  "Pajak",
  "Lainnya"
];

export default function Financial() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showDialog, setShowDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["/api/financial-records"],
    retry: false,
  });

  const form = useForm({
    resolver: zodResolver(financialFormSchema),
    defaultValues: {
      type: "income",
      category: "",
      amount: "",
      description: "",
      reference: "",
    },
  });

  const selectedType = form.watch("type");
  const availableCategories = selectedType === "income" ? incomeCategories : 
                             selectedType === "expense" ? expenseCategories : [];

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const recordData = {
        ...data,
        amount: parseFloat(data.amount),
      };
      return apiRequest('POST', '/api/financial-records', recordData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial-records"] });
      setShowDialog(false);
      setEditingRecord(null);
      form.reset();
      toast({ title: "Sukses", description: "Catatan keuangan berhasil ditambahkan" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Gagal menambahkan catatan keuangan", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const recordData = {
        ...data,
        amount: parseFloat(data.amount),
      };
      return apiRequest('PUT', `/api/financial-records/${id}`, recordData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial-records"] });
      setShowDialog(false);
      setEditingRecord(null);
      form.reset();
      toast({ title: "Sukses", description: "Catatan keuangan berhasil diperbarui" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Gagal memperbarui catatan keuangan", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/financial-records/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial-records"] });
      toast({ title: "Sukses", description: "Catatan keuangan berhasil dihapus" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Gagal menghapus catatan keuangan", variant: "destructive" });
    },
  });

  // Calculate summary statistics
  const financialSummary = (records as FinancialRecord[]).reduce((acc, record) => {
    const amount = parseFloat(record.amount.toString());
    if (record.type === "income") {
      acc.totalIncome += amount;
    } else if (record.type === "expense") {
      acc.totalExpense += amount;
    } else if (record.type === "asset") {
      acc.totalAssets += amount;
    } else if (record.type === "liability") {
      acc.totalLiabilities += amount;
    }
    return acc;
  }, {
    totalIncome: 0,
    totalExpense: 0,
    totalAssets: 0,
    totalLiabilities: 0,
  });

  const netProfit = financialSummary.totalIncome - financialSummary.totalExpense;

  const handleSubmit = (data: any) => {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (record: FinancialRecord) => {
    setEditingRecord(record);
    form.reset({
      type: record.type,
      category: record.category,
      amount: record.amount.toString(),
      description: record.description,
      reference: record.reference || "",
    });
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus catatan keuangan ini?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNew = () => {
    setEditingRecord(null);
    form.reset();
    setShowDialog(true);
  };

  const filteredRecords = (records as FinancialRecord[])
    .filter((record) => {
      const matchesType = typeFilter === "all" || record.type === typeFilter;
      const matchesCategory = categoryFilter === "all" || record.category === categoryFilter;
      return matchesType && matchesCategory;
    });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Manajemen Keuangan" 
          breadcrumb="Home / Financial"
          action={
            <Button onClick={handleNew} data-testid="button-add-financial">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Catatan
            </Button>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Ringkasan</TabsTrigger>
              <TabsTrigger value="transactions">Transaksi</TabsTrigger>
              <TabsTrigger value="reports">Laporan</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Pemasukan</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600" data-testid="total-income">
                      Rp {financialSummary.totalIncome.toLocaleString("id-ID")}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600" data-testid="total-expense">
                      Rp {financialSummary.totalExpense.toLocaleString("id-ID")}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
                    <DollarSign className={`h-4 w-4 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="net-profit">
                      Rp {netProfit.toLocaleString("id-ID")}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Aset</CardTitle>
                    <PiggyBank className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600" data-testid="total-assets">
                      Rp {financialSummary.totalAssets.toLocaleString("id-ID")}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaksi Keuangan Terbaru</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(records as FinancialRecord[]).slice(0, 5).map((record: FinancialRecord) => {
                      const typeConfig = recordTypes[record.type as keyof typeof recordTypes];
                      const TypeIcon = typeConfig.icon;
                      
                      return (
                        <div key={record.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full bg-background flex items-center justify-center`}>
                              <TypeIcon className={`w-4 h-4 ${typeConfig.color}`} />
                            </div>
                            <div>
                              <p className="font-medium" data-testid={`recent-description-${record.id}`}>
                                {record.description}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {record.category} • {new Date(record.createdAt!).toLocaleDateString("id-ID")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${record.type === 'income' ? 'text-green-600' : 'text-red-600'}`} data-testid={`recent-amount-${record.id}`}>
                              {record.type === 'expense' ? '- ' : '+ '}
                              Rp {parseFloat(record.amount.toString()).toLocaleString("id-ID")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {typeConfig.label}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions">
              {/* Filters */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Tipe</SelectItem>
                        <SelectItem value="income">Pemasukan</SelectItem>
                        <SelectItem value="expense">Pengeluaran</SelectItem>
                        <SelectItem value="asset">Aset</SelectItem>
                        <SelectItem value="liability">Kewajiban</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kategori</SelectItem>
                        {[...incomeCategories, ...expenseCategories].map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Records Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Catatan Keuangan ({filteredRecords.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                  ) : filteredRecords.length === 0 ? (
                    <div className="text-center py-8">
                      <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {typeFilter !== "all" || categoryFilter !== "all" ? "Tidak ada catatan yang cocok dengan filter" : "Belum ada catatan keuangan"}
                      </p>
                      <Button className="mt-4" onClick={handleNew}>
                        Tambah Catatan Pertama
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Tipe</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Deskripsi</TableHead>
                          <TableHead>Jumlah</TableHead>
                          <TableHead>Referensi</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record: FinancialRecord) => {
                          const typeConfig = recordTypes[record.type as keyof typeof recordTypes];
                          const TypeIcon = typeConfig.icon;
                          
                          return (
                            <TableRow key={record.id}>
                              <TableCell>
                                <div className="flex items-center text-sm">
                                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                                  <span data-testid={`record-date-${record.id}`}>
                                    {record.createdAt ? new Date(record.createdAt).toLocaleDateString('id-ID') : '-'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <TypeIcon className={`w-4 h-4 ${typeConfig.color}`} />
                                  <span className="text-sm" data-testid={`record-type-${record.id}`}>
                                    {typeConfig.label}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm" data-testid={`record-category-${record.id}`}>
                                  {record.category}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm truncate max-w-xs" data-testid={`record-description-${record.id}`}>
                                  {record.description}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className={`font-medium ${record.type === 'income' ? 'text-green-600' : record.type === 'expense' ? 'text-red-600' : typeConfig.color}`} data-testid={`record-amount-${record.id}`}>
                                  Rp {parseFloat(record.amount.toString()).toLocaleString("id-ID")}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground" data-testid={`record-reference-${record.id}`}>
                                  {record.reference || "-"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(record)}
                                    data-testid={`button-edit-record-${record.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(record.id)}
                                    data-testid={`button-delete-record-${record.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>Laporan Keuangan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Income vs Expense */}
                    <div className="space-y-4">
                      <h3 className="font-medium">Pemasukan vs Pengeluaran</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span>Total Pemasukan:</span>
                          <span className="font-medium text-green-600">
                            Rp {financialSummary.totalIncome.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Total Pengeluaran:</span>
                          <span className="font-medium text-red-600">
                            Rp {financialSummary.totalExpense.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Laba Bersih:</span>
                            <span className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Rp {netProfit.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Balance Sheet */}
                    <div className="space-y-4">
                      <h3 className="font-medium">Neraca</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span>Total Aset:</span>
                          <span className="font-medium text-blue-600">
                            Rp {financialSummary.totalAssets.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Total Kewajiban:</span>
                          <span className="font-medium text-orange-600">
                            Rp {financialSummary.totalLiabilities.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Ekuitas:</span>
                            <span className="font-bold">
                              Rp {(financialSummary.totalAssets - financialSummary.totalLiabilities).toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Financial Record Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? "Edit Catatan Keuangan" : "Tambah Catatan Keuangan"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipe Transaksi *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="income">Pemasukan</SelectItem>
                          <SelectItem value="expense">Pengeluaran</SelectItem>
                          <SelectItem value="asset">Aset</SelectItem>
                          <SelectItem value="liability">Kewajiban</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field} 
                        data-testid="input-amount" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Deskripsi transaksi..." 
                        {...field} 
                        data-testid="textarea-description" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referensi</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="No. invoice, receipt, dll" 
                        {...field} 
                        data-testid="input-reference" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowDialog(false)}
                  data-testid="button-cancel-financial"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-financial"
                >
                  {editingRecord ? "Perbarui" : "Simpan"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}