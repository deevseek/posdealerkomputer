import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Calendar,
  Building2,
  CreditCard,
  Activity
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  trialClients: number;
  suspendedClients: number;
  totalRevenue: number;
  avgRevenuePerClient: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  subdomain: string;
  status: 'active' | 'trial' | 'suspended' | 'expired';
  createdAt: string;
}

export default function SaasAdmin() {
  const queryClient = useQueryClient();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/dashboard'],
  });

  // Fetch clients list
  const { data: clientsData, isLoading: clientsLoading } = useQuery<{
    clients: Client[];
    pagination: any;
  }>({
    queryKey: ['/api/admin/clients'],
  });

  // Update client status mutation
  const updateClientStatus = useMutation({
    mutationFn: async ({ clientId, status }: { clientId: string; status: string }) => {
      const response = await fetch(`/api/admin/clients/${clientId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (statsLoading || clientsLoading) {
    return (
      <div className=\"min-h-screen bg-gray-50 flex items-center justify-center\">
        <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600\"></div>
      </div>
    );
  }

  return (
    <div className=\"min-h-screen bg-gray-50\">
      {/* Header */}
      <div className=\"bg-white shadow\">
        <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">
          <div className=\"flex justify-between items-center py-6\">
            <div>
              <h1 className=\"text-3xl font-bold text-gray-900\">LaptopPOS SaaS Admin</h1>
              <p className=\"text-gray-600\">Manage clients, subscriptions, and revenue</p>
            </div>
            <div className=\"flex items-center space-x-4\">
              <Badge variant=\"outline\" className=\"text-sm\">
                Super Admin
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8\">
        {/* Stats Cards */}
        <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8\">
          <Card>
            <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
              <CardTitle className=\"text-sm font-medium\">Total Clients</CardTitle>
              <Users className=\"h-4 w-4 text-muted-foreground\" />
            </CardHeader>
            <CardContent>
              <div className=\"text-2xl font-bold\">{stats?.totalClients || 0}</div>
              <p className=\"text-xs text-muted-foreground\">
                {stats?.activeClients || 0} active, {stats?.trialClients || 0} trial
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
              <CardTitle className=\"text-sm font-medium\">Total Revenue</CardTitle>
              <DollarSign className=\"h-4 w-4 text-muted-foreground\" />
            </CardHeader>
            <CardContent>
              <div className=\"text-2xl font-bold\">{formatCurrency(stats?.totalRevenue || 0)}</div>
              <p className=\"text-xs text-muted-foreground\">
                Avg: {formatCurrency(stats?.avgRevenuePerClient || 0)} per client
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
              <CardTitle className=\"text-sm font-medium\">Active Subscriptions</CardTitle>
              <CreditCard className=\"h-4 w-4 text-muted-foreground\" />
            </CardHeader>
            <CardContent>
              <div className=\"text-2xl font-bold\">{stats?.activeClients || 0}</div>
              <p className=\"text-xs text-muted-foreground\">
                {stats?.suspendedClients || 0} suspended
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
              <CardTitle className=\"text-sm font-medium\">Growth Rate</CardTitle>
              <TrendingUp className=\"h-4 w-4 text-muted-foreground\" />
            </CardHeader>
            <CardContent>
              <div className=\"text-2xl font-bold\">+12.5%</div>
              <p className=\"text-xs text-muted-foreground\">
                This month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle>Client Management</CardTitle>
            <CardDescription>
              Manage client accounts, subscriptions, and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className=\"overflow-x-auto\">
              <table className=\"w-full border-collapse\">
                <thead>
                  <tr className=\"border-b\">
                    <th className=\"text-left p-4 font-medium\">Company</th>
                    <th className=\"text-left p-4 font-medium\">Subdomain</th>
                    <th className=\"text-left p-4 font-medium\">Email</th>
                    <th className=\"text-left p-4 font-medium\">Status</th>
                    <th className=\"text-left p-4 font-medium\">Created</th>
                    <th className=\"text-left p-4 font-medium\">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clientsData?.clients?.map((client) => (
                    <tr key={client.id} className=\"border-b hover:bg-gray-50\">
                      <td className=\"p-4\">
                        <div className=\"flex items-center space-x-2\">
                          <Building2 className=\"h-4 w-4 text-gray-400\" />
                          <span className=\"font-medium\">{client.name}</span>
                        </div>
                      </td>
                      <td className=\"p-4\">
                        <code className=\"bg-gray-100 px-2 py-1 rounded text-sm\">
                          {client.subdomain}.laptoppos.com
                        </code>
                      </td>
                      <td className=\"p-4\">{client.email}</td>
                      <td className=\"p-4\">
                        <Badge className={getStatusColor(client.status)}>
                          {client.status}
                        </Badge>
                      </td>
                      <td className=\"p-4\">
                        {new Date(client.createdAt).toLocaleDateString()}
                      </td>
                      <td className=\"p-4\">
                        <div className=\"flex space-x-2\">
                          {client.status === 'active' && (
                            <Button
                              size=\"sm\"
                              variant=\"outline\"
                              onClick={() => updateClientStatus.mutate({ 
                                clientId: client.id, 
                                status: 'suspended' 
                              })}
                              disabled={updateClientStatus.isPending}
                            >
                              Suspend
                            </Button>
                          )}
                          {client.status === 'suspended' && (
                            <Button
                              size=\"sm\"
                              variant=\"outline\"
                              onClick={() => updateClientStatus.mutate({ 
                                clientId: client.id, 
                                status: 'active' 
                              })}
                              disabled={updateClientStatus.isPending}
                            >
                              Activate
                            </Button>
                          )}
                          {client.status === 'trial' && (
                            <Button
                              size=\"sm\"
                              variant=\"outline\"
                              onClick={() => updateClientStatus.mutate({ 
                                clientId: client.id, 
                                status: 'active' 
                              })}
                              disabled={updateClientStatus.isPending}
                            >
                              Upgrade
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}