import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Package, AlertTriangle, History, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Products with stock info
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products", searchQuery],
    queryFn: async () => {
      const url = searchQuery ? `/api/products?search=${encodeURIComponent(searchQuery)}` : '/api/products';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    retry: false,
  });

  // Stock movements for tracking
  const { data: stockMovements = [] } = useQuery({
    queryKey: ["/api/reports/stock-movements"],
    retry: false,
  });

  // Purchase orders untuk show incoming stock
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["/api/purchase-orders"],
    retry: false,
  });

  const getStockStatus = (product: any) => {
    const stock = product.stock || 0;
    const minStock = product.minStock || 5;
    
    if (stock <= 0) {
      return { text: "Out of Stock", variant: "destructive" as const, color: "text-red-600" };
    }
    if (stock <= minStock) {
      return { text: "Low Stock", variant: "secondary" as const, color: "text-orange-600" };
    }
    return { text: "In Stock", variant: "default" as const, color: "text-green-600" };
  };

  const filteredProducts = products.filter((product: any) =>
    product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockProducts = products.filter((product: any) => {
    const stock = product.stock || 0;
    const minStock = product.minStock || 5;
    return stock <= minStock;
  });

  const incomingStock = purchaseOrders.filter((po: any) => 
    po.status === 'confirmed' || po.status === 'partial_received'
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Inventory Management" 
          breadcrumb="Home / Inventory"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
              <TabsTrigger value="movements" data-testid="tab-movements">Stock Movements</TabsTrigger>
              <TabsTrigger value="incoming" data-testid="tab-incoming">Incoming Stock</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Products */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{products.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Active products in inventory
                    </p>
                  </CardContent>
                </Card>

                {/* Low Stock Alerts */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{lowStockProducts.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Products need restocking
                    </p>
                  </CardContent>
                </Card>

                {/* Incoming Stock */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Incoming Orders</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{incomingStock.length}</div>
                    <p className="text-xs text-muted-foreground">
                      POs ready for receiving
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Low Stock Products */}
              {lowStockProducts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-red-600">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      Low Stock Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Current Stock</TableHead>
                          <TableHead className="text-right">Min Stock</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowStockProducts.map((product: any) => {
                          const stockStatus = getStockStatus(product);
                          return (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">
                                {product.name}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={stockStatus.color}>
                                  {product.stock || 0}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {product.minStock || 5}
                              </TableCell>
                              <TableCell>
                                <Badge variant={stockStatus.variant}>
                                  {stockStatus.text}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              {/* Search Bar */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex space-x-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search products by name or SKU..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        data-testid="input-product-search"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Products Inventory ({filteredProducts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {productsLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Name</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Current Stock</TableHead>
                          <TableHead className="text-right">Min Stock</TableHead>
                          <TableHead className="text-right">Purchase Price</TableHead>
                          <TableHead className="text-right">Selling Price</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product: any) => {
                          const stockStatus = getStockStatus(product);
                          
                          return (
                            <TableRow key={product.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium" data-testid={`product-name-${product.id}`}>
                                    {product.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {product.description}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell data-testid={`product-sku-${product.id}`}>
                                {product.sku || "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                <span 
                                  className={`font-bold text-lg ${stockStatus.color}`}
                                  data-testid={`product-stock-${product.id}`}
                                >
                                  {product.stock || 0}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {product.minStock || 5}
                              </TableCell>
                              <TableCell className="text-right">
                                Rp {Number(product.purchasePrice || 0).toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell className="text-right">
                                Rp {Number(product.sellingPrice || 0).toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell>
                                <Badge variant={stockStatus.variant}>
                                  {stockStatus.text}
                                </Badge>
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

            {/* Stock Movements Tab */}
            <TabsContent value="movements" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <History className="w-5 h-5 mr-2" />
                    Stock Movement History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockMovements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No stock movements recorded yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        stockMovements.slice(0, 20).map((movement: any) => (
                          <TableRow key={movement.id}>
                            <TableCell className="text-sm">
                              {new Date(movement.createdAt).toLocaleDateString('id-ID')}
                            </TableCell>
                            <TableCell className="font-medium">
                              {movement.productName || movement.productId}
                            </TableCell>
                            <TableCell>
                              <Badge variant={movement.movementType === 'in' ? 'default' : 'secondary'}>
                                {movement.movementType === 'in' ? 'IN' : 'OUT'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {movement.movementType === 'in' ? '+' : '-'}{movement.quantity}
                            </TableCell>
                            <TableCell className="text-sm">
                              {movement.referenceType === 'purchase' ? 'Purchase Order' : movement.referenceType}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {movement.notes}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Incoming Stock Tab */}
            <TabsContent value="incoming" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2 text-blue-600" />
                    Incoming Stock from Purchase Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Items</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomingStock.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No incoming stock from purchase orders
                          </TableCell>
                        </TableRow>
                      ) : (
                        incomingStock.map((po: any) => (
                          <TableRow key={po.id}>
                            <TableCell className="font-medium">
                              {po.poNumber}
                            </TableCell>
                            <TableCell>
                              {po.supplierName || po.supplierId}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(po.orderDate).toLocaleDateString('id-ID')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                po.status === 'confirmed' ? 'default' : 
                                po.status === 'partial_received' ? 'secondary' : 'outline'
                              }>
                                {po.status === 'confirmed' ? 'Ready to Receive' :
                                 po.status === 'partial_received' ? 'Partially Received' : po.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {po.itemCount || 0} items
                            </TableCell>
                            <TableCell className="text-right">
                              Rp {Number(po.totalAmount || 0).toLocaleString('id-ID')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}