import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, DollarSign, TrendingUp, TrendingDown, BarChart3, Package, FileText, Download } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState("this-month");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // API queries untuk data reports
  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: [`/api/reports/sales/${startDate}/${endDate}`],
    retry: false,
  });

  const { data: serviceReport, isLoading: serviceLoading } = useQuery({
    queryKey: [`/api/reports/services/${startDate}/${endDate}`],
    retry: false,
  });

  const { data: financialReport, isLoading: financialLoading } = useQuery({
    queryKey: [`/api/reports/financial/${startDate}/${endDate}`],
    retry: false,
  });

  const { data: inventoryReport, isLoading: inventoryLoading } = useQuery({
    queryKey: ["/api/reports/inventory"],
    retry: false,
  });

  const { toast } = useToast();

  // PDF Export mutation
  const exportPdfMutation = useMutation({
    mutationFn: async () => {
      const reportData = {
        salesReport,
        serviceReport,
        financialReport,
        inventoryReport
      };

      try {
        const response = await fetch('/api/reports/export-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate,
            endDate,
            reportData
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Handle PDF download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `laporan-bisnis-${startDate}-${endDate}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return blob;
      } catch (error) {
        console.error('Export error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Export PDF Berhasil",
        description: "Laporan PDF berhasil didownload",
      });
    },
    onError: (error) => {
      console.error('Export PDF error:', error);
      toast({
        title: "Export PDF Gagal",
        description: "Terjadi kesalahan saat mengexport laporan PDF",
        variant: "destructive",
      });
    },
  });

  // XLSX Export mutation
  const exportXlsxMutation = useMutation({
    mutationFn: async () => {
      const reportData = {
        salesReport,
        serviceReport,
        financialReport,
        inventoryReport
      };

      try {
        const response = await fetch('/api/reports/export-xlsx', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate,
            endDate,
            reportData
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Handle XLSX download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `laporan-bisnis-${startDate}-${endDate}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return blob;
      } catch (error) {
        console.error('Export XLSX error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Export XLSX Berhasil",
        description: "Laporan Excel berhasil didownload",
      });
    },
    onError: (error) => {
      console.error('Export XLSX error:', error);
      toast({
        title: "Export XLSX Gagal",
        description: "Terjadi kesalahan saat mengexport laporan Excel",
        variant: "destructive",
      });
    },
  });

  const handleExportPDF = () => {
    if (!salesReport || !serviceReport || !financialReport || !inventoryReport) {
      toast({
        title: "Data Belum Siap",
        description: "Tunggu hingga semua data selesai dimuat",
        variant: "destructive",
      });
      return;
    }
    
    exportPdfMutation.mutate();
  };

  const handleExportXLSX = () => {
    if (!salesReport || !serviceReport || !financialReport || !inventoryReport) {
      toast({
        title: "Data Belum Siap",
        description: "Tunggu hingga semua data selesai dimuat",
        variant: "destructive",
      });
      return;
    }
    
    exportXlsxMutation.mutate();
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const today = new Date();
    
    switch (period) {
      case "today":
        setStartDate(today.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case "this-week":
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        setStartDate(weekStart.toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
        break;
      case "this-month":
        setStartDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
        break;
      case "last-month":
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(lastMonth.toISOString().split('T')[0]);
        setEndDate(lastMonthEnd.toISOString().split('T')[0]);
        break;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Business Reports" breadcrumb="Home / Reports" />
        <main className="flex-1 overflow-y-auto p-6">
          
          {/* Filter Controls */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Filter Periode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hari Ini</SelectItem>
                    <SelectItem value="this-week">Minggu Ini</SelectItem>
                    <SelectItem value="this-month">Bulan Ini</SelectItem>
                    <SelectItem value="last-month">Bulan Lalu</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={selectedPeriod !== "custom"}
                />
                
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={selectedPeriod !== "custom"}
                />
                
                <div className="flex gap-2">
                  <Button 
                    className="flex items-center gap-2"
                    onClick={handleExportPDF}
                    disabled={exportPdfMutation.isPending || salesLoading || serviceLoading || financialLoading || inventoryLoading}
                    data-testid="button-export-pdf"
                  >
                    <Download className="w-4 h-4" />
                    {exportPdfMutation.isPending ? "Mengexport..." : "Export PDF"}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={handleExportXLSX}
                    disabled={exportXlsxMutation.isPending || salesLoading || serviceLoading || financialLoading || inventoryLoading}
                    data-testid="button-export-xlsx"
                  >
                    <FileText className="w-4 h-4" />
                    {exportXlsxMutation.isPending ? "Mengexport..." : "Export Excel"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sales">Penjualan</TabsTrigger>
              <TabsTrigger value="services">Servis</TabsTrigger>
              <TabsTrigger value="financial">Keuangan</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Penjualan</p>
                        <p className="text-2xl font-bold">
                          {salesLoading ? "Loading..." : `Rp ${Number(salesReport?.totalSales || 0).toLocaleString('id-ID')}`}
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Omset Servis</p>
                        <p className="text-2xl font-bold">
                          {serviceLoading ? "Loading..." : `Rp ${Number(serviceReport?.totalRevenue || 0).toLocaleString('id-ID')}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {serviceReport?.totalServices || 0} servis
                        </p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Profit</p>
                        <p className="text-2xl font-bold text-green-600">
                          {financialLoading ? "Loading..." : `Rp ${Number(financialReport?.profit || 0).toLocaleString('id-ID')}`}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Nilai Aset Inventory</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {inventoryLoading ? "Loading..." : `Rp ${Number(inventoryReport?.totalAssetValue || 0).toLocaleString('id-ID')}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {inventoryReport?.totalStockQuantity || 0} stok • {inventoryReport?.lowStockCount || 0} rendah
                        </p>
                      </div>
                      <Package className="w-8 h-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Sales Tab */}
            <TabsContent value="sales" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Laporan Penjualan</CardTitle>
                </CardHeader>
                <CardContent>
                  {salesLoading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : !salesReport?.transactions || salesReport.transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Tidak ada data penjualan untuk periode ini
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>No. Transaksi</TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesReport.transactions.map((transaction: any) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{transaction.transactionNumber}</TableCell>
                            <TableCell>{new Date(transaction.createdAt).toLocaleDateString('id-ID')}</TableCell>
                            <TableCell>{transaction.customer?.name || "Walk-in"}</TableCell>
                            <TableCell>Rp {Number(transaction.total).toLocaleString('id-ID')}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">Completed</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services" className="space-y-6">
              {/* Service Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600">Total Omset</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {serviceLoading ? "Loading..." : `Rp ${Number(serviceReport?.totalRevenue || 0).toLocaleString('id-ID')}`}
                    </p>
                    <div className="text-sm text-muted-foreground mt-2">
                      <div>Labor: Rp {Number(serviceReport?.revenueBreakdown?.laborRevenue || 0).toLocaleString('id-ID')}</div>
                      <div>Parts: Rp {Number(serviceReport?.revenueBreakdown?.partsRevenue || 0).toLocaleString('id-ID')}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Total Modal Parts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {serviceLoading ? "Loading..." : `Rp ${Number(serviceReport?.totalCost || 0).toLocaleString('id-ID')}`}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-600">Laba Bersih</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {serviceLoading ? "Loading..." : `Rp ${Number(serviceReport?.totalProfit || 0).toLocaleString('id-ID')}`}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Detail Tiket Servis</CardTitle>
                </CardHeader>
                <CardContent>
                  {serviceLoading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : !serviceReport?.tickets || serviceReport.tickets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Tidak ada data servis untuk periode ini
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>No. Tiket</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Device</TableHead>
                          <TableHead>Problem</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Biaya</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {serviceReport.tickets.map((ticket: any) => (
                          <TableRow key={ticket.id}>
                            <TableCell>{ticket.ticketNumber}</TableCell>
                            <TableCell>{ticket.customer?.name}</TableCell>
                            <TableCell>{ticket.deviceType} {ticket.deviceBrand}</TableCell>
                            <TableCell>{ticket.problem}</TableCell>
                            <TableCell>
                              <Badge variant={ticket.status === 'completed' ? 'default' : 'secondary'}>
                                {ticket.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <div className="text-sm">
                                  {ticket.laborCost ? `Labor: Rp ${Number(ticket.laborCost).toLocaleString('id-ID')}` : 'Labor: -'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {ticket.partsCost ? `Parts: Rp ${Number(ticket.partsCost).toLocaleString('id-ID')}` : 'Parts: -'}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Financial Tab */}
            <TabsContent value="financial" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600">Pemasukan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {financialLoading ? "Loading..." : `Rp ${Number(financialReport?.totalIncome || 0).toLocaleString('id-ID')}`}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Pengeluaran</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {financialLoading ? "Loading..." : `Rp ${Number(financialReport?.totalExpense || 0).toLocaleString('id-ID')}`}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Catatan:</strong> Data keuangan mencakup penjualan produk, biaya modal parts service, 
                  penjualan parts service, dan ongkos kerja. Sistem otomatis mencatat 3 transaksi saat service diselesaikan.
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Detail Transaksi Keuangan</CardTitle>
                </CardHeader>
                <CardContent>
                  {financialLoading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : !financialReport?.records || financialReport.records.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Tidak ada data keuangan untuk periode ini
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financialReport.records.map((record: any) => (
                          <TableRow key={record.id}>
                            <TableCell>{new Date(record.createdAt).toLocaleDateString('id-ID')}</TableCell>
                            <TableCell>
                              <Badge variant={record.type === 'income' ? 'default' : 'destructive'}>
                                {record.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                              </Badge>
                            </TableCell>
                            <TableCell>{record.category}</TableCell>
                            <TableCell>{record.description}</TableCell>
                            <TableCell className={record.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                              {record.type === 'income' ? '+' : '-'}Rp {Number(record.amount).toLocaleString('id-ID')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
