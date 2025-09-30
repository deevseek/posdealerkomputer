import { useEffect, useState } from 'react';
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
  description: string;
  price: string;
  isActive: boolean;
  maxUsers: string;
  maxTransactionsPerMonth: string;
  maxStorageGB: string;
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

const createEditablePlan = (plan: Plan): EditablePlan => ({
  id: plan.id,
  name: plan.name,
  description: plan.description ?? '',
  price: plan.price != null ? String(plan.price) : '',
  isActive: plan.isActive ?? true,
  maxUsers: plan.maxUsers != null ? String(plan.maxUsers) : '',
  maxTransactionsPerMonth:
    plan.maxTransactionsPerMonth != null ? String(plan.maxTransactionsPerMonth) : '',
  maxStorageGB: plan.maxStorageGB != null ? String(plan.maxStorageGB) : '',
  currency: plan.currency ?? 'IDR',
});

const parseRequiredPositiveNumber = (value: string, fieldLabel: string) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`${fieldLabel} harus lebih dari 0.`);
  }

  return Math.round(numeric);
};

const parseOptionalInteger = (value: string, fieldLabel: string, options: { min?: number } = {}) => {
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

export default function PlanCard({ plan, onUpdate }: PlanCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<EditablePlan>(() => createEditablePlan(plan));

  useEffect(() => {
    if (!isDialogOpen) {
      setEditPlan(createEditablePlan(plan));
    }
  }, [plan, isDialogOpen]);

  const updatePlanMutation = useMutation({
    mutationFn: async (data: EditablePlan) => {
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        throw new Error('Nama paket harus diisi.');
      }

      const payload: Record<string, unknown> = {
        name: trimmedName,
        description: data.description.trim(),
        price: parseRequiredPositiveNumber(data.price, 'Harga paket'),
        isActive: Boolean(data.isActive),
        currency: data.currency ?? 'IDR',
      };

      const maxUsers = parseOptionalInteger(data.maxUsers, 'Jumlah pengguna maksimal', { min: 1 });
      if (maxUsers !== undefined) {
        payload.maxUsers = maxUsers;
      }

      const maxTransactions = parseOptionalInteger(
        data.maxTransactionsPerMonth,
        'Transaksi maksimal per bulan',
        { min: 0 },
      );
      if (maxTransactions !== undefined) {
        payload.maxTransactionsPerMonth = maxTransactions;
      }

      const maxStorage = parseOptionalInteger(data.maxStorageGB, 'Kapasitas penyimpanan (GB)', { min: 0 });
      if (maxStorage !== undefined) {
        payload.maxStorageGB = maxStorage;
      }

      return apiRequest('PUT', `/api/admin/saas/plans/${data.id}`, payload);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Plan updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/saas/plans'] });
      setIsDialogOpen(false);
      setEditPlan(createEditablePlan(plan));
      onUpdate?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update plan',
        variant: 'destructive',
      });
    },
  });

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      setEditPlan(createEditablePlan(plan));
    }
  };

  const handleSave = () => {
    updatePlanMutation.mutate(editPlan);
  };

  return (
    <Card className="mb-3 border-l-4 border-l-blue-500">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>{getPlanLabel(plan.name)}</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Plan Name"
                value={editPlan.name}
                onChange={(e) => setEditPlan({ ...editPlan, name: e.target.value })}
              />
              <Input
                placeholder="Description"
                value={editPlan.description}
                onChange={(e) => setEditPlan({ ...editPlan, description: e.target.value })}
              />
              <Input
                type="number"
                min={1}
                placeholder="Price"
                value={editPlan.price}
                onChange={(e) => setEditPlan({ ...editPlan, price: e.target.value })}
              />
              <Input
                type="number"
                min={1}
                placeholder="Maksimal Pengguna"
                value={editPlan.maxUsers}
                onChange={(e) => setEditPlan({ ...editPlan, maxUsers: e.target.value })}
              />
              <Input
                type="number"
                min={0}
                placeholder="Transaksi / Bulan"
                value={editPlan.maxTransactionsPerMonth}
                onChange={(e) =>
                  setEditPlan({ ...editPlan, maxTransactionsPerMonth: e.target.value })
                }
              />
              <Input
                type="number"
                min={0}
                placeholder="Penyimpanan (GB)"
                value={editPlan.maxStorageGB}
                onChange={(e) => setEditPlan({ ...editPlan, maxStorageGB: e.target.value })}
              />
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editPlan.isActive}
                  onCheckedChange={(checked) => setEditPlan({ ...editPlan, isActive: checked })}
                />
                <span>{editPlan.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleSave} disabled={updatePlanMutation.isPending}>
                  {updatePlanMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditPlan(createEditablePlan(plan));
                  }}
                >
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
          <div className="flex justify-between items-center border-t pt-2">
            <span className="text-muted-foreground">Status</span>
            {plan.isActive ? (
              <span className="flex items-center space-x-1 font-medium text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Aktif</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 font-medium text-red-500">
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
