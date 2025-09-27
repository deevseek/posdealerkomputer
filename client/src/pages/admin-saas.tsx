import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, XCircle, Building2, Users, DollarSign, AlertTriangle, Settings } from 'lucide-react';
import { CreateClientForm } from '@/components/CreateClientForm';
import { FeatureConfigurationManager } from '@/components/FeatureConfigurationManager';
import ClientTable from '@/components/ClientTable';
import PlanCard from '@/components/PlanCard';

// Enum mapping for plans
type PlanCode = 'basic' | 'pro' | 'premium';

const PLAN_ENUMS: Array<{ value: PlanCode; label: string }> = [
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Professional' },
  { value: 'premium', label: 'Enterprise' }
];

type NewPlanFormState = {
  name: string;
  description: string;
  price: string;
  maxUsers: string;
  maxTransactionsPerMonth: string;
  maxStorageGB: string;
  whatsappIntegration: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  isActive: boolean;
  planCode: PlanCode;
};

const PLAN_FORM_TEMPLATE: NewPlanFormState = {
  name: '',
  description: '',
  price: '',
  maxUsers: '',
  maxTransactionsPerMonth: '',
  maxStorageGB: '',
  whatsappIntegration: false,
  customBranding: false,
  apiAccess: false,
  prioritySupport: false,
  isActive: true,
  planCode: 'basic',
};

type BooleanPlanField = 'whatsappIntegration' | 'customBranding' | 'apiAccess' | 'prioritySupport' | 'isActive';

const PLAN_FEATURE_TOGGLES: Array<{ key: BooleanPlanField; label: string; description: string }> = [
  {
    key: 'whatsappIntegration',
    label: 'Integrasi WhatsApp',
    description: 'Aktifkan integrasi notifikasi WhatsApp untuk paket ini.',
  },
  {
    key: 'customBranding',
    label: 'Kustomisasi Branding',
    description: 'Izinkan penggunaan logo dan warna khusus milik client.',
  },
  {
    key: 'apiAccess',
    label: 'Akses API',
    description: 'Berikan akses API untuk integrasi sistem eksternal.',
  },
  {
    key: 'prioritySupport',
    label: 'Prioritas Support',
    description: 'Client akan mendapatkan respon dukungan yang lebih cepat.',
  },
  {
    key: 'isActive',
    label: 'Aktifkan Paket',
    description: 'Nonaktifkan jika paket belum siap dipublikasikan.',
  },
];

type AnalyticsSummary = {
  clients: {
    total: number;
    newThisMonth: number;
    active: number;
    trial: number;
    expiringTrials: number;
    suspended: number;
  };
  revenue: {
    monthlyTotal: number;
  };
};

type RevenueAnalytics = {
  mrr: number;
  dailyRevenue: Array<{ date: string; value: number }>;
};

type PlanSummary = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  currency?: string | null;
  maxUsers?: number | null;
  maxTransactionsPerMonth?: number | null;
  maxStorageGB?: number | null;
  whatsappIntegration?: boolean | null;
  customBranding?: boolean | null;
  apiAccess?: boolean | null;
  prioritySupport?: boolean | null;
  isActive?: boolean | null;
};

export default function AdminSaaS() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [newPlan, setNewPlan] = useState<NewPlanFormState>(() => ({ ...PLAN_FORM_TEMPLATE }));

  const handleNewPlanChange = <K extends keyof NewPlanFormState>(field: K, value: NewPlanFormState[K]) => {
    setNewPlan((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreatePlanDialogChange = (open: boolean) => {
    setCreatePlanOpen(open);
    if (!open) {
      setNewPlan({ ...PLAN_FORM_TEMPLATE });
    }
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: analyticsRaw } = useQuery<AnalyticsSummary>({ queryKey: ['/api/admin/saas/stats'], retry: false });
  const analyticsData = analyticsRaw as AnalyticsSummary | undefined;
  const analytics: AnalyticsSummary =
    analyticsData ?? {
      clients: {
        total: 0,
        newThisMonth: 0,
        active: 0,
        trial: 0,
        expiringTrials: 0,
        suspended: 0,
      },
      revenue: {
        monthlyTotal: 0,
      },
    };

  const { data: clientsRaw, refetch: refetchClients } = useQuery<any[]>({
    queryKey: ['/api/admin/saas/clients'],
    retry: false,
  });
  const clients = Array.isArray(clientsRaw) ? clientsRaw : [];

  const { data: plansRaw } = useQuery<PlanSummary[]>({ queryKey: ['/api/admin/plans'], retry: false });
  const plans: PlanSummary[] = Array.isArray(plansRaw) ? plansRaw : [];

  const { data: expiringTrialsRaw } = useQuery<any[]>({
    queryKey: ['/api/admin/notifications/expiring-trials'],
    retry: false,
  });
  const expiringTrials = Array.isArray(expiringTrialsRaw) ? expiringTrialsRaw : [];

  const { data: revenueDataRaw } = useQuery<RevenueAnalytics>({
    queryKey: ['/api/admin/analytics/revenue'],
    retry: false,
  });
  const revenueDataTyped = revenueDataRaw as RevenueAnalytics | undefined;
  const revenueData: RevenueAnalytics = {
    mrr: revenueDataTyped?.mrr ?? 0,
    dailyRevenue: revenueDataTyped?.dailyRevenue ?? [],
  };

  const formPlanOptions = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    description: plan.description ?? '',
  }));

  // Mutations
  const createPlanMutation = useMutation({
    mutationFn: async (planData: NewPlanFormState) => {
      const trimmedName = planData.name.trim();
      if (!trimmedName) {
        throw new Error('Nama paket harus diisi.');
      }

      if (!planData.planCode) {
        throw new Error('Pilih tipe paket langganan.');
      }

      const parsedPrice = Number(planData.price);
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        throw new Error('Harga paket harus lebih dari 0.');
      }

      const ensureOptionalInteger = (value: string, fieldLabel: string, options: { min?: number } = {}) => {
        if (!value) {
          return undefined;
        }

        const numeric = Number(value);
        if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
          throw new Error(`${fieldLabel} harus berupa angka bulat.`);
        }

        if (options.min !== undefined && numeric < options.min) {
          throw new Error(`${fieldLabel} minimal ${options.min}.`);
        }

        return numeric;
      };

      const maxUsers = ensureOptionalInteger(planData.maxUsers, 'Jumlah pengguna maksimal', { min: 1 });
      const maxTransactions = ensureOptionalInteger(planData.maxTransactionsPerMonth, 'Transaksi maksimal per bulan', {
        min: 0,
      });
      const maxStorage = ensureOptionalInteger(planData.maxStorageGB, 'Kapasitas penyimpanan (GB)', { min: 0 });

      const payload: Record<string, unknown> = {
        name: trimmedName,
        description: planData.description?.trim() || '',
        price: Math.round(parsedPrice),
        currency: 'IDR',
        billingPeriod: 'monthly',
        whatsappIntegration: Boolean(planData.whatsappIntegration),
        customBranding: Boolean(planData.customBranding),
        apiAccess: Boolean(planData.apiAccess),
        prioritySupport: Boolean(planData.prioritySupport),
        isActive: Boolean(planData.isActive),
        planCode: planData.planCode,
      };

      if (maxUsers !== undefined) {
        payload.maxUsers = maxUsers;
      }
      if (maxTransactions !== undefined) {
        payload.maxTransactionsPerMonth = maxTransactions;
      }
      if (maxStorage !== undefined) {
        payload.maxStorageGB = maxStorage;
      }

      return apiRequest('POST', '/api/admin/plans', payload);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Plan created successfully' });
      setCreatePlanOpen(false);
      setNewPlan({ ...PLAN_FORM_TEMPLATE });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
    },
    onError: (error: any) =>
      toast({ title: 'Error', description: error.message || 'Failed to create plan', variant: 'destructive' }),
  });

  const handleCreatePlan = () => {
    createPlanMutation.mutate(newPlan);
  };

  const createClientMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/admin/saas/clients', data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Client created successfully with trial period' });
      refetchClients();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/saas/stats'] });
      setCreateClientOpen(false);
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message || 'Failed to create client', variant: 'destructive' }),
  });

  // Helpers
  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🚀 SaaS Management Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive client & subscription management system</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={createClientOpen} onOpenChange={setCreateClientOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Plus className="h-4 w-4 mr-2" /> New Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>🎯 Create New Client</DialogTitle>
              </DialogHeader>
              <CreateClientForm
                plans={formPlanOptions}
                onSubmit={(data) => createClientMutation.mutate(data)}
                isLoading={createClientMutation.isPending}
              />
            </DialogContent>
          </Dialog>

          <Button onClick={() => setCreatePlanOpen(true)} className="bg-gradient-to-r from-green-600 to-blue-600">
            <Plus className="h-4 w-4 mr-2" /> Add Plan
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.clients?.total || 0}</div>
            <p className="text-xs text-muted-foreground">+{analytics?.clients?.newThisMonth || 0} this month</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.clients?.active || 0}</div>
            <p className="text-xs text-muted-foreground">{analytics?.clients?.trial || 0} in trial</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics?.revenue?.monthlyTotal || 0)}</div>
            <p className="text-xs text-muted-foreground">MRR: {formatCurrency(revenueData?.mrr || 0)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium">Expiring Trials</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.clients?.expiringTrials || 0}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.clients?.suspended || 0}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">📊 Clients</TabsTrigger>
          <TabsTrigger value="analytics">📈 Analytics</TabsTrigger>
          <TabsTrigger value="subscriptions">💳 Subscriptions</TabsTrigger>
          <TabsTrigger value="billing">💰 Billing</TabsTrigger>
          <TabsTrigger value="notifications">🔔 Alerts</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ClientTable clients={clients} refetchClients={refetchClients} plans={plans} />
        </TabsContent>

        <TabsContent value="analytics">
          {/* Revenue & Popular Plans Cards */}
        </TabsContent>

        <TabsContent value="subscriptions">
          {/* Subscription Management Table */}
        </TabsContent>

        <TabsContent value="billing">
          {/* Billing Overview Cards */}
        </TabsContent>

        <TabsContent value="notifications">
          {/* Trial Expiry Notifications */}
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2"><Settings className="h-5 w-5" /> Plan Feature Configuration</CardTitle>
              <CardDescription>Configure which features are available per plan</CardDescription>
            </CardHeader>
            <CardContent>
              <FeatureConfigurationManager />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📦 Subscription Plans Overview</CardTitle>
              <CardDescription>Current pricing plans and features</CardDescription>
            </CardHeader>
            <CardContent>
              {plans.map((plan: any) => (
                <PlanCard 
                  key={plan.id} 
                  plan={plan} 
                  onUpdate={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] })} 
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Plan Dialog */}
      <Dialog open={createPlanOpen} onOpenChange={handleCreatePlanDialogChange}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>➕ Create Subscription Plan</DialogTitle>
            <CardDescription>Definisikan parameter paket untuk pelanggan SaaS Anda.</CardDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Nama Paket</Label>
              <Input
                id="plan-name"
                placeholder="Contoh: Paket Toko Basic"
                value={newPlan.name}
                onChange={(e) => handleNewPlanChange('name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-code">Kode Paket</Label>
              <Select
                value={newPlan.planCode}
                onValueChange={(value) => handleNewPlanChange('planCode', value as PlanCode)}
              >
                <SelectTrigger id="plan-code">
                  <SelectValue placeholder="Pilih kode paket" />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_ENUMS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Pilih kode paket internal untuk memastikan konsistensi dengan konfigurasi enum di backend.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-description">Deskripsi</Label>
              <Input
                id="plan-description"
                placeholder="Deskripsi singkat paket"
                value={newPlan.description}
                onChange={(e) => handleNewPlanChange('description', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plan-price">Harga per Bulan (IDR)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  min={1}
                  value={newPlan.price}
                  onChange={(e) => handleNewPlanChange('price', e.target.value)}
                  placeholder="299000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-max-users">Maks. Pengguna</Label>
                <Input
                  id="plan-max-users"
                  type="number"
                  min={1}
                  value={newPlan.maxUsers}
                  onChange={(e) => handleNewPlanChange('maxUsers', e.target.value)}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-max-transactions">Transaksi / Bulan</Label>
                <Input
                  id="plan-max-transactions"
                  type="number"
                  min={0}
                  value={newPlan.maxTransactionsPerMonth}
                  onChange={(e) => handleNewPlanChange('maxTransactionsPerMonth', e.target.value)}
                  placeholder="5000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-max-storage">Penyimpanan (GB)</Label>
                <Input
                  id="plan-max-storage"
                  type="number"
                  min={0}
                  value={newPlan.maxStorageGB}
                  onChange={(e) => handleNewPlanChange('maxStorageGB', e.target.value)}
                  placeholder="50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PLAN_FEATURE_TOGGLES.map((toggle) => (
                <div key={toggle.key} className="flex items-center justify-between rounded-md border p-3">
                  <div className="mr-4 space-y-1">
                    <p className="text-sm font-medium">{toggle.label}</p>
                    <p className="text-xs text-muted-foreground">{toggle.description}</p>
                  </div>
                  <Switch
                    checked={newPlan[toggle.key]}
                    onCheckedChange={(checked) => handleNewPlanChange(toggle.key, checked)}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => handleCreatePlanDialogChange(false)}
                disabled={createPlanMutation.isPending}
              >
                Batal
              </Button>
              <Button
                onClick={handleCreatePlan}
                className="bg-gradient-to-r from-green-600 to-blue-600"
                disabled={createPlanMutation.isPending}
              >
                {createPlanMutation.isPending ? 'Menyimpan...' : 'Create Plan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
