import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TrackingConfig } from "@shared/schema";

export default function OnlineTrackingSetup() {
  const { data: trackingConfig } = useQuery<TrackingConfig>({
    queryKey: ["/api/tracking/config"],
  });

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <i className="fas fa-link text-blue-600 dark:text-blue-400"></i>
            </div>
            <div>
              <CardTitle className="text-lg">Auto-Generated Tracking Links</CardTitle>
              <p className="text-sm text-muted-foreground">One-click service status checking</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            <i className="fas fa-check mr-1"></i>Active
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Before (Manual) */}
          <div>
            <h4 className="font-medium text-foreground mb-3 flex items-center">
              <i className="fas fa-times-circle text-red-500 mr-2"></i>
              Sebelumnya (Manual)
            </h4>
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="space-y-3">
                <div className="text-sm">
                  <div className="text-muted-foreground mb-1">Link yang dikirim:</div>
                  <code className="bg-red-100 dark:bg-red-900 px-2 py-1 rounded text-xs">
                    {trackingConfig?.baseUrl || 'https://service.app'}/tracking
                  </code>
                </div>
                <div className="text-sm">
                  <div className="text-muted-foreground mb-1">Customer harus input:</div>
                  <Input 
                    type="text" 
                    placeholder="Masukkan nomor service..." 
                    className="border-red-300 dark:border-red-700 bg-background"
                    data-testid="manual-service-input"
                    readOnly
                  />
                </div>
                <div className="text-xs text-red-600 dark:text-red-400">
                  ❌ Langkah tambahan untuk customer
                </div>
              </div>
            </div>
          </div>
          
          {/* After (Auto) */}
          <div>
            <h4 className="font-medium text-foreground mb-3 flex items-center">
              <i className="fas fa-check-circle text-green-500 mr-2"></i>
              Sekarang (Otomatis)
            </h4>
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="space-y-3">
                <div className="text-sm">
                  <div className="text-muted-foreground mb-1">Link yang dikirim:</div>
                  <code className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded text-xs">
                    {trackingConfig?.baseUrl || 'https://service.app'}/track/SVC20241201001
                  </code>
                </div>
                <div className="text-sm">
                  <div className="text-muted-foreground mb-1">Customer action:</div>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    data-testid="one-click-tracking"
                  >
                    Klik Langsung → Status Muncul
                  </Button>
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">
                  ✅ Satu klik langsung tampil status
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sample Tracking Interface */}
        <div className="mt-6">
          <h5 className="font-medium text-foreground mb-3">Sample Tracking Status</h5>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h6 className="font-semibold text-foreground" data-testid="service-number">
                  Service #SVC20241201001
                </h6>
                <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  Dalam Proses
                </Badge>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-check text-green-600 dark:text-green-400 text-xs"></i>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Service Diterima</div>
                    <div className="text-sm text-muted-foreground" data-testid="step-received">
                      01 Dec 2024, 09:00
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-check text-green-600 dark:text-green-400 text-xs"></i>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Analisa Kerusakan</div>
                    <div className="text-sm text-muted-foreground" data-testid="step-analysis">
                      01 Dec 2024, 10:30
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-tools text-blue-600 dark:text-blue-400 text-xs"></i>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Sedang Diperbaiki</div>
                    <div className="text-sm text-muted-foreground" data-testid="step-repair">
                      01 Dec 2024, 14:00
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-clock text-muted-foreground text-xs"></i>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Quality Check</div>
                    <div className="text-sm text-muted-foreground" data-testid="step-pending">
                      Pending
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
