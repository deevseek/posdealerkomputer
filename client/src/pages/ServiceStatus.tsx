import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Clock, CheckCircle, AlertCircle, Package, Calendar, Receipt, Settings } from "lucide-react";
import { formatDateLong } from '@shared/utils/timezone';
import { SERVICE_STATUS_LABELS, normalizeServiceStatus, type ServiceStatus } from "@shared/service-status";
import ServiceStatusTracker from "@/components/ServiceStatusTracker";

const statusConfig: Record<ServiceStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: SERVICE_STATUS_LABELS.pending, color: 'bg-yellow-500', icon: Clock },
  checking: { label: SERVICE_STATUS_LABELS.checking, color: 'bg-yellow-500', icon: Clock },
  'waiting-confirmation': { label: SERVICE_STATUS_LABELS['waiting-confirmation'], color: 'bg-red-500', icon: AlertCircle },
  'waiting-parts': { label: SERVICE_STATUS_LABELS['waiting-parts'], color: 'bg-orange-500', icon: Package },
  'in-progress': { label: SERVICE_STATUS_LABELS['in-progress'], color: 'bg-blue-500', icon: Settings },
  completed: { label: SERVICE_STATUS_LABELS.completed, color: 'bg-green-500', icon: CheckCircle },
  delivered: { label: SERVICE_STATUS_LABELS.delivered, color: 'bg-emerald-500', icon: CheckCircle },
  cancelled: { label: SERVICE_STATUS_LABELS.cancelled, color: 'bg-red-600', icon: AlertCircle },
};

export default function ServiceStatus() {
  const [serviceNumber, setServiceNumber] = useState("");
  const [searchClicked, setSearchClicked] = useState(false);
  const [showStatusTracker, setShowStatusTracker] = useState(false);
  const [location] = useLocation();

  // Auto-fill service number from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketParam = urlParams.get('ticket');
    if (ticketParam) {
      setServiceNumber(ticketParam);
      setSearchClicked(true); // Automatically search when ticket is provided
    }
  }, [location]);

  const { data: serviceData, isLoading, error } = useQuery({
    queryKey: ['/api/public/service-status', serviceNumber],
    enabled: searchClicked && serviceNumber.length > 0,
    retry: false,
  }) as {
    data: {
      ticketNumber: string;
      customerName: string;
      deviceType: string;
      deviceBrand: string;
      deviceModel: string;
      problem: string;
      diagnosis?: string;
      status: string;
      estimatedCost?: string;
      estimatedCompletion?: string;
      completedAt?: string;
      createdAt: string;
      parts?: Array<{
        name: string;
        quantity: number;
        unitPrice: string;
      }>;
    } | undefined;
    isLoading: boolean;
    error: any;
  };

  const handleSearch = () => {
    if (serviceNumber.trim()) {
      setSearchClicked(true);
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(amount));
  };

  const normalizedStatus = normalizeServiceStatus(serviceData?.status ?? undefined);
  const status = normalizedStatus ? statusConfig[normalizedStatus] : null;
  const StatusIcon = status?.icon || Clock;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cek Status Service</h1>
          <p className="text-gray-600">Masukkan nomor service untuk melihat status perbaikan perangkat Anda</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-2">
              <Input
                placeholder="Masukkan nomor service (contoh: SRV-20240830-001)"
                value={serviceNumber}
                onChange={(e) => setServiceNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
                data-testid="input-service-number"
              />
              <Button onClick={handleSearch} disabled={!serviceNumber.trim()} data-testid="button-search">
                <Search className="h-4 w-4 mr-2" />
                Cari
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Mencari data service...</p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Tidak Ditemukan</h3>
              <p className="text-gray-600">
                Nomor service yang Anda masukkan tidak ditemukan. Pastikan nomor service benar.
              </p>
            </CardContent>
          </Card>
        )}

        {serviceData && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Detail Service
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nomor Service</label>
                    <p className="font-semibold" data-testid="text-service-number">{serviceData.ticketNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="flex items-center gap-2">
                      <Badge className={`${status?.color} text-white`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status?.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium text-gray-500">Nama Customer</label>
                  <p className="font-semibold" data-testid="text-customer-name">{serviceData.customerName}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Perangkat</label>
                  <p className="font-semibold" data-testid="text-device">{serviceData.deviceType} {serviceData.deviceBrand} {serviceData.deviceModel}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Keluhan</label>
                  <p className="text-gray-900" data-testid="text-problem">{serviceData.problem}</p>
                </div>

                {serviceData.diagnosis && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Diagnosis</label>
                    <p className="text-gray-900" data-testid="text-diagnosis">{serviceData.diagnosis}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tanggal Masuk</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span data-testid="text-created-date">
                        {formatDateLong(serviceData.createdAt)}
                      </span>
                    </div>
                  </div>
                  {serviceData.estimatedCompletion && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Estimasi Selesai</label>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span data-testid="text-estimated-completion">
                          {formatDateLong(serviceData.estimatedCompletion)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {serviceData.completedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tanggal Selesai</label>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span data-testid="text-completed-date">
                        {formatDateLong(serviceData.completedAt)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {serviceData.parts && serviceData.parts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Sparepart yang Digunakan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {serviceData.parts.map((part: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="font-medium" data-testid={`text-part-name-${index}`}>{part.name}</p>
                          <p className="text-sm text-gray-500">Qty: {part.quantity}</p>
                        </div>
                        <p className="font-semibold" data-testid={`text-part-price-${index}`}>
                          {formatCurrency(part.unitPrice)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Estimasi Biaya Service</span>
                  <span className="text-2xl font-bold text-blue-600" data-testid="text-total-cost">
                    {serviceData.estimatedCost ? formatCurrency(serviceData.estimatedCost) : 'Belum ditentukan'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Action Button */}
            <Card>
              <CardContent className="p-6 text-center">
                <Button 
                  onClick={() => setShowStatusTracker(true)}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 mx-auto"
                >
                  <Settings className="h-4 w-4" />
                  Detail Status Proses Service
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  Lihat tahapan detail proses perbaikan perangkat Anda
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Service Status Tracker Dialog */}
        {serviceData && (
          <ServiceStatusTracker
            isOpen={showStatusTracker}
            onClose={() => setShowStatusTracker(false)}
            serviceNumber={serviceData.ticketNumber}
            currentStatus={serviceData.status}
          />
        )}
      </div>
    </div>
  );
}