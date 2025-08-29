import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import TransactionModal from "@/components/pos/transaction-modal";
import ReceiptModal from "@/components/pos/receipt-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default function POS() {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);

  const handleNewTransaction = () => {
    setShowTransactionModal(true);
  };

  const handleTransactionComplete = (transaction: any) => {
    setCurrentTransaction(transaction);
    setShowTransactionModal(false);
    setShowReceiptModal(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Point of Sale" 
          breadcrumb="Home / POS"
          action={
            <Button 
              onClick={handleNewTransaction}
              data-testid="button-new-transaction"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Transaction
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
                <p className="text-muted-foreground">
                  Click "New Transaction" to start processing sales.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Today's Sales</span>
                    <span className="font-medium">Rp 0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Transactions</span>
                    <span className="font-medium">0</span>
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
