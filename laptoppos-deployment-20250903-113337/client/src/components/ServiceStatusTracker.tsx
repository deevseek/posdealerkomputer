import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Clock, AlertCircle, Package, Settings, TestTube, FileText, X } from 'lucide-react';

interface ServiceStep {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'pending' | 'waiting';
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

interface ServiceStatusTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  serviceNumber: string;
  currentStatus: string;
}

const serviceSteps: ServiceStep[] = [
  {
    id: 'received',
    label: 'Belum Cek',
    status: 'pending',
    icon: Clock,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100'
  },
  {
    id: 'checking',
    label: 'Sedang Cek',
    status: 'pending',
    icon: AlertCircle,
    color: 'text-sky-700',
    bgColor: 'bg-sky-100'
  },
  {
    id: 'in-progress',
    label: 'Sedang Dikerjakan',
    status: 'pending',
    icon: Settings,
    color: 'text-green-700',
    bgColor: 'bg-green-100'
  },
  {
    id: 'waiting-technician',
    label: 'Ditunggu MITRA Teknik',
    status: 'pending',
    icon: AlertCircle,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100'
  },
  {
    id: 'testing',
    label: 'Sedang Tes',
    status: 'pending',
    icon: TestTube,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100'
  },
  {
    id: 'waiting-confirmation',
    label: 'Menunggu Konfirmasi',
    status: 'pending',
    icon: FileText,
    color: 'text-red-700',
    bgColor: 'bg-red-100'
  },
  {
    id: 'waiting-parts',
    label: 'Menunggu Sparepart',
    status: 'pending',
    icon: Package,
    color: 'text-orange-700',
    bgColor: 'bg-orange-100'
  },
  {
    id: 'completed',
    label: 'Selesai',
    status: 'pending',
    icon: CheckCircle,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100'
  }
];

// Map status dari database ke langkah-langkah service
const statusMapping: Record<string, number> = {
  'pending': 0,           // Belum Cek
  'checking': 1,          // Sedang Cek  
  'in-progress': 2,       // Sedang Dikerjakan
  'waiting-technician': 3, // Ditunggu MITRA Teknik
  'testing': 4,           // Sedang Tes
  'waiting-confirmation': 5, // Menunggu Konfirmasi
  'waiting-parts': 6,     // Menunggu Sparepart
  'completed': 7,         // Selesai
  'delivered': 7,         // Selesai (sudah diambil)
  'cancelled': -1         // Dibatalkan
};

export default function ServiceStatusTracker({ 
  isOpen, 
  onClose, 
  serviceNumber, 
  currentStatus 
}: ServiceStatusTrackerProps) {
  
  const getCurrentStepIndex = () => {
    return statusMapping[currentStatus] || 0;
  };

  const getStepStatus = (stepIndex: number): 'completed' | 'current' | 'pending' | 'waiting' => {
    const currentIndex = getCurrentStepIndex();
    
    if (currentStatus === 'cancelled') {
      return 'waiting';
    }
    
    if (stepIndex < currentIndex) {
      return 'completed';
    } else if (stepIndex === currentIndex) {
      return 'current';
    } else {
      return 'pending';
    }
  };

  const getStepColors = (step: ServiceStep, actualStatus: string) => {
    switch (actualStatus) {
      case 'completed':
        return {
          color: 'text-green-700',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-500'
        };
      case 'current':
        return {
          color: step.color,
          bgColor: step.bgColor,
          borderColor: 'border-blue-500 ring-2 ring-blue-200'
        };
      case 'waiting':
        return {
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-300'
        };
      default:
        return {
          color: 'text-gray-400',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>📋 Perbaikan Detail Status Proses Servis</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center text-sm text-gray-600">
            Silahkan pilih Detail Status untuk No. Servis <span className="font-bold text-blue-600">{serviceNumber}</span>
          </div>

          {/* Status Steps Grid */}
          <div className="grid grid-cols-2 gap-3">
            {serviceSteps.map((step, index) => {
              const stepStatus = getStepStatus(index);
              const colors = getStepColors(step, stepStatus);
              const Icon = step.icon;

              return (
                <div
                  key={step.id}
                  className={`
                    relative p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-md
                    ${colors.bgColor} ${colors.borderColor}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`
                      flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                      ${stepStatus === 'completed' ? 'bg-green-500 text-white' : 
                        stepStatus === 'current' ? 'bg-blue-500 text-white' : 
                        'bg-gray-300 text-gray-500'}
                    `}>
                      {stepStatus === 'completed' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium text-sm ${colors.color}`}>
                        {step.label}
                      </div>
                      {stepStatus === 'current' && (
                        <div className="text-xs text-blue-600 mt-1">
                          ← Status Saat Ini
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status indicator */}
                  {stepStatus === 'current' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Information Box */}
          <Card className="mt-6">
            <CardContent className="pt-4">
              <div className="text-sm text-gray-600">
                <strong>Informasi:</strong> Detail Status Proses Servis ini juga akan muncul saat Pelanggan 
                melakukan Cek Status (Tracking).
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              ← Batal
            </Button>
            <Button 
              onClick={onClose}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              ✓ Perbaikan Detail Status
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}