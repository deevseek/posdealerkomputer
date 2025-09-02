import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import TransactionModal from "@/components/pos/transaction-modal";
import ReceiptModal from "@/components/pos/receipt-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye } from "lucide-react";
// Format currency helper function
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function POS() {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const queryClient = useQueryClient();

  // Fetch recent transactions (limit to 10)
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/transactions", { limit: 10 }],
    queryFn: async () => {
      const response = await fetch("/api/transactions?limit=10", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
  });

  // Fetch dashboard stats for today's data
  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  }) as { data: { todaySales?: string; todayRevenue?: string; activeServices?: number } | undefined };

  const handleNewTransaction = () => {
    setShowTransactionModal(true);
  };

  const handleTransactionComplete = (transaction: any) => {
    setCurrentTransaction(transaction);
    setShowTransactionModal(false);
    setShowReceiptModal(true);
    // Refresh data after transaction
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
  };

  const handleViewTransaction = (transaction: any) => {
    setCurrentTransaction(transaction);
    setShowReceiptModal(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Point of Sale" 
          breadcrumb="Beranda / POS"
          action={
            <Button 
              onClick={handleNewTransaction}
              data-testid="button-new-transaction"
            >
              <Plus className="w-4 h-4 mr-2" />
              Transaksi Baru
            </Button>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <p className="text-muted-foreground">Loading transactions...</p>
                ) : transactions.length === 0 ? (
                  <p className="text-muted-foreground">
                    No transactions yet. Click "New Transaction" to start processing sales.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((transaction: any) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        data-testid={`transaction-${transaction.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{transaction.transactionNumber}</span>
                            <Badge variant={transaction.type === 'sale' ? 'default' : 'secondary'}>
                              {transaction.type}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {transaction.customer?.name || 'Walk-in Customer'} • {' '}
                            {new Date(transaction.createdAt).toLocaleString('id-ID')}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(parseFloat(transaction.total))}</div>
                            <div className="text-sm text-muted-foreground">
                              {transaction.paymentMethod || 'cash'}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewTransaction(transaction)}
                            data-testid={`button-view-transaction-${transaction.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Product Sales</span>
                    <span className="font-medium">
                      {stats?.todaySales ? formatCurrency(parseFloat(stats.todaySales)) : 'Rp 0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                    <span className="font-medium">
                      {stats?.todayRevenue ? formatCurrency(parseFloat(stats.todayRevenue)) : 'Rp 0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Transactions</span>
                    <span className="font-medium">{transactions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Services</span>
                    <span className="font-medium">{stats?.activeServices || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <TransactionModal
        open={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onComplete={handleTransactionComplete}
      />

      <ReceiptModal
        open={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        transaction={currentTransaction}
      />
    </div>
  );
}
