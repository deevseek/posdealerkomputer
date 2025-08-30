import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Edit, Users, Mail, UserCheck, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import { z } from "zod";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

const userUpdateSchema = z.object({
  firstName: z.string().min(1, "Nama depan harus diisi"),
  lastName: z.string().optional(),
  email: z.string().email("Format email tidak valid"),
  role: z.enum(["admin", "kasir", "teknisi", "purchasing", "finance", "owner"]),
  isActive: z.boolean(),
});

const roleLabels = {
  admin: "Administrator",
  kasir: "Kasir",
  teknisi: "Teknisi",
  purchasing: "Purchasing",
  finance: "Finance", 
  owner: "Owner"
};

const roleColors = {
  admin: "destructive",
  kasir: "default",
  teknisi: "secondary",
  purchasing: "outline",
  finance: "default",
  owner: "destructive"
} as const;

export default function UsersPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  const form = useForm({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "kasir" as const,
      isActive: true,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('PUT', `/api/users/${editingUser?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setShowDialog(false);
      setEditingUser(null);
      form.reset();
      toast({
        title: "Berhasil",
        description: "User berhasil diupdate",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Gagal mengupdate user",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Berhasil",
        description: "User berhasil dihapus",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Gagal menghapus user",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      role: user.role || "kasir",
      isActive: user.isActive ?? true,
    });
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus user ini?")) {
      deleteMutation.mutate(id);
    }
  };

  const getInitials = (user: User) => {
    const first = user.firstName?.charAt(0) || "";
    const last = user.lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || user.email?.charAt(0).toUpperCase() || "?";
  };

  if (isLoading) {
    return <div data-testid="loading">Memuat data user...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Management User" breadcrumb="Home / Users" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold" data-testid="page-title">Management User</h1>
                <p className="text-muted-foreground">Kelola akun pengguna dan peran mereka</p>
              </div>
            </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title">Edit User</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Depan</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nama depan"
                          data-testid="input-first-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Belakang</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nama belakang"
                          data-testid="input-last-name"
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="user@example.com"
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peran</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Pilih peran" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="kasir">Kasir</SelectItem>
                        <SelectItem value="teknisi">Teknisi</SelectItem>
                        <SelectItem value="purchasing">Purchasing</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
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
                        User dapat login dan mengakses sistem
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
                    setEditingUser(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Batal
                </Button>
                <Button 
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-submit"
                >
                  Update
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Daftar User
          </CardTitle>
          <CardDescription>
            Total {users.length} user terdaftar dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-state">
              Belum ada user yang terdaftar.
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Peran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bergabung</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: User) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.profileImageUrl || ""} />
                            <AvatarFallback className="text-sm">
                              {getInitials(user)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium" data-testid={`user-name-${user.id}`}>
                              {`${user.firstName || ""} ${user.lastName || ""}`.trim() || "User"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {user.id}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span data-testid={`user-email-${user.id}`}>
                            {user.email || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={roleColors[user.role as keyof typeof roleColors] || "default"}
                          data-testid={`user-role-${user.id}`}
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          {roleLabels[user.role as keyof typeof roleLabels] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.isActive ? "default" : "secondary"}
                          data-testid={`user-status-${user.id}`}
                        >
                          <UserCheck className="w-3 h-3 mr-1" />
                          {user.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span 
                          className="text-sm text-muted-foreground"
                          data-testid={`user-created-${user.id}`}
                        >
                          {user.createdAt 
                            ? new Date(user.createdAt).toLocaleDateString("id-ID")
                            : "-"
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(user)}
                            data-testid={`button-edit-${user.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            data-testid={`button-delete-${user.id}`}
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
        </main>
      </div>
    </div>
  );
}