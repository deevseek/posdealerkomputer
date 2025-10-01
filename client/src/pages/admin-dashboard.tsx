import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateShort } from '@shared/utils/timezone';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  Building2, 
  CreditCard, 
  TrendingUp, 
  Settings, 
  Eye,
  UserPlus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  subdomain: string;
  email: string;
  status: 'active' | 'suspended' | 'expired' | 'trial' | 'pending';
  createdAt: string;
  trialEndsAt?: string;
  subscription?: {
    id: string;
    planName: string;
    paymentStatus: string;
    startDate: string;
    endDate: string;
    amount: number;
  };
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  limits: any;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    subdomain: '',
    email: '',
    planId: ''
  });

  // Define stats interface with proper types
  interface AdminStats {
    totalClients?: number;
    newClientsThisMonth?: number;
    activeClients?: number;
    monthlyRevenue?: number;
    revenueGrowth?: number;
    expiringTrials?: number;
  }

  // Fetch dashboard stats
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
  });

  // Fetch all clients
  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/admin/clients'],
  });

  // Fetch subscription plans
  const { data: plans } = useQuery<Plan[]>({
    queryKey: ['/api/admin/plans'],
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (clientData: any) => {
      return await apiRequest('POST', '/api/admin/clients', clientData);
    },
    onSuccess: () => {
      toast({
        title: "Client berhasil dibuat",
        description: "Client baru telah ditambahkan ke sistem",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setCreateClientOpen(false);
      setNewClient({ name: '', subdomain: '', email: '', planId: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal membuat client",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update client status mutation
  const updateClientStatusMutation = useMutation({
    mutationFn: async ({ clientId, status }: { clientId: string; status: string }) => {
      return await apiRequest('PUT', `/api/admin/clients/${clientId}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Status client berhasil diupdate",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clients'] });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal mengupdate status client",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: "default" as const, label: "Aktif", icon: CheckCircle },
      pending: { variant: "secondary" as const, label: "Pending", icon: Clock },
      trial: { variant: "secondary" as const, label: "Trial", icon: Clock },
      expired: { variant: "destructive" as const, label: "Expired", icon: XCircle },
      suspended: { variant: "outline" as const, label: "Suspended", icon: XCircle }
    };
    
    const config = variants[status as keyof typeof variants] || variants.active;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Kelola client dan langganan SaaS</p>
          </div>
          <Dialog open={createClientOpen} onOpenChange={setCreateClientOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-client">
                <UserPlus className="h-4 w-4 mr-2" />
                Tambah Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Client Baru</DialogTitle>
                <DialogDescription>
                  Buat client baru dengan langganan
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="client-name">Nama Client</Label>
                  <Input
                    id="client-name"
                    data-testid="input-client-name"
                    value={newClient.name}
                    onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="PT. Contoh Perusahaan"
                  />
                </div>
                <div>
                  <Label htmlFor="client-subdomain">Subdomain</Label>
                  <Input
                    id="client-subdomain"
                    data-testid="input-client-subdomain"
                    value={newClient.subdomain}
                    onChange={(e) => setNewClient(prev => ({ ...prev, subdomain: e.target.value }))}
                    placeholder="contoh"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Client akan mengakses di: {newClient.subdomain}.yourdomain.com
                  </p>
                </div>
                <div>
                  <Label htmlFor="client-email">Email</Label>
                  <Input
                    id="client-email"
                    data-testid="input-client-email"
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@contoh.com"
                  />
                </div>
                <div>
                  <Label htmlFor="client-plan">Paket Langganan</Label>
                  <Select onValueChange={(value) => setNewClient(prev => ({ ...prev, planId: value }))}>
                    <SelectTrigger data-testid="select-client-plan">
                      <SelectValue placeholder="Pilih paket" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans?.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - Rp {plan.price.toLocaleString()}/bulan
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  data-testid="button-submit-client"
                  onClick={() => createClientMutation.mutate(newClient)}
                  disabled={createClientMutation.isPending}
                >
                  {createClientMutation.isPending ? 'Membuat...' : 'Buat Client'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Client</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-clients">
                {stats?.totalClients ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                +{stats?.newClientsThisMonth ?? 0} bulan ini
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Client Aktif</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="stat-active-clients">
                {stats?.activeClients ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.activeClients && stats?.totalClients ? ((stats.activeClients / stats.totalClients) * 100).toFixed(1) : '0'}% dari total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Bulan Ini</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-monthly-revenue">
                Rp {(stats?.monthlyRevenue ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +{stats?.revenueGrowth ?? 0}% dari bulan lalu
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial yang Berakhir</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="stat-expiring-trials">
                {stats?.expiringTrials ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                7 hari ke depan
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="clients" className="space-y-4">
          <TabsList>
            <TabsTrigger value="clients">Client Management</TabsTrigger>
            <TabsTrigger value="subscriptions">Langganan</TabsTrigger>
            <TabsTrigger value="plans">Paket Langganan</TabsTrigger>
            <TabsTrigger value="settings">Pengaturan</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Daftar Client</CardTitle>
                <CardDescription>
                  Kelola semua client dan status langganan mereka
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Subdomain</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paket</TableHead>
                      <TableHead>Terdaftar</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients?.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{client.name}</div>
                            <div className="text-sm text-gray-500">{client.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {client.subdomain}
                          </code>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(client.status)}
                        </TableCell>
                        <TableCell>
                          {client.subscription ? (
                            <div>
                              <div className="font-medium">{client.subscription.planName}</div>
                              <div className="text-sm text-gray-500">
                                Rp {client.subscription.amount.toLocaleString()}/bulan
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">No subscription</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDateShort(client.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-view-client-${client.id}`}
                              onClick={() => setSelectedClient(client)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Select onValueChange={(status) => 
                              updateClientStatusMutation.mutate({ clientId: client.id, status })
                            }>
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Aktifkan</SelectItem>
                                <SelectItem value="suspended">Suspend</SelectItem>
                                <SelectItem value="expired">Expire</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Monitoring Langganan</CardTitle>
                <CardDescription>
                  Monitor status pembayaran dan perpanjangan langganan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  Feature monitoring langganan akan ditambahkan di sini
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paket Langganan</CardTitle>
                <CardDescription>
                  Kelola paket dan harga langganan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans?.map((plan) => (
                    <Card key={plan.id} className="border-2">
                      <CardHeader>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                        <div className="text-2xl font-bold">
                          Rp {plan.price.toLocaleString()}
                          <span className="text-sm font-normal text-gray-500">/bulan</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          {(Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || '[]')).map((feature: string, index: number) => (
                            <li key={index} className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pengaturan Sistem</CardTitle>
                <CardDescription>
                  Konfigurasi umum untuk sistem SaaS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  Pengaturan sistem akan ditambahkan di sini
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}