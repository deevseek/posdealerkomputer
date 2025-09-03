import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Laptop, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'delivered':
        return 'secondary';
      default:
        return 'destructive';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return Clock;
      case 'in_progress':
        return Clock;
      case 'completed':
        return CheckCircle;
      case 'delivered':
        return CheckCircle;
      default:
        return AlertTriangle;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Menunggu';
      case 'in_progress':
        return 'Dikerjakan';
      case 'completed':
        return 'Selesai';
      case 'delivered':
        return 'Terkirim';
      default:
        return 'Tertunda';
    }
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
              const StatusIcon = getStatusIcon(ticket.status);
              
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
                      variant={getStatusColor(ticket.status)}
                      className="flex items-center"
                    >
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {getStatusText(ticket.status)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ticket.estimatedCompletion 
                        ? `Est: ${new Date(ticket.estimatedCompletion).toLocaleDateString()}`
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
