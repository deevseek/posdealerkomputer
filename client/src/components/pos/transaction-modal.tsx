import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, X, Search, Barcode, Percent, DollarSign } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CustomerCreateModal from "@/components/customers/customer-create-modal";

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (transaction: any) => void;
}

interface TransactionItem {
  productId: string;
  name: string;
  sellingPrice: number;
  quantity: number;
  stock?: number;
}

export default function TransactionModal({ open, onClose, onComplete }: TransactionModalProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [showCustomerCreateModal, setShowCustomerCreateModal] = useState(false);
  
  // Discount states
  const [discountType, setDiscountType] = useState<"percentage" | "rupiah">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [showDiscountSection, setShowDiscountSection] = useState(false);
  const { toast } = useToast();

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  // Fetch store config for tax rate - WITH PROPER REFRESH
  const { data: storeConfig } = useQuery({
    queryKey: ['store-config-transaction'],
    queryFn: async () => {
      const response = await fetch('/api/store-config', { credentials: 'include' });
      if (!response.ok) return { taxRate: 0 };
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes instead of Infinity
    refetchOnWindowFocus: true,
    retry: false,
  });

  // Fetch customers
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["/api/customers", customerSearch],
    queryFn: async () => {
      const url = customerSearch ? `/api/customers?search=${encodeURIComponent(customerSearch)}` : '/api/customers';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    },
  });

  // Filter customers based on search
  const filteredCustomers = customers.filter((customer: any) =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // Filter products based on search
  const filteredProducts = Array.isArray(products) ? products.filter((product: any) =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(productSearch.toLowerCase())
  ) : [];

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/transactions', data);
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Transaction completed successfully",
      });
      onComplete(data);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process transaction",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setPaymentMethod("cash");
    setItems([]);
    setProductSearch("");
    setSelectedProducts([]);
    setShowCustomerCreateModal(false);
    setDiscountType("percentage");
    setDiscountValue(0);
    setShowDiscountSection(false);
  };

  const selectCustomer = (customer: any) => {
    console.log('selectCustomer called with:', customer);
    setSelectedCustomer(customer);
    setCustomerSearch("");
    console.log('selectedCustomer after set:', customer);
  };

  const handleCustomerCreated = (newCustomer: any) => {
    console.log('Customer created:', newCustomer);
    selectCustomer(newCustomer);
    toast({
      title: "Success",
      description: `Customer ${newCustomer.name} berhasil ditambahkan dan terpilih`,
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        // Check stock limit
        if (newQuantity > (item.stock || 0)) {
          toast({
            title: "Stock Insufficient",
            description: `Only ${item.stock} units available`,
            variant: "destructive",
          });
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(item => item.productId !== productId));
  };

  const addProductToCart = (product: any) => {
    if (product.stock <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is out of stock`,
        variant: "destructive",
      });
      return;
    }

    // Adding product to cart
    
    const existingItem = items.find(item => item.productId === product.id);
    if (existingItem) {
      updateQuantity(product.id, 1);
    } else {
      const sellingPrice = typeof product.sellingPrice === 'string' 
        ? parseFloat(product.sellingPrice) 
        : (product.sellingPrice || 0);
      
      const newItem: TransactionItem = {
        productId: product.id,
        name: product.name,
        sellingPrice: sellingPrice,
        quantity: 1,
        stock: product.stock,
      };
      // Item created successfully
      setItems(prev => [...prev, newItem]);
    }
    setProductSearch("");
  };

  const subtotal = items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  
  // Calculate discount amount
  let discountAmount = 0;
  if (discountValue > 0) {
    if (discountType === "percentage") {
      discountAmount = subtotal * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }
    // Ensure discount doesn't exceed subtotal
    discountAmount = Math.min(discountAmount, subtotal);
  }
  
  const discountedSubtotal = subtotal - discountAmount;
  const taxRate = Number(storeConfig?.taxRate || 11) / 100;
  const tax = discountedSubtotal * taxRate;
  const total = discountedSubtotal + tax;

  const handleProcessTransaction = () => {
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the transaction",
        variant: "destructive",
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: "Error",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    const transactionData = {
      transaction: {
        type: 'sale' as const,
        customerId: selectedCustomer?.id || null,
        paymentMethod: paymentMethod || 'cash',
        subtotal: Math.round(subtotal).toString(),
        taxAmount: Math.round(tax).toString(),
        discountAmount: Math.round(discountAmount).toString(),
        total: Math.round(total).toString(),
        notes: `POS Sale - ${items.length} items${selectedCustomer ? ` for ${selectedCustomer.name}` : ''}`,
      },
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Math.round(item.sellingPrice).toString(),
        totalPrice: Math.round(item.sellingPrice * item.quantity).toString(),
      })),
    };

    createTransactionMutation.mutate(transactionData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>New Transaction</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto">
          {/* Customer and Payment */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="customer">Customer</Label>
              <div className="space-y-2">
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div>
                      <div className="font-medium">{selectedCustomer.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedCustomer.phone} • {selectedCustomer.email}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCustomer(null)}
                      data-testid="button-remove-customer"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Input
                        id="customer"
                        placeholder="Search customer by name, phone, or email..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        data-testid="input-customer-search"
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                    
                    {/* Customer Search Results */}
                    {customerSearch && (
                      <Card className="max-h-48 overflow-y-auto">
                        <CardContent className="p-2">
                          {customersLoading ? (
                            <div className="text-center py-4">Loading customers...</div>
                          ) : filteredCustomers.length > 0 ? (
                            <div className="space-y-1">
                              {filteredCustomers.slice(0, 8).map((customer: any) => (
                                <Button
                                  key={customer.id}
                                  variant="ghost"
                                  className="w-full justify-start h-auto p-3"
                                  onClick={() => selectCustomer(customer)}
                                  data-testid={`button-select-customer-${customer.id}`}
                                >
                                  <div className="text-left">
                                    <div className="font-medium">{customer.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {customer.phone} • {customer.email}
                                    </div>
                                  </div>
                                </Button>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 space-y-2">
                              <div className="text-muted-foreground">Tidak ada customer ditemukan</div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCustomerCreateModal(true)}
                                data-testid="button-add-new-customer"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Customer Baru
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Optional: Leave empty for walk-in customer
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCustomerCreateModal(true)}
                        data-testid="button-add-customer"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Customer
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="payment">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit">Credit Card</SelectItem>
                  <SelectItem value="debit">Debit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="product">Add Products</Label>
              <div className="relative">
                <Input
                  id="product"
                  placeholder="Scan barcode or search product..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  data-testid="input-product-search"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
              
              {/* Product Search Results */}
              {productSearch && (
                <Card className="max-h-64 overflow-y-auto">
                  <CardContent className="p-2">
                    {productsLoading ? (
                      <div className="text-center py-4">Loading products...</div>
                    ) : filteredProducts.length > 0 ? (
                      <div className="space-y-1">
                        {filteredProducts.slice(0, 10).map((product: any) => (
                          <Button
                            key={product.id}
                            variant="ghost"
                            className="w-full justify-between h-auto p-3"
                            onClick={() => addProductToCart(product)}
                            disabled={product.stock <= 0}
                            data-testid={`button-add-product-${product.id}`}
                          >
                            <div className="text-left">
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Stock: {product.stock} | Rp {product.sellingPrice?.toLocaleString('id-ID')}
                              </div>
                            </div>
                            <Plus className="w-4 h-4" />
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No products found
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Selected Items */}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {items.map((item) => (
                <Card key={item.productId} className="p-3">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Rp {(item.sellingPrice || 0).toLocaleString('id-ID')} × {item.quantity} = Rp {(item.sellingPrice * item.quantity).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.productId, -1)}
                        data-testid={`button-decrease-${item.productId}`}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span data-testid={`text-quantity-${item.productId}`} className="w-8 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.productId, 1)}
                        data-testid={`button-increase-${item.productId}`}
                        disabled={item.quantity >= (item.stock || 0)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.productId)}
                        data-testid={`button-remove-${item.productId}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              
              {items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No items added yet. Search and add products above.
                </div>
              )}
            </div>

            {/* Discount Section */}
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Diskon</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDiscountSection(!showDiscountSection)}
                    data-testid="button-toggle-discount"
                  >
                    {showDiscountSection ? "Tutup Diskon" : "Tambah Diskon"}
                  </Button>
                </div>
                
                {showDiscountSection && (
                  <div className="space-y-3 border-t pt-3">
                    {/* Discount Type Toggle */}
                    <div className="flex gap-2">
                      <Button
                        variant={discountType === "percentage" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDiscountType("percentage")}
                        data-testid="button-discount-percentage"
                      >
                        <Percent className="w-3 h-3 mr-1" />
                        Persen (%)
                      </Button>
                      <Button
                        variant={discountType === "rupiah" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDiscountType("rupiah")}
                        data-testid="button-discount-rupiah"
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        Rupiah (Rp)
                      </Button>
                    </div>
                    
                    {/* Discount Value Input */}
                    <div className="space-y-1">
                      <Label htmlFor="discountValue">
                        Nilai Diskon {discountType === "percentage" ? "(%)" : "(Rp)"}
                      </Label>
                      <Input
                        id="discountValue"
                        type="number"
                        min="0"
                        max={discountType === "percentage" ? "100" : subtotal.toString()}
                        value={discountValue || ""}
                        onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                        placeholder={discountType === "percentage" ? "Masukkan persen (0-100)" : "Masukkan jumlah rupiah"}
                        data-testid="input-discount-value"
                      />
                      {discountType === "percentage" && discountValue > 0 && (
                        <div className="text-xs text-muted-foreground">
                          = Rp {((subtotal * (discountValue / 100))).toLocaleString('id-ID')}
                        </div>
                      )}
                      {discountAmount > 0 && (
                        <div className="text-xs text-green-600">
                          Diskon aktif: Rp {discountAmount.toLocaleString('id-ID')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Transaction Summary */}
            <Card className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span data-testid="text-subtotal">Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Diskon ({discountType === "percentage" ? `${discountValue}%` : "Rupiah"}):</span>
                    <span data-testid="text-discount">-Rp {discountAmount.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Tax ({((storeConfig as any)?.taxRate || 11)}%):</span>
                  <span data-testid="text-tax">Rp {tax.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total:</span>
                  <span data-testid="text-total">Rp {total.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={createTransactionMutation.isPending}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleProcessTransaction}
            disabled={createTransactionMutation.isPending || items.length === 0}
            data-testid="button-process-transaction"
          >
            {createTransactionMutation.isPending ? "Processing..." : "Process Transaction"}
          </Button>
        </div>
      </DialogContent>

      <CustomerCreateModal
        open={showCustomerCreateModal}
        onClose={() => setShowCustomerCreateModal(false)}
        onCustomerCreated={handleCustomerCreated}
      />
    </Dialog>
  );
}
