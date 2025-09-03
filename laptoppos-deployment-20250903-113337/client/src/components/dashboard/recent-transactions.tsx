import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingCart, Wrench, CheckCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function RecentTransactions() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["/api/transactions"],
    retry: false,
  });

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>Transaksi Terbaru</CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-view-all-transactions">
            Lihat Semua <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Tidak ada transaksi. Mulai dengan membuat transaksi baru.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase border-b">
                <tr>
                  <th className="text-left py-3">ID</th>
                  <th className="text-left py-3">Pelanggan</th>
                  <th className="text-left py-3">Jenis</th>
                  <th className="text-right py-3">Jumlah</th>
                  <th className="text-left py-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                {transactions.slice(0, 5).map((transaction: any) => (
                  <tr key={transaction.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 font-medium" data-testid={`transaction-id-${transaction.id}`}>
                      {transaction.transactionNumber || transaction.id}
                    </td>
                    <td className="py-3">
                      {transaction.customer?.name || "Walk-in Customer"}
                    </td>
                    <td className="py-3">
                      <Badge variant="outline" className="flex items-center w-fit">
                        {transaction.type === 'sale' ? (
                          <ShoppingCart className="w-3 h-3 mr-1" />
                        ) : (
                          <Wrench className="w-3 h-3 mr-1" />
                        )}
                        {transaction.type === 'sale' ? 'Penjualan' : 'Servis'}
                      </Badge>
                    </td>
                    <td className="py-3 text-right font-medium">
                      Rp {Number(transaction.total).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3">
                      <Badge variant="secondary" className="flex items-center w-fit">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Selesai
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
