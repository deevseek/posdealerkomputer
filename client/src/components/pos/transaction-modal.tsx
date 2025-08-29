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
import { Plus, Minus, X, Search, Barcode } from "lucide-react";

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (transaction: any) => void;
}

interface TransactionItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function TransactionModal({ open, onClose, onComplete }: TransactionModalProps) {
  const [customer, setCustomer] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
        : item
    ).filter(item => item.quantity > 0));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const addSampleItem = () => {
    const sampleItem: TransactionItem = {
      id: `item-${Date.now()}`,
      name: "ASUS VivoBook 15",
      price: 8500000,
      quantity: 1,
    };
    setItems(prev => [...prev, sampleItem]);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.11;
  const total = subtotal + tax;

  const handleProcessTransaction = () => {
    const transaction = {
      id: `TRX-${Date.now()}`,
      customer,
      paymentMethod,
      items,
      subtotal,
      tax,
      total,
      date: new Date(),
    };
    
    onComplete(transaction);
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
              <div className="relative">
                <Input
                  id="customer"
                  placeholder="Search customer..."
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  data-testid="input-customer"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  data-testid="button-add-customer"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant={paymentMethod === "sale" ? "default" : "outline"}
                onClick={() => setPaymentMethod("sale")}
                className="p-4 h-auto flex-col"
                data-testid="button-product-sale"
              >
                <Search className="w-5 h-5 mb-2" />
                <span className="text-sm">Product Sale</span>
              </Button>
              <Button 
                variant={paymentMethod === "service" ? "default" : "outline"}
                onClick={() => setPaymentMethod("service")}
                className="p-4 h-auto flex-col"
                data-testid="button-service"
              >
                <Barcode className="w-5 h-5 mb-2" />
                <span className="text-sm">Service</span>
              </Button>
            </div>

            <div>
              <Label htmlFor="payment">Payment Method</Label>
              <Select onValueChange={setPaymentMethod}>
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="transfer">Bank Transfer</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                  <SelectItem value="installment">Installment</SelectItem>
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={addSampleItem}
                  data-testid="button-add-sample-product"
                >
                  <Barcode className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Selected Items */}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {items.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">{item.name}</span>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, -1)}
                        data-testid={`button-decrease-${item.id}`}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span data-testid={`text-quantity-${item.id}`}>{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, 1)}
                        data-testid={`button-increase-${item.id}`}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <span className="font-medium ml-2" data-testid={`text-total-${item.id}`}>
                        Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        data-testid={`button-remove-${item.id}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Transaction Summary */}
            <Card className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span data-testid="text-subtotal">Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (11%):</span>
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
          <Button variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            onClick={handleProcessTransaction}
            disabled={items.length === 0 || !paymentMethod}
            data-testid="button-process-transaction"
          >
            Process Transaction
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
