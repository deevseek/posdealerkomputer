import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { 
  ChartLine, ScanBarcode, Wrench, Package, PieChart, Users, Truck, 
  FileText, Settings, UserCog, Shield, Layers, MessageCircle, Palette,
  Database, CreditCard, BarChart3, CheckCircle, XCircle, Save
} from 'lucide-react';

// Define all available application features
const APPLICATION_FEATURES = [
  { 
    id: 'dashboard', 
    name: 'Dashboard & Analytics', 
    icon: ChartLine, 
    description: 'Main dashboard with business analytics and reports',
    permission: 'dashboard_view'
  },
  { 
    id: 'pos', 
    name: 'Point of Sale (POS)', 
    icon: ScanBarcode, 
    description: 'Cash register and sales transactions',
    permission: 'pos_access'
  },
  { 
    id: 'service', 
    name: 'Service Tickets', 
    icon: Wrench, 
    description: 'Repair service management and tracking',
    permission: 'service_tickets_full'
  },
  { 
    id: 'inventory', 
    name: 'Inventory Management', 
    icon: Package, 
    description: 'Stock management and product catalog',
    permission: 'inventory_full'
  },
  { 
    id: 'purchasing', 
    name: 'Purchasing System', 
    icon: Truck, 
    description: 'Purchase orders and supplier management',
    permission: 'purchasing_full'
  },
  { 
    id: 'finance', 
    name: 'Finance & Payroll', 
    icon: PieChart, 
    description: 'Financial management and payroll processing',
    permission: 'financial_full'
  },
  { 
    id: 'customers', 
    name: 'Customer Management', 
    icon: Users, 
    description: 'Customer database and relationship management',
    permission: 'customers_full'
  },
  { 
    id: 'suppliers', 
    name: 'Supplier Management', 
    icon: Truck, 
    description: 'Supplier database and purchase management',
    permission: 'suppliers_full'
  },
  { 
    id: 'users', 
    name: 'User Management', 
    icon: UserCog, 
    description: 'Staff accounts and access control',
    permission: 'users_full'
  },
  { 
    id: 'roles', 
    name: 'Role Management', 
    icon: Shield, 
    description: 'User roles and permission management',
    permission: 'roles_full'
  },
  { 
    id: 'reports', 
    name: 'Reports & Analytics', 
    icon: FileText, 
    description: 'Business reports and data analytics',
    permission: 'reports_full'
  },
  { 
    id: 'stock_movements', 
    name: 'Stock Movements', 
    icon: Layers, 
    description: 'Inventory tracking and movement history',
    permission: 'reports_inventory_view'
  },
  { 
    id: 'settings', 
    name: 'System Settings', 
    icon: Settings, 
    description: 'Application configuration and preferences',
    permission: 'settings_full'
  },
  { 
    id: 'whatsapp', 
    name: 'WhatsApp Integration', 
    icon: MessageCircle, 
    description: 'WhatsApp business messaging and notifications',
    permission: 'whatsapp_settings'
  },
  { 
    id: 'custom_branding', 
    name: 'Custom Branding', 
    icon: Palette, 
    description: 'Logo customization and brand colors',
    permission: 'settings_full'
  },
  { 
    id: 'api_access', 
    name: 'API Access', 
    icon: Database, 
    description: 'REST API access for integrations',
    permission: 'system_admin'
  },
  { 
    id: 'priority_support', 
    name: 'Priority Support', 
    icon: CreditCard, 
    description: 'Premium customer support and assistance',
    permission: 'system_admin'
  },
];

export function FeatureConfigurationManager() {
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [activeTab, setActiveTab] = useState('features');
  const queryClient = useQueryClient();

  // Fetch subscription plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/admin/plans'],
    retry: false,
  });

  // Fetch plan features configuration
  const { data: planFeatures } = useQuery({
    queryKey: ['/api/admin/plan-features', selectedPlan],
    enabled: !!selectedPlan,
    retry: false,
  });

  // Update plan features mutation
  const updatePlanFeatures = useMutation({
    mutationFn: async (data: { planId: string; features: any; limits: any }) => {
      return apiRequest('PUT', `/api/admin/plans/${data.planId}/features`, {
        features: data.features,
        limits: data.limits
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Plan features updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plan-features', selectedPlan] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update plan features',
        variant: 'destructive',
      });
    },
  });

  const handleFeatureToggle = (featureId: string, enabled: boolean) => {
    const currentFeatures = planFeatures?.features || [];
    const updatedFeatures = enabled 
      ? [...currentFeatures.filter((f: string) => f !== featureId), featureId]
      : currentFeatures.filter((f: string) => f !== featureId);
    
    updatePlanFeatures.mutate({
      planId: selectedPlan,
      features: updatedFeatures,
      limits: planFeatures?.limits || {}
    });
  };

  const handleLimitUpdate = (limitType: string, value: number) => {
    const updatedLimits = {
      ...planFeatures?.limits || {},
      [limitType]: value
    };
    
    updatePlanFeatures.mutate({
      planId: selectedPlan,
      features: planFeatures?.features || [],
      limits: updatedLimits
    });
  };

  const selectedPlanData = plans?.find((p: any) => p.id === selectedPlan);

  return (
    <div className="space-y-6">
      {/* Plan Selection */}
      <div className="flex items-center space-x-4">
        <Label htmlFor="plan-select" className="text-sm font-medium">Select Plan to Configure:</Label>
        <Select value={selectedPlan} onValueChange={setSelectedPlan}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Choose a subscription plan" />
          </SelectTrigger>
          <SelectContent>
            {plans?.map((plan: any) => (
              <SelectItem key={plan.id} value={plan.id}>
                <div className="flex items-center space-x-2">
                  <span>{plan.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0
                    }).format(plan.price)}/mo
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPlan && selectedPlanData && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Configure: {selectedPlanData.name}</span>
            </CardTitle>
            <CardDescription>
              Customize features and limitations for this subscription plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="features">🎛️ Features</TabsTrigger>
                <TabsTrigger value="limits">📊 Limits & Quotas</TabsTrigger>
              </TabsList>

              <TabsContent value="features" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {APPLICATION_FEATURES.map((feature) => {
                    const isEnabled = planFeatures?.features?.includes(feature.id) || false;
                    const IconComponent = feature.icon;
                    
                    return (
                      <Card key={feature.id} className={`transition-all ${isEnabled ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg ${isEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                              <IconComponent className={`h-4 w-4 ${isEnabled ? 'text-green-600' : 'text-gray-500'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium truncate">{feature.name}</h4>
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={(checked) => handleFeatureToggle(feature.id, checked)}
                                  disabled={updatePlanFeatures.isPending}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {feature.description}
                              </p>
                              <Badge variant={isEnabled ? "default" : "secondary"} className="mt-2 text-xs">
                                {isEnabled ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Enabled
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Disabled
                                  </>
                                )}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="limits" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>User Limits</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label htmlFor="max-users" className="text-xs">Maximum Users</Label>
                        <Input
                          id="max-users"
                          type="number"
                          value={planFeatures?.limits?.maxUsers || selectedPlanData.maxUsers || 5}
                          onChange={(e) => handleLimitUpdate('maxUsers', parseInt(e.target.value))}
                          className="mt-1"
                          min="1"
                          max="1000"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Transaction Limits</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label htmlFor="max-transactions" className="text-xs">Transactions/Month</Label>
                        <Input
                          id="max-transactions"
                          type="number"
                          value={planFeatures?.limits?.maxTransactionsPerMonth || selectedPlanData.maxTransactionsPerMonth || 1000}
                          onChange={(e) => handleLimitUpdate('maxTransactionsPerMonth', parseInt(e.target.value))}
                          className="mt-1"
                          min="1"
                          step="100"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <Database className="h-4 w-4" />
                        <span>Storage Limits</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label htmlFor="max-storage" className="text-xs">Storage (GB)</Label>
                        <Input
                          id="max-storage"
                          type="number"
                          value={planFeatures?.limits?.maxStorageGB || selectedPlanData.maxStorageGB || 1}
                          onChange={(e) => handleLimitUpdate('maxStorageGB', parseInt(e.target.value))}
                          className="mt-1"
                          min="1"
                          max="1000"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Summary */}
                <Card className="bg-blue-50/50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-sm text-blue-800">📋 Configuration Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-blue-700">Active Features:</span>
                        <span className="ml-2 font-bold">{planFeatures?.features?.length || 0}</span>
                      </div>
                      <div>
                        <span className="font-medium text-blue-700">Max Users:</span>
                        <span className="ml-2 font-bold">{planFeatures?.limits?.maxUsers || selectedPlanData.maxUsers}</span>
                      </div>
                      <div>
                        <span className="font-medium text-blue-700">Monthly Transactions:</span>
                        <span className="ml-2 font-bold">{(planFeatures?.limits?.maxTransactionsPerMonth || selectedPlanData.maxTransactionsPerMonth)?.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {!selectedPlan && (
        <Card className="border-dashed border-2">
          <CardContent className="text-center py-12">
            <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Plan to Configure</h3>
            <p className="text-muted-foreground">
              Choose a subscription plan above to configure its features and limitations
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}