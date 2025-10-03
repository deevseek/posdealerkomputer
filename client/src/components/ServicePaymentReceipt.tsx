import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, Download, X } from 'lucide-react';
import QRCode from 'qrcode';
import { formatDateShort, formatDateWithTime, formatDateForDisplay } from '@shared/utils/timezone';
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
    // Warranty fields
    warrantyDuration?: number;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
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
      // Wait a bit to ensure content is fully loaded
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const element = document.getElementById('service-payment-receipt-content');
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
      pdf.save(`Nota-Pembayaran-Service-${serviceTicket.ticketNumber}-${paperSize === 'a4' ? 'A5' : pageWidth + 'mm'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again or contact support.');
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
              width: ${paperSize === 'a4' ? '140mm' : `${pageWidth}mm`};
              max-width: ${paperSize === 'a4' ? '140mm' : `${pageWidth}mm`};
              font-family: ${paperSize === 'a4' ? '"Arial", sans-serif' : '"Courier New", monospace'};
              font-size: ${paperSize === 'a4' ? '10px' : fontSize};
              line-height: ${paperSize === 'a4' ? '1.3' : '1.1'};
              color: #000;
              background: #fff;
              page-break-inside: avoid;
              height: auto;
              max-height: ${paperSize === 'a4' ? '270mm' : '300mm'};
              padding: ${paperSize === 'a4' ? '6mm' : '2mm'};
            }
            .no-print { 
              display: none !important; 
            }
            @page {
              size: ${paperSize === 'a4' ? '148mm 210mm' : `${pageWidth}mm 350mm`};
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
            h3 { font-size: ${paperSize === 'a4' ? '12px' : fontSize}; margin: ${paperSize === 'a4' ? '4px' : '2px'} 0 !important; font-weight: bold; }
            img { max-width: ${paperSize === 'a4' ? '50mm' : '30mm'}; height: auto; }
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
              style={{ 
                minHeight: '400px',
                display: 'block',
                visibility: 'visible',
                position: 'relative'
              }}
            >
              {/* Header */}
              <div className={`text-center ${paperSize === 'a4' ? 'mb-6' : 'mb-4'}`}>
                <h1 className={`font-bold tracking-wide ${
                  paperSize === 'a4' ? 'text-2xl mb-3' : 
                  paperSize === '58' ? 'text-sm mb-2' : 
                  'text-lg mb-2'
                }`}>{storeConfig.name}</h1>
                <div className={`text-gray-700 space-y-1 ${
                  paperSize === 'a4' ? 'text-sm' : 
                  paperSize === '58' ? 'text-xs' : 
                  'text-xs'
                }`}>
                  <p>{storeConfig.address}</p>
                  <p>Telp: {storeConfig.phone} | Email: {storeConfig.email}</p>
                </div>
              </div>

              <div className={`bg-gray-100 py-2 px-3 mb-4 rounded ${paperSize !== 'a4' ? 'text-center' : ''}`}>
                <h2 className={`text-center font-bold ${
                  paperSize === 'a4' ? 'text-lg' : 
                  paperSize === '58' ? 'text-xs' : 
                  'text-sm'
                }`}>NOTA PEMBAYARAN SERVICE</h2>
                <p className={`text-center mt-1 ${
                  paperSize === 'a4' ? 'text-sm' : 
                  paperSize === '58' ? 'text-xs' : 
                  'text-xs'
                }`}>No: {serviceTicket.ticketNumber}</p>
              </div>

              {/* Customer Info */}
              <div className={`${paperSize === 'a4' ? 'grid grid-cols-2 gap-6 mb-6' : 'space-y-4 mb-4'}`}>
                <div>
                  <h3 className={`font-semibold border-b pb-1 mb-2 ${
                    paperSize === 'a4' ? 'text-sm' : 
                    paperSize === '58' ? 'text-xs' : 
                    'text-xs'
                  }`}>INFORMASI NOTA</h3>
                  <div className={`space-y-1 ${
                    paperSize === 'a4' ? 'text-sm' : 
                    paperSize === '58' ? 'text-xs' : 
                    'text-xs'
                  }`}>
                    <div><span className="text-gray-600">Tanggal:</span> {formatDateWithTime(new Date())}</div>
                    <div><span className="text-gray-600">Status:</span> <span className="text-green-600 font-medium">LUNAS</span></div>
                  </div>
                </div>
                <div>
                  <h3 className={`font-semibold border-b pb-1 mb-2 ${
                    paperSize === 'a4' ? 'text-sm' : 
                    paperSize === '58' ? 'text-xs' : 
                    'text-xs'
                  }`}>DATA PELANGGAN</h3>
                  <div className={`space-y-1 ${
                    paperSize === 'a4' ? 'text-sm' : 
                    paperSize === '58' ? 'text-xs' : 
                    'text-xs'
                  }`}>
                    <div><span className="text-gray-600">Nama:</span> {customer.name}</div>
                    {customer.phone && <div><span className="text-gray-600">Telp:</span> {customer.phone}</div>}
                    {customer.email && paperSize === 'a4' && <div><span className="text-gray-600">Email:</span> {customer.email}</div>}
                  </div>
                </div>
              </div>

              {/* Device Info */}
              <div className="bg-gray-50 p-4 rounded mb-4">
                <h3 className="font-semibold text-sm mb-3 border-b pb-1">DETAIL PERANGKAT</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 block">Jenis Perangkat:</span>
                    <span className="font-medium">{serviceTicket.deviceType}</span>
                  </div>
                  {serviceTicket.deviceBrand && (
                    <div>
                      <span className="text-gray-600 block">Merk:</span>
                      <span className="font-medium">{serviceTicket.deviceBrand}</span>
                    </div>
                  )}
                  {serviceTicket.deviceModel && (
                    <div>
                      <span className="text-gray-600 block">Model:</span>
                      <span className="font-medium">{serviceTicket.deviceModel}</span>
                    </div>
                  )}
                  {serviceTicket.serialNumber && (
                    <div>
                      <span className="text-gray-600 block">Serial Number:</span>
                      <span className="font-medium">{serviceTicket.serialNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Details */}
              <div className="mb-4">
                <h3 className="font-semibold text-sm mb-3 border-b pb-1">RINCIAN PERBAIKAN</h3>
                <div className="space-y-3 text-sm">
                  <div className="bg-red-50 p-3 rounded">
                    <span className="text-red-700 font-medium block mb-1">Keluhan/Masalah:</span>
                    <p className="text-gray-800">{serviceTicket.problem}</p>
                  </div>
                  {serviceTicket.diagnosis && (
                    <div className="bg-blue-50 p-3 rounded">
                      <span className="text-blue-700 font-medium block mb-1">Diagnosa:</span>
                      <p className="text-gray-800">{serviceTicket.diagnosis}</p>
                    </div>
                  )}
                  {serviceTicket.solution && (
                    <div className="bg-green-50 p-3 rounded">
                      <span className="text-green-700 font-medium block mb-1">Solusi & Tindakan:</span>
                      <p className="text-gray-800">{serviceTicket.solution}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Parts Used */}
              {serviceTicket.parts && serviceTicket.parts.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-sm mb-3 border-b pb-1">SPAREPART YANG DIGUNAKAN</h3>
                  <div className="bg-yellow-50 p-4 rounded">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-yellow-200">
                          <th className="text-left py-1">Item</th>
                          <th className="text-center py-1">Qty</th>
                          <th className="text-right py-1">Harga</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviceTicket.parts.map((part, index) => (
                          <tr key={index} className="border-b border-yellow-100">
                            <td className="py-2">{part.productName}</td>
                            <td className="text-center py-2">{part.quantity}</td>
                            <td className="text-right py-2 font-medium">{formatCurrency(part.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Cost Breakdown */}
              <div className="bg-gray-100 p-4 rounded mb-4">
                <h3 className="font-semibold text-sm mb-3 border-b border-gray-300 pb-1">RINCIAN BIAYA</h3>
                <div className="space-y-2 text-sm">
                  {serviceTicket.laborCost && Number(serviceTicket.laborCost) > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-700">Biaya Jasa Service:</span>
                      <span className="font-medium">{formatCurrency(serviceTicket.laborCost)}</span>
                    </div>
                  )}
                  {serviceTicket.partsCost && Number(serviceTicket.partsCost) > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-700">Biaya Sparepart:</span>
                      <span className="font-medium">{formatCurrency(serviceTicket.partsCost)}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-gray-400 pt-2 mt-3">
                    <div className="flex justify-between py-2 bg-green-100 px-3 rounded font-bold text-base">
                      <span>TOTAL PEMBAYARAN:</span>
                      <span className="text-green-700">{formatCurrency(getTotalCost())}</span>
                    </div>
                    <p className="text-center text-xs text-gray-600 mt-2">** LUNAS **</p>
                  </div>
                </div>
              </div>

              {/* Warranty Information */}
              {serviceTicket.warrantyDuration && serviceTicket.warrantyDuration > 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mb-4">
                  <h3 className="font-semibold text-sm mb-3 text-blue-800 border-b border-blue-200 pb-1">INFORMASI GARANSI</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1">
                      <span className="text-blue-700">Durasi Garansi:</span>
                      <span className="font-medium text-blue-900">
                        {serviceTicket.warrantyDuration >= 9999 ? 'Garansi Seumur Hidup' : `${serviceTicket.warrantyDuration} Hari`}
                      </span>
                    </div>
                    {serviceTicket.warrantyStartDate && (
                      <div className="flex justify-between py-1">
                        <span className="text-blue-700">Tanggal Mulai:</span>
                        <span className="font-medium text-blue-900">
                          {formatDateShort(serviceTicket.warrantyStartDate)}
                        </span>
                      </div>
                    )}
                    {serviceTicket.warrantyEndDate && serviceTicket.warrantyDuration < 9999 && (
                      <div className="flex justify-between py-1">
                        <span className="text-blue-700">Berlaku Sampai:</span>
                        <span className="font-medium text-blue-900">
                          {formatDateShort(serviceTicket.warrantyEndDate)}
                        </span>
                      </div>
                    )}
                    <div className="bg-blue-100 p-2 rounded mt-3">
                      <p className="text-xs text-blue-800 font-medium text-center">
                        ⚠️ SIMPAN NOTA INI SEBAGAI BUKTI GARANSI
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status & Dates */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2 text-gray-700">Timeline Service:</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tanggal Masuk:</span>
                      <span>{formatDateShort(serviceTicket.createdAt)}</span>
                    </div>
                    {serviceTicket.completedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tanggal Selesai:</span>
                        <span>{formatDateShort(serviceTicket.completedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2 text-gray-700">Informasi Lainnya:</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-semibold text-green-600">
                        {serviceTicket.status === 'selesai' ? 'SELESAI' :
                         serviceTicket.status === 'sudah_diambil' ? 'DIAMBIL' : 'SELESAI'}
                      </span>
                    </div>
                    {technician && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Teknisi:</span>
                        <span>{technician.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* QR Code */}
              {qrCodeDataURL && (
                <div className="text-center py-4 bg-white border border-gray-200 rounded mb-4">
                  <p className="text-sm font-medium mb-2 text-gray-700">QR Code - Tracking Service</p>
                  <img 
                    src={qrCodeDataURL} 
                    alt="QR Code" 
                    className="mx-auto border border-gray-100 p-2 rounded"
                    style={{ 
                      width: paperSize === 'a4' ? '60mm' : 
                             paperSize === '58' ? '30mm' : '40mm', 
                      height: 'auto' 
                    }}
                  />
                  <p className="text-xs mt-2 text-gray-600">Scan untuk cek status service online</p>
                </div>
              )}

              {/* Footer */}
              <div className="bg-blue-50 p-4 rounded text-center">
                <div className="space-y-2">
                  <p className="font-bold text-lg text-blue-800">TERIMA KASIH</p>
                  <p className="text-sm text-gray-700">Atas kepercayaan Anda menggunakan layanan service kami</p>
                  <div className="bg-yellow-100 p-2 rounded mt-3">
                    <p className="text-sm font-medium text-yellow-800">⚠️ GARANSI SERVICE 30 HARI</p>
                    <p className="text-xs text-yellow-700">Berlaku dari tanggal pengambilan barang</p>
                  </div>
                  <div className="border-t border-blue-200 pt-2 mt-3">
                    <p className="text-xs text-gray-500">Nota ini adalah bukti pembayaran yang sah</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}