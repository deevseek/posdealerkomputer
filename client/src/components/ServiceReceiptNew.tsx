import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Printer, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ServiceReceiptProps {
  serviceTicket: {
    id: string;
    ticketNumber: string;
    customerId: string;
    deviceType: string;
    deviceBrand?: string;
    deviceModel?: string;
    serialNumber?: string;
    completeness?: string;
    problem: string;
    diagnosis?: string;
    solution?: string;
    estimatedCost?: string;
    status: string;
    technicianId?: string;
    createdAt: string;
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
}

export default function ServiceReceiptNew({ serviceTicket, customer, storeConfig }: ServiceReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');

  useEffect(() => {
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
  }, [serviceTicket.ticketNumber]);

  const handlePrint = () => {
    if (receiptRef.current) {
      const printContent = receiptRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Tanda Terima Service - ${serviceTicket.ticketNumber}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                .receipt { max-width: 600px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
                .header h2 { margin: 5px 0; font-size: 18px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
                .field { margin-bottom: 10px; }
                .label { font-weight: bold; }
                .value { margin-top: 2px; }
                .qr-section { text-align: center; margin: 20px 0; }
                .conditions { margin-top: 20px; font-size: 12px; }
                .signature-area { margin-top: 30px; display: flex; justify-content: space-between; }
                .signature-box { text-align: center; width: 150px; }
                @media print {
                  body { print-color-adjust: exact; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: id });
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(amount));
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-4 flex gap-2 no-print">
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Print Receipt
        </Button>
      </div>

      <Card className="p-8" ref={receiptRef}>
        <div className="receipt">
          {/* Header */}
          <div className="header text-center border-b-2 border-gray-800 pb-4 mb-6">
            <h1 className="text-2xl font-bold uppercase">{storeConfig.name}</h1>
            <h2 className="text-lg font-semibold mt-2">TANDA TERIMA SERVIS</h2>
            <div className="text-sm mt-2">
              <p>{storeConfig.address}</p>
              <p>Telp: {storeConfig.phone} | Email: {storeConfig.email}</p>
            </div>
          </div>

          {/* Service Number and Date */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="field">
                <span className="label">No. Service:</span>
                <span className="value ml-2 font-bold">{serviceTicket.ticketNumber}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="field">
                <span className="label">Tanggal:</span>
                <span className="value ml-2">{formatDate(serviceTicket.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Customer and Device Info Grid */}
          <div className="info-grid grid grid-cols-2 gap-8 mb-6">
            {/* Customer Info */}
            <div>
              <h3 className="font-bold text-lg mb-3">Data Pelanggan</h3>
              <div className="field">
                <div className="label">Nama:</div>
                <div className="value border-b border-dotted border-gray-400 pb-1">{customer.name}</div>
              </div>
              <div className="field">
                <div className="label">Alamat:</div>
                <div className="value border-b border-dotted border-gray-400 pb-1">{customer.address || '-'}</div>
              </div>
              <div className="field">
                <div className="label">No. Telepon:</div>
                <div className="value border-b border-dotted border-gray-400 pb-1">{customer.phone || '-'}</div>
              </div>
            </div>

            {/* Device Info */}
            <div>
              <h3 className="font-bold text-lg mb-3">Data Perangkat</h3>
              <div className="field">
                <div className="label">Jenis Perangkat:</div>
                <div className="value border-b border-dotted border-gray-400 pb-1">{serviceTicket.deviceType}</div>
              </div>
              <div className="field">
                <div className="label">Merk:</div>
                <div className="value border-b border-dotted border-gray-400 pb-1">{serviceTicket.deviceBrand || '-'}</div>
              </div>
              <div className="field">
                <div className="label">Tipe/Model:</div>
                <div className="value border-b border-dotted border-gray-400 pb-1">{serviceTicket.deviceModel || '-'}</div>
              </div>
              <div className="field">
                <div className="label">No. Seri:</div>
                <div className="value border-b border-dotted border-gray-400 pb-1">{serviceTicket.serialNumber || '-'}</div>
              </div>
            </div>
          </div>

          {/* Problem Description */}
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3">Keluhan/Masalah</h3>
            <div className="border border-gray-300 p-3 min-h-[80px] bg-gray-50">
              {serviceTicket.problem}
            </div>
          </div>

          {/* Completeness */}
          {serviceTicket.completeness && (
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3">Kelengkapan</h3>
              <div className="border border-gray-300 p-3 min-h-[60px] bg-gray-50">
                {serviceTicket.completeness}
              </div>
            </div>
          )}

          {/* QR Code and Estimated Cost */}
          <div className="flex justify-between items-center mb-6">
            <div className="qr-section">
              {qrCodeDataURL && (
                <div>
                  <img src={qrCodeDataURL} alt="QR Code" className="mx-auto mb-2" />
                  <p className="text-xs">Scan untuk cek status</p>
                </div>
              )}
            </div>
            <div className="text-right">
              {serviceTicket.estimatedCost && (
                <div className="field">
                  <span className="label text-lg">Estimasi Biaya:</span>
                  <div className="value text-xl font-bold">{formatCurrency(serviceTicket.estimatedCost)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="conditions text-xs leading-relaxed border-t pt-4 mb-6">
            <h4 className="font-bold mb-2">SYARAT DAN KETENTUAN:</h4>
            <ul className="space-y-1">
              <li>• Barang yang sudah diperbaiki dan tidak diambil dalam 30 hari akan dikenakan biaya penitipan</li>
              <li>• Kerusakan akibat force majeure (bencana alam, dll) bukan tanggung jawab kami</li>
              <li>• Harap membawa tanda terima ini saat mengambil barang</li>
              <li>• Garansi service berlaku 30 hari untuk kerusakan yang sama</li>
              <li>• Pembayaran dilakukan saat pengambilan barang</li>
            </ul>
          </div>

          {/* Signature Area */}
          <div className="signature-area flex justify-between">
            <div className="signature-box">
              <div className="label mb-12">Penerima</div>
              <div className="border-t border-black">
                <div className="mt-1 text-center">({customer.name})</div>
              </div>
            </div>
            <div className="signature-box">
              <div className="label mb-12">Teknisi</div>
              <div className="border-t border-black">
                <div className="mt-1 text-center">({storeConfig.name})</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}