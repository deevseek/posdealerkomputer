import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, Download, X } from 'lucide-react';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ServicePaymentReceiptProps {
  open: boolean;
  onClose: () => void;
  serviceTicket: {
    id: string;
    ticketNumber: string;
    customerId: string;
    deviceType: string;
    deviceBrand?: string;
    deviceModel?: string;
    serialNumber?: string;
    problem: string;
    diagnosis?: string;
    solution?: string;
    actualCost?: string;
    partsCost?: string;
    laborCost?: string;
    status: string;
    createdAt: string;
    completedAt?: string;
    parts?: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: string;
      totalPrice: string;
    }>;
  };
  customer: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  storeConfig: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  technician?: {
    id: string;
    name: string;
    username: string;
  } | null;
}

const paperSizes = {
  'a4': { name: 'A4 - Printer Biasa', width: 210, type: 'standard' },
  '58': { name: '58mm - Thermal Kecil', width: 58, type: 'thermal' },
  '80': { name: '80mm - Thermal Standar', width: 80, type: 'thermal' },
  '100': { name: '100mm - Thermal Besar', width: 100, type: 'thermal' },
} as const;

type PaperSize = keyof typeof paperSizes;

export default function ServicePaymentReceipt({ 
  open, 
  onClose, 
  serviceTicket, 
  customer, 
  storeConfig, 
  technician 
}: ServicePaymentReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (open) {
      // Generate QR Code untuk tracking
      const generateQR = async () => {
        try {
          const trackingURL = `${window.location.origin}/service-status?ticket=${serviceTicket.ticketNumber}`;
          const qrDataURL = await QRCode.toDataURL(trackingURL, {
            width: 120,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          });
          setQrCodeDataURL(qrDataURL);
        } catch (err) {
          console.error('Error generating QR code:', err);
        }
      };
      generateQR();
    }
  }, [serviceTicket.ticketNumber, open]);

  if (!open) return null;

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(amount));
  };

  const getTotalCost = () => {
    const actualCost = Number(serviceTicket.actualCost || 0);
    const partsCost = Number(serviceTicket.partsCost || 0);
    const laborCost = Number(serviceTicket.laborCost || 0);
    return Math.max(actualCost, partsCost + laborCost);
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const element = document.getElementById('service-payment-receipt-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pageWidth = paperSizes[paperSize].width;
      const pageHeight = paperSize === 'a4' ? 297 : (canvas.height / canvas.width) * pageWidth;
      
      const pdf = new jsPDF('p', 'mm', paperSize === 'a4' ? 'a4' : [pageWidth, pageHeight]);
      if (paperSize === 'a4') {
        // For A4, fit to page with margins
        const margin = 10;
        const availableWidth = pageWidth - (2 * margin);
        const scaledHeight = (canvas.height / canvas.width) * availableWidth;
        pdf.addImage(imgData, 'PNG', margin, margin, availableWidth, scaledHeight);
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      }
      pdf.save(`Nota-Pembayaran-Service-${serviceTicket.ticketNumber}-${pageWidth}mm.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    try {
      const pageWidth = paperSizes[paperSize].width;
      const fontSize = paperSize === 'a4' ? '12px' : 
                      paperSize === '58' ? '7px' : 
                      paperSize === '80' ? '8px' : '10px';
      
      const printStyle = `
        <style id="service-payment-print-style">
          @media print {
            * { 
              visibility: hidden; 
              margin: 0 !important; 
              padding: 0 !important;
              box-sizing: border-box;
            }
            #service-payment-receipt-content, 
            #service-payment-receipt-content * { 
              visibility: visible; 
            }
            #service-payment-receipt-content {
              position: absolute;
              left: 0;
              top: 0;
              width: ${pageWidth}mm;
              max-width: ${pageWidth}mm;
              font-family: ${paperSize === 'a4' ? 'Arial, sans-serif' : "'Courier New', monospace"};
              font-size: ${fontSize};
              line-height: ${paperSize === 'a4' ? '1.4' : '1.0'};
              color: #000;
              background: #fff;
              page-break-inside: avoid;
              height: auto;
              max-height: ${paperSize === 'a4' ? '270mm' : '300mm'};
              padding: ${paperSize === 'a4' ? '10mm' : '2mm'};
            }
            .no-print { 
              display: none !important; 
            }
            @page {
              size: ${paperSize === 'a4' ? 'A4' : `${pageWidth}mm 350mm`};
              margin: ${paperSize === 'a4' ? '10mm' : '1mm'};
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .flex { display: flex; }
            .flex-1 { flex: 1; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .border-t { 
              border-top: 1px dashed #333; 
              margin: 2px 0 !important; 
            }
            .border-b { 
              border-bottom: 1px dashed #333; 
              margin: 2px 0 !important; 
            }
            .space-y-1 > * + * { margin-top: 1px !important; }
            .py-2 { padding: 2px 0 !important; }
            .my-2 { margin: 2px 0 !important; }
            .mb-2 { margin-bottom: 2px !important; }
            .mt-4 { margin-top: 3px !important; }
            h3 { font-size: ${fontSize}; margin: 2px 0 !important; }
            img { max-width: 40mm; height: auto; }
          }
          @media screen {
            #service-payment-print-style { display: none; }
          }
        </style>
      `;
      
      const oldStyle = document.getElementById('service-payment-print-style');
      if (oldStyle) oldStyle.remove();
      
      document.head.insertAdjacentHTML('beforeend', printStyle);
      window.print();
      
      setTimeout(() => {
        const printStyleElement = document.getElementById('service-payment-print-style');
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
          <DialogTitle>Nota Pembayaran Service</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-4 top-4"
            data-testid="button-close-payment-receipt"
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

          {/* Print Actions */}
          <div className="flex gap-2 no-print">
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Cetak Nota
            </Button>
            <Button 
              onClick={generatePDF} 
              variant="outline" 
              disabled={isGenerating}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>

          {/* Receipt Content */}
          <Card className="p-0 shadow-none">
            <div 
              id="service-payment-receipt-content"
              className={`mx-auto bg-white p-4 ${getReceiptWidth()} ${getTextSize()}`}
              ref={receiptRef}
            >
              {/* Header */}
              <div className="text-center space-y-1 mb-4">
                <h1 className="font-bold text-lg">{storeConfig.name}</h1>
                <p className="text-xs">{storeConfig.address}</p>
                <p className="text-xs">Telp: {storeConfig.phone}</p>
                <p className="text-xs">Email: {storeConfig.email}</p>
              </div>

              <div className="border-t border-b border-dashed border-gray-400 py-2 my-2">
                <h2 className="text-center font-bold">NOTA PEMBAYARAN SERVICE</h2>
                <p className="text-center text-xs">No: {serviceTicket.ticketNumber}</p>
              </div>

              {/* Customer Info */}
              <div className="space-y-1 mb-3">
                <div className="flex justify-between">
                  <span className="text-xs">Tanggal:</span>
                  <span className="text-xs">{format(new Date(), 'dd/MM/yyyy HH:mm', { locale: id })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs">Customer:</span>
                  <span className="text-xs">{customer.name}</span>
                </div>
                {customer.phone && (
                  <div className="flex justify-between">
                    <span className="text-xs">Telp:</span>
                    <span className="text-xs">{customer.phone}</span>
                  </div>
                )}
              </div>

              {/* Device Info */}
              <div className="border-t border-dashed border-gray-400 py-2 my-2">
                <h3 className="font-bold text-xs mb-1">DETAIL PERANGKAT</h3>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs">Jenis:</span>
                    <span className="text-xs">{serviceTicket.deviceType}</span>
                  </div>
                  {serviceTicket.deviceBrand && (
                    <div className="flex justify-between">
                      <span className="text-xs">Merk:</span>
                      <span className="text-xs">{serviceTicket.deviceBrand}</span>
                    </div>
                  )}
                  {serviceTicket.deviceModel && (
                    <div className="flex justify-between">
                      <span className="text-xs">Model:</span>
                      <span className="text-xs">{serviceTicket.deviceModel}</span>
                    </div>
                  )}
                  {serviceTicket.serialNumber && (
                    <div className="flex justify-between">
                      <span className="text-xs">S/N:</span>
                      <span className="text-xs">{serviceTicket.serialNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Details */}
              <div className="border-t border-dashed border-gray-400 py-2 my-2">
                <h3 className="font-bold text-xs mb-1">RINCIAN PERBAIKAN</h3>
                <div className="space-y-1">
                  <div>
                    <span className="text-xs font-semibold">Masalah:</span>
                    <p className="text-xs">{serviceTicket.problem}</p>
                  </div>
                  {serviceTicket.diagnosis && (
                    <div>
                      <span className="text-xs font-semibold">Diagnosa:</span>
                      <p className="text-xs">{serviceTicket.diagnosis}</p>
                    </div>
                  )}
                  {serviceTicket.solution && (
                    <div>
                      <span className="text-xs font-semibold">Solusi:</span>
                      <p className="text-xs">{serviceTicket.solution}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Parts Used */}
              {serviceTicket.parts && serviceTicket.parts.length > 0 && (
                <div className="border-t border-dashed border-gray-400 py-2 my-2">
                  <h3 className="font-bold text-xs mb-1">SPAREPART DIGUNAKAN</h3>
                  {serviceTicket.parts.map((part, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span>{part.productName} x{part.quantity}</span>
                      <span>{formatCurrency(part.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Cost Breakdown */}
              <div className="border-t border-dashed border-gray-400 py-2 my-2">
                <h3 className="font-bold text-xs mb-1">RINCIAN BIAYA</h3>
                <div className="space-y-1">
                  {serviceTicket.laborCost && Number(serviceTicket.laborCost) > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>Biaya Jasa:</span>
                      <span>{formatCurrency(serviceTicket.laborCost)}</span>
                    </div>
                  )}
                  {serviceTicket.partsCost && Number(serviceTicket.partsCost) > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>Biaya Sparepart:</span>
                      <span>{formatCurrency(serviceTicket.partsCost)}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-gray-400 pt-1 mt-1">
                    <div className="flex justify-between font-bold text-xs">
                      <span>TOTAL PEMBAYARAN:</span>
                      <span>{formatCurrency(getTotalCost())}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Dates */}
              <div className="border-t border-dashed border-gray-400 py-2 my-2">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-semibold">
                      {serviceTicket.status === 'completed' ? 'SELESAI' : 
                       serviceTicket.status === 'delivered' ? 'DIAMBIL' : 'SELESAI'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tgl Masuk:</span>
                    <span>{format(new Date(serviceTicket.createdAt), 'dd/MM/yyyy', { locale: id })}</span>
                  </div>
                  {serviceTicket.completedAt && (
                    <div className="flex justify-between">
                      <span>Tgl Selesai:</span>
                      <span>{format(new Date(serviceTicket.completedAt), 'dd/MM/yyyy', { locale: id })}</span>
                    </div>
                  )}
                  {technician && (
                    <div className="flex justify-between">
                      <span>Teknisi:</span>
                      <span>{technician.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Code */}
              {qrCodeDataURL && (
                <div className="text-center py-2 my-2">
                  <img 
                    src={qrCodeDataURL} 
                    alt="QR Code" 
                    className="mx-auto"
                    style={{ 
                      width: paperSize === 'a4' ? '50mm' : 
                             paperSize === '58' ? '30mm' : '35mm', 
                      height: 'auto' 
                    }}
                  />
                  <p className="text-xs mt-1">Scan untuk cek status service</p>
                </div>
              )}

              {/* Footer */}
              <div className="border-t border-dashed border-gray-400 pt-2 mt-4">
                <div className="text-center text-xs space-y-1">
                  <p className="font-bold">TERIMA KASIH</p>
                  <p>Atas kepercayaan Anda menggunakan layanan kami</p>
                  <p>Garansi service 30 hari dari tanggal pengambilan</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}