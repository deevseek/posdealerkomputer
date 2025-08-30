import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Printer, Download } from "lucide-react";
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
  pending: 'Menunggu',
  'in-progress': 'Dikerjakan',
  'waiting-parts': 'Menunggu Sparepart',
  'waiting-payment': 'Menunggu Pembayaran',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export default function ServiceReceipt({ serviceData, storeConfig }: ServiceReceiptProps) {
  const [isGenerating, setIsGenerating] = useState(false);

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
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`Nota-Service-${serviceData.serviceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const element = document.getElementById('service-receipt-content');
    if (!element) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Nota Service - ${serviceData.serviceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .receipt-header { text-align: center; margin-bottom: 20px; }
            .store-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .store-info { font-size: 14px; color: #666; }
            .receipt-title { font-size: 20px; font-weight: bold; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .info-label { font-weight: bold; }
            .separator { border-top: 2px solid #333; margin: 15px 0; }
            .parts-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .parts-table th, .parts-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .parts-table th { background-color: #f5f5f5; }
            .total-row { font-size: 18px; font-weight: bold; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${element.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
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

      <Card>
        <CardContent className="p-6">
          <div id="service-receipt-content" className="space-y-4">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-2xl font-bold" data-testid="text-store-name">
                {storeConfig?.name || 'LaptopPOS Service Center'}
              </h2>
              {storeConfig?.address && (
                <p className="text-sm text-gray-600" data-testid="text-store-address">{storeConfig.address}</p>
              )}
              <div className="flex justify-center gap-4 text-sm text-gray-600">
                {storeConfig?.phone && <span data-testid="text-store-phone">Tel: {storeConfig.phone}</span>}
                {storeConfig?.email && <span data-testid="text-store-email">Email: {storeConfig.email}</span>}
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-xl font-bold">NOTA SERVICE</h3>
              <p className="text-lg font-semibold" data-testid="text-service-number">{serviceData.serviceNumber}</p>
            </div>

            <Separator />

            {/* Service Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Tanggal:</strong> <span data-testid="text-service-date">{format(new Date(serviceData.createdAt), 'dd/MM/yyyy HH:mm', { locale: idLocale })}</span></p>
                <p><strong>Customer:</strong> <span data-testid="text-customer-name">{serviceData.customer?.name}</span></p>
                {serviceData.customer?.phone && (
                  <p><strong>Telepon:</strong> <span data-testid="text-customer-phone">{serviceData.customer.phone}</span></p>
                )}
              </div>
              <div>
                <p><strong>Status:</strong> <span data-testid="text-service-status">{statusConfig[serviceData.status as keyof typeof statusConfig]}</span></p>
                {serviceData.estimatedCompletion && (
                  <p><strong>Est. Selesai:</strong> <span data-testid="text-estimated-completion">{format(new Date(serviceData.estimatedCompletion), 'dd/MM/yyyy', { locale: idLocale })}</span></p>
                )}
                {serviceData.completedAt && (
                  <p><strong>Selesai:</strong> <span data-testid="text-completion-date">{format(new Date(serviceData.completedAt), 'dd/MM/yyyy', { locale: idLocale })}</span></p>
                )}
              </div>
            </div>

            <Separator />

            {/* Device & Problem */}
            <div className="space-y-2 text-sm">
              <p><strong>Perangkat:</strong> <span data-testid="text-device">{serviceData.device}</span></p>
              <p><strong>Keluhan:</strong> <span data-testid="text-problem">{serviceData.problem}</span></p>
              {serviceData.diagnosis && (
                <p><strong>Diagnosis:</strong> <span data-testid="text-diagnosis">{serviceData.diagnosis}</span></p>
              )}
            </div>

            {/* Parts Used */}
            {serviceData.parts && serviceData.parts.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-bold mb-2">Sparepart yang Digunakan:</h4>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Item</th>
                        <th className="text-center p-2">Qty</th>
                        <th className="text-right p-2">Harga</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceData.parts.map((part, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2" data-testid={`text-part-name-${index}`}>{part.product.name}</td>
                          <td className="text-center p-2" data-testid={`text-part-qty-${index}`}>{part.quantity}</td>
                          <td className="text-right p-2" data-testid={`text-part-price-${index}`}>{formatCurrency(part.unitPrice)}</td>
                          <td className="text-right p-2" data-testid={`text-part-total-${index}`}>{formatCurrency(part.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <Separator />

            {/* Total */}
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total Biaya Service:</span>
              <span data-testid="text-total-cost">{formatCurrency(serviceData.totalCost)}</span>
            </div>

            <Separator />

            {/* Footer */}
            <div className="text-center text-sm text-gray-600 mt-6">
              <p>Terima kasih telah menggunakan layanan kami!</p>
              <p>Garansi service 30 hari dari tanggal pengambilan</p>
              <p data-testid="text-print-date">Dicetak: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: idLocale })}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}