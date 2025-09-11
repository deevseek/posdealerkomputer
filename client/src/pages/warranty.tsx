import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Calendar, Clock, Wrench, ShoppingCart, Filter } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { getCurrentJakartaTime, formatDateShort } from '@shared/utils/timezone';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WarrantyItem {
  id: string;
  type: 'service' | 'sale';
  customerName: string;
  customerPhone?: string;
  productName?: string;
  deviceInfo?: string;
  warrantyDuration: number;
  warrantyStartDate: string;
  warrantyEndDate?: string;
  status: 'active' | 'expired' | 'unlimited';
  daysRemaining?: number;
  ticketNumber?: string;
  transactionNumber?: string;
}

function getWarrantyStatus(endDate?: string, duration?: number): { status: 'active' | 'expired' | 'unlimited', daysRemaining?: number } {
  if (!duration || duration >= 9999) {
    return { status: 'unlimited' };
  }
  
  if (!endDate) {
    return { status: 'expired' };
  }
  
  const now = getCurrentJakartaTime();
  const end = new Date(endDate);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) {
    return { status: 'expired' };
  }
  
  return { status: 'active', daysRemaining: diffDays };
}

function formatDaysRemaining(days?: number): string {
  if (!days) return "-";
  
  if (days === 1) return "1 hari";
  if (days < 30) return `${days} hari`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    return `${months} bulan ${remainingDays} hari`;
  }
  
  const years = Math.floor(days / 365);
  const remainingDays = days % 365;
  const months = Math.floor(remainingDays / 30);
  
  return `${years} tahun ${months} bulan`;
}

export default function WarrantyPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "service" | "sale">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "expired" | "unlimited">("all");

  // Fetch service tickets with warranties
  const { data: serviceTickets = [] } = useQuery({
    queryKey: ["/api/service-tickets"],
    queryFn: async () => {
      const response = await fetch("/api/service-tickets", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch service tickets");
      return response.json();
    },
  });

  // Fetch transactions with warranties
  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions"],
    queryFn: async () => {
      const response = await fetch("/api/transactions", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
  });

  // Fetch customers for lookup
  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  // Fetch products for lookup
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Transform data into warranty items
  const warrantyItems: WarrantyItem[] = [
    // Service warranties
    ...serviceTickets
      .filter((ticket: any) => ticket.warrantyDuration && ticket.warrantyDuration > 0)
      .map((ticket: any) => {
        const customer = customers.find((c: any) => c.id === ticket.customerId);
        const warrantyStatus = getWarrantyStatus(ticket.warrantyEndDate, ticket.warrantyDuration);
        
        return {
          id: ticket.id,
          type: 'service' as const,
          customerName: customer?.name || 'Unknown Customer',
          customerPhone: customer?.phone,
          deviceInfo: `${ticket.deviceType}${ticket.deviceBrand ? ` - ${ticket.deviceBrand}` : ''}${ticket.deviceModel ? ` ${ticket.deviceModel}` : ''}`,
          warrantyDuration: ticket.warrantyDuration,
          warrantyStartDate: ticket.warrantyStartDate,
          warrantyEndDate: ticket.warrantyEndDate,
          status: warrantyStatus.status,
          daysRemaining: warrantyStatus.daysRemaining,
          ticketNumber: ticket.ticketNumber,
        };
      }),
    
    // Transaction/POS warranties
    ...transactions
      .filter((transaction: any) => transaction.warrantyDuration && transaction.warrantyDuration > 0)
      .map((transaction: any) => {
        const customer = customers.find((c: any) => c.id === transaction.customerId);
        const warrantyStatus = getWarrantyStatus(transaction.warrantyEndDate, transaction.warrantyDuration);
        
        // Get product names from transaction items
        const productNames = transaction.items?.map((item: any) => {
          return item.product?.name || 'Unknown Product';
        }).join(', ') || 'Unknown Product';
        
        return {
          id: transaction.id,
          type: 'sale' as const,
          customerName: customer?.name || 'Walk-in Customer',
          customerPhone: customer?.phone,
          productName: productNames,
          warrantyDuration: transaction.warrantyDuration,
          warrantyStartDate: transaction.warrantyStartDate,
          warrantyEndDate: transaction.warrantyEndDate,
          status: warrantyStatus.status,
          daysRemaining: warrantyStatus.daysRemaining,
          transactionNumber: transaction.transactionNumber,
        };
      }),
  ];

  // Filter warranties
  const filteredWarranties = warrantyItems.filter((item) => {
    const matchesSearch = 
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.deviceInfo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.transactionNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Sort by most recent warranties and urgent expiring ones
  const sortedWarranties = filteredWarranties.sort((a, b) => {
    // Priority: expiring soon (1-7 days) > active > expired > unlimited
    if (a.status === 'active' && b.status === 'active') {
      const aDays = a.daysRemaining || 999999;
      const bDays = b.daysRemaining || 999999;
      return aDays - bDays; // Sort by days remaining (ascending)
    }
    
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    
    // Sort by start date (most recent first)
    return new Date(b.warrantyStartDate).getTime() - new Date(a.warrantyStartDate).getTime();
  });

  const getStatusBadge = (item: WarrantyItem) => {
    switch (item.status) {
      case 'active':
        const isUrgent = item.daysRemaining && item.daysRemaining <= 7;
        return (
          <Badge variant={isUrgent ? "destructive" : "default"}>
            {isUrgent ? "Segera Berakhir" : "Aktif"}
          </Badge>
        );
      case 'expired':
        return <Badge variant="secondary">Berakhir</Badge>;
      case 'unlimited':
        return <Badge variant="outline">Tanpa Batas</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const activeCount = warrantyItems.filter(item => item.status === 'active').length;
  const expiredCount = warrantyItems.filter(item => item.status === 'expired').length;
  const unlimitedCount = warrantyItems.filter(item => item.status === 'unlimited').length;
  const urgentCount = warrantyItems.filter(item => 
    item.status === 'active' && item.daysRemaining && item.daysRemaining <= 7
  ).length;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Management Garansi" breadcrumb="Beranda / Management Garansi" />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Garansi Aktif</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCount}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Segera Berakhir</CardTitle>
                <Calendar className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{urgentCount}</div>
                <p className="text-xs text-muted-foreground">
                  ≤ 7 hari
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tanpa Batas</CardTitle>
                <Clock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{unlimitedCount}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Berakhir</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{expiredCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filter Garansi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari berdasarkan customer, produk, nomor tiket..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-warranty-search"
                  />
                </div>
                
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tipe</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="sale">Penjualan</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="expired">Berakhir</SelectItem>
                    <SelectItem value="unlimited">Tanpa Batas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Warranty Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Garansi ({sortedWarranties.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Produk/Device</TableHead>
                      <TableHead>Nomor Referensi</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mulai</TableHead>
                      <TableHead>Berakhir</TableHead>
                      <TableHead>Sisa Waktu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedWarranties.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          {searchTerm || filterType !== "all" || filterStatus !== "all" 
                            ? "Tidak ada garansi yang sesuai dengan filter"
                            : "Belum ada garansi terdaftar"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedWarranties.map((warranty) => (
                        <TableRow key={`${warranty.type}-${warranty.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {warranty.type === 'service' ? (
                                <Wrench className="h-4 w-4 text-blue-600" />
                              ) : (
                                <ShoppingCart className="h-4 w-4 text-green-600" />
                              )}
                              <span className="capitalize">
                                {warranty.type === 'service' ? 'Service' : 'Penjualan'}
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div>
                              <div className="font-medium">{warranty.customerName}</div>
                              {warranty.customerPhone && (
                                <div className="text-sm text-muted-foreground">
                                  {warranty.customerPhone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="max-w-xs truncate">
                              {warranty.productName || warranty.deviceInfo}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <code className="text-sm bg-muted px-1 py-0.5 rounded">
                              {warranty.ticketNumber || warranty.transactionNumber}
                            </code>
                          </TableCell>
                          
                          <TableCell>
                            {getStatusBadge(warranty)}
                          </TableCell>
                          
                          <TableCell>
                            {formatDateShort(warranty.warrantyStartDate)}
                          </TableCell>
                          
                          <TableCell>
                            {warranty.status === 'unlimited' 
                              ? 'Tanpa Batas' 
                              : warranty.warrantyEndDate 
                                ? formatDateShort(warranty.warrantyEndDate)
                                : '-'
                            }
                          </TableCell>
                          
                          <TableCell>
                            {warranty.status === 'unlimited' 
                              ? 'Tanpa Batas'
                              : warranty.status === 'expired'
                                ? 'Berakhir'
                                : formatDaysRemaining(warranty.daysRemaining)
                            }
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}