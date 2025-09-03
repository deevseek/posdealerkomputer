import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function InventoryAlerts() {
  const { data: lowStockProducts, isLoading } = useQuery({
    queryKey: ["/api/products/low-stock"],
    retry: false,
  });

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <CardTitle>Peringatan Inventori</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : !lowStockProducts || lowStockProducts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Semua produk stoknya mencukupi.
          </p>
        ) : (
          <div className="space-y-4">
            {lowStockProducts.map((product: any) => {
              const isVeryLow = product.stock <= 1;
              
              return (
                <div 
                  key={product.id}
                  className={`flex items-center justify-between p-3 rounded-md border ${
                    isVeryLow 
                      ? 'border-destructive/20 bg-destructive/5' 
                      : 'border-secondary/20 bg-secondary/5'
                  }`}
                  data-testid={`inventory-alert-${product.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isVeryLow ? 'bg-destructive/10' : 'bg-secondary/10'
                    }`}>
                      {isVeryLow ? (
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      ) : (
                        <Info className="w-5 h-5 text-secondary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Stok: <span data-testid={`stock-count-${product.id}`}>{product.stock} unit</span>
                        {product.minStock && (
                          <span className="ml-2">Minimal: {product.minStock}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    data-testid={`button-reorder-${product.id}`}
                  >
                    Pesan Ulang
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
