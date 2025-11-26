import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Pencil, Eye } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

const PAYMENT_STATUS_OPTIONS: Array<{ value: PaymentStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SERVICE_OPTIONS: Array<{ id: string; name: string; description: string }> = [
  { id: 'pos', name: 'Point of Sale', description: 'Modul kasir dan transaksi penjualan.' },
  { id: 'service', name: 'Servis', description: 'Manajemen tiket servis dan tracking perbaikan.' },
  { id: 'inventory', name: 'Inventory', description: 'Stok barang, gudang, dan katalog produk.' },
  { id: 'finance', name: 'Keuangan', description: 'Pencatatan pembayaran dan laporan keuangan.' },
  { id: 'purchasing', name: 'Pembelian', description: 'Pengadaan dan purchase order ke supplier.' },
  { id: 'reports', name: 'Laporan', description: 'Ringkasan performa bisnis dan laporan periodik.' },
  { id: 'whatsapp', name: 'WhatsApp', description: 'Integrasi notifikasi dan pesan otomatis.' },
];

interface ClientTableProps {
  clients: any[];
  refetchClients: () => void;
  plans?: any[];
}

const formatCurrency = (amount?: number | string | null) => {
  if (amount == null) {
    return null;
  }

  const numeric = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(numeric);
};

const formatPaymentStatus = (status?: string | null) => {
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

export default function ClientTable({ clients, refetchClients, plans = [] }: ClientTableProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editClient, setEditClient] = useState<any>(null);
  const [localPaymentStatus, setLocalPaymentStatus] = useState<Partial<Record<string, PaymentStatus>>>({});
  const [updatingSubscriptionId, setUpdatingSubscriptionId] = useState<string | null>(null);
  const [serviceDialogClient, setServiceDialogClient] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [renewDialogClient, setRenewDialogClient] = useState<any>(null);
  const [renewalMonths, setRenewalMonths] = useState<number>(1);
  const [renewalStartDate, setRenewalStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const parseServicesFromSettings = (clientSettings: any): string[] => {
    const rawSettings = typeof clientSettings === 'string' ? (() => {
      try {
        return JSON.parse(clientSettings);
      } catch (error) {
        console.warn('Failed to parse client settings', error);
        return null;
      }
    })() : clientSettings;

    if (rawSettings && typeof rawSettings === 'object') {
      if (Array.isArray((rawSettings as any).features)) {
        return (rawSettings as any).features.filter((feature: unknown): feature is string => typeof feature === 'string');
      }

      if (Array.isArray((rawSettings as any).services)) {
        return (rawSettings as any).services.filter((feature: unknown): feature is string => typeof feature === 'string');
      }
    }

    return [];
  };

  const updateClientMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; email: string; planId?: string | null }) =>
      apiRequest('PUT', `/api/admin/saas/clients/${data.id}`, {
        name: data.name,
        email: data.email,
        planId: data.planId || undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Client updated successfully' });
      setEditClient(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/saas/clients'] });
    },
    onError: (error: any) =>
      toast({ title: 'Error', description: error.message || 'Failed to update client', variant: 'destructive' }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'suspended' | 'expired' | 'trial' }) =>
      apiRequest('PATCH', `/api/admin/saas/clients/${id}/status`, { status }),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Client status updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/saas/clients'] });
    },
    onError: (error: any) =>
      toast({ title: 'Error', description: error.message || 'Failed to update client status', variant: 'destructive' }),
  });

  const updateServicesMutation = useMutation({
    mutationFn: async ({ id, services }: { id: string; services: string[] }) =>
      apiRequest('PATCH', `/api/admin/saas/clients/${id}/services`, { services }),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Layanan tenant berhasil diperbarui' });
      setServiceDialogClient(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/saas/clients'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Gagal memperbarui layanan tenant',
        variant: 'destructive',
      });
    },
  });

  const renewSubscriptionMutation = useMutation({
    mutationFn: async ({ subscriptionId, months, startDate }: { subscriptionId: string; months: number; startDate: string }) =>
      apiRequest('POST', `/api/admin/saas/subscriptions/${subscriptionId}/renew`, {
        months,
        startDate,
      }),
    onSuccess: async () => {
      toast({ title: 'Berhasil', description: 'Langganan berhasil diperpanjang' });
      setRenewDialogClient(null);
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/saas/clients'] });
      await refetchClients();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Gagal memperpanjang langganan',
        variant: 'destructive',
      });
    },
  });

  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ subscriptionId, status }: { subscriptionId: string; status: PaymentStatus }) =>
      apiRequest('PATCH', `/api/admin/saas/subscriptions/${subscriptionId}/payment-status`, { status }),
  });

  const handlePaymentStatusChange = async (subscriptionId: string, status: PaymentStatus) => {
    setLocalPaymentStatus((prev) => ({ ...prev, [subscriptionId]: status }));
    setUpdatingSubscriptionId(subscriptionId);

    try {
      await updatePaymentStatusMutation.mutateAsync({ subscriptionId, status });
      toast({ title: 'Success', description: 'Payment status updated successfully' });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/saas/clients'] });
      await refetchClients();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to update payment status', variant: 'destructive' });
    } finally {
      setUpdatingSubscriptionId((prev) => (prev === subscriptionId ? null : prev));
      setLocalPaymentStatus((prev) => {
        const next = { ...prev };
        delete next[subscriptionId];
        return next;
      });
    }
  };

  const handleOpenServiceDialog = (client: any, open: boolean) => {
    if (open) {
      setServiceDialogClient(client);
      setSelectedServices(parseServicesFromSettings(client.settings));
      return;
    }

    setServiceDialogClient(null);
  };

  const toggleService = (serviceId: string, enabled: boolean) => {
    setSelectedServices((prev) => {
      if (enabled) {
        return Array.from(new Set([...prev, serviceId]));
      }

      return prev.filter((item) => item !== serviceId);
    });
  };

  const handleSaveServices = () => {
    if (!serviceDialogClient) {
      return;
    }

    if (selectedServices.length === 0) {
      toast({
        title: 'Pilih layanan',
        description: 'Minimal satu layanan harus diaktifkan untuk tenant ini.',
        variant: 'destructive',
      });
      return;
    }

    updateServicesMutation.mutate({ id: serviceDialogClient.id, services: selectedServices });
  };

  const handleOpenRenewDialog = (client: any, subscription: any, open: boolean) => {
    if (open) {
      setRenewDialogClient(client);

      if (subscription?.endDate) {
        const nextDay = new Date(subscription.endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        setRenewalStartDate(nextDay.toISOString().slice(0, 10));
      } else {
        setRenewalStartDate(new Date().toISOString().slice(0, 10));
      }

      setRenewalMonths(1);
      return;
    }

    setRenewDialogClient(null);
  };

  const handleRenewSubscription = (subscriptionId: string) => {
    if (!renewalStartDate || Number.isNaN(new Date(renewalStartDate).getTime())) {
      toast({
        title: 'Tanggal tidak valid',
        description: 'Pilih tanggal mulai yang valid untuk perpanjangan.',
        variant: 'destructive',
      });
      return;
    }

    renewSubscriptionMutation.mutate({
      subscriptionId,
      months: renewalMonths,
      startDate: renewalStartDate,
    });
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Domain</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const subscription = client.subscription ?? null;
            const isActive = client.status === 'active';
            const nextStatus = isActive ? 'suspended' : 'active';
            const matchedPlan = subscription?.planId
              ? plans.find((plan: any) => plan.id === subscription.planId)
              : undefined;
            const displayPrice =
              matchedPlan?.price ?? (subscription?.amount ? Number(subscription.amount) : undefined);
            const formattedPrice = formatCurrency(displayPrice);
            const paymentStatusLabel = formatPaymentStatus(subscription?.paymentStatus);
            const currentPaymentStatus = subscription
              ? (subscription.paymentStatus as PaymentStatus)
              : 'pending';
            const pendingStatusSelection = subscription?.id ? localPaymentStatus[subscription.id] : undefined;
            const paymentStatusValue = pendingStatusSelection ?? currentPaymentStatus;
            const domain = client.customDomain
              ? client.customDomain
              : client.subdomain
              ? `${client.subdomain}.profesionalservis.my.id`
              : '-';

            return (
              <TableRow key={client.id}>
                <TableCell>{client.id}</TableCell>
                <TableCell>{client.name}</TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{domain}</code>
                </TableCell>
                <TableCell>
                  {subscription ? (
                    <div className="space-y-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 font-medium">
                          <span>{subscription.planName || subscription.plan || '-'}</span>
                          {paymentStatusLabel ? (
                            <Badge variant={subscription.paymentStatus === 'paid' ? 'outline' : 'secondary'} className="uppercase tracking-wide">
                              {paymentStatusLabel}
                            </Badge>
                          ) : null}
                        </div>
                        {subscription.id ? (
                          <Select
                            value={paymentStatusValue}
                            onValueChange={(value) => {
                              if (subscription.id) {
                                void handlePaymentStatusChange(subscription.id, value as PaymentStatus);
                              }
                            }}
                            disabled={updatingSubscriptionId === subscription.id || updatePaymentStatusMutation.isPending}
                          >
                            <SelectTrigger className="h-8 w-[150px] text-xs">
                              <SelectValue placeholder="Payment Status" />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : null}
                      </div>
                      {formattedPrice ? (
                        <p className="text-xs text-muted-foreground">{formattedPrice} / bulan</p>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Tidak ada paket</span>
                  )}
                </TableCell>
                <TableCell>
                  {isActive ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
                </TableCell>
                <TableCell className="space-x-2">
                  <Dialog
                    open={!!editClient && editClient.id === client.id}
                    onOpenChange={(open) => {
                      if (open) {
                        setEditClient({
                          id: client.id,
                          name: client.name,
                          email: client.email,
                          planId: subscription?.planId || '',
                        });
                      } else {
                        setEditClient(null);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline"><Pencil className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Edit Client</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2">
                        <Input
                          placeholder="Name"
                          value={editClient?.name || ''}
                          onChange={(e) => setEditClient({ ...editClient, name: e.target.value })}
                        />
                        <Input
                          placeholder="Email"
                          type="email"
                          value={editClient?.email || ''}
                          onChange={(e) => setEditClient({ ...editClient, email: e.target.value })}
                        />
                        <Select
                          value={editClient?.planId || ''}
                          onValueChange={(value) => setEditClient({ ...editClient, planId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Plan" />
                          </SelectTrigger>
                          <SelectContent>
                            {plans.map((plan: any) => (
                              <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() =>
                              editClient &&
                              updateClientMutation.mutate({
                                id: editClient.id,
                                name: editClient.name,
                                email: editClient.email,
                                planId: editClient.planId,
                              })
                            }
                            disabled={updateClientMutation.isPending}
                          >
                            {updateClientMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEditClient(null)}
                            disabled={updateClientMutation.isPending}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {client.status === 'expired' && subscription?.id ? (
                    <Dialog
                      open={!!renewDialogClient && renewDialogClient.id === client.id}
                      onOpenChange={(open) => handleOpenRenewDialog(client, subscription, open)}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" variant="default">Perpanjang</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[480px]">
                        <DialogHeader>
                          <DialogTitle>Perpanjang Layanan</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="renew-start">Tanggal Mulai</Label>
                            <Input
                              id="renew-start"
                              type="date"
                              value={renewalStartDate}
                              onChange={(e) => setRenewalStartDate(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="renew-months">Durasi (bulan)</Label>
                            <Input
                              id="renew-months"
                              type="number"
                              min={1}
                              max={24}
                              value={renewalMonths}
                              onChange={(e) => setRenewalMonths(Math.max(1, Number(e.target.value) || 1))}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleOpenRenewDialog(client, subscription, false)}
                              disabled={renewSubscriptionMutation.isPending}
                            >
                              Batal
                            </Button>
                            <Button
                              onClick={() => handleRenewSubscription(subscription.id)}
                              disabled={renewSubscriptionMutation.isPending}
                            >
                              {renewSubscriptionMutation.isPending ? 'Memproses...' : 'Perpanjang Sekarang'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : null}
                  <Dialog
                    open={!!serviceDialogClient && serviceDialogClient.id === client.id}
                    onOpenChange={(open) => handleOpenServiceDialog(client, open)}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" variant="secondary">Layanan</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[560px]">
                      <DialogHeader>
                        <DialogTitle>Kelola Layanan Tenant</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Aktifkan atau nonaktifkan modul yang tersedia untuk tenant ini.
                        </p>
                        <div className="space-y-3">
                          {SERVICE_OPTIONS.map((service) => {
                            const enabled = selectedServices.includes(service.id);

                            return (
                              <div
                                key={service.id}
                                className="flex items-start justify-between rounded-md border p-3"
                              >
                                <div className="mr-4 space-y-1">
                                  <p className="text-sm font-medium">{service.name}</p>
                                  <p className="text-xs text-muted-foreground">{service.description}</p>
                                </div>
                                <Switch
                                  checked={enabled}
                                  onCheckedChange={(checked) => toggleService(service.id, checked)}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleOpenServiceDialog(client, false)}
                            disabled={updateServicesMutation.isPending}
                          >
                            Batal
                          </Button>
                          <Button
                            onClick={handleSaveServices}
                            disabled={updateServicesMutation.isPending || selectedServices.length === 0}
                          >
                            {updateServicesMutation.isPending ? 'Menyimpan...' : 'Simpan Layanan'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    variant={isActive ? 'destructive' : 'default'}
                    onClick={() => updateStatusMutation.mutate({ id: client.id, status: nextStatus })}
                    disabled={updateStatusMutation.isPending}
                  >
                    {isActive ? 'Suspend' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
