import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRoleSchema } from "@shared/schema";
import { Trash2, Edit, Plus, UserCheck, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Role } from "@shared/schema";
import { z } from "zod";

const roleFormSchema = insertRoleSchema.extend({
  permissions: z.array(z.string()).optional(),
});

const availablePermissions = [
  "dashboard:view",
  "pos:use", 
  "service:create",
  "service:manage",
  "inventory:view",
  "inventory:manage",
  "financial:view", 
  "financial:manage",
  "customers:view",
  "customers:manage",
  "suppliers:view",
  "suppliers:manage",
  "reports:view",
  "settings:view",
  "settings:manage",
  "users:view",
  "users:manage",
  "roles:view",
  "roles:manage"
];

export default function RolesPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch roles
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['/api/roles'],
  });

  const form = useForm({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      displayName: "",
      description: "",
      permissions: [] as string[],
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        permissions: data.permissions || [],
      };
      return apiRequest('POST', '/api/roles', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setShowDialog(false);
      form.reset();
      toast({
        title: "Berhasil",
        description: "Role berhasil dibuat",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Gagal membuat role",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        permissions: data.permissions || [],
      };
      return apiRequest('PUT', `/api/roles/${editingRole?.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setShowDialog(false);
      setEditingRole(null);
      form.reset();
      toast({
        title: "Berhasil",
        description: "Role berhasil diupdate",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Gagal mengupdate role",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      toast({
        title: "Berhasil",
        description: "Role berhasil dihapus",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Gagal menghapus role",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any) => {
    if (editingRole) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    form.reset({
      name: role.name,
      displayName: role.displayName,
      description: role.description || "",
      permissions: role.permissions || [],
      isActive: role.isActive,
    });
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus role ini?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div data-testid="loading">Memuat data role...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Management Role</h1>
          <p className="text-muted-foreground">Kelola peran dan izin pengguna</p>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingRole(null);
                form.reset({
                  name: "",
                  displayName: "",
                  description: "",
                  permissions: [],
                  isActive: true,
                });
              }}
              data-testid="button-add-role"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="dialog-title">
                {editingRole ? "Edit Role" : "Tambah Role Baru"}
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Role</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="admin, kasir, teknisi"
                            data-testid="input-role-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Tampilan</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Administrator, Kasir, Teknisi"
                            data-testid="input-display-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Deskripsi peran dan tanggung jawab..."
                          data-testid="input-description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="permissions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Izin Akses</FormLabel>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-3">
                        {availablePermissions.map((permission) => (
                          <div key={permission} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`permission-${permission}`}
                              checked={(field.value || []).includes(permission)}
                              onChange={(e) => {
                                const current = field.value || [];
                                if (e.target.checked) {
                                  field.onChange([...current, permission]);
                                } else {
                                  field.onChange(current.filter((p) => p !== permission));
                                }
                              }}
                              data-testid={`checkbox-permission-${permission}`}
                            />
                            <label 
                              htmlFor={`permission-${permission}`}
                              className="text-sm cursor-pointer"
                            >
                              {permission.replace(":", " ")}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Status Aktif</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Role dapat digunakan dan diterapkan ke pengguna
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowDialog(false);
                      setEditingRole(null);
                      form.reset();
                    }}
                    data-testid="button-cancel"
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {editingRole ? "Update" : "Simpan"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="w-5 h-5 mr-2" />
            Daftar Role
          </CardTitle>
          <CardDescription>
            Total {roles.length} role tersedia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-state">
              Belum ada role yang dibuat. Mulai dengan membuat role baru.
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Role</TableHead>
                    <TableHead>Nama Tampilan</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Izin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role: Role) => (
                    <TableRow key={role.id} data-testid={`role-row-${role.id}`}>
                      <TableCell>
                        <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {role.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span data-testid={`role-display-name-${role.id}`}>
                          {role.displayName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span 
                          className="text-sm text-muted-foreground" 
                          data-testid={`role-description-${role.id}`}
                        >
                          {role.description || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(role.permissions || []).slice(0, 3).map((permission, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {permission.split(":")[0]}
                            </Badge>
                          ))}
                          {(role.permissions || []).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(role.permissions || []).length - 3} lainnya
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={role.isActive ? "default" : "secondary"}
                          data-testid={`role-status-${role.id}`}
                        >
                          {role.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(role)}
                            data-testid={`button-edit-${role.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(role.id)}
                            data-testid={`button-delete-${role.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}