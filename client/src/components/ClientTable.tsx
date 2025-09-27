import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast, useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Pencil, Eye } from 'lucide-react';

interface ClientTableProps {
  clients: any[];
  refetchClients: () => void;
  plans?: any[];
}

export default function ClientTable({ clients, refetchClients, plans = [] }: ClientTableProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editClient, setEditClient] = useState<any>(null);

  const updateClientMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('PUT', `/api/admin/saas/clients/${data.id}`, data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Client updated successfully' });
      setEditClient(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/saas/clients'] });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message || 'Failed to update client', variant: 'destructive' }),
  });

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>{client.id}</TableCell>
              <TableCell>{client.name}</TableCell>
              <TableCell>{client.email}</TableCell>
              <TableCell>{client.planName || client.plan || '-'}</TableCell>
              <TableCell>
                {client.isActive ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
              </TableCell>
              <TableCell className="space-x-2">
                <Dialog open={!!editClient && editClient.id === client.id} onOpenChange={(open) => {
                  if (open) setEditClient(client);
                  else setEditClient(null);
                }}>
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
                        <Button onClick={() => updateClientMutation.mutate(editClient)}>Save</Button>
                        <Button variant="outline" onClick={() => setEditClient(null)}>Cancel</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  size="sm"
                  variant={client.isActive ? 'destructive' : 'default'}
                  onClick={() => updateClientMutation.mutate({ id: client.id, isActive: !client.isActive })}
                >
                  {client.isActive ? 'Suspend' : 'Activate'}
                </Button>
                <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
