import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Printer, Download, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useState } from "react";

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  transaction: any;
}

const paperSizes = {
  '58': { name: '58mm (2.3")', width: 58 },
  '80': { name: '80mm (3.1")', width: 80 },
  '100': { name: '100mm (3.9")', width: 100 },
} as const;

type PaperSize = keyof typeof paperSizes;

export default function ReceiptModal({ open, onClose, transaction }: ReceiptModalProps) {
  const [paperSize, setPaperSize] = useState<PaperSize>('80');
  const [isGenerating, setIsGenerating] = useState(false);

  // Get store config for receipt header - WITH BETTER CACHING
  const { data: storeConfig } = useQuery({
    queryKey: ['store-config-receipt'],
    queryFn: async () => {
      const response = await fetch('/api/store-config', { credentials: 'include' });
      if (!response.ok) return { name: 'LaptopPOS', address: '', phone: '' };
      return response.json();
    },
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  if (!transaction) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const element = document.getElementById('purchase-receipt-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const thermalWidth = paperSizes[paperSize].width;
      const thermalHeight = (canvas.height / canvas.width) * thermalWidth;
      
      const pdf = new jsPDF('p', 'mm', [thermalWidth, thermalHeight]);
      pdf.addImage(imgData, 'PNG', 0, 0, thermalWidth, thermalHeight);
      pdf.save(`Nota-Pembayaran-POS-${transaction.transactionNumber || transaction.id}-${thermalWidth}mm.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    try {
      // Ukuran kertas sesuai thermal yang dipilih
      const thermalWidth = paperSizes[paperSize].width;
      const fontSize = paperSize === '58' ? '7px' : paperSize === '80' ? '8px' : '10px';
      
      const printStyle = `
        <style id="thermal-print-style">
          @media print {
            * { 
              visibility: hidden; 
              margin: 0 !important; 
              padding: 0 !important;
              box-sizing: border-box;
            }
            #purchase-receipt-content, 
            #purchase-receipt-content * { 
              visibility: visible; 
            }
            #purchase-receipt-content {
              position: absolute;
              left: 0;
              top: 0;
              width: ${thermalWidth}mm;
              max-width: ${thermalWidth}mm;
              font-family: 'Courier New', monospace;
              font-size: ${fontSize};
              line-height: 1.0;
              color: #000;
              background: #fff;
              page-break-inside: avoid;
              page-break-after: avoid;
              page-break-before: avoid;
              height: auto;
              max-height: 250mm;
            }
            .no-print { 
              display: none !important; 
            }
            @page {
              size: ${thermalWidth}mm 300mm;
              margin: 1mm;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .flex { display: flex; }
            .flex-1 { flex: 1; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .border-t { 
              border-top: 1px dashed #333; 
              margin: 1px 0 !important; 
            }
            .border-solid { border-style: solid; }
            .border-gray-800 { border-color: #333; }
            .text-gray-600 { color: #666; }
            .space-y-1 > * + * { margin-top: 1px !important; }
            .py-2 { padding: 1px 0 !important; }
            .my-2 { margin: 1px 0 !important; }
            .mb-2 { margin-bottom: 1px !important; }
            .mt-6 { margin-top: 2px !important; }
            h3 { font-size: ${fontSize}; margin: 1px 0 !important; }
            div { margin: 0 !important; padding: 0 !important; }
            p { margin: 0 !important; padding: 0 !important; }
          }
          @media screen {
            #thermal-print-style { display: none; }
          }
        </style>
      `;
      
      // Hapus style print lama jika ada
      const oldStyle = document.getElementById('thermal-print-style');
      if (oldStyle) oldStyle.remove();
      
      // Tambahkan CSS print baru
      document.head.insertAdjacentHTML('beforeend', printStyle);
      
      // Print
      window.print();
      
      // Restore setelah delay
      setTimeout(() => {
        const printStyleElement = document.getElementById('thermal-print-style');
        if (printStyleElement) {
          printStyleElement.remove();
        }
      }, 1000);
      
    } catch (error) {
      console.error('Print error:', error);
      alert('Terjadi kesalahan saat mencetak. Silakan coba lagi.');
    }
  };

  const getReceiptWidth = () => {
    switch (paperSize) {
      case '58': return 'max-w-[58mm]';
      case '80': return 'max-w-[80mm]';
      case '100': return 'max-w-[100mm]';
      default: return 'max-w-[80mm]';
    }
  };

  const getTextSize = () => {
    switch (paperSize) {
      case '58': return 'text-xs';
      case '80': return 'text-sm';
      case '100': return 'text-base';
      default: return 'text-sm';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="no-print">
          <DialogTitle>Nota Pembayaran POS</DialogTitle>
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

        <div className="space-y-4">
          {/* Paper Size Selector */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg no-print">
            <Label htmlFor="paper-size" className="font-medium">Ukuran Kertas:</Label>
            <Select value={paperSize} onValueChange={(value: PaperSize) => setPaperSize(value)}>
              <SelectTrigger className="w-48" id="paper-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58">{paperSizes['58'].name}</SelectItem>
                <SelectItem value="80">{paperSizes['80'].name}</SelectItem>
                <SelectItem value="100">{paperSizes['100'].name}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 no-print">
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
              onClick={generatePDF}
              disabled={isGenerating}
              className="flex-1"
              data-testid="button-download-receipt"
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>

          <Separator className="no-print" />

          {/* Preview Receipt */}
          <div className="flex justify-center">
            <div className={`${getReceiptWidth()} mx-auto bg-white border rounded-lg overflow-hidden shadow-lg`}>
              <div className="p-4 font-mono" id="purchase-receipt-content">
                {/* Store Header */}
                <div className={`text-center ${getTextSize()} space-y-1`}>
                  <h3 className="font-bold" data-testid="text-store-name">
                    {(storeConfig as any)?.name || 'LaptopPOS Service Center'}
                  </h3>
                  {(storeConfig as any)?.address && (
                    <div data-testid="text-store-address">
                      {(storeConfig as any).address}
                    </div>
                  )}
                  <div className="space-y-0">
                    {(storeConfig as any)?.phone && (
                      <div data-testid="text-store-phone">Tel: {(storeConfig as any).phone}</div>
                    )}
                    {(storeConfig as any)?.email && (
                      <div data-testid="text-store-email">{(storeConfig as any).email}</div>
                    )}
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-400 my-2"></div>

                {/* Transaction Info */}
                <div className={`${getTextSize()} space-y-1`}>
                  <div className="flex justify-between">
                    <span>No. Transaksi:</span>
                    <span data-testid="text-receipt-number">
                      {transaction.transactionNumber || transaction.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tanggal:</span>
                    <span data-testid="text-receipt-date">
                      {format(new Date(transaction.createdAt || transaction.date || new Date()), 'dd/MM/yyyy HH:mm', { locale: idLocale })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span data-testid="text-cashier-name">
                      {transaction.user?.firstName || 'Admin'}
                    </span>
                  </div>
                  {transaction.customer && (
                    <div className="flex justify-between">
                      <span>Pelanggan:</span>
                      <span data-testid="text-customer-name">
                        {transaction.customer.name || transaction.customer}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-gray-400 my-2"></div>

                {/* Items */}
                <div className={`${getTextSize()} space-y-1`}>
                  {transaction.items?.map((item: any, index: number) => (
                    <div key={index} className="space-y-1">
                      <div className="font-bold" data-testid={`item-name-${index}`}>
                        {item.product?.name || item.name}
                      </div>
                      <div className="flex justify-between">
                        <span>{item.quantity} x {formatCurrency(item.unitPrice || item.price)}</span>
                        <span data-testid={`item-total-${index}`}>
                          {formatCurrency(item.totalPrice || (item.price * item.quantity))}
                        </span>
                      </div>
                    </div>
                  )) || []}
                </div>

                <div className="border-t border-solid border-gray-800 my-2"></div>

                {/* Totals */}
                <div className={`${getTextSize()} space-y-1`}>
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span data-testid="receipt-subtotal">
                      {formatCurrency(Number(transaction.subtotal || 0))}
                    </span>
                  </div>
                  {transaction.taxAmount && Number(transaction.taxAmount) > 0 && (
                    <div className="flex justify-between">
                      <span>Pajak:</span>
                      <span data-testid="receipt-tax">
                        {formatCurrency(Number(transaction.taxAmount))}
                      </span>
                    </div>
                  )}
                  {transaction.discountAmount && Number(transaction.discountAmount) > 0 && (
                    <div className="flex justify-between">
                      <span>Diskon:</span>
                      <span data-testid="receipt-discount">
                        -{formatCurrency(Number(transaction.discountAmount))}
                      </span>
                    </div>
                  )}
                  <div className={`flex justify-between font-bold ${getTextSize()}`}>
                    <span>TOTAL:</span>
                    <span data-testid="receipt-total">
                      {formatCurrency(Number(transaction.total || 0))}
                    </span>
                  </div>
                  {transaction.paymentMethod && (
                    <div className="flex justify-between">
                      <span>Pembayaran:</span>
                      <span data-testid="receipt-payment">
                        {transaction.paymentMethod === 'cash' ? 'Tunai' : 
                         transaction.paymentMethod === 'card' ? 'Kartu' : 
                         transaction.paymentMethod === 'transfer' ? 'Transfer' : 
                         transaction.paymentMethod}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-gray-400 my-2"></div>

                {/* Footer */}
                <div className={`text-center ${getTextSize()} text-gray-600 space-y-1 mt-6`}>
                  <div>Terima kasih atas pembelian Anda!</div>
                  <div>Barang yang sudah dibeli tidak dapat dikembalikan</div>
                  <div data-testid="text-print-date">Cetak: {format(new Date(), 'dd/MM/yy HH:mm', { locale: idLocale })}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
