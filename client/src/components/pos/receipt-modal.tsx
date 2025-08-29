import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Mail, X } from "lucide-react";

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  transaction: any;
}

export default function ReceiptModal({ open, onClose, transaction }: ReceiptModalProps) {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    // TODO: Implement email functionality
    console.log("Email receipt");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="no-print">
          <DialogTitle>Receipt</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-4 top-4"
            data-testid="button-close-receipt"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>
        
        {/* Printable Receipt */}
        <div className="space-y-6" id="receipt-content">
          <div className="text-center">
            <h3 className="text-lg font-bold" data-testid="text-store-name">
              LaptopPOS Service Center
            </h3>
            <p className="text-xs text-muted-foreground">
              Jl. Teknologi No. 123, Jakarta
            </p>
            <p className="text-xs text-muted-foreground">
              Phone: (021) 12345678
            </p>
          </div>

          <div className="border-t border-b py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Receipt #:</span>
              <span className="font-mono" data-testid="text-receipt-number">
                {transaction.id}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Date:</span>
              <span data-testid="text-receipt-date">
                {transaction.date?.toLocaleString('id-ID') || new Date().toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Customer:</span>
              <span data-testid="text-customer-name">
                {transaction.customer || "Walk-in Customer"}
              </span>
            </div>
          </div>

          {/* Transaction Items */}
          <div className="space-y-2 border-b pb-4">
            {transaction.items?.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm font-medium" data-testid={`item-name-${index}`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`item-details-${index}`}>
                    Qty: {item.quantity} x Rp {item.price.toLocaleString('id-ID')}
                  </p>
                </div>
                <p className="text-sm font-medium" data-testid={`item-total-${index}`}>
                  Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span data-testid="receipt-subtotal">
                Rp {transaction.subtotal?.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax (11%):</span>
              <span data-testid="receipt-tax">
                Rp {transaction.tax?.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t pt-2">
              <span>TOTAL:</span>
              <span data-testid="receipt-total">
                Rp {transaction.total?.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <p>Thank you for your business!</p>
            <p>Return policy: 7 days with receipt</p>
          </div>
        </div>

        <div className="flex space-x-3 pt-6 border-t no-print">
          <Button 
            onClick={handlePrint} 
            className="flex-1"
            data-testid="button-print-receipt"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button 
            variant="outline" 
            onClick={handleEmail} 
            className="flex-1"
            data-testid="button-email-receipt"
          >
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
