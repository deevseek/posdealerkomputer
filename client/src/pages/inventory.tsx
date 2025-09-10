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
import { Search, Package, AlertTriangle, History, TrendingUp, DollarSign, Plus, Tag } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { insertProductSchema, insertCategorySchema } from "@shared/schema";
import { useWebSocket } from "@/lib/websocket";

const pricingSchema = z.object({
  sellingPrice: z.string().min(1, "Harga jual harus diisi"),
  marginPercent: z.string().optional(),
});

type PricingFormData = z.infer<typeof pricingSchema>;
type ProductFormData = z.infer<typeof insertProductSchema>;
type CategoryFormData = z.infer<typeof insertCategorySchema>;

// Add Category Form Component
function AddCategoryForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
    mode: "onChange", // Enable real-time validation
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Berhasil", description: "Kategori berhasil ditambahkan!" });
      form.reset();
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Gagal menambah kategori", variant: "destructive" });
    },
  });

  const onSubmit = (data: CategoryFormData) => {
    console.log("🔥 Category handleSubmit called with data:", data);
    console.log("🔥 Category Form errors:", form.formState.errors);
    console.log("🔥 Category Form is valid:", form.formState.isValid);
    addCategoryMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Kategori *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Masukkan nama kategori" />
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
              <FormLabel>Deskripsi</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ""} placeholder="Deskripsi kategori (opsional)" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button 
            type="submit" 
            disabled={addCategoryMutation.isPending}
            data-testid="button-add-category-submit"
            onClick={(e) => {
              console.log("🔥 Category Button clicked!");
              console.log("🔥 Category Form state:", form.formState);
              console.log("🔥 Category Form values:", form.getValues());
            }}
          >
            {addCategoryMutation.isPending ? "Menambah..." : "Tambah Kategori"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Add Product Form Component  
function AddProductForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  
  // Get categories for dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    retry: false,
  });
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      brand: "",
      model: "",
      unit: "pcs",
      specifications: "",
      sellingPrice: "0",
      minStock: 5,
      maxStock: 100,
      // Add required stock fields
      stock: 0,
      totalStock: 0,
      availableStock: 0,
      reservedStock: 0,
      // Add other potentially required fields
      reorderPoint: 5,
      reorderQuantity: 10,
    },
    mode: "onChange", // Enable real-time validation
  });

  const addProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Success", description: "Produk berhasil ditambahkan!" });
      form.reset();
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Gagal menambah produk", variant: "destructive" });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    console.log("🔥 Product handleSubmit called with data:", data);
    console.log("🔥 Product Form errors:", form.formState.errors);
    console.log("🔥 Product Form is valid:", form.formState.isValid);
    addProductMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => {
        console.log("🔥 Product Form submit event triggered!");
        console.log("🔥 Product Form valid before submit:", form.formState.isValid);
        console.log("🔥 Product Form errors before submit:", form.formState.errors);
        console.log("🔥 Current form data:", form.getValues());
        
        form.handleSubmit(onSubmit)(e);
      }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Produk *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Masukkan nama produk" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kategori</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(categories as any[]).map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ""} placeholder="Deskripsi produk" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="Brand produk" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="Model produk" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || "pcs"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pcs">Pcs</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="set">Set</SelectItem>
                    <SelectItem value="meter">Meter</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="sellingPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Harga Jual</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} type="number" placeholder="0" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="minStock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Stock</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    placeholder="5"
                    value={field.value?.toString() || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="maxStock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Stock</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    placeholder="100"
                    value={field.value?.toString() || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button 
            type="submit" 
            disabled={addProductMutation.isPending}
            data-testid="button-add-product-submit"
            onClick={(e) => {
              console.log("🔥 Product Button clicked!");
              console.log("🔥 Product Form state:", form.formState);
              console.log("🔥 Product Form values:", form.getValues());
              console.log("🔥 Product Form isValid:", form.formState.isValid);
              console.log("🔥 Product Form isDirty:", form.formState.isDirty);
              console.log("🔥 Product Form dirtyFields:", form.formState.dirtyFields);
            }}
          >
            {addProductMutation.isPending ? "Adding..." : "Tambah Produk"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function PricingEditForm({ product, onSuccess }: { product: any; onSuccess: () => void }) {
  const form = useForm<PricingFormData>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      sellingPrice: product.sellingPrice?.toString() || "",
      marginPercent: "",
    },
  });

  const updatePricingMutation = useMutation({
    mutationFn: async (data: { sellingPrice: string }) => {
      const response = await fetch(`/api/products/${product.id}/pricing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sellingPrice: data.sellingPrice }),
      });
      if (!response.ok) throw new Error('Failed to update pricing');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      onSuccess();
    },
  });

  const onSubmit = (data: PricingFormData) => {
    updatePricingMutation.mutate({ sellingPrice: data.sellingPrice });
  };

  const hpp = Number(product.averageCost || 0);
  const currentSellingPrice = form.watch("sellingPrice");
  const calculatedMargin = hpp > 0 && currentSellingPrice ? 
    ((Number(currentSellingPrice) - hpp) / hpp * 100).toFixed(1) : "0";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div>
            <p className="text-sm font-medium">HPP Saat Ini:</p>
            <p className="text-lg font-bold text-blue-600">Rp {hpp.toLocaleString('id-ID')}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Margin Terhitung:</p>
            <p className="text-lg font-bold text-green-600">{calculatedMargin}%</p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="sellingPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Harga Jual</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Masukkan harga jual" 
                  type="number"
                  step="0.01"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button 
            type="submit" 
            disabled={updatePricingMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {updatePricingMutation.isPending ? "Menyimpan..." : "Update Harga"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  
  // Connect to WebSocket for real-time updates
  const { isConnected } = useWebSocket();
  
  console.log('📡 Inventory page WebSocket status:', isConnected);

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
  const { data: stockMovementsData } = useQuery({
    queryKey: ["/api/reports/stock-movements"],
    retry: false,
  });
  const stockMovements = stockMovementsData?.movements || [];

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

  const incomingStock = (purchaseOrders as any[]).filter((po: any) => 
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
              <TabsTrigger value="pricing" data-testid="tab-pricing">HPP & Pricing</TabsTrigger>
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
              {/* Search Bar with Action Buttons */}
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
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" data-testid="button-add-category">
                            <Tag className="w-4 h-4 mr-2" />
                            Add Category
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Tambah Kategori Baru</DialogTitle>
                          </DialogHeader>
                          <AddCategoryForm onSuccess={() => {
                            // Dialog akan tertutup otomatis karena form reset
                          }} />
                        </DialogContent>
                      </Dialog>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button data-testid="button-add-product">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Product
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Tambah Produk Baru</DialogTitle>
                          </DialogHeader>
                          <AddProductForm onSuccess={() => {
                            // Dialog akan tertutup otomatis karena form reset
                          }} />
                        </DialogContent>
                      </Dialog>
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
                          <TableHead className="text-right">HPP (Harga Pokok)</TableHead>
                          <TableHead className="text-right">Harga Jual</TableHead>
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
                                <div className="space-y-1">
                                  <div className="font-medium">Rp {Number(product.averageCost || 0).toLocaleString('id-ID')}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Last: Rp {Number(product.lastPurchasePrice || 0).toLocaleString('id-ID')}
                                  </div>
                                </div>
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

            {/* HPP & Pricing Management Tab */}
            <TabsContent value="pricing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    HPP & Pricing Management
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Manage Harga Pokok Penjualan (Cost of Goods Sold) and selling prices
                  </p>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Last Purchase Price</TableHead>
                        <TableHead className="text-right">HPP (Harga Pokok)</TableHead>
                        <TableHead className="text-right">Harga Jual</TableHead>
                        <TableHead className="text-right">Margin %</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product: any) => {
                        const hpp = Number(product.averageCost || 0);
                        const sellingPrice = Number(product.sellingPrice || 0);
                        const marginPercent = hpp > 0 ? ((sellingPrice - hpp) / hpp * 100).toFixed(1) : 0;
                        
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground">{product.sku}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">{product.stock || 0}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm">
                                Rp {Number(product.lastPurchasePrice || 0).toLocaleString('id-ID')}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-medium text-blue-600">
                                Rp {hpp.toLocaleString('id-ID')}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-medium text-green-600">
                                Rp {sellingPrice.toLocaleString('id-ID')}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={Number(marginPercent) > 20 ? "default" : "secondary"}>
                                {marginPercent}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    data-testid={`edit-pricing-${product.id}`}
                                  >
                                    Edit
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                  <DialogHeader>
                                    <DialogTitle>Edit Pricing - {product.name}</DialogTitle>
                                  </DialogHeader>
                                  <PricingEditForm 
                                    product={product} 
                                    onSuccess={() => {
                                      toast({ title: "Pricing berhasil diupdate!" });
                                    }} 
                                  />
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              
              {/* HPP Calculation Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Info Perhitungan HPP</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-700 dark:text-blue-300">HPP (Harga Pokok Penjualan)</h4>
                      <p className="text-blue-600 dark:text-blue-400">
                        Dihitung dari rata-rata tertimbang harga pembelian dari waktu ke waktu
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-700 dark:text-green-300">Harga Jual</h4>
                      <p className="text-green-600 dark:text-green-400">
                        Ditentukan oleh admin berdasarkan riset pasar dan target margin
                      </p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
                      <h4 className="font-semibold text-amber-700 dark:text-amber-300">Margin %</h4>
                      <p className="text-amber-600 dark:text-amber-400">
                        Rumus: (Harga Jual - HPP) / HPP × 100%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stock Movements Tab */}
            <TabsContent value="movements" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <History className="w-5 h-5 mr-2" />
                    Riwayat Pergerakan Stok
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead>Referensi</TableHead>
                        <TableHead>Catatan</TableHead>
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
                              <div className="space-y-1">
                                <div className="font-medium">{po.itemCount || 0} items</div>
                                {po.outstandingCount > 0 && (
                                  <div className="text-xs text-orange-600">
                                    {po.outstandingCount} outstanding
                                  </div>
                                )}
                              </div>
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