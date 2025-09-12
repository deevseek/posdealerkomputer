import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Search, Calendar, Clock, Wrench, ShoppingCart, Filter, CheckCircle, AlertCircle, Package, ArrowRight } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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

interface WarrantyClaim {
  id: string;
  claimNumber: string;
  claimType: 'service' | 'sales_return';
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  customerId: string;
  customerName?: string;
  claimReason: string;
  claimDate: string;
  processedDate?: string;
  processedBy?: string;
  returnCondition?: 'normal_stock' | 'damaged_stock';
  notes?: string;
  originalTransactionId?: string;
  originalServiceTicketId?: string;
  deviceInfo?: string;
  productName?: string;
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
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyItem | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null);
  const [activeTab, setActiveTab] = useState("warranties");
  
  const { toast } = useToast();

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

  // Fetch warranty claims
  const { data: warrantyClaims = [] } = useQuery<WarrantyClaim[]>({
    queryKey: ["/api/warranty-claims"],
  });

  // Enhance warranty claims with customer data
  const enhancedClaims: WarrantyClaim[] = warrantyClaims.map((claim: any) => {
    const customer = customers.find((c: any) => c.id === claim.customerId);
    let deviceInfo = "";
    let productName = "";

    if (claim.originalServiceTicketId) {
      const ticket = serviceTickets.find((t: any) => t.id === claim.originalServiceTicketId);
      if (ticket) {
        deviceInfo = `${ticket.deviceType}${ticket.deviceBrand ? ` - ${ticket.deviceBrand}` : ''}${ticket.deviceModel ? ` ${ticket.deviceModel}` : ''}`;
      }
    }

    if (claim.originalTransactionId) {
      const transaction = transactions.find((t: any) => t.id === claim.originalTransactionId);
      if (transaction) {
        productName = transaction.items?.map((item: any) => item.product?.name || 'Unknown Product').join(', ') || 'Unknown Product';
      }
    }

    return {
      ...claim,
      customerName: customer?.name || 'Unknown Customer',
      deviceInfo,
      productName,
    };
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
        const isExpiringSoon = item.daysRemaining && item.daysRemaining <= 30;
        
        if (isUrgent) {
          return (
            <Badge variant="destructive" className="flex items-center space-x-1">
              <span>🚨</span>
              <span>Segera Berakhir ({item.daysRemaining} hari)</span>
            </Badge>
          );
        } else if (isExpiringSoon) {
          return (
            <Badge variant="outline" className="flex items-center space-x-1 text-orange-600 border-orange-200">
              <span>⏰</span>
              <span>Perhatian ({item.daysRemaining} hari)</span>
            </Badge>
          );
        } else {
          return (
            <Badge variant="default" className="flex items-center space-x-1 bg-green-100 text-green-800">
              <span>✅</span>
              <span>Aktif ({item.daysRemaining} hari)</span>
            </Badge>
          );
        }
      case 'expired':
        return (
          <Badge variant="secondary" className="flex items-center space-x-1 bg-red-100 text-red-800">
            <span>❌</span>
            <span>Berakhir</span>
          </Badge>
        );
      case 'unlimited':
        return (
          <Badge variant="outline" className="flex items-center space-x-1 bg-blue-100 text-blue-800">
            <span>♾️</span>
            <span>Tanpa Batas</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <span>❓</span>
            <span>Tidak Diketahui</span>
          </Badge>
        );
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="warranties" data-testid="tab-warranties">Daftar Garansi</TabsTrigger>
              <TabsTrigger value="claims" data-testid="tab-claims">Klaim Garansi</TabsTrigger>
            </TabsList>

            <TabsContent value="warranties" className="space-y-6">
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
            </TabsContent>

            <TabsContent value="claims" className="space-y-6">
              {/* Warranty Claims Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Klaim Pending</CardTitle>
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{enhancedClaims.filter(c => c.status === 'pending').length}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Klaim Disetujui</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{enhancedClaims.filter(c => c.status === 'approved').length}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Klaim Selesai</CardTitle>
                    <Package className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{enhancedClaims.filter(c => c.status === 'processed').length}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Warranty Claims Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Daftar Klaim Garansi</CardTitle>
                  <Button 
                    onClick={() => setClaimDialogOpen(true)}
                    data-testid="button-create-claim"
                  >
                    Buat Klaim Garansi
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>No. Klaim</TableHead>
                          <TableHead>Tipe</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Produk/Device</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enhancedClaims.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              Belum ada klaim garansi
                            </TableCell>
                          </TableRow>
                        ) : (
                          enhancedClaims.map((claim) => (
                            <TableRow key={claim.id}>
                              <TableCell>
                                <code className="text-sm bg-muted px-1 py-0.5 rounded">
                                  {claim.claimNumber}
                                </code>
                              </TableCell>
                              
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {claim.claimType === 'service' ? (
                                    <Wrench className="h-4 w-4 text-blue-600" />
                                  ) : (
                                    <ShoppingCart className="h-4 w-4 text-green-600" />
                                  )}
                                  <span className="capitalize">
                                    {claim.claimType === 'service' ? 'Service' : 'Retur Penjualan'}
                                  </span>
                                </div>
                              </TableCell>
                              
                              <TableCell>
                                <div className="font-medium">{claim.customerName}</div>
                              </TableCell>
                              
                              <TableCell>
                                <div className="max-w-xs truncate">
                                  {claim.productName || claim.deviceInfo}
                                </div>
                              </TableCell>
                              
                              <TableCell>
                                <Badge variant={
                                  claim.status === 'pending' ? 'secondary' :
                                  claim.status === 'approved' ? 'default' :
                                  claim.status === 'processed' ? 'outline' :
                                  'destructive'
                                }>
                                  {claim.status === 'pending' ? 'Pending' :
                                   claim.status === 'approved' ? 'Disetujui' :
                                   claim.status === 'processed' ? 'Selesai' :
                                   'Ditolak'}
                                </Badge>
                              </TableCell>
                              
                              <TableCell>
                                {formatDateShort(claim.claimDate)}
                              </TableCell>
                              
                              <TableCell>
                                <div className="flex gap-2">
                                  {claim.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedClaim(claim);
                                        setProcessDialogOpen(true);
                                      }}
                                      data-testid={`button-process-${claim.id}`}
                                    >
                                      Proses
                                    </Button>
                                  )}
                                  {claim.status === 'approved' && (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedClaim(claim);
                                        setAcceptDialogOpen(true);
                                      }}
                                      data-testid={`button-accept-${claim.id}`}
                                    >
                                      Terima Garansi
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Create Warranty Claim Dialog */}
          <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Buat Klaim Garansi</DialogTitle>
              </DialogHeader>
              <CreateClaimForm 
                onSuccess={() => {
                  setClaimDialogOpen(false);
                }}
                warrantyItems={sortedWarranties}
              />
            </DialogContent>
          </Dialog>

          {/* Process Warranty Claim Dialog */}
          <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Proses Klaim Garansi</DialogTitle>
              </DialogHeader>
              {selectedClaim && (
                <ProcessClaimForm 
                  claim={selectedClaim}
                  onSuccess={() => {
                    setProcessDialogOpen(false);
                    setSelectedClaim(null);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Accept Warranty Dialog */}
          <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Terima Garansi</DialogTitle>
              </DialogHeader>
              {selectedClaim && (
                <AcceptWarrantyForm 
                  claim={selectedClaim}
                  onSuccess={() => {
                    setAcceptDialogOpen(false);
                    setSelectedClaim(null);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}

// Form schemas - aligned with shared/schema.ts
const createClaimSchema = z.object({
  warrantyItemId: z.string().min(1, "Pilih item garansi"),
  claimType: z.enum(['service', 'sales_return']),
  claimReason: z.string().min(1, "Deskripsi diperlukan"),
  notes: z.string().optional(),
});

const processClaimSchema = z.object({
  action: z.enum(['approve', 'reject']),
  adminNotes: z.string().optional(),
});

// Dynamic schema validation for accept warranty - returnCondition required for sales_return
const createAcceptWarrantySchema = (claimType: string) => z.object({
  returnCondition: claimType === 'sales_return' 
    ? z.enum(['normal_stock', 'damaged_stock'], { 
        required_error: "Pilih kondisi barang untuk sales return" 
      })
    : z.enum(['normal_stock', 'damaged_stock']).optional(),
  notes: z.string().optional(),
});

// Helper function for status badges
function getStatusBadge(status: string) {
  const statusConfig = {
    'active': { color: 'bg-green-500', label: 'Aktif' },
    'expired': { color: 'bg-red-500', label: 'Berakhir' },
    'claimed': { color: 'bg-blue-500', label: 'Diklaim' },
    'completed': { color: 'bg-gray-500', label: 'Selesai' }
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.expired;
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${config.color}`}>
      {config.label}
    </span>
  );
}

// Form Components
function CreateClaimForm({ onSuccess, warrantyItems }: { onSuccess: () => void; warrantyItems: WarrantyItem[] }) {
  const { toast } = useToast();
  const [noteNumber, setNoteNumber] = useState("");
  const [searchResults, setSearchResults] = useState<WarrantyItem[]>([]);

  const form = useForm({
    resolver: zodResolver(createClaimSchema),
    defaultValues: {
      warrantyItemId: "",
      claimType: "service" as const,
      claimReason: "",
      notes: "",
    },
  });

  // Search function for warranty items
  useEffect(() => {
    if (noteNumber.trim().length >= 3) {
      const activeWarranties = warrantyItems.filter(item => item.status === 'active');
      const filtered = activeWarranties.filter(item => 
        (item.ticketNumber && item.ticketNumber.toLowerCase().includes(noteNumber.toLowerCase())) ||
        (item.transactionNumber && item.transactionNumber.toLowerCase().includes(noteNumber.toLowerCase()))
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [noteNumber, warrantyItems]);

  const createClaimMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createClaimSchema>) => {
      return apiRequest("POST", "/api/warranty-claims", data);
    },
    onSuccess: () => {
      toast({ title: "Klaim garansi berhasil dibuat" });
      queryClient.invalidateQueries({ queryKey: ["/api/warranty-claims"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Gagal membuat klaim",
        variant: "destructive" 
      });
    },
  });

  const activeWarranties = warrantyItems.filter(item => item.status === 'active');

  return (
    <form onSubmit={form.handleSubmit((data) => createClaimMutation.mutate(data))} className="space-y-4">
      <div className="space-y-4">
        <div>
          <Label htmlFor="warrantyItemId">Nomor Nota/Tiket</Label>
          <div className="text-sm text-muted-foreground mb-2">
            🔍 Masukan nomor nota service atau nomor garansi untuk mencari item yang akan diklaim
          </div>
          <div className="space-y-3">
            <Input
              placeholder="Masukan nomor nota/tiket (contoh: TKT-001, TXN-001)"
              value={noteNumber}
              onChange={(e) => setNoteNumber(e.target.value)}
              data-testid="input-note-number"
              className="text-base"
            />
            
            {noteNumber && searchResults.length > 0 && (
              <div className="border rounded-lg p-3 bg-gray-50">
                <p className="text-sm font-medium mb-2">📋 Item ditemukan:</p>
                <div className="space-y-2">
                  {searchResults.map((item) => (
                    <div 
                      key={item.id}
                      className={`p-3 border rounded cursor-pointer transition-colors ${
                        form.watch("warrantyItemId") === item.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => form.setValue("warrantyItemId", item.id)}
                      data-testid={`search-result-${item.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {item.customerName} - {item.productName || item.deviceInfo}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            📄 {item.ticketNumber || item.transactionNumber}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            📅 Berakhir: {item.warrantyEndDate ? 
                              new Date(item.warrantyEndDate).toLocaleDateString('id-ID') : 'Tidak diketahui'
                            }
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {noteNumber && searchResults.length === 0 && (
              <div className="border rounded-lg p-3 bg-yellow-50 text-center">
                <div className="text-yellow-600">⚠️ Tidak ditemukan item garansi</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Pastikan nomor nota/tiket benar dan masih dalam masa garansi
                </div>
              </div>
            )}
          </div>
          {form.formState.errors.warrantyItemId && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.warrantyItemId.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="claimType">Tipe Klaim</Label>
          <Select 
            value={form.watch("claimType")} 
            onValueChange={(value: 'service' | 'sales_return') => form.setValue("claimType", value)}
          >
            <SelectTrigger data-testid="select-claim-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="service">Service Warranty</SelectItem>
              <SelectItem value="sales_return">Sales Return</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="claimReason">Deskripsi Masalah</Label>
          <Textarea
            {...form.register("claimReason")}
            placeholder="Jelaskan masalah yang dialami..."
            rows={3}
            data-testid="textarea-claim-reason"
          />
          {form.formState.errors.claimReason && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.claimReason.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="notes">Catatan (Opsional)</Label>
          <Textarea
            {...form.register("notes")}
            placeholder="Catatan tambahan..."
            rows={2}
            data-testid="textarea-notes"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button 
          type="submit" 
          disabled={createClaimMutation.isPending}
          data-testid="button-submit-claim"
        >
          {createClaimMutation.isPending ? "Membuat..." : "Buat Klaim"}
        </Button>
      </div>
    </form>
  );
}

function ProcessClaimForm({ claim, onSuccess }: { claim: WarrantyClaim; onSuccess: () => void }) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(processClaimSchema),
    defaultValues: {
      action: "approve" as const,
      adminNotes: "",
    },
  });

  const processClaimMutation = useMutation({
    mutationFn: async (data: z.infer<typeof processClaimSchema>) => {
      return apiRequest("PUT", `/api/warranty-claims/${claim.id}/process`, data);
    },
    onSuccess: () => {
      toast({ title: "Klaim berhasil diproses" });
      queryClient.invalidateQueries({ queryKey: ["/api/warranty-claims"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Gagal memproses klaim",
        variant: "destructive" 
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="font-medium">Detail Klaim:</h4>
        <p className="text-sm"><strong>No:</strong> {claim.claimNumber}</p>
        <p className="text-sm"><strong>Customer:</strong> {claim.customerName}</p>
        <p className="text-sm"><strong>Tipe:</strong> {claim.claimType === 'service' ? 'Service' : 'Retur Penjualan'}</p>
        <p className="text-sm"><strong>Deskripsi:</strong> {claim.description}</p>
      </div>

      <form onSubmit={form.handleSubmit((data) => processClaimMutation.mutate(data))} className="space-y-4">
        <div>
          <Label>Keputusan</Label>
          <Select 
            value={form.watch("action")} 
            onValueChange={(value: 'approve' | 'reject') => form.setValue("action", value)}
          >
            <SelectTrigger data-testid="select-process-action">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="approve">Setujui</SelectItem>
              <SelectItem value="reject">Tolak</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="adminNotes">Catatan Admin (Opsional)</Label>
          <Textarea
            {...form.register("adminNotes")}
            placeholder="Catatan untuk keputusan ini..."
            rows={2}
            data-testid="textarea-admin-notes"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            type="submit" 
            disabled={processClaimMutation.isPending}
            data-testid="button-submit-process"
          >
            {processClaimMutation.isPending ? "Memproses..." : "Simpan Keputusan"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function AcceptWarrantyForm({ claim, onSuccess }: { claim: WarrantyClaim; onSuccess: () => void }) {
  const { toast } = useToast();
  const acceptWarrantySchema = createAcceptWarrantySchema(claim.claimType);
  
  const form = useForm({
    resolver: zodResolver(acceptWarrantySchema),
    defaultValues: {
      returnCondition: claim.claimType === 'sales_return' ? 'normal_stock' as const : undefined,
      notes: "",
    },
  });

  const acceptWarrantyMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/warranty-claims/${claim.id}/complete`, data);
    },
    onSuccess: () => {
      toast({ title: "Garansi berhasil diterima" });
      queryClient.invalidateQueries({ queryKey: ["/api/warranty-claims"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Gagal menerima garansi",
        variant: "destructive" 
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="font-medium">Terima Garansi:</h4>
        <p className="text-sm"><strong>No:</strong> {claim.claimNumber}</p>
        <p className="text-sm"><strong>Customer:</strong> {claim.customerName}</p>
        <p className="text-sm"><strong>Tipe:</strong> {claim.claimType === 'service' ? 'Service' : 'Retur Penjualan'}</p>
        
        {claim.claimType === 'service' && (
          <div className="bg-blue-50 p-3 rounded text-sm">
            <strong>Service Warranty:</strong> Item akan dikembalikan ke proses service tanpa update stok atau keuangan.
          </div>
        )}
        
        {claim.claimType === 'sale' && (
          <div className="bg-green-50 p-3 rounded text-sm">
            <strong>Sales Return:</strong> Pilih kondisi barang untuk update stok dan keuangan yang sesuai.
          </div>
        )}
      </div>

      <form onSubmit={form.handleSubmit((data) => acceptWarrantyMutation.mutate(data))} className="space-y-4">
        {claim.claimType === 'sales_return' && (
          <div>
            <Label>Kondisi Barang</Label>
            <Select 
              value={form.watch("returnCondition") || ''} 
              onValueChange={(value: 'normal_stock' | 'damaged_stock') => form.setValue("returnCondition", value)}
            >
              <SelectTrigger data-testid="select-return-condition">
                <SelectValue placeholder="Pilih kondisi barang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal_stock">Normal (Asset)</SelectItem>
                <SelectItem value="damaged_stock">Rusak (Penyesuaian)</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.returnCondition && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.returnCondition.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Normal: Stok bertambah sebagai aset. Rusak: Stok bertambah dengan penyesuaian keuangan.
            </p>
          </div>
        )}

        <div>
          <Label htmlFor="notes">Catatan (Opsional)</Label>
          <Textarea
            {...form.register("notes")}
            placeholder="Catatan penerimaan garansi..."
            rows={2}
            data-testid="textarea-accept-notes"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            type="submit" 
            disabled={acceptWarrantyMutation.isPending}
            data-testid="button-submit-accept"
          >
            {acceptWarrantyMutation.isPending ? "Memproses..." : "Terima Garansi"}
          </Button>
        </div>
      </form>
    </div>
  );
}