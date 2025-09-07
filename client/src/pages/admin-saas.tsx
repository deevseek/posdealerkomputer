import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Building2, Users, CreditCard, TrendingUp, Plus, Settings, Bell, DollarSign, Calendar, UserPlus, Eye, Edit, Trash2, CheckCircle, XCircle, Clock, Activity, Pencil, Save, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast, useToast } from '@/hooks/use-toast';
import { CreateClientForm } from '@/components/CreateClientForm';
import { FeatureConfigurationManager } from '@/components/FeatureConfigurationManager';

// Plan Card Component with Inline Editing
function PlanCard({ plan, onUpdate }: { plan: any, onUpdate: (plan: any) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPlan, setEditedPlan] = useState(plan);
  const { toast } = useToast();

  const updatePlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      return apiRequest('PUT', `/api/admin/plans/${plan.id}`, planData);
    },
    onSuccess: (data) => {
      onUpdate(data.plan);
      setIsEditing(false);
      toast({
        title: 'Plan Updated',
        description: 'Subscription plan has been updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update plan',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    updatePlanMutation.mutate({
      name: editedPlan.name,
      description: editedPlan.description,
      price: parseFloat(editedPlan.price),
      maxUsers: parseInt(editedPlan.maxUsers),
      maxTransactionsPerMonth: parseInt(editedPlan.maxTransactionsPerMonth),
      maxStorageGB: parseInt(editedPlan.maxStorageGB),
      whatsappIntegration: editedPlan.whatsappIntegration,
      customBranding: editedPlan.customBranding,
      apiAccess: editedPlan.apiAccess,
      prioritySupport: editedPlan.prioritySupport,
      isActive: editedPlan.isActive
    });
  };

  const handleCancel = () => {
    setEditedPlan(plan);
    setIsEditing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <Input
                value={editedPlan.name}
                onChange={(e) => setEditedPlan({ ...editedPlan, name: e.target.value })}
                className="font-semibold text-lg"
                placeholder="Plan name"
              />
              <Input
                value={editedPlan.description}
                onChange={(e) => setEditedPlan({ ...editedPlan, description: e.target.value })}
                className="text-sm"
                placeholder="Plan description"
              />
              <div className="flex items-center space-x-2">
                <span className="text-sm">Rp</span>
                <Input
                  type="number"
                  value={editedPlan.price}
                  onChange={(e) => setEditedPlan({ ...editedPlan, price: e.target.value })}
                  className="w-32"
                  placeholder="Price"
                />
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
            </div>
          ) : (
            <>
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              <div className="text-lg font-bold mt-2">
                {formatCurrency(plan.price)}/month
              </div>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={plan.isActive ? 'default' : 'secondary'}>
            {plan.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {isEditing ? (
            <>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={updatePlanMutation.isPending}
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="mt-3">
        <p className="text-sm font-medium mb-2">Plan Limits:</p>
        {isEditing ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="maxUsers" className="text-xs">Max Users</Label>
              <Input
                id="maxUsers"
                type="number"
                value={editedPlan.maxUsers}
                onChange={(e) => setEditedPlan({ ...editedPlan, maxUsers: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="maxStorage" className="text-xs">Storage (GB)</Label>
              <Input
                id="maxStorage"
                type="number"
                value={editedPlan.maxStorageGB}
                onChange={(e) => setEditedPlan({ ...editedPlan, maxStorageGB: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="maxTransactions" className="text-xs">Max Transactions/Month</Label>
              <Input
                id="maxTransactions"
                type="number"
                value={editedPlan.maxTransactionsPerMonth}
                onChange={(e) => setEditedPlan({ ...editedPlan, maxTransactionsPerMonth: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>👥 Users: {plan.maxUsers}</div>
            <div>💾 Storage: {plan.maxStorageGB}GB</div>
            <div>📊 Transactions: {plan.maxTransactionsPerMonth?.toLocaleString()}</div>
            <div>📱 WhatsApp: {plan.whatsappIntegration ? '✅' : '❌'}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminSaaS() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch comprehensive analytics
  const { data: analytics } = useQuery({
    queryKey: ['/api/admin/analytics/overview'],
    retry: false,
  });

  // Fetch detailed clients
  const { data: clients, refetch: refetchClients } = useQuery({
    queryKey: ['/api/admin/clients/detailed'],
    retry: false,
  });

  // Fetch subscription plans
  const { data: plans } = useQuery({
    queryKey: ['/api/admin/plans'],
    retry: false,
  });

  // Fetch expiring trials
  const { data: expiringTrials } = useQuery({
    queryKey: ['/api/admin/notifications/expiring-trials'],
    retry: false,
  });

  // Fetch revenue analytics
  const { data: revenueData } = useQuery({
    queryKey: ['/api/admin/analytics/revenue'],
    retry: false,
  });

  // Create client mutation
  const createClient = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/admin/clients', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Client created successfully with trial period',
      });
      refetchClients();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/overview'] });
      setCreateClientOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create client',
        variant: 'destructive',
      });
    },
  });

  // Update client status mutation
  const updateClientStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      return apiRequest('PATCH', `/api/admin/clients/${id}/status`, { status, reason });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Client status updated successfully',
      });
      refetchClients();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/overview'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update client status',
        variant: 'destructive',
      });
    },
  });

  // Upgrade subscription mutation
  const upgradeSubscription = useMutation({
    mutationFn: async ({ id, planId }: { id: string; planId: string }) => {
      return apiRequest('POST', `/api/admin/clients/${id}/upgrade`, { planId });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Subscription upgraded successfully',
      });
      refetchClients();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upgrade subscription',
        variant: 'destructive',
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Aktif', color: 'bg-green-100 text-green-800' },
      trial: { label: 'Trial', color: 'bg-blue-100 text-blue-800' },
      suspended: { label: 'Suspended', color: 'bg-red-100 text-red-800' },
      expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.expired;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🚀 SaaS Management Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive client & subscription management system</p>
        </div>
        <Dialog open={createClientOpen} onOpenChange={setCreateClientOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              New Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>🎯 Create New Client</DialogTitle>
              <DialogDescription>
                Set up a new client with trial period and subscription plan
              </DialogDescription>
            </DialogHeader>
            <CreateClientForm 
              plans={plans || []} 
              onSubmit={(data) => createClient.mutate(data)}
              isLoading={createClient.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Enhanced Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.clients?.total || 0}</div>
            <p className="text-xs text-muted-foreground">+{analytics?.clients?.newThisMonth || 0} this month</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.clients?.active || 0}</div>
            <p className="text-xs text-muted-foreground">{analytics?.clients?.trial || 0} in trial</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics?.revenue?.monthlyTotal || 0)}
            </div>
            <p className="text-xs text-muted-foreground">MRR: {formatCurrency(revenueData?.mrr || 0)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Trials</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.clients?.expiringTrials || 0}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.clients?.suspended || 0}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">📊 Clients</TabsTrigger>
          <TabsTrigger value="analytics">📈 Analytics</TabsTrigger>
          <TabsTrigger value="subscriptions">💳 Subscriptions</TabsTrigger>
          <TabsTrigger value="billing">💰 Billing</TabsTrigger>
          <TabsTrigger value="notifications">🔔 Alerts</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🏢 Client Management</CardTitle>
              <CardDescription>
                Comprehensive client management with subscription details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clients && clients.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Subdomain</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client: any) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{client.name}</div>
                            <div className="text-sm text-muted-foreground">{client.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {client.subdomain}.laptoppos.com
                          </code>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{client.planName || 'No Plan'}</div>
                            <div className="text-sm text-muted-foreground">
                              {client.planAmount ? formatCurrency(parseInt(client.planAmount)) : 'Free Trial'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(client.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{client.userCount || 0} users</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {client.subscriptionStatus === 'paid' ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Paid
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Clock className="h-3 w-3 mr-1" />
                                {client.status === 'trial' ? 'Trial' : 'Pending'}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" title="Edit Client">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              title={client.status === 'active' ? 'Suspend' : 'Activate'}
                              onClick={() => {
                                const newStatus = client.status === 'active' ? 'suspended' : 'active';
                                updateClientStatus.mutate({ 
                                  id: client.id, 
                                  status: newStatus,
                                  reason: `Status changed via admin dashboard`
                                });
                              }}
                            >
                              {client.status === 'active' ? 
                                <XCircle className="h-4 w-4 text-red-500" /> : 
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              }
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Clients Yet</h3>
                  <p className="text-muted-foreground mb-4">Start by creating your first client with a trial period</p>
                  <Button onClick={() => setCreateClientOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Client
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>📈 Revenue Analytics</CardTitle>
                <CardDescription>Monthly recurring revenue trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-3xl font-bold">
                    {formatCurrency(revenueData?.mrr || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Monthly Recurring Revenue</div>
                  {revenueData?.dailyRevenue && revenueData.dailyRevenue.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Recent Revenue</h4>
                      {revenueData.dailyRevenue.slice(-5).map((day: any, index: number) => (
                        <div key={index} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                          <span>{day.date}</span>
                          <span className="font-medium">{formatCurrency(day.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🏆 Popular Plans</CardTitle>
                <CardDescription>Most subscribed plans</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.insights?.popularPlans && analytics.insights.popularPlans.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.insights.popularPlans.map((plan: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{plan.planName}</div>
                          <div className="text-sm text-muted-foreground">{plan.count} subscribers</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(plan.revenue || 0)}</div>
                          <div className="text-sm text-muted-foreground">Total Revenue</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No subscription data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🔔 Trial Expiry Notifications</CardTitle>
              <CardDescription>
                Manage trial expiration alerts and client follow-ups
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expiringTrials && expiringTrials.length > 0 ? (
                <div className="space-y-4">
                  {expiringTrials.map((trial: any) => (
                    <div key={trial.id} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50">
                      <div>
                        <h3 className="font-semibold">{trial.name}</h3>
                        <p className="text-sm text-muted-foreground">{trial.email}</p>
                        <p className="text-sm text-orange-600 font-medium">
                          ⚠️ Trial ends in {Math.ceil(trial.daysRemaining)} days
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Bell className="h-4 w-4 mr-2" />
                          Send Reminder
                        </Button>
                        <Button variant="outline" size="sm">
                          <Calendar className="h-4 w-4 mr-2" />
                          Extend Trial
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All Good! 🎉</h3>
                  <p className="text-muted-foreground">No trials expiring soon</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    All clients are in good standing
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Feature Configuration Management */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>🎛️ Plan Feature Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure which application features are available for each subscription plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeatureConfigurationManager />
            </CardContent>
          </Card>

          {/* Existing Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>📦 Subscription Plans Overview</CardTitle>
                <CardDescription>
                  Current pricing plans and basic features
                </CardDescription>
              </CardHeader>
              <CardContent>
                {plans && plans.length > 0 ? (
                  <div className="space-y-4">
                    {plans.map((plan: any) => (
                      <PlanCard 
                        key={plan.id} 
                        plan={plan}
                        onUpdate={(updatedPlan) => {
                          queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
                          toast({
                            title: 'Success',
                            description: 'Plan updated successfully',
                          });
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No subscription plans configured</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>⚙️ Global SaaS Settings</CardTitle>
                <CardDescription>
                  System-wide configuration for the SaaS platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="trial-period">Default Trial Period (days)</Label>
                  <Input id="trial-period" type="number" defaultValue="14" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="auto-suspend">Auto-suspend after trial</Label>
                  <Select defaultValue="enabled">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">✅ Enabled</SelectItem>
                      <SelectItem value="disabled">❌ Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notification-days">Trial expiry notification (days before)</Label>
                  <Input id="notification-days" type="number" defaultValue="3" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="grace-period">Payment grace period (days)</Label>
                  <Input id="grace-period" type="number" defaultValue="3" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="webhook-url">Payment Webhook URL</Label>
                  <Input id="webhook-url" placeholder="https://api.example.com/webhook" className="mt-1" />
                </div>
                <Button className="w-full mt-4 bg-gradient-to-r from-green-600 to-blue-600">
                  💾 Save Configuration
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Feature Management Guidelines */}
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="text-orange-800">📋 Feature Management Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <ul className="space-y-2 text-orange-700">
                <li>• <strong>Basic Plan:</strong> Essential features for small businesses (POS, basic inventory, customers)</li>
                <li>• <strong>Pro Plan:</strong> Advanced features for growing businesses (service tickets, reports, purchasing)</li>
                <li>• <strong>Premium Plan:</strong> Full feature set with integrations (WhatsApp, API access, custom branding)</li>
                <li>• <strong>Feature Toggles:</strong> Changes take effect immediately for all clients on that plan</li>
                <li>• <strong>Limits:</strong> Configure user count, transaction volume, and storage per plan</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>💰 Billing Overview</CardTitle>
              <CardDescription>
                Revenue tracking and payment management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-6 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="text-3xl font-bold text-green-600">{formatCurrency(analytics?.revenue?.monthlyTotal || 0)}</div>
                  <div className="text-sm text-muted-foreground">This Month</div>
                </div>
                <div className="text-center p-6 border rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50">
                  <div className="text-3xl font-bold text-blue-600">{formatCurrency(revenueData?.mrr || 0)}</div>
                  <div className="text-sm text-muted-foreground">Monthly Recurring Revenue</div>
                </div>
                <div className="text-center p-6 border rounded-lg bg-gradient-to-br from-purple-50 to-violet-50">
                  <div className="text-3xl font-bold text-purple-600">{analytics?.clients?.active || 0}</div>
                  <div className="text-sm text-muted-foreground">Paying Clients</div>
                </div>
              </div>
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <DollarSign className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Advanced Billing Features</h3>
                <p className="text-muted-foreground mb-4">
                  🚀 Coming soon: Invoice generation, payment tracking, and automated billing
                </p>
                <p className="text-sm text-muted-foreground">
                  ✨ Stripe integration, PDF invoices, payment reminders, and more!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>💳 Subscription Management</CardTitle>
              <CardDescription>
                Monitor and manage all client subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clients && clients.filter((c: any) => c.subscriptionId).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Auto Renew</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.filter((c: any) => c.subscriptionId).map((client: any) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="font-medium">{client.name}</div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{client.planName}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(parseInt(client.planAmount || '0'))}/month
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(client.subscriptionStatus)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{client.subscriptionStart ? new Date(client.subscriptionStart).toLocaleDateString() : '-'}</div>
                            <div className="text-muted-foreground">to {client.subscriptionEnd ? new Date(client.subscriptionEnd).toLocaleDateString() : '-'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={client.autoRenew ? 'default' : 'secondary'}>
                            {client.autoRenew ? '✅ Yes' : '❌ No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Select onValueChange={(planId) => upgradeSubscription.mutate({ id: client.id, planId })}>
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Change Plan" />
                              </SelectTrigger>
                              <SelectContent>
                                {plans?.map((plan: any) => (
                                  <SelectItem key={plan.id} value={plan.id}>
                                    {plan.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Subscriptions</h3>
                  <p className="text-muted-foreground">
                    Clients will appear here once they upgrade from trial
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}