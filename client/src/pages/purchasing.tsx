import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, ShoppingCart, Package, Truck, CheckCircle, Clock, AlertCircle, Eye, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Schema for forms
const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Supplier wajib dipilih"),
  expectedDeliveryDate: z.string().min(1, "Tanggal pengiriman wajib diisi"),
  notes: z.string().optional(),
});

const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "Produk wajib dipilih"),
  quantity: z.number().min(1, "Kuantitas minimal 1"),
  unitCost: z.string().min(1, "Harga satuan wajib diisi"),
  notes: z.string().optional(),
});

export default function PurchasingPage() {
  const [selectedTab, setSelectedTab] = useState("orders");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [isAddPOOpen, setIsAddPOOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [poItems, setPOItems] = useState<any[]>([]);
  const [receivingPOOpen, setReceivingPOOpen] = useState(false);
  const [receivingItems, setReceivingItems] = useState<any[]>([]);
  const [viewPOOpen, setViewPOOpen] = useState(false);

  const queryClient = useQueryClient();

  // Forms
  const poForm = useForm({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplierId: "",
      expectedDeliveryDate: "",
      notes: "",
    },
  });

  const itemForm = useForm({
    resolver: zodResolver(purchaseOrderItemSchema),
    defaultValues: {
      productId: "",
      quantity: 1,
      unitCost: "",
      notes: "",
    },
  });

  // Queries
  const { data: purchaseOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/purchase-orders"],
    enabled: selectedTab === "orders",
  });

  const { data: suppliers } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: selectedPOItems } = useQuery({
    queryKey: ["/api/purchase-orders", selectedPO?.id, "items"],
    enabled: !!selectedPO?.id,
  });

  // Get ALL outstanding items from ALL purchase orders for reports
  const { data: allOutstandingItemsData } = useQuery({
    queryKey: ["/api/purchase-orders/outstanding-items"],
    retry: false,
  });
  
  // Data untuk outstanding items dari SEMUA PO (untuk laporan)
  const allOutstandingItems = allOutstandingItemsData || [];
  
  // Data untuk outstanding items dari PO terpilih saja (untuk dialog detail PO)
  const selectedPOOutstandingItems = (selectedPOItems || []).filter((item: any) => (item.outstandingQuantity || 0) > 0);

  // Mutations
  const createPOMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/purchase-orders", data),
    onSuccess: () => {
      // Comprehensive invalidation for new PO
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders/outstanding-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsAddPOOpen(false);
      setPOItems([]);
      poForm.reset();
      toast({ title: "Purchase order berhasil dibuat dengan items" });
    },
    onError: (error) => {
      toast({ title: "Gagal membuat purchase order", description: error.message, variant: "destructive" });
    },
  });

  const approvePOMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/purchase-orders/${id}/approve`),
    onSuccess: () => {
      // Invalidate all related queries when approving PO
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders/outstanding-items"] });
      toast({ title: "Purchase order berhasil disetujui" });
    },
    onError: (error) => {
      toast({ title: "Gagal menyetujui purchase order", description: error.message, variant: "destructive" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/purchase-orders/${selectedPO?.id}/items`, data),
    onSuccess: () => {
      // Invalidate all related queries for better sync
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", selectedPO?.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders/outstanding-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsAddItemOpen(false);
      itemForm.reset();
      toast({ title: "Item berhasil ditambahkan" });
    },
    onError: (error) => {
      toast({ title: "Gagal menambahkan item", description: error.message, variant: "destructive" });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async (itemsToReceive: any[]) => {
      return Promise.all(
        itemsToReceive.map(item => 
          apiRequest('POST', `/api/purchase-orders/items/${item.itemId}/receive`, { receivedQuantity: item.quantity })
        )
      );
    },
    onSuccess: () => {
      // Comprehensive invalidation for receiving items
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders/outstanding-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/stock-movements"] });
      setReceivingPOOpen(false);
      setReceivingItems([]);
      toast({ title: "Items received successfully" });
    },
    onError: (error) => {
      console.error("Failed to receive items:", error);
      toast({ title: "Failed to receive items", description: error.message, variant: "destructive" });
    },
  });

  const onSubmitPO = (data: any) => {
    createPOMutation.mutate({
      ...data,
      items: poItems
    });
  };

  const addItemToPO = (item: any) => {
    setPOItems([...poItems, { ...item, id: Date.now() }]);
  };

  const removeItemFromPO = (itemId: any) => {
    setPOItems(poItems.filter(item => item.id !== itemId));
  };

  // Mutation to delete item from existing purchase order
  const deleteItemMutation = useMutation({
    mutationFn: ({ poId, itemId }: { poId: string; itemId: string }) => 
      fetch(`/api/purchase-orders/${poId}/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      }).then(res => {
        if (!res.ok) throw new Error('Failed to delete item');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      if (selectedPO) {
        queryClient.invalidateQueries({ queryKey: [`/api/purchase-orders/${selectedPO.id}/items`] });
      }
      toast({ title: "Item berhasil dihapus" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Gagal menghapus item",
        variant: "destructive" 
      });
    }
  });

  // Function to remove item from existing purchase order
  const removeItemFromExistingPO = (itemId: string) => {
    if (!selectedPO) return;
    deleteItemMutation.mutate({ poId: selectedPO.id, itemId });
  };

  // Update outstanding status for purchase order item
  const updateOutstandingStatus = async (itemId: string, status: string, reason: string) => {
    try {
      const response = await apiRequest("POST", `/api/purchase-orders/items/${itemId}/outstanding-status`, {
        status,
        reason
      });
      
      if (response.ok) {
        toast({ 
          title: "Status berhasil diupdate",
          description: `Status item berubah menjadi ${status}`,
        });
        
        // Refresh the data
        queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
        queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders', selectedPO?.id, 'items'] });
      }
    } catch (error) {
      toast({ 
        title: "Gagal update status", 
        description: "Silakan coba lagi",
        variant: "destructive" 
      });
    }
  };

  const onSubmitItem = (data: any) => {
    addItemMutation.mutate({
      ...data,
      quantity: parseInt(data.quantity) || 1,
      orderedQuantity: parseInt(data.quantity) || 1,
      unitCost: parseFloat(data.unitCost) || 0,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary" data-testid={`badge-status-draft`}>Draft</Badge>;
      case "pending":
        return <Badge variant="outline" data-testid={`badge-status-pending`}>Pending</Badge>;
      case "confirmed":
        return <Badge variant="default" data-testid={`badge-status-confirmed`}>Confirmed</Badge>;
      case "partial_received":
        return <Badge variant="default" className="bg-orange-500" data-testid={`badge-status-partial_received`}>Partial Received</Badge>;
      case "received":
        return <Badge variant="default" className="bg-green-500" data-testid={`badge-status-received`}>Received</Badge>;
      case "delivered":
        return <Badge variant="default" className="bg-green-500" data-testid={`badge-status-delivered`}>Delivered</Badge>;
      case "cancelled":
        return <Badge variant="destructive" data-testid={`badge-status-cancelled`}>Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredOrders = purchaseOrders?.filter((order: any) =>
    order.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Purchasing Management" 
          breadcrumb="Beranda / Purchasing"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6" data-testid="purchasing-page">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-muted-foreground">Kelola purchase order, supplier, dan penerimaan barang</p>
              </div>
              <div className="flex gap-2">
          <Dialog open={isAddPOOpen} onOpenChange={setIsAddPOOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-po">
                <Plus className="h-4 w-4 mr-2" />
                Buat Purchase Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Buat Purchase Order Baru</DialogTitle>
              </DialogHeader>
              <Form {...poForm}>
                <form onSubmit={poForm.handleSubmit(onSubmitPO)} className="space-y-4">
                  <FormField
                    control={poForm.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-supplier">
                              <SelectValue placeholder="Pilih supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers?.map((supplier: any) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={poForm.control}
                    name="expectedDeliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tanggal Pengiriman Diharapkan</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-delivery-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={poForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catatan</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Catatan tambahan" {...field} data-testid="input-po-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Items Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Items</h3>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const product = products?.[0];
                          if (product) {
                            addItemToPO({
                              productId: product.id,
                              productName: product.name,
                              quantity: 1,
                              unitCost: 0
                            });
                          }
                        }}
                        data-testid="button-add-item-to-po"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Item
                      </Button>
                    </div>
                    
                    {poItems.length > 0 ? (
                      <div className="space-y-2">
                        {poItems.map((item, index) => (
                          <div key={item.id} className="border p-3 rounded-md">
                            <div className="grid grid-cols-4 gap-3 items-center">
                              <div>
                                <Label className="text-sm">Produk</Label>
                                <Select 
                                  value={item.productId} 
                                  onValueChange={(value) => {
                                    const product = products?.find(p => p.id === value);
                                    setPOItems(poItems.map((it, i) => 
                                      i === index ? { ...it, productId: value, productName: product?.name } : it
                                    ));
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products?.map((product: any) => (
                                      <SelectItem key={product.id} value={product.id}>
                                        {product.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-sm">Kuantitas</Label>
                                <Input 
                                  type="number" 
                                  value={item.quantity}
                                  onChange={(e) => {
                                    setPOItems(poItems.map((it, i) => 
                                      i === index ? { ...it, quantity: parseInt(e.target.value) || 1 } : it
                                    ));
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-sm">Harga Satuan</Label>
                                <Input 
                                  type="number" 
                                  value={item.unitCost}
                                  onChange={(e) => {
                                    setPOItems(poItems.map((it, i) => 
                                      i === index ? { ...it, unitCost: parseFloat(e.target.value) || 0 } : it
                                    ));
                                  }}
                                />
                              </div>
                              <div className="flex items-end">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => removeItemFromPO(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Belum ada item. Klik "Tambah Item" untuk menambahkan.</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={createPOMutation.isPending || poItems.length === 0} data-testid="button-save-po">
                      {createPOMutation.isPending ? "Menyimpan..." : "Buat Purchase Order"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => {
                      setIsAddPOOpen(false);
                      setPOItems([]);
                    }}>
                      Batal
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders" className="flex items-center gap-2" data-testid="tab-orders">
            <ShoppingCart className="h-4 w-4" />
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="receiving" className="flex items-center gap-2" data-testid="tab-receiving">
            <Truck className="h-4 w-4" />
            Receiving
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2" data-testid="tab-suppliers">
            <Package className="h-4 w-4" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2" data-testid="tab-reports">
            <Eye className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <Input
                placeholder="Cari purchase order berdasarkan nomor PO atau catatan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-lg"
                data-testid="input-search-po"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Tanggal Order</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders?.map((order: any) => (
                      <TableRow key={order.id} data-testid={`row-po-${order.id}`}>
                        <TableCell className="font-medium" data-testid={`text-po-number-${order.id}`}>
                          {order.poNumber}
                        </TableCell>
                        <TableCell>{(order as any).supplierName || order.supplierId}</TableCell>
                        <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(order.expectedDeliveryDate).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>Rp {Number(order.totalAmount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPO(order);
                                setViewPOOpen(true);
                              }}
                              data-testid={`button-view-po-${order.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {order.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => approvePOMutation.mutate(order.id)}
                                data-testid={`button-approve-po-${order.id}`}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // For now, just open the view dialog as edit functionality
                                setSelectedPO(order);
                                setViewPOOpen(true);
                              }}
                              data-testid={`button-edit-po-${order.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
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

        <TabsContent value="receiving" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Goods Receiving</h2>
              <p className="text-muted-foreground">Terima barang dari purchase order yang sudah dikonfirmasi</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders Ready for Receiving</CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders?.filter((order: any) => order.status === 'confirmed' || order.status === 'partial_received').map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.poNumber}</TableCell>
                        <TableCell>{(order as any).supplierName || order.supplierId}</TableCell>
                        <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>Rp {Number(order.totalAmount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPO(order);
                              setReceivingPOOpen(true);
                              setReceivingItems([]);
                            }}
                            data-testid={`button-receive-po-${order.id}`}
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            Receive Items
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!purchaseOrders?.some((order: any) => order.status === 'confirmed' || order.status === 'partial_received') && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No purchase orders ready for receiving
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Supplier Management</h3>
                <p className="text-muted-foreground">Fitur manajemen supplier akan segera hadir</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {/* Header untuk Reports */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Laporan Purchasing</h2>
              <p className="text-muted-foreground">Overview dan analisis data pembelian</p>
            </div>
          </div>

          {/* Main Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total PO</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-po">{purchaseOrders?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Purchase orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending PO</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600" data-testid="stat-pending-po">
                  {purchaseOrders?.filter((po: any) => po.status === "pending").length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Menunggu persetujuan</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sebagian Diterima</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600" data-testid="stat-partial-received-po">
                  {purchaseOrders?.filter((po: any) => po.status === "partial_received").length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Masih ada barang belum diterima</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Selesai</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="stat-received-po">
                  {purchaseOrders?.filter((po: any) => po.status === "received").length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Semua barang sudah diterima</p>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Nilai PO</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-po-value">
                  Rp {purchaseOrders?.reduce((sum: number, po: any) => sum + Number(po.totalAmount || 0), 0).toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">Nilai total semua PO</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Belum Dikonfirmasi</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  Rp {purchaseOrders?.filter((po: any) => po.status === "pending")
                    .reduce((sum: number, po: any) => sum + Number(po.totalAmount || 0), 0).toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">Nilai PO pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Items</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {(allOutstandingItems || []).reduce((sum: number, item: any) => sum + (item.outstandingQuantity || 0), 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">Total barang belum diterima</p>
              </CardContent>
            </Card>
          </div>

          {/* Outstanding Items Detail */}
          <Card>
            <CardHeader>
              <CardTitle>Detail Barang Belum Diterima</CardTitle>
              <CardDescription>Daftar item yang belum diterima lengkap dari supplier</CardDescription>
            </CardHeader>
            <CardContent>
              {(allOutstandingItems || []).length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead>Dipesan</TableHead>
                        <TableHead>Diterima</TableHead>
                        <TableHead>Outstanding</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Nilai</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(allOutstandingItems || []).map((item: any) => {
                        const outstandingQty = item.outstandingQuantity || 0;
                        const unitCost = parseFloat(item.unitCost || item.unitPrice || '0');
                        const outstandingValue = outstandingQty * unitCost;
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.poNumber}</TableCell>
                            <TableCell>{item.productName || item.productId}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.receivedQuantity || 0}</TableCell>
                            <TableCell className="font-medium text-orange-600">{outstandingQty}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.outstandingStatus === 'pending' ? 'text-yellow-600 bg-yellow-100' :
                                item.outstandingStatus === 'cancelled' ? 'text-red-600 bg-red-100' :
                                item.outstandingStatus === 'refunded' ? 'text-blue-600 bg-blue-100' :
                                item.outstandingStatus === 'backordered' ? 'text-orange-600 bg-orange-100' :
                                'text-gray-600 bg-gray-100'
                              }`}>
                                {item.outstandingStatus === 'pending' ? 'Menunggu' : 
                                 item.outstandingStatus === 'cancelled' ? 'Dibatalkan' :
                                 item.outstandingStatus === 'refunded' ? 'Dikembalikan' :
                                 item.outstandingStatus === 'backordered' ? 'Backorder' : 
                                 item.outstandingStatus || 'Pending'}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">Rp {outstandingValue.toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-green-600">Semua Barang Sudah Diterima!</h3>
                  <p>Tidak ada outstanding items yang perlu ditindaklanjuti.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View PO Dialog */}
      <Dialog open={viewPOOpen} onOpenChange={setViewPOOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Detail - {selectedPO?.poNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Supplier</Label>
                <p className="text-sm font-medium">{(selectedPO as any)?.supplierName || selectedPO?.supplierId}</p>
              </div>
              <div>
                <Label>Status</Label>
                <div className="mt-1">{selectedPO && getStatusBadge(selectedPO.status)}</div>
              </div>
              <div>
                <Label>Tanggal Order</Label>
                <p className="text-sm">{selectedPO && new Date(selectedPO.orderDate).toLocaleDateString()}</p>
              </div>
              <div>
                <Label>Expected Delivery</Label>
                <p className="text-sm">{selectedPO && new Date(selectedPO.expectedDeliveryDate).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Items</h3>
                <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-add-item">
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tambah Item ke PO</DialogTitle>
                    </DialogHeader>
                    <Form {...itemForm}>
                      <form onSubmit={itemForm.handleSubmit(onSubmitItem)} className="space-y-4">
                        <FormField
                          control={itemForm.control}
                          name="productId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Produk</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-product">
                                    <SelectValue placeholder="Pilih produk" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {products?.map((product: any) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={itemForm.control}
                            name="quantity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Kuantitas</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    data-testid="input-quantity"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={itemForm.control}
                            name="unitCost"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Harga Satuan</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} data-testid="input-unit-cost" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={itemForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Catatan</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Catatan item" {...field} data-testid="input-item-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-2 pt-4">
                          <Button type="submit" disabled={addItemMutation.isPending} data-testid="button-save-item">
                            {addItemMutation.isPending ? "Menyimpan..." : "Tambah Item"}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setIsAddItemOpen(false)}>
                            Batal
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>Kuantitas</TableHead>
                    <TableHead>Harga Satuan</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPOItems?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{(item as any).productName || item.productId}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>Rp {Number(item.unitCost).toLocaleString()}</TableCell>
                      <TableCell>Rp {(item.quantity * Number(item.unitCost)).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeItemFromExistingPO(item.id)}
                          disabled={selectedPO?.status !== 'pending'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goods Receiving Dialog */}
      <Dialog open={receivingPOOpen} onOpenChange={setReceivingPOOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Receive Items - {selectedPO?.poNumber}</DialogTitle>
            <DialogDescription>
              Terima barang dari supplier dan update stock inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Supplier</Label>
                <p className="text-sm font-medium">{(selectedPO as any)?.supplierName || selectedPO?.supplierId}</p>
              </div>
              <div>
                <Label>Total Amount</Label>
                <p className="text-sm font-medium">Rp {Number(selectedPO?.totalAmount || 0).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Ordered Qty</TableHead>
                    <TableHead>Already Received</TableHead>
                    <TableHead>Receive Now</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPOItems?.map((item: any) => {
                    const receivingQty = receivingItems.find(r => r.itemId === item.id)?.quantity || 0;
                    const remaining = item.quantity - (item.receivedQuantity || 0) - receivingQty;
                    const outstandingQty = item.outstandingQuantity || (item.quantity - (item.receivedQuantity || 0));
                    const outstandingStatus = item.outstandingStatus || 'pending';
                    
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'pending': return 'text-yellow-600 bg-yellow-100';
                        case 'cancelled': return 'text-red-600 bg-red-100';
                        case 'refunded': return 'text-blue-600 bg-blue-100';
                        case 'backordered': return 'text-orange-600 bg-orange-100';
                        case 'completed': return 'text-green-600 bg-green-100';
                        default: return 'text-gray-600 bg-gray-100';
                      }
                    };
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{(item as any).productName || item.productId}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.receivedQuantity || 0}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={remaining}
                            value={receivingQty}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 0;
                              setReceivingItems(prev => {
                                const existing = prev.find(r => r.itemId === item.id);
                                if (existing) {
                                  return prev.map(r => 
                                    r.itemId === item.id ? { ...r, quantity: qty } : r
                                  );
                                } else {
                                  return [...prev, { itemId: item.id, quantity: qty }];
                                }
                              });
                            }}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {outstandingQty > 0 ? outstandingQty : '-'}
                        </TableCell>
                        <TableCell>
                          {outstandingQty > 0 ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(outstandingStatus)}`}>
                              {outstandingStatus === 'pending' ? 'Menunggu' : 
                               outstandingStatus === 'cancelled' ? 'Dibatalkan' :
                               outstandingStatus === 'refunded' ? 'Dikembalikan' :
                               outstandingStatus === 'backordered' ? 'Backorder' :
                               outstandingStatus === 'completed' ? 'Selesai' : outstandingStatus}
                            </span>
                          ) : (
                            <span className="text-green-600 text-xs">Lengkap</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {outstandingQty > 0 && outstandingStatus === 'pending' ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => updateOutstandingStatus(item.id, 'cancelled', 'Cancelled by user')}>
                                  Batalkan
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateOutstandingStatus(item.id, 'refunded', 'Refunded by supplier')}>
                                  Refund
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateOutstandingStatus(item.id, 'backordered', 'Backordered - delayed delivery')}>
                                  Backorder
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReceivingPOOpen(false)}>
                Cancel
              </Button>
              
              {/* Special button for refunded items */}
              {selectedPOItems?.some((item: any) => item.outstandingStatus === 'refunded' && (item.outstandingQuantity || 0) > 0) && (
                <Button 
                  variant="secondary"
                  onClick={() => {
                    // Show adjustment modal for refunded items
                    toast({
                      title: "Adjustment Required",
                      description: "Process refunded goods through Finance > Inventory Adjustment first",
                      variant: "default"
                    });
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Process Refunded Items
                </Button>
              )}
              
              <Button 
                onClick={() => {
                  const itemsToReceive = receivingItems.filter(item => item.quantity > 0);
                  
                  if (itemsToReceive.length > 0) {
                    receiveMutation.mutate(itemsToReceive);
                  } else {
                    toast({ title: "No items to receive", description: "Please enter quantities to receive", variant: "destructive" });
                  }
                }}
                disabled={receiveMutation.isPending || !receivingItems.some(item => item.quantity > 0)}
              >
                {receiveMutation.isPending ? "Processing..." : "Receive Items"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}