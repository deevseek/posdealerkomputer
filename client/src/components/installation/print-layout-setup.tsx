import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PrintLayout } from "@shared/schema";

export default function PrintLayoutSetup() {
  const { data: printLayouts = [] } = useQuery<PrintLayout[]>({
    queryKey: ["/api/print/layouts"],
  });

  const ServiceReceiptPreview = () => (
    <div className="print-preview rounded-lg p-4 relative z-10">
      <div className="text-center border-b border-gray-300 pb-3 mb-3">
        <div className="font-bold text-lg">TECH SERVICE</div>
        <div className="text-sm text-gray-600">Jl. Teknologi No. 123, Jakarta</div>
        <div className="text-sm text-gray-600">Telp: (021) 12345678</div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>No. Service:</span>
          <span className="font-medium" data-testid="service-receipt-number">SVC20241201001</span>
        </div>
        <div className="flex justify-between">
          <span>Tanggal:</span>
          <span data-testid="service-receipt-date">01/12/2024</span>
        </div>
        <div className="flex justify-between">
          <span>Customer:</span>
          <span data-testid="service-receipt-customer">John Doe</span>
        </div>
        <div className="flex justify-between">
          <span>HP/Telepon:</span>
          <span data-testid="service-receipt-phone">081234567890</span>
        </div>
      </div>
      
      <div className="border-t border-gray-300 mt-3 pt-3">
        <div className="font-medium mb-2">Barang yang diserahkan:</div>
        <div className="text-sm" data-testid="service-receipt-item">
          Laptop ASUS ROG - Tidak bisa nyala
        </div>
        <div className="text-sm text-gray-600 mt-1" data-testid="service-receipt-accessories">
          Kelengkapan: Charger, Tas
        </div>
      </div>
    </div>
  );

  const PaymentReceiptPreview = () => (
    <div className="print-preview rounded-lg p-4 relative z-10">
      <div className="text-center border-b border-gray-300 pb-3 mb-3">
        <div className="font-bold text-lg">TECH SERVICE</div>
        <div className="text-sm text-gray-600">NOTA PEMBAYARAN</div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>No. Invoice:</span>
          <span className="font-medium" data-testid="payment-receipt-invoice">INV-20241201-001</span>
        </div>
        <div className="flex justify-between">
          <span>Service:</span>
          <span data-testid="payment-receipt-service">SVC20241201001</span>
        </div>
      </div>
      
      <div className="border-t border-gray-300 mt-3 pt-3">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Service Laptop</span>
            <span data-testid="payment-receipt-service-cost">Rp 350.000</span>
          </div>
          <div className="flex justify-between">
            <span>Spare Part RAM</span>
            <span data-testid="payment-receipt-parts-cost">Rp 750.000</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-medium">
            <span>Subtotal</span>
            <span data-testid="payment-receipt-subtotal">Rp 1.100.000</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Diskon (10%)</span>
            <span data-testid="payment-receipt-discount">- Rp 110.000</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-bold text-lg">
            <span>TOTAL</span>
            <span data-testid="payment-receipt-total">Rp 990.000</span>
          </div>
        </div>
      </div>
    </div>
  );

  const SalesReceiptPreview = () => (
    <div className="print-preview rounded-lg p-4 relative z-10">
      <div className="text-center border-b border-gray-300 pb-3 mb-3">
        <div className="font-bold text-lg">TECH SERVICE</div>
        <div className="text-sm text-gray-600">NOTA PENJUALAN</div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>No. Penjualan:</span>
          <span className="font-medium" data-testid="sales-receipt-number">SALE-20241201-001</span>
        </div>
        <div className="flex justify-between">
          <span>Kasir:</span>
          <span data-testid="sales-receipt-cashier">Admin 1</span>
        </div>
      </div>
      
      <div className="border-t border-gray-300 mt-3 pt-3">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Mouse Wireless Logitech</span>
            <span data-testid="sales-receipt-item1">Rp 250.000</span>
          </div>
          <div className="flex justify-between">
            <span>Keyboard Mechanical</span>
            <span data-testid="sales-receipt-item2">Rp 650.000</span>
          </div>
          <div className="flex justify-between">
            <span>USB Flash Drive 32GB</span>
            <span data-testid="sales-receipt-item3">Rp 85.000</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-medium">
            <span>Subtotal</span>
            <span data-testid="sales-receipt-subtotal">Rp 985.000</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Diskon (Rp 35.000)</span>
            <span data-testid="sales-receipt-discount">- Rp 35.000</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-bold text-lg">
            <span>TOTAL</span>
            <span data-testid="sales-receipt-total">Rp 950.000</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <i className="fas fa-print text-purple-600 dark:text-purple-400"></i>
            </div>
            <div>
              <CardTitle className="text-lg">Enhanced Print Layouts</CardTitle>
              <p className="text-sm text-muted-foreground">Improved receipt and invoice templates</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
            <i className="fas fa-check mr-1"></i>Updated
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Service Receipt */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground flex items-center">
              <i className="fas fa-receipt text-blue-500 mr-2"></i>
              Tanda Terima Service
            </h4>
            <ServiceReceiptPreview />
          </div>
          
          {/* Payment Receipt */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground flex items-center">
              <i className="fas fa-credit-card text-green-500 mr-2"></i>
              Nota Pembayaran
            </h4>
            <PaymentReceiptPreview />
          </div>
          
          {/* Sales Receipt */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground flex items-center">
              <i className="fas fa-shopping-cart text-orange-500 mr-2"></i>
              Nota Penjualan
            </h4>
            <SalesReceiptPreview />
          </div>
        </div>
        
        {/* Print Settings */}
        <div className="mt-6">
          <h5 className="font-medium text-foreground mb-3">Print Configuration</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 dark:bg-muted/20 rounded-lg p-4">
              <div className="font-medium text-foreground mb-2">Paper Size</div>
              <Select defaultValue="a4">
                <SelectTrigger className="w-full" data-testid="select-paper-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4 (210x297mm)</SelectItem>
                  <SelectItem value="thermal_80">Thermal 80mm</SelectItem>
                  <SelectItem value="a5">Half Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-muted/50 dark:bg-muted/20 rounded-lg p-4">
              <div className="font-medium text-foreground mb-2">Logo Position</div>
              <Select defaultValue="center_top">
                <SelectTrigger className="w-full" data-testid="select-logo-position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center_top">Center Top</SelectItem>
                  <SelectItem value="left_top">Left Top</SelectItem>
                  <SelectItem value="right_top">Right Top</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-muted/50 dark:bg-muted/20 rounded-lg p-4">
              <div className="font-medium text-foreground mb-2">Font Size</div>
              <Select defaultValue="normal">
                <SelectTrigger className="w-full" data-testid="select-font-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (10pt)</SelectItem>
                  <SelectItem value="normal">Normal (12pt)</SelectItem>
                  <SelectItem value="large">Large (14pt)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
