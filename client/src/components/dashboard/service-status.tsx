import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Laptop, Clock, CheckCircle, AlertTriangle, Package, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDateShort } from '@shared/utils/timezone';
import { SERVICE_STATUS_LABELS, normalizeServiceStatus, type ServiceStatus } from "@shared/service-status";

export default function ServiceStatus() {
  const { data: serviceTickets, isLoading } = useQuery({
    queryKey: ["/api/service-tickets"],
    queryFn: async () => {
      const response = await fetch('/api/service-tickets?active=true');
      if (!response.ok) throw new Error('Failed to fetch service tickets');
      return response.json();
    },
    retry: false,
  });

  const statusConfig: Record<ServiceStatus, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock; label: string }> = {
    pending: { variant: "secondary", icon: Clock, label: SERVICE_STATUS_LABELS.pending },
    checking: { variant: "secondary", icon: Clock, label: SERVICE_STATUS_LABELS.checking },
    "waiting-technician": { variant: "outline", icon: AlertTriangle, label: SERVICE_STATUS_LABELS["waiting-technician"] },
    "waiting-confirmation": { variant: "destructive", icon: AlertTriangle, label: SERVICE_STATUS_LABELS["waiting-confirmation"] },
    "waiting-parts": { variant: "secondary", icon: Package, label: SERVICE_STATUS_LABELS["waiting-parts"] },
    "in-progress": { variant: "default", icon: Settings, label: SERVICE_STATUS_LABELS["in-progress"] },
    testing: { variant: "default", icon: Settings, label: SERVICE_STATUS_LABELS.testing },
    completed: { variant: "default", icon: CheckCircle, label: SERVICE_STATUS_LABELS.completed },
    delivered: { variant: "secondary", icon: CheckCircle, label: SERVICE_STATUS_LABELS.delivered },
    cancelled: { variant: "destructive", icon: AlertTriangle, label: SERVICE_STATUS_LABELS.cancelled },
  };

  const getStatusConfig = (status: string | null | undefined) => {
    const normalized = normalizeServiceStatus(status) ?? 'pending';
    return statusConfig[normalized];
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <CardTitle>Status Servis</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : !serviceTickets || serviceTickets.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Tidak ada tiket servis aktif.
          </p>
        ) : (
          <div className="space-y-4">
            {serviceTickets.slice(0, 5).map((ticket: any) => {
              const status = getStatusConfig(ticket.status);
              const StatusIcon = status?.icon || AlertTriangle;
              
              return (
                <div 
                  key={ticket.id} 
                  className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 transition-colors"
                  data-testid={`service-ticket-${ticket.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                      <Laptop className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {ticket.customer?.name || "Unknown Customer"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.deviceBrand} {ticket.deviceModel} - {ticket.problem}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={status?.variant || 'secondary'}
                      className="flex items-center"
                    >
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status?.label || 'Status Tidak Dikenal'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ticket.estimatedCompletion 
                        ? `Est: ${formatDateShort(ticket.estimatedCompletion)}`
                        : "No estimate"
                      }
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
