import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface CreateClientFormProps {
  plans: Plan[];
  onSubmit: (data: {
    name: string;
    subdomain: string;
    email: string;
    phone?: string;
    address?: string;
    planId: string;
    trialDays: number;
  }) => void;
  isLoading: boolean;
}

const sanitize = (value: string) => value.trim();

export function CreateClientForm({ plans, onSubmit, isLoading }: CreateClientFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    email: '',
    phone: '',
    address: '',
    planId: '', // will hold plan id
    trialDays: 7
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.planId) {
      return;
    }

    onSubmit({
      name: sanitize(formData.name),
      subdomain: sanitize(formData.subdomain.toLowerCase()),
      email: sanitize(formData.email.toLowerCase()),
      phone: sanitize(formData.phone) || undefined,
      address: sanitize(formData.address) || undefined,
      planId: formData.planId,
      trialDays: formData.trialDays,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nama Client *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Contoh: Toko Laptop Jaya"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subdomain">Subdomain *</Label>
          <div className="flex items-center">
            <Input
              id="subdomain"
              value={formData.subdomain}
              onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase() })}
              placeholder="tokojaya"
              required
              className="rounded-r-none"
            />
            <div className="px-3 py-2 bg-gray-50 border border-l-0 rounded-r-md text-sm text-gray-600">
              .profesionalservis.my.id
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="admin@tokojaya.com"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Nomor Telepon</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+62 812-3456-7890"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trial-days">Periode Trial (hari)</Label>
          <Select 
            value={formData.trialDays.toString()} 
            onValueChange={(value) => setFormData({ ...formData, trialDays: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 hari</SelectItem>
              <SelectItem value="14">14 hari</SelectItem>
              <SelectItem value="30">30 hari</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Alamat</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Alamat lengkap toko..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan">Paket Langganan *</Label>
        <Select value={formData.planId} onValueChange={(value) => setFormData({ ...formData, planId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih paket langganan" />
          </SelectTrigger>
          <SelectContent>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name === 'basic' ? 'Basic' : plan.name === 'pro' ? 'Professional' : plan.name === 'premium' ? 'Enterprise' : plan.name} - Rp {plan.price.toLocaleString('id-ID')}/bulan
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isLoading || !formData.planId}>
          {isLoading ? 'Membuat...' : 'Buat Client'}
        </Button>
      </div>
    </form>
  );
}