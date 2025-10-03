import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDateWithTime, formatDateShort } from '@shared/utils/timezone';
import { Printer, Download, FileText } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ServiceReceiptProps {
  serviceData: {
    id: string;
    serviceNumber: string;
    device: string;
    problem: string;
    diagnosis?: string;
    status: string;
    totalCost: string;
    estimatedCompletion?: string;
    completedAt?: string;
    createdAt: string;
    // Warranty fields
    warrantyDuration?: number;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
    customer?: {
      name: string;
      phone?: string;
      email?: string;
    };
    parts?: Array<{
      product: {
        name: string;
      };
      quantity: number;
      unitPrice: string;
      totalPrice: string;
    }>;
  };
  storeConfig?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

const statusConfig = {
  sedang_dicek: 'Sedang Dicek',
  menunggu_konfirmasi: 'Menunggu Konfirmasi',
  menunggu_sparepart: 'Menunggu Sparepart',
  sedang_dikerjakan: 'Sedang Dikerjakan',
  selesai: 'Selesai',
  sudah_diambil: 'Sudah Diambil',
  cencel: 'Cencel',
};

const paperSizes = {
  '58': { width: 58, name: '58mm (Mini)' },
  '80': { width: 80, name: '80mm (Standard)' },
  '100': { width: 100, name: '100mm (Large)' }
};

export default function ServiceReceipt({ serviceData, storeConfig }: ServiceReceiptProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [paperSize, setPaperSize] = useState<'58' | '80' | '100'>('80');

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(amount));
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const element = document.getElementById('service-receipt-content');
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
      pdf.save(`Nota-Service-${serviceData.serviceNumber}-${thermalWidth}mm.pdf`);
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
            #service-receipt-content, 
            #service-receipt-content * { 
              visibility: visible; 
            }
            #service-receipt-content {
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
    <div className="space-y-4">
      {/* Paper Size Selector */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg no-print">
        <Label htmlFor="paper-size" className="font-medium">Ukuran Kertas:</Label>
        <Select value={paperSize} onValueChange={(value: '58' | '80' | '100') => setPaperSize(value)}>
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

      <div className="flex gap-2 mb-4 no-print">
        <Button onClick={handlePrint} variant="outline" data-testid="button-print">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button 
          onClick={generatePDF} 
          variant="outline"
          disabled={isGenerating}
          data-testid="button-download-pdf"
        >
          <Download className="h-4 w-4 mr-2" />
          {isGenerating ? 'Generating...' : 'Download PDF'}
        </Button>
      </div>

      {/* Receipt Preview */}
      <div className="flex justify-center">
        <Card className={`${getReceiptWidth()} mx-auto`}>
          <CardContent className="p-4">
            <div id="service-receipt-content" className={`space-y-2 ${getTextSize()}`} style={{ fontFamily: 'Courier New, monospace' }}>
              {/* Header */}
              <div className="text-center space-y-1">
                <h2 className={`${paperSize === '58' ? 'text-sm' : paperSize === '80' ? 'text-base' : 'text-lg'} font-bold`} data-testid="text-store-name">
                  {storeConfig?.name || 'LaptopPOS Service Center'}
                </h2>
                {storeConfig?.address && (
                  <p className={`${getTextSize()} text-gray-600`} data-testid="text-store-address">{storeConfig.address}</p>
                )}
                <div className={`flex flex-col ${getTextSize()} text-gray-600`}>
                  {storeConfig?.phone && <span data-testid="text-store-phone">Tel: {storeConfig.phone}</span>}
                  {storeConfig?.email && <span data-testid="text-store-email">{storeConfig.email}</span>}
                </div>
              </div>

              <div className="text-center py-2">
                <h3 className={`${paperSize === '58' ? 'text-sm' : paperSize === '80' ? 'text-base' : 'text-lg'} font-bold`}>NOTA SERVICE</h3>
                <p className={`${getTextSize()} font-semibold`} data-testid="text-service-number">#{serviceData.serviceNumber}</p>
              </div>

              <div className="border-t border-dashed border-gray-400 my-2"></div>

              {/* Service Info - Thermal Layout */}
              <div className={`space-y-1 ${getTextSize()}`}>
                <div className="flex justify-between">
                  <span className="font-bold">Tanggal:</span>
                  <span data-testid="text-service-date">{formatDateWithTime(serviceData.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Customer:</span>
                  <span data-testid="text-customer-name">{serviceData.customer?.name || '-'}</span>
                </div>
                {serviceData.customer?.phone && (
                  <div className="flex justify-between">
                    <span className="font-bold">Telepon:</span>
                    <span data-testid="text-customer-phone">{serviceData.customer.phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-bold">Status:</span>
                  <span data-testid="text-service-status">{statusConfig[serviceData.status as keyof typeof statusConfig]}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-400 my-2"></div>

              {/* Device & Problem */}
              <div className={`space-y-1 ${getTextSize()}`}>
                <div>
                  <span className="font-bold">Perangkat:</span> <span data-testid="text-device">{serviceData.device}</span>
                </div>
                <div>
                  <span className="font-bold">Keluhan:</span> <span data-testid="text-problem">{serviceData.problem}</span>
                </div>
                {serviceData.diagnosis && (
                  <div>
                    <span className="font-bold">Diagnosis:</span> <span data-testid="text-diagnosis">{serviceData.diagnosis}</span>
                  </div>
                )}
              </div>

              {/* Parts Used */}
              {serviceData.parts && serviceData.parts.length > 0 && (
                <>
                  <div className="border-t border-dashed border-gray-400 my-2"></div>
                  <div>
                    <div className={`font-bold mb-2 ${getTextSize()}`}>Sparepart:</div>
                    {serviceData.parts.map((part, index) => (
                      <div key={index} className={`flex justify-between ${getTextSize()}`}>
                        <div className="flex-1">
                          <div data-testid={`text-part-name-${index}`}>{part.product.name}</div>
                          <div className="text-gray-600">{part.quantity} x {formatCurrency(part.unitPrice)}</div>
                        </div>
                        <div data-testid={`text-part-total-${index}`}>{formatCurrency(part.totalPrice)}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="border-t border-solid border-gray-800 my-2"></div>

              {/* Total */}
              <div className={`flex justify-between items-center font-bold ${getTextSize()}`}>
                <span>Total Service:</span>
                <span data-testid="text-total-cost">{formatCurrency(serviceData.totalCost)}</span>
              </div>

              {/* Warranty Information */}
              {(serviceData as any).warrantyDuration && (
                <>
                  <div className="border-t border-dashed border-gray-400 my-2"></div>
                  <div className={`space-y-1 ${getTextSize()}`}>
                    <div className="text-center font-bold">
                      === INFORMASI GARANSI ===
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Durasi Garansi:</span>
                      <span data-testid="warranty-duration">
                        {(serviceData as any).warrantyDuration === 999999 ? 'Unlimited' : `${(serviceData as any).warrantyDuration} hari`}
                      </span>
                    </div>
                    {(serviceData as any).warrantyStartDate && (
                      <div className="flex justify-between">
                        <span className="font-bold">Mulai Garansi:</span>
                        <span data-testid="warranty-start">
                          {formatDateShort((serviceData as any).warrantyStartDate)}
                        </span>
                      </div>
                    )}
                    {(serviceData as any).warrantyEndDate && (serviceData as any).warrantyDuration !== 999999 && (
                      <div className="flex justify-between">
                        <span className="font-bold">Berakhir:</span>
                        <span data-testid="warranty-end">
                          {formatDateShort((serviceData as any).warrantyEndDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="border-t border-dashed border-gray-400 my-2"></div>

              {/* Footer */}
              <div className={`text-center ${getTextSize()} text-gray-600 space-y-1 mt-6`}>
                <div>Terima kasih atas kepercayaan Anda!</div>
                {!(serviceData as any).warrantyDuration && (
                  <div>Garansi service 30 hari</div>
                )}
                <div data-testid="text-print-date">Cetak: {formatDateWithTime(new Date())}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}