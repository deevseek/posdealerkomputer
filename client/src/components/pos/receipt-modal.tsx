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
  'a4': { name: 'A4 - Printer Biasa', width: 210, type: 'standard' },
  '58': { name: '58mm - Thermal Kecil', width: 58, type: 'thermal' },
  '80': { name: '80mm - Thermal Standar', width: 80, type: 'thermal' },
  '100': { name: '100mm - Thermal Besar', width: 100, type: 'thermal' },
} as const;

type PaperSize = keyof typeof paperSizes;

export default function ReceiptModal({ open, onClose, transaction }: ReceiptModalProps) {
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
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
      // Wait a bit to ensure content is fully loaded
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const element = document.getElementById('purchase-receipt-content');
      if (!element) {
        console.error('Receipt element not found');
        alert('Error: Receipt element not found. Please try again.');
        return;
      }

      // Make sure element is visible
      element.style.display = 'block';
      element.style.visibility = 'visible';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true,
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      // Check if canvas has content
      if (canvas.width === 0 || canvas.height === 0) {
        console.error('Canvas is empty');
        alert('Error: Failed to capture receipt content. Please try again.');
        return;
      }

      const imgData = canvas.toDataURL('image/png');
      const pageWidth = paperSizes[paperSize].width;
      const pageHeight = paperSize === 'a4' ? 297 : (canvas.height / canvas.width) * pageWidth;
      
      const pdf = new jsPDF('p', 'mm', paperSize === 'a4' ? [148, 210] : [pageWidth, pageHeight]);
      if (paperSize === 'a4') {
        // For A5 size (half page), fit to page with margins
        const margin = 4;
        const availableWidth = 148 - (2 * margin); // A5 width
        const scaledHeight = (canvas.height / canvas.width) * availableWidth;
        pdf.addImage(imgData, 'PNG', margin, margin, availableWidth, scaledHeight);
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      }
      pdf.save(`Nota-Pembayaran-POS-${transaction.transactionNumber || transaction.id}-${paperSize === 'a4' ? 'A5' : pageWidth + 'mm'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again or contact support.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    try {
      // Ukuran kertas sesuai pilihan
      const pageWidth = paperSizes[paperSize].width;
      const fontSize = paperSize === 'a4' ? '12px' : 
                      paperSize === '58' ? '7px' : 
                      paperSize === '80' ? '8px' : '10px';
      
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
              width: ${paperSize === 'a4' ? '140mm' : `${pageWidth}mm`};
              max-width: ${paperSize === 'a4' ? '140mm' : `${pageWidth}mm`};
              font-family: ${paperSize === 'a4' ? '"Arial", sans-serif' : '"Courier New", monospace'};
              font-size: ${paperSize === 'a4' ? '11px' : fontSize};
              line-height: ${paperSize === 'a4' ? '1.4' : '1.2'};
              color: #000;
              background: #fff;
              page-break-inside: avoid;
              page-break-after: avoid;
              page-break-before: avoid;
              height: auto;
              max-height: ${paperSize === 'a4' ? '270mm' : '280mm'};
              padding: ${paperSize === 'a4' ? '8mm' : '3mm'};
            }
            .no-print { 
              display: none !important; 
            }
            @page {
              size: ${paperSize === 'a4' ? '148mm 210mm' : `${pageWidth}mm 300mm`};
              margin: ${paperSize === 'a4' ? '4mm' : '1mm'};
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .flex { display: flex; }
            .flex-1 { flex: 1; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .border-t { 
              border-top: 1px dashed #333; 
              margin: ${paperSize === 'a4' ? '4px' : '2px'} 0 !important; 
            }
            .border-solid { border-style: solid; }
            .border-gray-800 { border-color: #333; }
            .text-gray-600 { color: #666; }
            .space-y-1 > * + * { margin-top: ${paperSize === 'a4' ? '2px' : '1px'} !important; }
            .py-2 { padding: ${paperSize === 'a4' ? '3px' : '1px'} 0 !important; }
            .my-2 { margin: ${paperSize === 'a4' ? '4px' : '2px'} 0 !important; }
            h3 { 
              font-size: ${paperSize === 'a4' ? '16px' : fontSize}; 
              margin: ${paperSize === 'a4' ? '8px' : '3px'} 0 !important; 
              text-align: center;
              font-weight: bold;
            }
            .header-spacing { 
              margin-bottom: ${paperSize === 'a4' ? '12px' : '6px'} !important; 
            }
            .section-spacing { 
              margin: ${paperSize === 'a4' ? '8px' : '4px'} 0 !important; 
            }
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
      case 'a4': return 'max-w-[500px]';
      case '58': return 'max-w-[58mm]';
      case '80': return 'max-w-[80mm]';
      case '100': return 'max-w-[100mm]';
      default: return 'max-w-[500px]';
    }
  };

  const getTextSize = () => {
    switch (paperSize) {
      case 'a4': return 'text-sm';
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
                <SelectItem value="a4">{paperSizes['a4'].name}</SelectItem>
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
              <div 
                className="p-4 font-mono" 
                id="purchase-receipt-content"
                style={{
                  minHeight: '300px',
                  display: 'block',
                  visibility: 'visible',
                  position: 'relative'
                }}
              >
                {/* Store Header */}
                <div className={`text-center header-spacing`}>
                  <h3 className="font-bold" data-testid="text-store-name" style={{ 
                    fontSize: paperSize === 'a4' ? '16px' : 
                              paperSize === '58' ? '10px' : '12px',
                    marginBottom: paperSize === 'a4' ? '3px' : '2px',
                    letterSpacing: paperSize !== 'a4' ? '0.5px' : '1px',
                    textTransform: 'uppercase'
                  }}>
                    {(storeConfig as any)?.name || 'LAPTOPPOS SERVICE CENTER'}
                  </h3>
                  <div className={paperSize === 'a4' ? 'text-sm' : 'text-xs'} style={{ 
                    fontSize: paperSize === 'a4' ? '10px' : 
                              paperSize === '58' ? '7px' : '8px',
                    lineHeight: '1.2'
                  }}>
                    {(storeConfig as any)?.address && (
                      <div data-testid="text-store-address" style={{ marginBottom: '1px' }}>
                        {paperSize === '58' && (storeConfig as any).address.length > 35 
                          ? (storeConfig as any).address.substring(0, 35) + '...'
                          : (storeConfig as any).address}
                      </div>
                    )}
                    <div style={{ marginBottom: '2px' }}>
                      {(storeConfig as any)?.phone && (
                        <span data-testid="text-store-phone">Tel: {(storeConfig as any).phone}</span>
                      )}
                      {paperSize === 'a4' && (storeConfig as any)?.email && (storeConfig as any)?.phone && <span> | </span>}
                      {paperSize === 'a4' && (storeConfig as any)?.email && (
                        <span data-testid="text-store-email">Email: {(storeConfig as any).email}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ 
                    marginTop: paperSize === 'a4' ? '6px' : '4px',
                    fontSize: paperSize === 'a4' ? '11px' : 
                              paperSize === '58' ? '8px' : '9px',
                    fontWeight: 'bold',
                    borderTop: '1px dashed #333',
                    borderBottom: '1px dashed #333',
                    paddingTop: '2px',
                    paddingBottom: '2px',
                    marginBottom: '2px'
                  }}>
                    ═══ NOTA PENJUALAN ═══
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
                  {(transaction.items && transaction.items.length > 0) ? (
                    transaction.items.map((item: any, index: number) => {
                      
                      // Handle different data structures
                      const itemName = item.product?.name || item.name || 'Unknown Product';
                      const unitPrice = parseFloat(item.unitPrice || item.price || '0');
                      const quantity = item.quantity || 1;
                      const totalPrice = parseFloat(item.totalPrice || '0') || (unitPrice * quantity);
                      
                      return (
                        <div key={item.id || index} className="space-y-1">
                          <div className="font-bold" data-testid={`item-name-${index}`}>
                            {itemName}
                          </div>
                          <div className="flex justify-between">
                            <span>{quantity} x {formatCurrency(unitPrice)}</span>
                            <span data-testid={`item-total-${index}`}>
                              {formatCurrency(totalPrice)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-2 text-muted-foreground">
                      Tidak ada item ditemukan
                    </div>
                  )}
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

                {/* Warranty Information */}
                {transaction.warrantyDuration && (
                  <>
                    <div className="border-t border-dashed border-gray-400 my-2"></div>
                    <div className={`${getTextSize()} space-y-1`}>
                      <div className="text-center font-bold" style={{
                        fontSize: paperSize === 'a4' ? '11px' : '8px',
                        marginBottom: '2px'
                      }}>
                        === INFORMASI GARANSI ===
                      </div>
                      <div className="flex justify-between">
                        <span>Durasi Garansi:</span>
                        <span data-testid="warranty-duration">
                          {transaction.warrantyDuration === 999999 ? 'Unlimited' : `${transaction.warrantyDuration} hari`}
                        </span>
                      </div>
                      {transaction.warrantyStartDate && (
                        <div className="flex justify-between">
                          <span>Mulai Garansi:</span>
                          <span data-testid="warranty-start">
                            {format(new Date(transaction.warrantyStartDate), 'dd/MM/yyyy', { locale: idLocale })}
                          </span>
                        </div>
                      )}
                      {transaction.warrantyEndDate && transaction.warrantyDuration !== 999999 && (
                        <div className="flex justify-between">
                          <span>Berakhir:</span>
                          <span data-testid="warranty-end">
                            {format(new Date(transaction.warrantyEndDate), 'dd/MM/yyyy', { locale: idLocale })}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="border-t border-dashed border-gray-400 my-2"></div>

                {/* Footer */}
                <div className="text-center section-spacing border-t border-dashed border-gray-400 pt-2" style={{
                  fontSize: paperSize === 'a4' ? '9px' : 
                           paperSize === '58' ? '6px' : '7px',
                  color: '#666',
                  marginTop: paperSize === 'a4' ? '8px' : '4px'
                }}>
                  <div style={{ marginBottom: '2px', fontWeight: 'bold' }}>
                    {paperSize === '58' ? '★ TERIMA KASIH ★' : '★ TERIMA KASIH ATAS PEMBELIAN ANDA ★'}
                  </div>
                  <div style={{ marginBottom: '1px' }}>
                    {paperSize === '58' ? 'Barang dibeli tidak dapat dikembalikan' : 'Barang yang sudah dibeli tidak dapat dikembalikan'}
                  </div>
                  <div style={{ marginBottom: '1px' }}>
                    Simpan nota ini sebagai bukti pembelian
                  </div>
                  {paperSize === 'a4' && (
                    <div style={{ marginBottom: '1px' }}>
                      Komplain maksimal 7 hari setelah pembelian
                    </div>
                  )}
                  <div data-testid="text-print-date" style={{ 
                    marginTop: '3px',
                    fontSize: paperSize === 'a4' ? '8px' : 
                              paperSize === '58' ? '5px' : '6px',
                    borderTop: '1px dashed #ccc',
                    paddingTop: '2px'
                  }}>
                    Cetak: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: idLocale })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
