import { useMemo, useState } from 'react';
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
  Database, CreditCard, BarChart3, CheckCircle, XCircle, Save, HelpCircle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { Plan as SaasPlan } from '@shared/saas-schema';

type PlanFeatureLimits = {
  maxUsers?: number | null;
  maxTransactionsPerMonth?: number | null;
  maxStorageGB?: number | null;
  [key: string]: unknown;
};

type PlanFeatureResponse = {
  planId: string;
  planName: string;
  features: string[];
  limits: PlanFeatureLimits;
};

const defaultPlanFeatures: PlanFeatureResponse = {
  planId: '',
  planName: '',
  features: [],
  limits: {}
};

type FeatureDefinition = {
  name: string;
  description: string;
  icon: LucideIcon;
};

const FEATURE_DEFINITIONS: Record<string, FeatureDefinition> = {
  dashboard: {
    name: 'Dashboard & Analytics',
    description: 'Main dashboard with business analytics and reports',
    icon: ChartLine,
  },
  pos: {
    name: 'Point of Sale (POS)',
    description: 'Cash register and sales transactions',
    icon: ScanBarcode,
  },
  service: {
    name: 'Service Tickets',
    description: 'Repair service management and tracking',
    icon: Wrench,
  },
  inventory: {
    name: 'Inventory Management',
    description: 'Stock management and product catalog',
    icon: Package,
  },
  purchasing: {
    name: 'Purchasing System',
    description: 'Purchase orders and supplier management',
    icon: Truck,
  },
  finance: {
    name: 'Finance & Payroll',
    description: 'Financial management and payroll processing',
    icon: PieChart,
  },
  customers: {
    name: 'Customer Management',
    description: 'Customer database and relationship management',
    icon: Users,
  },
  suppliers: {
    name: 'Supplier Management',
    description: 'Supplier database and purchase management',
    icon: Truck,
  },
  users: {
    name: 'User Management',
    description: 'Staff accounts and access control',
    icon: UserCog,
  },
  roles: {
    name: 'Role Management',
    description: 'User roles and permission management',
    icon: Shield,
  },
  reports: {
    name: 'Reports & Analytics',
    description: 'Business reports and data analytics',
    icon: FileText,
  },
  stock_movements: {
    name: 'Stock Movements',
    description: 'Inventory tracking and movement history',
    icon: Layers,
  },
  settings: {
    name: 'System Settings',
    description: 'Application configuration and preferences',
    icon: Settings,
  },
  whatsapp: {
    name: 'WhatsApp Integration',
    description: 'WhatsApp business messaging and notifications',
    icon: MessageCircle,
  },
  custom_branding: {
    name: 'Custom Branding',
    description: 'Logo customization and brand colors',
    icon: Palette,
  },
  api_access: {
    name: 'API Access',
    description: 'REST API access for integrations',
    icon: Database,
  },
  priority_support: {
    name: 'Priority Support',
    description: 'Premium customer support and assistance',
    icon: CreditCard,
  },
};

const DEFAULT_FEATURE_IDS = Object.keys(FEATURE_DEFINITIONS);

type FeatureOption = FeatureDefinition & { id: string };

export function FeatureConfigurationManager() {
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [activeTab, setActiveTab] = useState('features');
  const queryClient = useQueryClient();

  // Fetch subscription plans
  const { data: plans = [], isLoading: plansLoading } = useQuery<SaasPlan[]>({
    queryKey: ['/api/admin/plans'],
    retry: false,
  });

  // Fetch plan features configuration
  const { data: planFeaturesResponse } = useQuery<PlanFeatureResponse | null>({
    queryKey: ['/api/admin/plan-features', selectedPlan],
    enabled: !!selectedPlan,
    retry: false,
  });

  const { data: availableFeaturesResponse } = useQuery<{ features?: unknown }>({
    queryKey: ['/api/admin/available-features'],
    retry: false,
  });

  const planFeatures = useMemo(() => planFeaturesResponse ?? defaultPlanFeatures, [planFeaturesResponse]);

  const normalizedPlanFeatures = useMemo(() => {
    if (!Array.isArray(planFeatures.features)) {
      return [] as string[];
    }

    return planFeatures.features
      .filter((feature): feature is string => typeof feature === 'string' && feature.trim().length > 0);
  }, [planFeatures.features]);

  const normalizedLimits: PlanFeatureLimits = useMemo(() => (
    typeof planFeatures.limits === 'object' && planFeatures.limits !== null
      ? planFeatures.limits
      : {}
  ), [planFeatures.limits]);

  const availableFeatureIds = useMemo(() => {
    const responseFeatures = Array.isArray((availableFeaturesResponse as any)?.features)
      ? (availableFeaturesResponse as any).features.filter((feature: unknown): feature is string => typeof feature === 'string')
      : [];

    const baseIds = responseFeatures.length > 0 ? responseFeatures : DEFAULT_FEATURE_IDS;

    return Array.from(new Set([...baseIds, ...normalizedPlanFeatures]));
  }, [availableFeaturesResponse, normalizedPlanFeatures]);

  const featureOptions: FeatureOption[] = useMemo(() => {
    const toTitleCase = (value: string) =>
      value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (match) => match.toUpperCase());

    return availableFeatureIds.map((featureId) => {
      const definition = FEATURE_DEFINITIONS[featureId];

      if (definition) {
        return { id: featureId, ...definition } satisfies FeatureOption;
      }

      const displayName = toTitleCase(featureId);

      return {
        id: featureId,
        name: displayName || 'Fitur Kustom',
        description: displayName
          ? `Pengaturan untuk ${displayName}`
          : 'Pengaturan fitur tambahan dari paket langganan.',
        icon: HelpCircle,
      } satisfies FeatureOption;
    });
  }, [availableFeatureIds]);

  // Update plan features mutation
  const updatePlanFeatures = useMutation({
    mutationFn: async (data: { planId: string; features: string[]; limits: PlanFeatureLimits }) => {
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
    if (!selectedPlan) return;

    const currentFeatures = normalizedPlanFeatures;
    const updatedFeatures = enabled
      ? [...currentFeatures.filter((f: string) => f !== featureId), featureId]
      : currentFeatures.filter((f: string) => f !== featureId);

    updatePlanFeatures.mutate({
      planId: selectedPlan,
      features: updatedFeatures,
      limits: normalizedLimits
    });
  };

  const handleLimitUpdate = (limitType: string, value: string) => {
    if (!selectedPlan) return;

    const parsedValue = Number.parseInt(value, 10);
    const safeValue = Number.isFinite(parsedValue) ? parsedValue : undefined;

    const updatedLimits = {
      ...normalizedLimits,
    } as Record<string, number | null>;

    if (safeValue === undefined) {
      delete updatedLimits[limitType];
    } else {
      updatedLimits[limitType] = safeValue;
    };

    updatePlanFeatures.mutate({
      planId: selectedPlan,
      features: normalizedPlanFeatures,
      limits: updatedLimits
    });
  };

  const selectedPlanData = plans.find((plan) => plan.id === selectedPlan);

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
            {plans.map((plan) => (
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
                  {featureOptions.map((feature) => {
                    const isEnabled = normalizedPlanFeatures.includes(feature.id);
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
                          value={normalizedLimits?.maxUsers ?? selectedPlanData.maxUsers ?? 5}
                          onChange={(e) => handleLimitUpdate('maxUsers', e.target.value)}
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
                          value={normalizedLimits?.maxTransactionsPerMonth ?? selectedPlanData.maxTransactionsPerMonth ?? 1000}
                          onChange={(e) => handleLimitUpdate('maxTransactionsPerMonth', e.target.value)}
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
                          value={normalizedLimits?.maxStorageGB ?? selectedPlanData.maxStorageGB ?? 1}
                          onChange={(e) => handleLimitUpdate('maxStorageGB', e.target.value)}
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
                        <span className="ml-2 font-bold">{normalizedPlanFeatures.length}</span>
                      </div>
                      <div>
                        <span className="font-medium text-blue-700">Max Users:</span>
                        <span className="ml-2 font-bold">{normalizedLimits?.maxUsers ?? selectedPlanData.maxUsers}</span>
                      </div>
                      <div>
                        <span className="font-medium text-blue-700">Monthly Transactions:</span>
                        <span className="ml-2 font-bold">{(normalizedLimits?.maxTransactionsPerMonth ?? selectedPlanData.maxTransactionsPerMonth ?? 0).toLocaleString()}</span>
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