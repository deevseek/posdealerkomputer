import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Pencil, CheckCircle, XCircle } from 'lucide-react';

type Plan = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  isActive?: boolean | null;
  maxUsers?: number | null;
  maxTransactionsPerMonth?: number | null;
  maxStorageGB?: number | null;
  currency?: string | null;
};

type EditablePlan = {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
  isActive?: boolean | null;
  maxUsers?: number | string | null;
  maxTransactionsPerMonth?: number | string | null;
  maxStorageGB?: number | string | null;
  currency?: string | null;
};

interface PlanCardProps {
  plan: Plan;
  onUpdate?: () => void;
}

const PLAN_LABELS: Record<string, string> = {
  basic: 'Basic',
  pro: 'Professional',
  premium: 'Enterprise',
};

const getPlanLabel = (code: string) => PLAN_LABELS[code] ?? code;

const formatCurrency = (amount: number | null | undefined, currency = 'IDR') => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return '-';
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

const coerceOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const numeric = typeof value === 'number' ? value : Number(value);

  if (Number.isNaN(numeric)) {
    throw new Error('Nilai numerik tidak valid.');
  }

  return numeric;
};

export default function PlanCard({ plan, onUpdate }: PlanCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<EditablePlan | null>(null);

  const updatePlanMutation = useMutation({
    mutationFn: async (data: EditablePlan) => {
      if (!data.id) {
        throw new Error('Plan tidak ditemukan.');
      }

      const payload: Record<string, unknown> = {};

      if (data.name !== undefined) {
        const trimmedName = data.name.trim();
        if (!trimmedName) {
          throw new Error('Nama paket harus diisi.');
        }
        payload.name = trimmedName;
      }

      if (data.description !== undefined) {
        payload.description = data.description?.trim() ?? '';
      }

      if (data.price !== undefined) {
        const numericPrice = coerceOptionalNumber(data.price);
        if (numericPrice === undefined || numericPrice <= 0) {
          throw new Error('Harga paket harus lebih dari 0.');
        }
        payload.price = numericPrice;
      }

      if (data.maxUsers !== undefined) {
        const maxUsers = coerceOptionalNumber(data.maxUsers);
        if (maxUsers !== undefined) {
          if (!Number.isInteger(maxUsers) || maxUsers < 1) {
            throw new Error('Jumlah pengguna maksimal harus minimal 1.');
          }
          payload.maxUsers = maxUsers;
        }
      }

      if (data.isActive !== undefined && data.isActive !== null) {
        payload.isActive = data.isActive;
      }

      if (Object.keys(payload).length === 0) {
        throw new Error('Tidak ada perubahan yang disimpan.');
      }

      return apiRequest('PUT', `/api/admin/plans/${data.id}`, payload);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Plan updated' });
      setIsDialogOpen(false);
      setEditPlan(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      onUpdate?.();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update plan', variant: 'destructive' });
    },
  });

  const openDialog = () => {
    setEditPlan({
      id: plan.id,
      name: plan.name,
      description: plan.description ?? '',
      price: plan.price != null ? String(plan.price) : '',
      isActive: plan.isActive ?? true,
      maxUsers: plan.maxUsers ?? undefined,
      maxTransactionsPerMonth: plan.maxTransactionsPerMonth ?? undefined,
      maxStorageGB: plan.maxStorageGB ?? undefined,
      currency: plan.currency,
    });
    setIsDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditPlan(null);
    }
  };

  const handleSave = () => {
    if (!editPlan) {
      return;
    }
    updatePlanMutation.mutate(editPlan);
  };

  return (
    <Card className="mb-3 border-l-4 border-l-blue-500">
      <CardHeader className="flex justify-between items-center">
        <CardTitle>{getPlanLabel(plan.name)}</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" onClick={openDialog}>
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                placeholder="Plan Name"
                value={editPlan?.name || ''}
                onChange={(e) => setEditPlan({ ...editPlan!, name: e.target.value })}
              />
              <Input
                placeholder="Description"
                value={editPlan?.description || ''}
                onChange={(e) => setEditPlan({ ...editPlan!, description: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Price"
                value={editPlan?.price !== undefined ? String(editPlan.price ?? '') : ''}
                onChange={(e) => setEditPlan({ ...editPlan!, price: e.target.value })}
                min={1}
              />
              <div className="flex items-center space-x-2">
                <Switch
                  checked={!!editPlan?.isActive}
                  onCheckedChange={(checked) => setEditPlan({ ...editPlan!, isActive: checked })}
                />
                <span>{editPlan?.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleSave} disabled={updatePlanMutation.isPending}>
                  {updatePlanMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" onClick={() => handleDialogChange(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <CardDescription>{plan.description || 'Belum ada deskripsi paket.'}</CardDescription>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Harga</span>
            <span className="font-medium">{formatCurrency(plan.price, plan.currency ?? 'IDR')}</span>
          </div>
          {typeof plan.maxUsers === 'number' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Maksimal Pengguna</span>
              <span className="font-medium">{plan.maxUsers}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-muted-foreground">Status</span>
            {plan.isActive ? (
              <span className="flex items-center space-x-1 text-green-600 font-medium">
                <CheckCircle className="h-4 w-4" />
                <span>Aktif</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-red-500 font-medium">
                <XCircle className="h-4 w-4" />
                <span>Nonaktif</span>
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
