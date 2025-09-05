import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DiscountConfig } from "@shared/schema";

export default function TransactionDiscountSetup() {
  const { data: discountConfigs = [] } = useQuery<DiscountConfig[]>({
    queryKey: ["/api/discounts/config"],
  });

  const percentageDiscount = discountConfigs.find(config => config.type === "percentage");
  const rupiahDiscount = discountConfigs.find(config => config.type === "rupiah");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <i className="fas fa-percentage text-green-600 dark:text-green-400"></i>
            </div>
            <div>
              <CardTitle className="text-lg">Transaction Discount System</CardTitle>
              <p className="text-sm text-muted-foreground">Percentage & Rupiah based discounts</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            <i className="fas fa-check mr-1"></i>Installed
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Percentage Discount */}
          <div className="feature-card bg-muted/50 dark:bg-muted/20 rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-foreground">Diskon Persentase</h4>
              <i className="fas fa-percent text-primary"></i>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Max Discount:</span>
                <span className="font-medium text-foreground">
                  {percentageDiscount?.maxValue || 50}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Min Transaction:</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(percentageDiscount?.minTransactionAmount || 100000)}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xs text-muted-foreground mb-1">Sample Calculation:</div>
                <div className="bg-card border border-border p-2 rounded text-sm">
                  <span data-testid="percentage-sample">
                    Rp 500.000 - 10% = Rp 450.000
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Rupiah Discount */}
          <div className="feature-card bg-muted/50 dark:bg-muted/20 rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-foreground">Diskon Nominal</h4>
              <i className="fas fa-money-bill text-secondary"></i>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Max Discount:</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(rupiahDiscount?.maxValue || 200000)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Min Transaction:</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(rupiahDiscount?.minTransactionAmount || 300000)}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xs text-muted-foreground mb-1">Sample Calculation:</div>
                <div className="bg-card border border-border p-2 rounded text-sm">
                  <span data-testid="rupiah-sample">
                    Rp 500.000 - Rp 50.000 = Rp 450.000
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Discount Interface Preview */}
        <div className="mt-6">
          <h5 className="font-medium text-foreground mb-3">Interface Preview</h5>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label htmlFor="discount-type" className="text-sm font-medium text-foreground mb-2 block">
                    Jenis Diskon
                  </Label>
                  <Select defaultValue="percentage">
                    <SelectTrigger className="w-full" data-testid="select-discount-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Persentase (%)</SelectItem>
                      <SelectItem value="rupiah">Nominal (Rp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="discount-value" className="text-sm font-medium text-foreground mb-2 block">
                    Nilai Diskon
                  </Label>
                  <Input 
                    type="text" 
                    placeholder="10" 
                    defaultValue="10"
                    data-testid="input-discount-value"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium text-foreground mb-2 block">
                    Total Setelah Diskon
                  </Label>
                  <div className="p-3 bg-muted rounded-md text-lg font-semibold text-foreground">
                    <span data-testid="total-after-discount">Rp 450.000</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
