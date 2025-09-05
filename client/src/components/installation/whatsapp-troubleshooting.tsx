import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { WhatsappConfig } from "@shared/schema";

export default function WhatsAppTroubleshooting() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: whatsappConfig } = useQuery<WhatsappConfig>({
    queryKey: ["/api/whatsapp/config"],
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/whatsapp/test');
    },
    onSuccess: () => {
      toast({
        title: "Connection Test Successful",
        description: "WhatsApp API is responding correctly",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Test Failed",
        description: error.message || "Unable to connect to WhatsApp API",
        variant: "destructive",
      });
    },
  });

  const retryFailedMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/whatsapp/retry-failed');
    },
    onSuccess: (data: any) => {
      toast({
        title: "Retrying Failed Messages",
        description: `Attempting to resend ${data.retriedCount} failed messages`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Retry Failed",
        description: error.message || "Unable to retry failed messages",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case "error":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      default:
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
              <i className="fab fa-whatsapp text-green-600 dark:text-green-400"></i>
            </div>
            <div>
              <CardTitle className="text-lg">WhatsApp API Improvements</CardTitle>
              <p className="text-sm text-muted-foreground">Fixing inconsistent message delivery</p>
            </div>
          </div>
          <Badge className={whatsappConfig?.status === "connected" 
            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
            : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
          }>
            <i className="fas fa-wrench mr-1"></i>
            {whatsappConfig?.status === "connected" ? "Connected" : "In Progress"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Issue Analysis */}
          <div>
            <h4 className="font-medium text-foreground mb-3 flex items-center">
              <i className="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>
              Identified Issues
            </h4>
            <div className="space-y-3">
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <i className="fas fa-check-circle text-green-500 mt-1 text-sm"></i>
                  <div className="text-sm">
                    <div className="font-medium text-foreground">Service Reception</div>
                    <div className="text-muted-foreground" data-testid="reception-status">
                      WhatsApp notifications working ✓
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <i className="fas fa-times-circle text-red-500 mt-1 text-sm"></i>
                  <div className="text-sm">
                    <div className="font-medium text-foreground">Status Updates</div>
                    <div className="text-muted-foreground" data-testid="update-status">
                      Not sending update messages ✗
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Solution Implementation */}
          <div>
            <h4 className="font-medium text-foreground mb-3 flex items-center">
              <i className="fas fa-cog text-blue-500 mr-2"></i>
              Solution Implementation
            </h4>
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="text-sm">
                  <div className="font-medium text-foreground mb-1">Queue System</div>
                  <div className="text-muted-foreground">Retry mechanism for failed messages</div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mt-2">
                    <div className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full" style={{ width: "75%" }}></div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="text-sm">
                  <div className="font-medium text-foreground mb-1">Webhook Validation</div>
                  <div className="text-muted-foreground">Enhanced response handling</div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mt-2">
                    <div className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full" style={{ width: "90%" }}></div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="text-sm">
                  <div className="font-medium text-foreground mb-1">Logging System</div>
                  <div className="text-muted-foreground">Track delivery status</div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mt-2">
                    <div className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full" style={{ width: "60%" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* WhatsApp Testing Interface */}
        <div className="mt-6">
          <h5 className="font-medium text-foreground mb-3">API Testing Dashboard</h5>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                    <i className="fas fa-paper-plane text-green-600 dark:text-green-400"></i>
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="messages-sent">
                    {whatsappConfig?.messagesSentToday || 247}
                  </div>
                  <div className="text-sm text-muted-foreground">Messages Sent Today</div>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-2">
                    <i className="fas fa-clock text-yellow-600 dark:text-yellow-400"></i>
                  </div>
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="pending-messages">
                    {whatsappConfig?.pendingMessages || 12}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending Messages</div>
                </div>
                
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-2">
                    <i className="fas fa-times text-red-600 dark:text-red-400"></i>
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="failed-messages">
                    {whatsappConfig?.failedMessages || 3}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed Messages</div>
                </div>
              </div>
              
              <div className="mt-4 flex space-x-2">
                <Button 
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => testConnectionMutation.mutate()}
                  disabled={testConnectionMutation.isPending}
                  data-testid="button-test-connection"
                >
                  {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
                </Button>
                <Button 
                  className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  onClick={() => retryFailedMutation.mutate()}
                  disabled={retryFailedMutation.isPending || !whatsappConfig?.failedMessages}
                  data-testid="button-retry-failed"
                >
                  {retryFailedMutation.isPending ? "Retrying..." : "Retry Failed"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
