import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStoreConfigSchema } from "@shared/schema";
import { Settings as SettingsIcon, Store, Shield, Bell, Database, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { StoreConfig } from "@shared/schema";
import { z } from "zod";

const storeConfigFormSchema = insertStoreConfigSchema.extend({
  taxRate: z.string().transform(val => parseFloat(val) || 11.0),
  defaultDiscount: z.string().transform(val => parseFloat(val) || 0.0),
});

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch store config
  const { data: storeConfig, isLoading } = useQuery({
    queryKey: ['/api/store-config'],
  });

  const form = useForm({
    resolver: zodResolver(storeConfigFormSchema),
    defaultValues: {
      name: storeConfig?.name || "",
      address: storeConfig?.address || "",
      phone: storeConfig?.phone || "",
      email: storeConfig?.email || "",
      taxRate: storeConfig?.taxRate?.toString() || "11.0",
      defaultDiscount: storeConfig?.defaultDiscount?.toString() || "0.0",
      logo: storeConfig?.logo || "",
    },
    values: storeConfig ? {
      name: storeConfig.name || "",
      address: storeConfig.address || "",
      phone: storeConfig.phone || "",
      email: storeConfig.email || "",
      taxRate: storeConfig.taxRate?.toString() || "11.0",
      defaultDiscount: storeConfig.defaultDiscount?.toString() || "0.0",
      logo: storeConfig.logo || "",
    } : undefined,
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/store-config', 'POST', {
        ...data,
        taxRate: parseFloat(data.taxRate) || 11.0,
        defaultDiscount: parseFloat(data.defaultDiscount) || 0.0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/store-config'] });
      toast({
        title: "Berhasil",
        description: "Konfigurasi toko berhasil disimpan",
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Gagal menyimpan konfigurasi toko",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any) => {
    updateConfigMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Settings" breadcrumb="Home / Settings" />
          <main className="flex-1 overflow-y-auto p-6">
            <div data-testid="loading">Memuat konfigurasi...</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Settings" breadcrumb="Home / Settings" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold" data-testid="page-title">Pengaturan Sistem</h1>
              <p className="text-muted-foreground">Kelola konfigurasi toko dan sistem</p>
            </div>
          </div>

          <Tabs defaultValue="store" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="store" data-testid="tab-store">
                <Store className="w-4 h-4 mr-2" />
                Toko
              </TabsTrigger>
              <TabsTrigger value="system" data-testid="tab-system">
                <SettingsIcon className="w-4 h-4 mr-2" />
                Sistem
              </TabsTrigger>
              <TabsTrigger value="security" data-testid="tab-security">
                <Shield className="w-4 h-4 mr-2" />
                Keamanan
              </TabsTrigger>
              <TabsTrigger value="backup" data-testid="tab-backup">
                <Database className="w-4 h-4 mr-2" />
                Backup
              </TabsTrigger>
            </TabsList>

            {/* Store Configuration */}
            <TabsContent value="store" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Store className="w-5 h-5 mr-2" />
                    Konfigurasi Toko
                  </CardTitle>
                  <CardDescription>
                    Atur informasi dasar toko Anda
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nama Toko</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="LaptopPOS Store"
                                  data-testid="input-store-name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telepon</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="021-1234567"
                                  data-testid="input-phone"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email"
                                  placeholder="store@example.com"
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
                          name="logo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Logo URL</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://example.com/logo.png"
                                  data-testid="input-logo"
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
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alamat</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Jl. Contoh No. 123, Jakarta"
                                data-testid="input-address"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="taxRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pajak (%)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  step="0.01"
                                  placeholder="11.0"
                                  data-testid="input-tax-rate"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="defaultDiscount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Diskon Default (%)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  step="0.01"
                                  placeholder="0.0"
                                  data-testid="input-default-discount"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button 
                          type="submit"
                          disabled={updateConfigMutation.isPending}
                          data-testid="button-save-config"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Simpan Konfigurasi
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Settings */}
            <TabsContent value="system" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <SettingsIcon className="w-5 h-5 mr-2" />
                    Pengaturan Sistem
                  </CardTitle>
                  <CardDescription>
                    Konfigurasi sistem dan preferensi aplikasi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h4 className="font-medium">Format Mata Uang</h4>
                      <p className="text-sm text-muted-foreground">Rupiah (IDR)</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Zona Waktu</h4>
                      <p className="text-sm text-muted-foreground">Asia/Jakarta (WIB)</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Format Tanggal</h4>
                      <p className="text-sm text-muted-foreground">DD/MM/YYYY</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Bahasa</h4>
                      <p className="text-sm text-muted-foreground">Indonesia</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Pengaturan Notifikasi</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Stok Rendah</p>
                          <p className="text-sm text-muted-foreground">
                            Notifikasi ketika stok produk mencapai batas minimum
                          </p>
                        </div>
                        <div className="text-green-600 font-medium">Aktif</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Service Selesai</p>
                          <p className="text-sm text-muted-foreground">
                            Notifikasi ketika service ticket selesai dikerjakan
                          </p>
                        </div>
                        <div className="text-green-600 font-medium">Aktif</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Pengaturan Keamanan
                  </CardTitle>
                  <CardDescription>
                    Kelola keamanan sistem dan akses pengguna
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Session Timeout</h4>
                        <p className="text-sm text-muted-foreground">
                          Waktu logout otomatis untuk keamanan
                        </p>
                      </div>
                      <div className="text-sm font-medium">7 hari</div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Two-Factor Authentication</h4>
                        <p className="text-sm text-muted-foreground">
                          Keamanan ekstra untuk login admin
                        </p>
                      </div>
                      <div className="text-sm font-medium">Dikelola Replit</div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Audit Log</h4>
                        <p className="text-sm text-muted-foreground">
                          Rekam aktivitas pengguna untuk keamanan
                        </p>
                      </div>
                      <div className="text-green-600 font-medium">Aktif</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Backup Settings */}
            <TabsContent value="backup" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="w-5 h-5 mr-2" />
                    Backup & Pemulihan
                  </CardTitle>
                  <CardDescription>
                    Kelola backup data dan pemulihan sistem
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Backup Otomatis</h4>
                        <p className="text-sm text-muted-foreground">
                          Backup database dilakukan otomatis oleh Replit
                        </p>
                      </div>
                      <div className="text-green-600 font-medium">Aktif</div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Point-in-Time Recovery</h4>
                        <p className="text-sm text-muted-foreground">
                          Kembalikan data ke waktu tertentu
                        </p>
                      </div>
                      <div className="text-green-600 font-medium">Tersedia</div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Backup Terakhir</h4>
                        <p className="text-sm text-muted-foreground">
                          Backup data terbaru dilakukan secara otomatis
                        </p>
                      </div>
                      <div className="text-sm font-medium">{new Date().toLocaleDateString("id-ID")}</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium text-orange-600">Rollback Sistem</h4>
                    <p className="text-sm text-muted-foreground">
                      Jika terjadi masalah, Anda dapat mengembalikan sistem ke checkpoint sebelumnya 
                      menggunakan fitur rollback Replit di panel kontrol.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}