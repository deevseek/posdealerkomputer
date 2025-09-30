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

interface PlanCardProps {
  plan: any;
  onUpdate?: () => void;
}

export default function PlanCard({ plan, onUpdate }: PlanCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editPlan, setEditPlan] = useState<any>(null);

  const updatePlanMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('PUT', `/api/admin/saas/plans/${data.id}`, data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Plan updated' });
      setEditPlan(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/saas/plans'] });
      onUpdate?.();
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message || 'Failed', variant: 'destructive' }),
  });

  return (
    <Card className="mb-3 border-l-4 border-l-blue-500">
      <CardHeader className="flex justify-between items-center">
        <CardTitle>{plan.name}</CardTitle>
        <Dialog
          open={editPlan?.id === plan.id}
          onOpenChange={(open) => {
            if (open) {
              setEditPlan({ ...plan });
            } else {
              setEditPlan(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Pencil className="h-4 w-4" /></Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                placeholder="Plan Name"
                value={editPlan?.name || ''}
                onChange={(e) => setEditPlan({ ...editPlan, name: e.target.value })}
              />
              <Input
                placeholder="Description"
                value={editPlan?.description || ''}
                onChange={(e) => setEditPlan({ ...editPlan, description: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Price"
                value={editPlan?.price || ''}
                onChange={(e) => setEditPlan({ ...editPlan, price: e.target.value })}
              />
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editPlan?.isActive}
                  onCheckedChange={(checked) => setEditPlan({ ...editPlan, isActive: checked })}
                />
                <span>{editPlan?.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex space-x-2">
                <Button onClick={() => updatePlanMutation.mutate(editPlan)}>Save</Button>
                <Button variant="outline" onClick={() => setEditPlan(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <CardDescription>{plan.description}</CardDescription>
        <div className="mt-2 flex justify-between items-center">
          <span>Price: {plan.price}</span>
          <span>Status: {plan.isActive ? <CheckCircle className="text-green-500 inline-block" /> : <XCircle className="text-red-500 inline-block" />}</span>
        </div>
      </CardContent>
    </Card>
  );
}
