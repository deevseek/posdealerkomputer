import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Printer, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { formatDateLong, formatDateShort, formatDateForDisplay } from '@shared/utils/timezone';

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
    // Warranty fields
    warrantyDuration?: number;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
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
  } | null;
}

export default function ServiceReceiptNew({ serviceTicket, customer, storeConfig, technician }: ServiceReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [paperFormat, setPaperFormat] = useState<'a4' | 'thermal-58' | 'thermal-80'>('a4');

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

  const getFormatStyles = () => {
    switch (paperFormat) {
      case 'thermal-58':
        return {
          width: '58mm',
          fontSize: '8px',
          padding: '2mm',
          lineHeight: '1.1',
          headerFontSize: '10px',
          titleFontSize: '9px'
        };
      case 'thermal-80':
        return {
          width: '80mm', 
          fontSize: '9px',
          padding: '3mm',
          lineHeight: '1.2',
          headerFontSize: '12px',
          titleFontSize: '10px'
        };
      default: // a4
        return {
          width: '210mm',
          fontSize: '12px', 
          padding: '15mm',
          lineHeight: '1.4',
          headerFontSize: '22px',
          titleFontSize: '16px'
        };
    }
  };

  const isThermal = paperFormat.startsWith('thermal');

  const handlePrint = () => {
    if (receiptRef.current) {
      const printContent = receiptRef.current.innerHTML;
      const formatStyles = getFormatStyles();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Tanda Terima Service - ${serviceTicket.ticketNumber}</title>
              <style>
                @page {
                  size: ${paperFormat === 'a4' ? 'A4' : `${formatStyles.width} auto`};
                  margin: ${isThermal ? '0' : '8mm'};
                  page-break-inside: avoid;
                }
                body { 
                  font-family: ${isThermal ? '"Courier New", monospace' : '"Arial", sans-serif'}; 
                  margin: 0; 
                  padding: ${formatStyles.padding}; 
                  font-size: ${formatStyles.fontSize};
                  line-height: ${formatStyles.lineHeight};
                  ${isThermal ? 'width: ' + formatStyles.width + '; box-sizing: border-box;' : ''}
                  page-break-inside: avoid;
                  overflow: hidden;
                  color: #000;
                  background: #fff;
                }
                .receipt { 
                  ${isThermal ? 'width: 100%;' : 'max-width: 580px; margin: 0 auto;'}
                  page-break-inside: avoid;
                  overflow: hidden;
                }
                .header { 
                  text-align: center; 
                  margin-bottom: ${isThermal ? '8px' : '20px'}; 
                  padding-bottom: ${isThermal ? '4px' : '8px'};
                  border-bottom: 1px dashed #333;
                }
                .header h1 { 
                  margin: 0; 
                  font-size: ${formatStyles.headerFontSize}; 
                  font-weight: bold;
                  margin-bottom: ${isThermal ? '2px' : '6px'};
                  text-transform: uppercase;
                  letter-spacing: ${isThermal ? '0.5px' : '1px'};
                }
                .header h2 { 
                  margin: ${isThermal ? '4px 0 6px' : '8px 0 12px'}; 
                  font-size: ${formatStyles.titleFontSize}; 
                  font-weight: bold;
                  text-align: center;
                }
                .header p { 
                  margin: ${isThermal ? '1px 0' : '2px 0'}; 
                  font-size: ${isThermal ? (paperFormat === 'thermal-58' ? '7px' : '8px') : '10px'}; 
                  line-height: 1.3;
                }
                .info-grid { 
                  ${isThermal 
                    ? 'display: block; margin: 8px 0;' 
                    : 'display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;'
                  }
                }
                .field { margin-bottom: ${isThermal ? '3px' : '8px'}; }
                .label { font-weight: bold; font-size: ${isThermal ? (paperFormat === 'thermal-58' ? '7px' : '8px') : '11px'}; color: #444; }
                .value { margin-top: 1px; font-size: ${isThermal ? (paperFormat === 'thermal-58' ? '7px' : '8px') : '11px'}; }
                .qr-section { text-align: center; margin: ${isThermal ? '8px 0' : '20px 0'}; }
                .qr-section img { width: ${isThermal ? '60px' : '120px'}; height: ${isThermal ? '60px' : '120px'}; }
                .conditions { 
                  margin-top: ${isThermal ? '6px' : '15px'}; 
                  font-size: ${isThermal ? (paperFormat === 'thermal-58' ? '6px' : '7px') : '10px'}; 
                  padding: ${isThermal ? '3px' : '6px'} 0;
                  border-top: 1px dashed #333;
                  line-height: 1.2;
                }
                .signature-area { 
                  margin-top: ${isThermal ? '10px' : '25px'}; 
                  ${isThermal ? 'display: block;' : 'display: flex; justify-content: space-between;'}
                  border-top: 1px solid #333;
                  padding-top: ${isThermal ? '6px' : '10px'};
                }
                .signature-box { 
                  text-align: center; 
                  ${isThermal ? 'margin-bottom: 12px;' : 'width: 150px;'}
                }
                .signature-box .label { 
                  margin-bottom: ${isThermal ? '15px' : '35px'}; 
                  font-size: ${isThermal ? (paperFormat === 'thermal-58' ? '7px' : '8px') : '11px'};
                  font-weight: bold;
                }
                h3 { font-size: ${isThermal ? '11px' : '18px'}; margin: ${isThermal ? '8px 0 4px' : '20px 0 8px'}; }
                .border-b { border-bottom: ${isThermal ? '1px dashed #000' : '2px solid #000'}; }
                .border-t { border-top: 1px solid #000; }
                @media print {
                  body { 
                    print-color-adjust: exact; 
                    height: auto !important;
                    overflow: visible !important;
                  }
                  .no-print { display: none; }
                  .receipt {
                    page-break-inside: avoid;
                    height: auto !important;
                  }
                  * {
                    page-break-inside: avoid;
                  }
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
    return formatDateLong(dateString);
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
      <div className="mb-4 flex gap-4 items-end no-print">
        <div className="flex flex-col gap-2">
          <Label htmlFor="paper-format">Format Cetak</Label>
          <Select value={paperFormat} onValueChange={(value: 'a4' | 'thermal-58' | 'thermal-80') => setPaperFormat(value)}>
            <SelectTrigger className="w-48" id="paper-format">
              <SelectValue placeholder="Pilih format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a4">A4 - Printer Standar</SelectItem>
              <SelectItem value="thermal-80">Thermal 80mm</SelectItem>
              <SelectItem value="thermal-58">Thermal 58mm</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Print Receipt
        </Button>
      </div>

      <Card className="p-8" ref={receiptRef}>
        <div className="receipt">
          {/* Header */}
          <div className="header">
            <h1>{storeConfig.name.toUpperCase()}</h1>
            <div style={{ fontSize: isThermal ? '9px' : '12px', lineHeight: '1.3' }}>
              <p>{storeConfig.address}</p>
              <p>Tel: {storeConfig.phone} {storeConfig.email && `| Email: ${storeConfig.email}`}</p>
            </div>
            <h2>═══ TANDA TERIMA SERVIS ═══</h2>
          </div>

          {/* Service Number and Date */}
          <div className={`${isThermal ? 'mb-4' : 'flex justify-between items-center mb-6'}`}>
            <div className={isThermal ? 'mb-2' : ''}>
              <div className="field">
                <span className="label">No. Service:</span>
                <span className="value ml-2 font-bold">{serviceTicket.ticketNumber}</span>
              </div>
            </div>
            <div className={isThermal ? '' : 'text-right'}>
              <div className="field">
                <span className="label">Tanggal:</span>
                <span className="value ml-2">{formatDate(serviceTicket.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Customer and Device Info */}
          <div className={`info-grid ${isThermal ? 'mb-4' : 'grid grid-cols-2 gap-8 mb-6'}`}>
            {/* Customer Info */}
            <div className={isThermal ? 'mb-4' : ''}>
              <h3 className={`font-bold ${isThermal ? 'text-xs mb-2 border-b border-gray-300 pb-1' : 'text-lg mb-3'}`}>Data Pelanggan</h3>
              <div className="field">
                <div className="label">Nama:</div>
                <div className="value border-b border-dotted border-gray-400 pb-1">{customer.name}</div>
              </div>
              {!isThermal && (
                <div className="field">
                  <div className="label">Alamat:</div>
                  <div className="value border-b border-dotted border-gray-400 pb-1">{customer.address || '-'}</div>
                </div>
              )}
              <div className="field">
                <div className="label">No. Telepon:</div>
                <div className="value border-b border-dotted border-gray-400 pb-1">{customer.phone || '-'}</div>
              </div>
              {isThermal && customer.address && (
                <div className="field">
                  <div className="label">Alamat:</div>
                  <div className="value border-b border-dotted border-gray-400 pb-1" style={{ fontSize: paperFormat === 'thermal-58' ? '6px' : '7px', lineHeight: '1.1' }}>
                    {customer.address.length > 40 ? customer.address.substring(0, 40) + '...' : customer.address}
                  </div>
                </div>
              )}
            </div>

            {/* Device Info */}
            <div>
              <h3 className={`font-bold ${isThermal ? 'text-xs mb-2 border-b border-gray-300 pb-1' : 'text-lg mb-3'}`}>Data Perangkat</h3>
              <div className="field">
                <div className="label">Jenis:</div>
                <div className="value border-b border-dotted border-gray-400 pb-1">{serviceTicket.deviceType}</div>
              </div>
              <div className="field">
                <div className="label">Merk:</div>
                <div className="value border-b border-dotted border-gray-400 pb-1">{serviceTicket.deviceBrand || '-'}</div>
              </div>
              <div className="field">
                <div className="label">Model:</div>
                <div className="value border-b border-dotted border-gray-400 pb-1">{serviceTicket.deviceModel || '-'}</div>
              </div>
              {!isThermal && serviceTicket.serialNumber && (
                <div className="field">
                  <div className="label">No. Seri:</div>
                  <div className="value border-b border-dotted border-gray-400 pb-1">{serviceTicket.serialNumber}</div>
                </div>
              )}
            </div>
          </div>

          {/* Problem Description */}
          <div className={isThermal ? 'mb-4' : 'mb-6'}>
            <h3 className={`font-bold ${isThermal ? 'text-xs mb-2' : 'text-lg mb-3'}`}>Keluhan/Masalah</h3>
            <div className={`border border-gray-300 p-2 ${isThermal ? 'min-h-[40px] text-xs' : 'min-h-[80px] p-3'} bg-gray-50`}>
              {serviceTicket.problem}
            </div>
          </div>

          {/* Completeness */}
          {serviceTicket.completeness && (
            <div className={isThermal ? 'mb-4' : 'mb-6'}>
              <h3 className={`font-bold ${isThermal ? 'text-xs mb-2' : 'text-lg mb-3'}`}>Kelengkapan</h3>
              <div className={`border border-gray-300 p-2 ${isThermal ? 'min-h-[30px] text-xs' : 'min-h-[60px] p-3'} bg-gray-50`}>
                {serviceTicket.completeness}
              </div>
            </div>
          )}

          {/* QR Code and Estimated Cost */}
          <div className={`${isThermal ? 'text-center mb-4' : 'flex justify-between items-center mb-6'}`}>
            <div className="qr-section">
              {qrCodeDataURL && (
                <div>
                  <img src={qrCodeDataURL} alt="QR Code" className={`mx-auto mb-2 ${isThermal ? 'w-16 h-16' : ''}`} />
                  <p className={`${isThermal ? 'text-xs' : 'text-xs'}`}>Scan untuk cek status</p>
                </div>
              )}
            </div>
            {!isThermal && (
              <div className="text-right">
                {serviceTicket.estimatedCost && (
                  <div className="field">
                    <span className="label text-lg">Estimasi Biaya:</span>
                    <div className="value text-xl font-bold">{formatCurrency(serviceTicket.estimatedCost)}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Estimated Cost for Thermal */}
          {isThermal && serviceTicket.estimatedCost && (
            <div className="text-center mb-4">
              <div className="field">
                <span className="label text-xs">Estimasi Biaya:</span>
                <div className="value text-sm font-bold">{formatCurrency(serviceTicket.estimatedCost)}</div>
              </div>
            </div>
          )}

          {/* Warranty Information */}
          {serviceTicket.warrantyDuration && serviceTicket.warrantyDuration > 0 && (
            <div className={`warranty-section ${isThermal ? 'mb-4 p-2 border border-gray-400' : 'mb-6 p-4 border-2 border-blue-300 bg-blue-50'}`}>
              <h4 className={`font-bold ${isThermal ? 'text-xs mb-2' : 'text-sm mb-3'} text-blue-800`}>INFORMASI GARANSI</h4>
              <div className="space-y-1">
                <div className="field">
                  <span className={`label ${isThermal ? 'text-xs' : 'text-sm'} text-blue-700`}>Durasi:</span>
                  <span className={`value ml-2 ${isThermal ? 'text-xs' : 'text-sm'} font-bold text-blue-900`}>
                    {serviceTicket.warrantyDuration >= 9999 ? 'Seumur Hidup' : `${serviceTicket.warrantyDuration} Hari`}
                  </span>
                </div>
                {serviceTicket.warrantyStartDate && (
                  <div className="field">
                    <span className={`label ${isThermal ? 'text-xs' : 'text-sm'} text-blue-700`}>Mulai:</span>
                    <span className={`value ml-2 ${isThermal ? 'text-xs' : 'text-sm'} font-medium text-blue-900`}>
                      {formatDateShort(serviceTicket.warrantyStartDate)}
                    </span>
                  </div>
                )}
                {serviceTicket.warrantyEndDate && serviceTicket.warrantyDuration < 9999 && (
                  <div className="field">
                    <span className={`label ${isThermal ? 'text-xs' : 'text-sm'} text-blue-700`}>Berakhir:</span>
                    <span className={`value ml-2 ${isThermal ? 'text-xs' : 'text-sm'} font-medium text-blue-900`}>
                      {formatDateShort(serviceTicket.warrantyEndDate)}
                    </span>
                  </div>
                )}
                <div className={`text-center mt-2 p-1 ${isThermal ? 'text-xs bg-gray-200' : 'text-sm bg-blue-100'} rounded`}>
                  <p className="font-medium text-blue-800">⚠️ SIMPAN NOTA SEBAGAI BUKTI GARANSI</p>
                </div>
              </div>
            </div>
          )}

          {/* Terms and Conditions */}
          <div className={`conditions border-t pt-2 mb-4`}>
            <h4 className={`font-bold mb-2 ${isThermal ? 'text-xs' : 'text-sm'}`}>SYARAT DAN KETENTUAN:</h4>
            <ul className={`${isThermal ? 'space-y-0.5' : 'space-y-1'} list-none`}>
              <li>• Barang tidak diambil 30 hari akan dikenakan biaya penyimpanan</li>
              <li>• Harap bawa tanda terima saat mengambil barang</li>
              <li>• Garansi service 30 hari untuk kerusakan yang sama</li>
              <li>• Pembayaran dilakukan saat pengambilan barang</li>
              {!isThermal && <li>• Kerusakan akibat force majeure bukan tanggung jawab service center</li>}
              {!isThermal && <li>• Komplain maksimal 7 hari setelah pengambilan</li>}
            </ul>
          </div>

          {/* Signature Area */}
          <div className={`signature-area ${isThermal ? 'text-center' : 'flex justify-between'}`}>
            <div className={`signature-box ${isThermal ? 'mb-6' : ''}`}>
              <div className={`label ${isThermal ? 'mb-8 text-xs' : 'mb-12'}`}>Penerima</div>
              <div className="border-t border-black">
                <div className={`mt-1 text-center ${isThermal ? 'text-xs' : ''}`}>({customer.name})</div>
              </div>
            </div>
            <div className="signature-box">
              <div className={`label ${isThermal ? 'mb-8 text-xs' : 'mb-12'}`}>Teknisi</div>
              <div className="border-t border-black">
                <div className={`mt-1 text-center ${isThermal ? 'text-xs' : ''}`}>({technician?.name || 'Teknisi'})</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}