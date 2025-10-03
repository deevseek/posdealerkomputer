import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Package, Filter, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

const OUTBOUND_MOVEMENT_TYPES = ['out', 'warranty_exchange'] as const;
const INBOUND_MOVEMENT_TYPES = ['in', 'warranty_return'] as const;

const isOutboundMovement = (type: string | null | undefined) =>
  type ? OUTBOUND_MOVEMENT_TYPES.includes(type as (typeof OUTBOUND_MOVEMENT_TYPES)[number]) : false;

const isInboundMovement = (type: string | null | undefined) =>
  type ? INBOUND_MOVEMENT_TYPES.includes(type as (typeof INBOUND_MOVEMENT_TYPES)[number]) : false;

export default function StockMovements() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [productFilter, setProductFilter] = useState("");
  const [referenceTypeFilter, setReferenceTypeFilter] = useState("");

  // Fetch stock movements with filters
  interface StockMovement {
    id: string;
    productId: string;
    productName?: string | null;
    movementType: string;
    quantity: number;
    referenceType?: string | null;
    reference?: string | null;
    notes?: string | null;
    createdAt: string;
    userName?: string | null;
  }

  interface StockMovementResponse {
    movements?: StockMovement[];
  }

  const {
    data: stockData,
    isLoading,
    refetch,
    error: stockError,
  } = useQuery<StockMovementResponse>({
    queryKey: ['/api/reports/stock-movements', startDate, endDate, productFilter, referenceTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (productFilter && productFilter !== 'all') params.append('productId', productFilter);
      if (referenceTypeFilter && referenceTypeFilter !== 'all') params.append('referenceType', referenceTypeFilter);

      const queryString = params.toString();
      const url = queryString ? `/api/reports/stock-movements?${queryString}` : '/api/reports/stock-movements';
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch stock movements');
      }
      return response.json();
    },
    retry: false,
  });

  const movements: StockMovement[] = stockData?.movements ?? [];

  const { totalMovements, summaryByReferenceType } = useMemo(() => {
    const totals: Record<string, { totalIn: number; totalOut: number; count: number }> = {};

    for (const movement of movements) {
      const referenceType = movement.referenceType || 'unknown';
      const quantity = Number(movement.quantity) || 0;
      if (!totals[referenceType]) {
        totals[referenceType] = { totalIn: 0, totalOut: 0, count: 0 };
      }

      if (isInboundMovement(movement.movementType)) {
        totals[referenceType].totalIn += quantity;
      } else if (isOutboundMovement(movement.movementType)) {
        totals[referenceType].totalOut += quantity;
      }

      totals[referenceType].count += 1;
    }

    return {
      totalMovements: movements.length,
      summaryByReferenceType: totals,
    };
  }, [movements]);

  // Fetch products for filter
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReferenceTypeBadge = (type: string) => {
    const variants = {
      service: "destructive",
      sale: "default",
      purchase: "secondary", 
      adjustment: "outline",
      return: "secondary"
    } as const;
    
    const labels = {
      service: "Servis",
      sale: "Penjualan", 
      purchase: "Pembelian",
      adjustment: "Penyesuaian",
      return: "Retur"
    };
    
    return (
      <Badge variant={variants[type as keyof typeof variants] || "outline"}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  const getMovementIcon = (type: string) => {
    return isOutboundMovement(type) ? (
      <ArrowDown className="h-4 w-4 text-red-500" />
    ) : (
      <ArrowUp className="h-4 w-4 text-green-500" />
    );
  };

  const getMovementLabel = (type: string) => (isOutboundMovement(type) ? 'Keluar' : 'Masuk');

  const handleFilter = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="page-title">Laporan Pergerakan Stok</h1>
            <p className="text-gray-600">Pantau semua pergerakan stok produk</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Pergerakan Stok" breadcrumb="Beranda / Pergerakan Stok" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" data-testid="page-title">Laporan Pergerakan Stok</h1>
                <p className="text-gray-600">Pantau semua pergerakan stok produk</p>
              </div>
            </div>

            {stockError ? (
              <Card className="border-destructive/50 bg-destructive/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-destructive">Gagal Memuat Data</CardTitle>
                  <CardDescription className="text-destructive/80">
                    {stockError instanceof Error ? stockError.message : 'Terjadi kesalahan saat memuat pergerakan stok.'}
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : null}

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Pergerakan</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-movements">
                      {totalMovements}
                    </div>
                  </CardContent>
                </Card>

                {Object.entries(summaryByReferenceType).map(([refType, data]) => (
                  <Card key={refType}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {refType === 'service' ? 'Untuk Servis' :
                         refType === 'sale' ? 'Untuk Penjualan' :
                         refType === 'purchase' ? 'Dari Pembelian' :
                         refType === 'adjustment' ? 'Penyesuaian' :
                         refType === 'return' ? 'Retur' :
                         refType === 'unknown' ? 'Lainnya' :
                         refType}
                      </CardTitle>
                      {refType === 'service' ?
                        <ArrowDown className="h-4 w-4 text-red-500" /> :
                        <ArrowUp className="h-4 w-4 text-green-500" />
                      }
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {data.totalOut || data.totalIn || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {data.count} transaksi
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filter Laporan
                  </CardTitle>
                  <CardDescription>
                    Filter data berdasarkan periode, produk, atau jenis transaksi
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div>
                      <Label htmlFor="start-date">Tanggal Mulai</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        data-testid="input-start-date"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">Tanggal Akhir</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        data-testid="input-end-date"
                      />
                    </div>
                    <div>
                      <Label htmlFor="product-filter">Produk</Label>
                      <Select value={productFilter} onValueChange={setProductFilter}>
                        <SelectTrigger data-testid="select-product-filter">
                          <SelectValue placeholder="Semua produk" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua produk</SelectItem>
                          {(products as any[])?.map((product: any) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="reference-filter">Jenis Transaksi</Label>
                      <Select value={referenceTypeFilter} onValueChange={setReferenceTypeFilter}>
                        <SelectTrigger data-testid="select-reference-filter">
                          <SelectValue placeholder="Semua jenis" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua jenis</SelectItem>
                          <SelectItem value="service">Servis</SelectItem>
                          <SelectItem value="sale">Penjualan</SelectItem>
                          <SelectItem value="purchase">Pembelian</SelectItem>
                          <SelectItem value="adjustment">Penyesuaian</SelectItem>
                          <SelectItem value="return">Retur</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Button onClick={handleFilter} className="w-full" data-testid="button-filter">
                        <Search className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stock Movements Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Riwayat Pergerakan Stok</CardTitle>
                  <CardDescription>
                    Daftar lengkap semua pergerakan stok produk
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Produk</TableHead>
                          <TableHead>Jenis</TableHead>
                          <TableHead>Tipe</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Referensi</TableHead>
                          <TableHead>Catatan</TableHead>
                          <TableHead>User</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.length ? (
                          movements.map((movement) => (
                            <TableRow key={movement.id} data-testid={`row-movement-${movement.id}`}>
                              <TableCell className="font-mono text-sm">
                                {formatDate(movement.createdAt)}
                              </TableCell>
                              <TableCell className="font-medium">
                                {movement.productName || 'Produk tidak ditemukan'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getMovementIcon(movement.movementType)}
                                  <span className="capitalize">{getMovementLabel(movement.movementType)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {getReferenceTypeBadge(movement.referenceType || '')}
                              </TableCell>
                              <TableCell className="font-bold">
                                <span className={isOutboundMovement(movement.movementType) ? 'text-red-600' : 'text-green-600'}>
                                  {isOutboundMovement(movement.movementType) ? '-' : '+'}{movement.quantity}
                                </span>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {movement.reference || '-'}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {movement.notes || '-'}
                              </TableCell>
                              <TableCell>
                                {movement.userName || 'Unknown'}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">
                              Tidak ada data pergerakan stok.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
          </div>
        </main>
      </div>
    </div>
  );
}