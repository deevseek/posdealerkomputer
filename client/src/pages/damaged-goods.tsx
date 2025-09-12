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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Eye,
  Edit,
  Trash2,
  Shield
} from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

interface DamagedClaim {
  id: string;
  claimNumber: string;
  customerName: string;
  customerPhone?: string;
  productName: string;
  productCode: string;
  claimDate: string;
  refundStatus: 'approved' | 'pending' | 'rejected';
  damageType: string;
  damageDescription: string;
  purchaseDate?: string;
  warrantyPeriod?: string;
}

export default function DamagedGoodsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [selectedClaim, setSelectedClaim] = useState<DamagedClaim | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch warranty claims filtered for damaged goods with refund status
  const { data: damagedClaims = [], isLoading } = useQuery<DamagedClaim[]>({
    queryKey: ["/api/warranty-claims/damaged"],
    queryFn: async () => {
      const response = await fetch("/api/warranty-claims/damaged", { 
        credentials: "include" 
      });
      if (!response.ok) throw new Error("Failed to fetch damaged goods claims");
      return response.json();
    },
  });

  // Filter claims based on search and filters
  const filteredClaims = damagedClaims.filter((claim) => {
    const matchesSearch = 
      claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || claim.refundStatus === statusFilter;
    
    // TODO: Implement date filtering based on dateFilter
    const matchesDate = true;
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate statistics
  const totalCount = damagedClaims.length;
  const approvedCount = damagedClaims.filter(c => c.refundStatus === 'approved').length;
  const pendingCount = damagedClaims.filter(c => c.refundStatus === 'pending').length;
  const rejectedCount = damagedClaims.filter(c => c.refundStatus === 'rejected').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Disetujui
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            <Clock className="w-3 h-3 mr-1" />
            Menunggu Review
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Ditolak
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleViewDetails = (claim: DamagedClaim) => {
    setSelectedClaim(claim);
    setDetailsOpen(true);
  };

  const handleReset = () => {
    setSearchTerm("");
    setStatusFilter("");
    setDateFilter("");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            title="Barang Rusak" 
            subtitle="Kelola klaim garansi untuk barang rusak yang dikembalikan"
            showExport
          />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Memuat data...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Barang Rusak" 
          subtitle="Kelola klaim garansi untuk barang rusak yang dikembalikan"
          showExport
        />
        
        <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Barang Rusak</CardTitle>
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="text-destructive h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive" data-testid="total-damaged-count">
                  {totalCount}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Total klaim kerusakan</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Refund Disetujui</CardTitle>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="text-emerald-600 h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600" data-testid="approved-count">
                  {approvedCount}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {totalCount > 0 ? `${((approvedCount / totalCount) * 100).toFixed(1)}% dari total` : '0% dari total'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Menunggu Review</CardTitle>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock className="text-amber-600 h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600" data-testid="pending-count">
                  {pendingCount}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {totalCount > 0 ? `${((pendingCount / totalCount) * 100).toFixed(1)}% dari total` : '0% dari total'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Refund Ditolak</CardTitle>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="text-red-600 h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600" data-testid="rejected-count">
                  {rejectedCount}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {totalCount > 0 ? `${((rejectedCount / totalCount) * 100).toFixed(1)}% dari total` : '0% dari total'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filter and Search */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Cari nomor klaim, customer, atau produk..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full sm:w-80"
                      data-testid="input-search-damaged"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                      <SelectValue placeholder="Semua Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Semua Status</SelectItem>
                      <SelectItem value="approved">Refund Disetujui</SelectItem>
                      <SelectItem value="pending">Menunggu Review</SelectItem>
                      <SelectItem value="rejected">Refund Ditolak</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-full sm:w-48" data-testid="select-date-filter">
                      <SelectValue placeholder="Semua Periode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Semua Periode</SelectItem>
                      <SelectItem value="7d">7 Hari Terakhir</SelectItem>
                      <SelectItem value="30d">30 Hari Terakhir</SelectItem>
                      <SelectItem value="90d">3 Bulan Terakhir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    className="flex items-center space-x-2"
                    data-testid="button-advanced-filter"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filter Lanjutan</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleReset}
                    className="flex items-center space-x-2"
                    data-testid="button-reset-filter"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Reset</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Damaged Goods Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-sm font-semibold">No. Klaim</TableHead>
                      <TableHead className="text-sm font-semibold">Customer</TableHead>
                      <TableHead className="text-sm font-semibold">Produk</TableHead>
                      <TableHead className="text-sm font-semibold">Tanggal Klaim</TableHead>
                      <TableHead className="text-sm font-semibold">Status Refund</TableHead>
                      <TableHead className="text-sm font-semibold">Kerusakan</TableHead>
                      <TableHead className="text-sm font-semibold">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClaims.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          {searchTerm || statusFilter || dateFilter 
                            ? "Tidak ada klaim yang sesuai dengan filter" 
                            : "Belum ada klaim barang rusak"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClaims.map((claim) => (
                        <TableRow 
                          key={claim.id} 
                          className="hover:bg-muted/20 transition-colors"
                          data-testid={`row-claim-${claim.id}`}
                        >
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Shield className="text-primary h-4 w-4" />
                              <span className="font-medium text-primary">
                                {claim.claimNumber}
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div>
                              <p className="font-medium">{claim.customerName}</p>
                              {claim.customerPhone && (
                                <p className="text-sm text-muted-foreground">
                                  {claim.customerPhone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div>
                              <p className="font-medium">{claim.productName}</p>
                              <p className="text-sm text-muted-foreground">
                                {claim.productCode}
                              </p>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <p>{claim.claimDate}</p>
                          </TableCell>
                          
                          <TableCell>
                            {getStatusBadge(claim.refundStatus)}
                          </TableCell>
                          
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm font-medium">{claim.damageType}</p>
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {claim.damageDescription}
                              </p>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewDetails(claim)}
                                data-testid={`button-view-${claim.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-amber-600 hover:text-amber-700"
                                data-testid={`button-edit-${claim.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-delete-${claim.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
        </main>
      </div>

      {/* Claim Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Klaim Barang Rusak</DialogTitle>
            <DialogDescription>
              Informasi lengkap klaim garansi
            </DialogDescription>
          </DialogHeader>
          
          {selectedClaim && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Informasi Klaim</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">No. Klaim:</span>
                      <span className="font-medium">{selectedClaim.claimNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tanggal Klaim:</span>
                      <span>{selectedClaim.claimDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge(selectedClaim.refundStatus)}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Informasi Customer</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nama:</span>
                      <span>{selectedClaim.customerName}</span>
                    </div>
                    {selectedClaim.customerPhone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Telepon:</span>
                        <span>{selectedClaim.customerPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Informasi Produk</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nama Produk:</span>
                      <span>{selectedClaim.productName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kode Produk:</span>
                      <span>{selectedClaim.productCode}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {selectedClaim.purchaseDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tanggal Beli:</span>
                        <span>{selectedClaim.purchaseDate}</span>
                      </div>
                    )}
                    {selectedClaim.warrantyPeriod && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Masa Garansi:</span>
                        <span>{selectedClaim.warrantyPeriod}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Detail Kerusakan</h4>
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="font-medium mb-2">
                    Jenis Kerusakan: <span>{selectedClaim.damageType}</span>
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {selectedClaim.damageDescription}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDetailsOpen(false)}
              data-testid="button-close-modal"
            >
              Tutup
            </Button>
            <Button data-testid="button-edit-claim-modal">
              Edit Klaim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
