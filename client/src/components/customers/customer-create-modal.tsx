import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertCustomerSchema } from "@shared/schema";
import { z } from "zod";

const customerFormSchema = insertCustomerSchema.extend({
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCustomerCreated?: (customer: any) => void;
}

export default function CustomerCreateModal({ 
  open, 
  onClose, 
  onCustomerCreated 
}: CustomerCreateModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      return await apiRequest('POST', '/api/customers', data);
    },
    onSuccess: (newCustomer) => {
      // Reset form first
      form.reset();
      
      // Close modal
      onClose();
      
      // Call callback to select customer immediately after modal closes
      if (onCustomerCreated) {
        // Use setTimeout to ensure modal is fully closed before updating parent state
        setTimeout(() => {
          onCustomerCreated(newCustomer);
          
          // Show success toast after customer is selected
          toast({
            title: "Success",
            description: `Customer ${newCustomer.name} berhasil ditambahkan dan terpilih`,
          });
          
          // Invalidate cache to refresh list
          queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
        }, 200);
      } else {
        // Fallback toast if no callback
        toast({
          title: "Success", 
          description: "Customer berhasil ditambahkan",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menambahkan customer",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CustomerFormData) => {
    // Clean up empty strings to null for optional fields
    const cleanData = {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
    };
    
    createCustomerMutation.mutate(cleanData);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Customer Baru</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nama *</Label>
            <Input
              id="name"
              placeholder="Masukkan nama customer"
              {...form.register("name")}
              data-testid="input-customer-name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Nomor Telepon</Label>
            <Input
              id="phone"
              placeholder="Contoh: 08123456789"
              {...form.register("phone")}
              data-testid="input-customer-phone"
            />
            {form.formState.errors.phone && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="contoh@email.com"
              {...form.register("email")}
              data-testid="input-customer-email"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="address">Alamat</Label>
            <Textarea
              id="address"
              placeholder="Masukkan alamat lengkap"
              rows={3}
              {...form.register("address")}
              data-testid="input-customer-address"
            />
            {form.formState.errors.address && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.address.message}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createCustomerMutation.isPending}
              data-testid="button-cancel"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createCustomerMutation.isPending}
              data-testid="button-save-customer"
            >
              {createCustomerMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}