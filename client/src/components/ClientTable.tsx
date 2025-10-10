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

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

const PAYMENT_STATUS_OPTIONS: Array<{ value: PaymentStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
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
