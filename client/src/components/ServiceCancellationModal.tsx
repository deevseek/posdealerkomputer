import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Calculator, RefreshCw, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { serviceCancellationSchema, type ServiceCancellationRequest } from "@shared/service-cancellation-schema";
import { formatDateShort } from '@shared/utils/timezone';

interface ServiceCancellationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceTicket: any;
  onSuccess?: () => void;
}

type CancellationType = 'before_completed' | 'after_completed' | 'warranty_refund';

const getCancellationScenarios = (ticket: any): CancellationType[] => {
  if (!ticket) return [];
  
  const status = ticket.status;
  const hasWarranty = ticket.warrantyDuration && ticket.warrantyDuration > 0;
  
  // For tickets not yet completed (pending, checking, in-progress, waiting-*)
  if (['pending', 'checking', 'in-progress', 'waiting-technician', 'testing', 'waiting-confirmation', 'waiting-parts'].includes(status)) {
    return ['before_completed'];
  }
  
  // For completed/delivered tickets
  if (['completed', 'delivered'].includes(status)) {
    const scenarios: CancellationType[] = ['after_completed'];
    
    // Add warranty refund option if ticket has warranty
    if (hasWarranty) {
      scenarios.push('warranty_refund');
    }
    
    return scenarios;
  }
  
  return [];
};

const getScenarioInfo = (type: CancellationType) => {
  switch (type) {
    case 'before_completed':
      return {
        title: 'Sebelum Selesai',
        description: 'Biaya pembatalan akan dicatat sebagai pendapatan',
        icon: <XCircle className="h-4 w-4 text-orange-600" />,
        color: 'bg-orange-50 border-orange-200 text-orange-800'
      };
    case 'after_completed':
      return {
        title: 'Setelah Selesai',
        description: 'Sparepart akan dikembalikan ke stok dan revenue sparepart akan di-reverse',
        icon: <RefreshCw className="h-4 w-4 text-blue-600" />,
        color: 'bg-blue-50 border-blue-200 text-blue-800'
      };
    case 'warranty_refund':
      return {
        title: 'Refund Garansi',
        description: 'Transaksi asli akan di-refund dan sparepart masuk ke barang rusak',
        icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
        color: 'bg-red-50 border-red-200 text-red-800'
      };
    default:
      return {
        title: 'Tidak Diketahui',
        description: '',
        icon: <XCircle className="h-4 w-4" />,
        color: 'bg-gray-50 border-gray-200 text-gray-800'
      };
  }
};

const formatCurrency = (value: string): string => {
  // Remove all non-digit characters
  const numbers = value.replace(/\D/g, '');
  
  // Add thousands separators
  if (numbers === '') return '';
  
  const formatted = new Intl.NumberFormat('id-ID').format(parseInt(numbers));
  return formatted;
};

const parseCurrency = (value: string): string => {
  // Remove all formatting and return just numbers with decimal point
  const numbers = value.replace(/\D/g, '');
  return numbers === '' ? '' : numbers;
};

export default function ServiceCancellationModal({
  open,
  onOpenChange,
  serviceTicket,
  onSuccess
}: ServiceCancellationModalProps) {
  const [selectedScenario, setSelectedScenario] = useState<CancellationType | null>(null);
  const { toast } = useToast();

  const availableScenarios = getCancellationScenarios(serviceTicket);

  const form = useForm<ServiceCancellationRequest>({
    resolver: zodResolver(serviceCancellationSchema),
    defaultValues: {
      cancellationFee: '',
      cancellationReason: '',
      cancellationType: 'before_completed', // Set default
      userId: 'current-user', // Set default user ID
    },
    mode: 'onChange',
  });

  const cancelMutation = useMutation({
    mutationFn: async (data: ServiceCancellationRequest) => {
      return apiRequest('POST', `/api/service-tickets/${serviceTicket.id}/cancel`, data);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["/api/service-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      toast({
        title: "Sukses",
        description: "Service ticket berhasil dibatalkan",
      });
      
      // Reset form and close modal
      form.reset();
      setSelectedScenario(null);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal membatalkan service ticket",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ServiceCancellationRequest) => {
    console.log('Form submit triggered, data:', data);
    console.log('Selected scenario:', selectedScenario);
    console.log('Form errors:', form.formState.errors);
    console.log('Form valid:', form.formState.isValid);
    
    if (!selectedScenario) {
      toast({
        title: "Error",
        description: "Pilih skenario pembatalan terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    // Parse currency value back to decimal string
    const parsedFee = parseCurrency(data.cancellationFee);
    
    const submitData = {
      ...data,
      cancellationFee: parsedFee,
    };

    console.log('Final submit data:', submitData);
    cancelMutation.mutate(submitData);
  };

  const handleClose = () => {
    form.reset();
    setSelectedScenario(null);
    onOpenChange(false);
  };

  if (!serviceTicket || availableScenarios.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-cancellation-unavailable">
          <DialogHeader>
            <DialogTitle>Pembatalan Tidak Tersedia</DialogTitle>
            <DialogDescription>
              Service ticket ini tidak dapat dibatalkan saat ini.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} data-testid="button-close-unavailable">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-service-cancellation">
        <DialogHeader>
          <DialogTitle>Pembatalan Service Ticket</DialogTitle>
          <DialogDescription>
            Pilih skenario pembatalan yang sesuai dan isi informasi yang diperlukan
          </DialogDescription>
        </DialogHeader>

        {/* Service Ticket Information */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Nomor Ticket:</span>
                <p className="text-muted-foreground">{serviceTicket.ticketNumber}</p>
              </div>
              <div>
                <span className="font-medium">Status Saat Ini:</span>
                <Badge variant="outline" className="ml-2">
                  {serviceTicket.status}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Customer:</span>
                <p className="text-muted-foreground">{serviceTicket.customerName || 'Unknown'}</p>
              </div>
              <div>
                <span className="font-medium">Tanggal Dibuat:</span>
                <p className="text-muted-foreground">
                  {serviceTicket.createdAt ? formatDateShort(serviceTicket.createdAt) : '-'}
                </p>
              </div>
              <div className="md:col-span-2">
                <span className="font-medium">Device:</span>
                <p className="text-muted-foreground">
                  {serviceTicket.deviceType}
                  {serviceTicket.deviceBrand && ` - ${serviceTicket.deviceBrand}`}
                  {serviceTicket.deviceModel && ` ${serviceTicket.deviceModel}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scenario Selection */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Pilih Skenario Pembatalan:</label>
            <div className="grid gap-3 mt-2">
              {availableScenarios.map((scenario) => {
                const info = getScenarioInfo(scenario);
                const isSelected = selectedScenario === scenario;
                
                return (
                  <Card
                    key={scenario}
                    className={`cursor-pointer transition-all border-2 ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => {
                      setSelectedScenario(scenario);
                      form.setValue('cancellationType', scenario);
                    }}
                    data-testid={`card-scenario-${scenario}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${info.color}`}>
                          {info.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{info.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {info.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="text-primary">
                            <Calculator className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {selectedScenario && (
            <>
              <Separator />
              
              {/* Cancellation Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="cancellationFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biaya Pembatalan (Rp) *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                              Rp
                            </span>
                            <Input
                              {...field}
                              placeholder="0"
                              className="pl-10"
                              value={formatCurrency(field.value)}
                              onChange={(e) => {
                                const rawValue = parseCurrency(e.target.value);
                                field.onChange(rawValue);
                              }}
                              data-testid="input-cancellation-fee"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cancellationReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alasan Pembatalan *</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Jelaskan alasan pembatalan service ticket ini..."
                            className="min-h-[100px]"
                            data-testid="textarea-cancellation-reason"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter className="pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={cancelMutation.isPending}
                      data-testid="button-cancel-cancellation"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={cancelMutation.isPending}
                      data-testid="button-confirm-cancellation"
                      onClick={(e) => {
                        console.log('Submit button clicked!');
                        console.log('Form values:', form.getValues());
                        console.log('Form errors:', form.formState.errors);
                        console.log('Form isValid:', form.formState.isValid);
                        console.log('Selected scenario:', selectedScenario);
                        console.log('Is pending:', cancelMutation.isPending);
                      }}
                    >
                      {cancelMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Membatalkan...
                        </>
                      ) : (
                        'Konfirmasi Pembatalan'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}