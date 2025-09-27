import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast, useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Save, X, Plus, Eye, Edit, CheckCircle, XCircle, Clock, Bell, Calendar, CreditCard, Building2, Users, DollarSign, AlertTriangle, Activity, Settings } from 'lucide-react';
import { CreateClientForm } from '@/components/CreateClientForm';
import { FeatureConfigurationManager } from '@/components/FeatureConfigurationManager';
import ClientTable from '@/components/ClientTable';
import PlanCard from '@/components/PlanCard';

// Enum mapping for plans
const PLAN_ENUMS = [
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Professional' },
  { value: 'premium', label: 'Enterprise' }
];

export default function AdminSaaS() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: 'basic',
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
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: analyticsRaw } = useQuery({ queryKey: ['/api/admin/saas/stats'], retry: false });
  const analytics = analyticsRaw ?? {
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

  const { data: clientsRaw, refetch: refetchClients } = useQuery({ queryKey: ['/api/admin/saas/clients'], retry: false });
  const clients = Array.isArray(clientsRaw) ? clientsRaw : [];

  const { data: plansRaw } = useQuery({ queryKey: ['/api/admin/plans'], retry: false });
  const plans = Array.isArray(plansRaw) ? plansRaw : [];

  const { data: expiringTrialsRaw } = useQuery({ queryKey: ['/api/admin/notifications/expiring-trials'], retry: false });
  const expiringTrials = Array.isArray(expiringTrialsRaw) ? expiringTrialsRaw : [];

  const { data: revenueDataRaw } = useQuery({ queryKey: ['/api/admin/analytics/revenue'], retry: false });
  const revenueData = { mrr: 0, dailyRevenue: [], ...(revenueDataRaw ?? {}) };

  // Mutations
  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => apiRequest('POST', '/api/admin/plans', planData),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Plan created successfully' });
      setCreatePlanOpen(false);
      setNewPlan({
        name: 'basic',
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
      });
  queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message || 'Failed to create plan', variant: 'destructive' }),
  });

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
                plans={plans} 
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
      <Dialog open={createPlanOpen} onOpenChange={setCreatePlanOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>➕ Create Subscription Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input 
              placeholder="Plan Name" 
              value={newPlan.name} 
              onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} 
            />
            <Input 
              placeholder="Description" 
              value={newPlan.description} 
              onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })} 
            />
            <Input 
              type="number" 
              placeholder="Price" 
              value={newPlan.price} 
              onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })} 
            />
            <Input 
              type="number" 
              placeholder="Max Users" 
              value={newPlan.maxUsers} 
              onChange={(e) => setNewPlan({ ...newPlan, maxUsers: e.target.value })} 
            />
            <Button onClick={() => createPlanMutation.mutate(newPlan)} className="w-full bg-green-600">Create Plan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
