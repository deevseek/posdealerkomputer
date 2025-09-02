import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Laptop, Wrench, BarChart3, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Landing() {
  // Get store config for app name
  const { data: storeConfig } = useQuery({
    queryKey: ['/api/store-config'],
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
  
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
              <Laptop className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">{(storeConfig as any)?.name || 'LaptopPOS'}</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Complete POS System for Laptop Sales & Service Management
          </p>
          <Button 
            onClick={handleLogin} 
            size="lg" 
            className="px-8 py-3 text-lg"
            data-testid="button-login"
          >
            Login to Continue
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Sales Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Complete POS system with transaction tracking and reporting
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="text-lg">Service Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track laptop repairs and service requests efficiently
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Package className="w-6 h-6 text-secondary" />
              </div>
              <CardTitle className="text-lg">Inventory Control</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage stock levels and get low stock alerts
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-lg">Financial Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track profits, expenses and generate detailed reports
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Key Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">For Administrators</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Role-based access control</li>
                  <li>• Complete system configuration</li>
                  <li>• User management</li>
                  <li>• Financial oversight</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">For Staff</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Easy-to-use POS interface</li>
                  <li>• Service ticket management</li>
                  <li>• Customer database</li>
                  <li>• Real-time inventory updates</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
