import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { useLocation } from 'wouter';
import { isPrimaryDomainClient } from '@/lib/domain';

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

type AnalyticsResponse = {
  totalClients?: number;
  newClientsThisMonth?: number;
  activeClients?: number;
  trialClients?: number;
  expiringTrials?: number;
  suspendedClients?: number;
  monthlyRevenue?: number;
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
  const [, setLocation] = useLocation();
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

  const isPrimaryDomain = isPrimaryDomainClient();

  useEffect(() => {
    if (!isPrimaryDomain) {
      setLocation('/');
    }
  }, [isPrimaryDomain, setLocation]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (!isPrimaryDomain) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>Akses Ditolak</CardTitle>
            <CardDescription>SaaS management hanya tersedia di domain utama.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Queries

  const { data: analyticsRaw } = useQuery<AnalyticsResponse>({
    queryKey: ['/api/admin/saas/stats'],
    retry: false,
  });

  const analytics: AnalyticsSummary = {
    clients: {
      total: analyticsRaw?.totalClients ?? 0,
      newThisMonth: analyticsRaw?.newClientsThisMonth ?? 0,
      active: analyticsRaw?.activeClients ?? 0,
      trial: analyticsRaw?.trialClients ?? 0,
      expiringTrials: analyticsRaw?.expiringTrials ?? 0,
      suspended: analyticsRaw?.suspendedClients ?? 0,
    },
    revenue: {
      monthlyTotal: analyticsRaw?.monthlyRevenue ?? 0,
    },
  };

  const { data: clientsRaw, refetch: refetchClients } = useQuery<any[]>({
    queryKey: ['/api/admin/saas/clients'],
    retry: false,
  });
  const clients = Array.isArray(clientsRaw) ? clientsRaw : [];


  const { data: plansRaw } = useQuery<PlanSummary[]>({
    queryKey: ['/api/admin/saas/plans'],
    retry: false,
  });
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

  const planLabelLookup = PLAN_ENUMS.reduce<Record<string, string>>((acc, item) => {
    acc[item.value] = item.label;
    return acc;
  }, {});

  const getPlanDisplayName = (rawName?: string | null) => {
    if (!rawName) {
      return '-';
    }

    const normalized = rawName.toLowerCase() as PlanCode;
    return planLabelLookup[normalized] ?? rawName;
  };

  const parseDate = (value: string | Date | null | undefined) => {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDate = (value: string | Date | null | undefined) => {
    const parsed = parseDate(value);
    if (!parsed) {
      return '-';
    }

    return parsed.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPaymentStatusLabel = (status?: string | null) => {
    if (!status) {
      return null;
    }

    switch (status) {
      case 'paid':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
    }
  };

  const renderClientStatusBadge = (status: string) => {
    const label = status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : '-';
    const variant =
      status === 'active'
        ? 'default'
        : status === 'trial'
        ? 'secondary'
        : status === 'suspended'
        ? 'destructive'
        : 'outline';

    return <Badge variant={variant}>{label}</Badge>;
  };

  type SubscriptionDetail = {
    client: any;
    plan?: PlanSummary;
    subscription: any;
    amount: number;
    startDate: Date | null;
    endDate: Date | null;
  };

  const planById = new Map(plans.map((plan) => [plan.id, plan]));

  const subscriptionsDetailed: SubscriptionDetail[] = clients
    .map((client) => {
      const subscription = client.subscription;
      if (!subscription) {
        return null;
      }

      const plan = subscription.planId ? planById.get(subscription.planId) : undefined;
      const parsedAmount =
        typeof subscription.amount === 'number'
          ? subscription.amount
          : typeof subscription.amount === 'string'
          ? Number(subscription.amount)
          : undefined;
      const amount = Number.isFinite(parsedAmount) ? Number(parsedAmount) : plan?.price ?? 0;

      return {
        client,
        plan,
        subscription,
        amount,
        startDate: parseDate(subscription.startDate),
        endDate: parseDate(subscription.endDate),
      } satisfies SubscriptionDetail;
    })
    .filter((detail): detail is SubscriptionDetail => detail !== null);

  const planDistribution = subscriptionsDetailed.reduce<Record<string, { planName: string; count: number; revenue: number }>>(
    (acc, detail) => {
      const key = detail.plan?.id ?? detail.subscription.planId ?? detail.subscription.plan ?? detail.client.id;
      const planName = getPlanDisplayName(detail.plan?.name ?? detail.subscription.planName ?? detail.subscription.plan);

      if (!acc[key]) {
        acc[key] = {
          planName,
          count: 0,
          revenue: 0,
        };
      }

      acc[key].count += 1;
      acc[key].revenue += detail.amount;
      return acc;
    },
    {},
  );

  const planDistributionRows = Object.values(planDistribution).sort((a, b) => b.count - a.count);
  const totalSubscriptions = subscriptionsDetailed.length;
  const computedMRR = subscriptionsDetailed.reduce((total, detail) => total + detail.amount, 0);
  const pendingSubscriptions = subscriptionsDetailed.filter(
    (detail) => detail.subscription.paymentStatus && detail.subscription.paymentStatus !== 'paid',
  );
  const upcomingRenewals = subscriptionsDetailed
    .filter((detail): detail is SubscriptionDetail & { endDate: Date } => Boolean(detail.endDate))
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
    .slice(0, 5);

  const revenueTimeline = (revenueData.dailyRevenue ?? [])
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7);
  const trialClients = clients.filter((client) => client.status === 'trial');

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

      return apiRequest('POST', '/api/admin/saas/plans', payload);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Plan created successfully' });
      setCreatePlanOpen(false);
      setNewPlan({ ...PLAN_FORM_TEMPLATE });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/saas/plans'] });
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

  const sendTrialReminderMutation = useMutation({
    mutationFn: async (clientId: string) =>
      apiRequest('POST', `/api/admin/notifications/remind-trial/${clientId}`),
    onSuccess: (response) => {
      const description = typeof response?.message === 'string'
        ? response.message
        : 'Pengingat trial berhasil dikirim.';
      toast({ title: 'Pengingat terkirim', description });
    },
    onError: (error: any) =>
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengirim pengingat trial',
        variant: 'destructive',
      }),
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
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribusi Paket</CardTitle>
                <CardDescription>
                  Estimasi MRR aktual: {formatCurrency(computedMRR)} berdasarkan paket aktif.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {planDistributionRows.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paket</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Pangsa</TableHead>
                        <TableHead className="text-right">MRR Est.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planDistributionRows.map((row) => {
                        const share = totalSubscriptions > 0 ? Math.round((row.count / totalSubscriptions) * 100) : 0;

                        return (
                          <TableRow key={row.planName}>
                            <TableCell className="font-medium">{row.planName}</TableCell>
                            <TableCell>{row.count}</TableCell>
                            <TableCell>{share}%</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">Belum ada data langganan yang dapat ditampilkan.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tren Pendapatan 7 Hari Terakhir</CardTitle>
                <CardDescription>Ringkasan pendapatan harian terbaru.</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueTimeline.length > 0 ? (
                  <div className="space-y-3">
                    {revenueTimeline.map((item) => (
                      <div key={item.date} className="flex items-center justify-between text-sm">
                        <span>{formatDate(item.date)}</span>
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Belum ada data pendapatan harian.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Ringkasan Langganan</CardTitle>
              <CardDescription>Ikhtisar status client dan pembayaran SaaS terkini.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total Langganan Aktif</p>
                  <p className="text-2xl font-semibold">{totalSubscriptions}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Pembayaran Pending</p>
                  <p className="text-2xl font-semibold">{pendingSubscriptions.length}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Client Trial</p>
                  <p className="text-2xl font-semibold">{trialClients.length}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Trial Hampir Berakhir</p>
                  <p className="text-2xl font-semibold">{analytics.clients.expiringTrials}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Langganan</CardTitle>
              <CardDescription>Monitor status langganan dan periode aktif setiap client.</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptionsDetailed.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Paket</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead className="text-right">Tagihan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptionsDetailed.map((detail) => {
                      const planName = getPlanDisplayName(
                        detail.plan?.name ?? detail.subscription.planName ?? detail.subscription.plan,
                      );
                      const paymentStatus = formatPaymentStatusLabel(detail.subscription.paymentStatus);

                      return (
                        <TableRow key={detail.subscription.id ?? detail.client.id}>
                          <TableCell>
                            <div className="font-medium">{detail.client.name}</div>
                            <div className="text-xs text-muted-foreground">{detail.client.email}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{planName}</div>
                            <div className="text-xs text-muted-foreground">{formatCurrency(detail.amount)} / bulan</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {renderClientStatusBadge(detail.client.status)}
                              {paymentStatus ? (
                                <Badge
                                  variant={detail.subscription.paymentStatus === 'paid' ? 'outline' : 'secondary'}
                                >
                                  {paymentStatus}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDate(detail.startDate)}</div>
                            <div className="text-xs text-muted-foreground">s/d {formatDate(detail.endDate)}</div>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(detail.amount)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada data langganan yang tercatat.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Perpanjangan Mendatang</CardTitle>
                <CardDescription>Client yang akan memasuki periode tagihan berikutnya.</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingRenewals.length > 0 ? (
                  <ul className="space-y-4">
                    {upcomingRenewals.map((detail) => (
                      <li key={detail.subscription.id} className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{detail.client.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getPlanDisplayName(detail.plan?.name ?? detail.subscription.planName ?? detail.subscription.plan)} ·{' '}
                            {formatCurrency(detail.amount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatDate(detail.endDate)}</p>
                          <p className="text-xs text-muted-foreground">Perpanjangan</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Tidak ada jadwal perpanjangan dalam waktu dekat.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pembayaran Pending</CardTitle>
                <CardDescription>Client yang masih menunggu penyelesaian pembayaran.</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingSubscriptions.length > 0 ? (
                  <ul className="space-y-4">
                    {pendingSubscriptions.map((detail) => (
                      <li key={detail.subscription.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{detail.client.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getPlanDisplayName(detail.plan?.name ?? detail.subscription.planName ?? detail.subscription.plan)} ·{' '}
                            {formatCurrency(detail.amount)}
                          </p>
                        </div>
                        <Badge variant="secondary">{formatPaymentStatusLabel(detail.subscription.paymentStatus)}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Tidak ada pembayaran pending.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Trial Hampir Berakhir</CardTitle>
              <CardDescription>Ambil tindakan untuk mempertahankan client trial sebelum masa berlaku habis.</CardDescription>
            </CardHeader>
            <CardContent>
              {expiringTrials.length > 0 ? (
                <ul className="space-y-4">
                  {expiringTrials.map((trial) => {
                    const daysRemaining =
                      typeof trial.daysRemaining === 'number' ? Math.max(Math.round(trial.daysRemaining), 0) : null;
                    const isSendingReminder =
                      sendTrialReminderMutation.isPending && sendTrialReminderMutation.variables === trial.id;

                    return (
                      <li
                        key={trial.id}
                        className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-medium">{trial.name}</p>
                          <p className="text-xs text-muted-foreground">{trial.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Berakhir {formatDate(trial.trialEndsAt)}
                            {daysRemaining !== null ? ` · ${daysRemaining} hari lagi` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {trial.subdomain ? <Badge variant="outline">{trial.subdomain}</Badge> : null}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendTrialReminderMutation.mutate(trial.id)}
                            disabled={isSendingReminder}
                          >
                            {isSendingReminder ? 'Mengirim...' : 'Kirim Pengingat'}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Tidak ada client trial yang akan berakhir dalam waktu dekat.</p>
              )}
            </CardContent>
          </Card>
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
