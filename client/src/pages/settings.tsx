import { useState } from "react";
import React from "react";
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
import { Settings as SettingsIcon, Store, Shield, Bell, Database, Save, MessageCircle, Smartphone, QrCode, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { StoreConfig } from "@shared/schema";
import { z } from "zod";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";

const storeConfigFormSchema = insertStoreConfigSchema.omit({
  taxRate: true,
  defaultDiscount: true,
}).extend({
  taxRate: z.string(),
  defaultDiscount: z.string(),
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
      name: "",
      address: "",
      phone: "",
      email: "",
      taxRate: "11.0",
      defaultDiscount: "0.0",
      logo: "",
    },
  });

  // Update form values when storeConfig data loads
  React.useEffect(() => {
    if (storeConfig && typeof storeConfig === 'object' && 'name' in storeConfig) {
      form.reset({
        name: (storeConfig as StoreConfig).name || "",
        address: (storeConfig as StoreConfig).address || "",
        phone: (storeConfig as StoreConfig).phone || "",
        email: (storeConfig as StoreConfig).email || "",
        taxRate: (storeConfig as StoreConfig).taxRate?.toString() || "11.0",
        defaultDiscount: (storeConfig as StoreConfig).defaultDiscount?.toString() || "0.0",
        logo: (storeConfig as StoreConfig).logo || "",
      });
    }
  }, [storeConfig, form]);

  const updateConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Submitting config data:', data);
      
      // Ensure all values are strings for proper validation
      const payload = {
        name: data.name || "",
        address: data.address || "",
        phone: data.phone || "",
        email: data.email || "",
        taxRate: String(data.taxRate || "11.00"),
        defaultDiscount: String(data.defaultDiscount || "0.00"),
        logo: data.logo || "",
      };

      const response = await fetch('/api/store-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/store-config'] });
      toast({
        title: "Berhasil",
        description: "Konfigurasi toko berhasil disimpan",
      });
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      toast({
        title: "Error", 
        description: error?.message || "Gagal menyimpan konfigurasi toko",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any) => {
    console.log('Form submit data:', data);
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="store" data-testid="tab-store">
                <Store className="w-4 h-4 mr-2" />
                Toko
              </TabsTrigger>
              <TabsTrigger value="system" data-testid="tab-system">
                <SettingsIcon className="w-4 h-4 mr-2" />
                Sistem
              </TabsTrigger>
              <TabsTrigger value="whatsapp" data-testid="tab-whatsapp">
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
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
                              <FormLabel>Logo Toko</FormLabel>
                              <FormControl>
                                <div className="space-y-4">
                                  {field.value && (
                                    <div className="flex items-center space-x-4">
                                      <img 
                                        src={field.value.startsWith('/objects/') ? field.value : `/objects/${field.value}`}
                                        alt="Logo toko" 
                                        className="w-16 h-16 object-cover rounded border"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                      <span className="text-sm text-muted-foreground">Logo saat ini</span>
                                    </div>
                                  )}
                                  <ObjectUploader
                                    maxNumberOfFiles={1}
                                    maxFileSize={5 * 1024 * 1024} // 5MB
                                    onGetUploadParameters={async () => {
                                      const response = await fetch('/api/objects/upload', {
                                        method: 'POST',
                                        credentials: 'include',
                                      });
                                      if (!response.ok) {
                                        throw new Error('Failed to get upload URL');
                                      }
                                      const { uploadURL } = await response.json();
                                      return {
                                        method: 'PUT' as const,
                                        url: uploadURL,
                                      };
                                    }}
                                    onComplete={(result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
                                      if (result.successful?.[0]?.uploadURL) {
                                        const uploadURL = result.successful[0].uploadURL as string;
                                        // Call API to set logo
                                        fetch('/api/logos', {
                                          method: 'PUT',
                                          headers: {
                                            'Content-Type': 'application/json',
                                          },
                                          credentials: 'include',
                                          body: JSON.stringify({
                                            logoURL: uploadURL,
                                          }),
                                        })
                                        .then(response => response.json())
                                        .then(data => {
                                          field.onChange(data.objectPath);
                                          toast({
                                            title: "Berhasil",
                                            description: "Logo berhasil diupload",
                                          });
                                        })
                                        .catch(error => {
                                          console.error('Error setting logo:', error);
                                          toast({
                                            title: "Error",
                                            description: "Gagal menyimpan logo",
                                            variant: "destructive",
                                          });
                                        });
                                      }
                                    }}
                                    buttonClassName="w-full"
                                  >
                                    <div className="flex items-center justify-center space-x-2">
                                      <span>📁</span>
                                      <span>Upload Logo</span>
                                    </div>
                                  </ObjectUploader>
                                </div>
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

            {/* WhatsApp Integration */}
            <TabsContent value="whatsapp" className="space-y-6">
              <WhatsAppSettings />
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

// WhatsApp Settings Component
function WhatsAppSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch store config for WhatsApp settings
  const { data: storeConfig, isLoading } = useQuery({
    queryKey: ['/api/store-config'],
  });
  
  // WhatsApp status query
  const { data: whatsappStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/whatsapp/status'],
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  // Enable/disable WhatsApp mutation
  const toggleWhatsAppMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest(`/api/whatsapp/${enabled ? 'enable' : 'disable'}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/store-config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/status'] });
      toast({
        title: "Berhasil",
        description: "Pengaturan WhatsApp berhasil diubah",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Gagal mengubah pengaturan WhatsApp",
        variant: "destructive",
      });
    },
  });

  // Connect WhatsApp mutation
  const connectWhatsAppMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/whatsapp/connect', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/status'] });
      toast({
        title: "Berhasil",
        description: "Mencoba menghubungkan ke WhatsApp...",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Gagal menghubungkan WhatsApp",
        variant: "destructive",
      });
    },
  });

  // Disconnect WhatsApp mutation
  const disconnectWhatsAppMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/whatsapp/disconnect', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/status'] });
      toast({
        title: "Berhasil",
        description: "WhatsApp terputus",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Gagal memutuskan WhatsApp",
        variant: "destructive",
      });
    },
  });

  // Test message mutation
  const [testPhone, setTestPhone] = useState("");
  const testMessageMutation = useMutation({
    mutationFn: async (phone: string) => {
      return await apiRequest('/api/whatsapp/test-message', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: phone }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Pesan test berhasil dikirim",
      });
      setTestPhone("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Gagal mengirim pesan test",
        variant: "destructive",
      });
    },
  });

  const handleToggleWhatsApp = (enabled: boolean) => {
    toggleWhatsAppMutation.mutate(enabled);
  };

  const handleConnect = () => {
    connectWhatsAppMutation.mutate();
  };

  const handleDisconnect = () => {
    disconnectWhatsAppMutation.mutate();
  };

  const handleTestMessage = () => {
    if (!testPhone.trim()) {
      toast({
        title: "Error",
        description: "Masukkan nomor WhatsApp untuk test",
        variant: "destructive",
      });
      return;
    }
    testMessageMutation.mutate(testPhone);
  };

  if (isLoading || statusLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div>Memuat pengaturan WhatsApp...</div>
        </CardContent>
      </Card>
    );
  }

  const whatsappEnabled = storeConfig?.whatsappEnabled || false;
  const whatsappConnected = whatsappStatus?.connected || false;
  const connectionState = whatsappStatus?.connectionState || 'close';
  const qrCode = whatsappStatus?.qrCode;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageCircle className="w-5 h-5 mr-2" />
          Integrasi WhatsApp
        </CardTitle>
        <CardDescription>
          Hubungkan WhatsApp untuk mengirim notifikasi otomatis ke pelanggan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h4 className="font-medium">Aktifkan WhatsApp</h4>
            <p className="text-sm text-muted-foreground">
              Nyalakan untuk mengirim notifikasi service otomatis
            </p>
          </div>
          <Switch
            checked={whatsappEnabled}
            onCheckedChange={handleToggleWhatsApp}
            disabled={toggleWhatsAppMutation.isPending}
            data-testid="switch-whatsapp-enabled"
          />
        </div>

        {whatsappEnabled && (
          <>
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium flex items-center">
                  {whatsappConnected ? (
                    <Wifi className="w-4 h-4 mr-2 text-green-600" />
                  ) : (
                    <WifiOff className="w-4 h-4 mr-2 text-red-600" />
                  )}
                  Status Koneksi
                </h4>
                <p className="text-sm text-muted-foreground">
                  {whatsappConnected ? 'Terhubung' : 'Tidak terhubung'}
                </p>
              </div>
              <div className={`text-sm font-medium ${whatsappConnected ? 'text-green-600' : 'text-red-600'}`}>
                {connectionState}
              </div>
            </div>

            {/* Connection Actions */}
            <div className="flex gap-2">
              {!whatsappConnected ? (
                <Button
                  onClick={handleConnect}
                  disabled={connectWhatsAppMutation.isPending || connectionState === 'connecting'}
                  data-testid="button-connect-whatsapp"
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  {connectionState === 'connecting' ? 'Menghubungkan...' : 'Hubungkan WhatsApp'}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={disconnectWhatsAppMutation.isPending}
                  data-testid="button-disconnect-whatsapp"
                >
                  <WifiOff className="w-4 h-4 mr-2" />
                  Putuskan Koneksi
                </Button>
              )}
            </div>

            {/* QR Code Display */}
            {qrCode && (
              <div className="space-y-4">
                <Alert>
                  <QrCode className="h-4 w-4" />
                  <AlertDescription>
                    Scan QR code berikut dengan aplikasi WhatsApp di ponsel Anda untuk menghubungkan bot
                  </AlertDescription>
                </Alert>
                <div className="flex justify-center p-4 border rounded-lg bg-white">
                  <img 
                    src={qrCode} 
                    alt="WhatsApp QR Code" 
                    className="w-64 h-64"
                  />
                </div>
              </div>
            )}

            {/* Test Message Section */}
            {whatsappConnected && (
              <div className="space-y-4">
                <Separator />
                <h4 className="font-medium">Test Pesan WhatsApp</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nomor WhatsApp (contoh: 081234567890)"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    data-testid="input-test-phone"
                  />
                  <Button
                    onClick={handleTestMessage}
                    disabled={testMessageMutation.isPending}
                    data-testid="button-test-message"
                  >
                    Kirim Test
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Kirim pesan test untuk memastikan koneksi WhatsApp berfungsi dengan baik
                </p>
              </div>
            )}

            {/* Feature Information */}
            <div className="space-y-4">
              <Separator />
              <h4 className="font-medium">Fitur Notifikasi Otomatis</h4>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span>Service baru diterima</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span>Status service berubah (sedang dikerjakan, selesai, dll)</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span>Service siap diambil</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}