import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Minus, Package, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

interface ServicePart {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  stock: number;
}

interface ServicePartsSelectorProps {
  parts: ServicePart[];
  onPartsChange: (parts: ServicePart[]) => void;
  laborCost: number;
}

export function ServicePartsSelector({ parts, onPartsChange, laborCost }: ServicePartsSelectorProps) {
  const { toast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    queryFn: () => fetch('/api/products').then(res => res.json())
  });

  // Filter products that have stock
  const availableProducts = useMemo(() => {
    return products.filter(product => product.stock > 0 && product.isActive);
  }, [products]);

  const selectedProduct = useMemo(() => {
    return availableProducts.find(p => p.id === selectedProductId);
  }, [availableProducts, selectedProductId]);

  const totalPartsCost = useMemo(() => {
    return parts.reduce((sum, part) => sum + parseFloat(part.totalPrice), 0);
  }, [parts]);

  const totalCost = useMemo(() => {
    return laborCost + totalPartsCost;
  }, [laborCost, totalPartsCost]);

  const handleAddPart = () => {
    if (!selectedProduct) {
      toast({
        title: "Error",
        description: "Pilih produk terlebih dahulu",
        variant: "destructive"
      });
      return;
    }

    if (quantity > selectedProduct.stock) {
      toast({
        title: "Error",
        description: `Stock tidak cukup. Tersedia: ${selectedProduct.stock}`,
        variant: "destructive"
      });
      return;
    }

    // Check if product already added
    const existingPartIndex = parts.findIndex(part => part.productId === selectedProduct.id);
    
    if (existingPartIndex >= 0) {
      const existingPart = parts[existingPartIndex];
      const newQuantity = existingPart.quantity + quantity;
      
      if (newQuantity > selectedProduct.stock) {
        toast({
          title: "Error",
          description: `Total quantity melebihi stock. Tersedia: ${selectedProduct.stock}, Sudah dipilih: ${existingPart.quantity}`,
          variant: "destructive"
        });
        return;
      }

      const unitPrice = selectedProduct.sellingPrice || "0";
      const newTotalPrice = (parseFloat(unitPrice) * newQuantity).toString();

      const updatedParts = parts.map((part, index) => 
        index === existingPartIndex 
          ? { ...part, quantity: newQuantity, totalPrice: newTotalPrice }
          : part
      );
      onPartsChange(updatedParts);
    } else {
      const unitPrice = selectedProduct.sellingPrice || "0";
      const totalPrice = (parseFloat(unitPrice) * quantity).toString();

      const newPart: ServicePart = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity,
        unitPrice,
        totalPrice,
        stock: selectedProduct.stock
      };

      onPartsChange([...parts, newPart]);
    }

    // Reset form
    setSelectedProductId("");
    setQuantity(1);
  };

  const handleRemovePart = (productId: string) => {
    onPartsChange(parts.filter(part => part.productId !== productId));
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    const part = parts.find(p => p.productId === productId);
    if (!part) return;

    const product = availableProducts.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity > product.stock) {
      toast({
        title: "Error",
        description: `Quantity melebihi stock. Tersedia: ${product.stock}`,
        variant: "destructive"
      });
      return;
    }

    if (newQuantity <= 0) {
      handleRemovePart(productId);
      return;
    }

    const newTotalPrice = (parseFloat(part.unitPrice) * newQuantity).toString();
    
    const updatedParts = parts.map(p => 
      p.productId === productId 
        ? { ...p, quantity: newQuantity, totalPrice: newTotalPrice }
        : p
    );
    onPartsChange(updatedParts);
  };

  return (
    <div className="space-y-4">
      {/* Add Parts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Tambah Spare Parts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-6">
              <Label htmlFor="product-select">Pilih Produk</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih spare part..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex justify-between items-center w-full">
                        <span>{product.name}</span>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant="outline" className="text-xs">
                            Stock: {product.stock}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Rp {parseFloat(product.sellingPrice || "0").toLocaleString("id-ID")}
                          </Badge>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={selectedProduct?.stock || 1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="col-span-2">
              <Label>Harga Satuan</Label>
              <div className="p-2 bg-muted rounded text-sm">
                {selectedProduct 
                  ? `Rp ${parseFloat(selectedProduct.sellingPrice || "0").toLocaleString("id-ID")}`
                  : "-"
                }
              </div>
            </div>
            <div className="col-span-2">
              <Button 
                onClick={handleAddPart} 
                disabled={!selectedProduct}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Parts List */}
      {parts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parts yang Digunakan</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Stock Tersedia</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Harga Satuan</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((part) => (
                  <TableRow key={part.productId}>
                    <TableCell>{part.productName}</TableCell>
                    <TableCell>
                      <Badge variant={part.stock <= 5 ? "destructive" : "secondary"}>
                        {part.stock} unit
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(part.productId, part.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="min-w-[2rem] text-center">{part.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(part.productId, part.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      Rp {parseFloat(part.unitPrice).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell>
                      Rp {parseFloat(part.totalPrice).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemovePart(part.productId)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Cost Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Biaya</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Biaya Tenaga Kerja:</span>
              <span>Rp {laborCost.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between">
              <span>Biaya Parts:</span>
              <span>Rp {totalPartsCost.toLocaleString("id-ID")}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Total Biaya:</span>
                <span>Rp {totalCost.toLocaleString("id-ID")}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {availableProducts.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Tidak ada produk dengan stock tersedia
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}