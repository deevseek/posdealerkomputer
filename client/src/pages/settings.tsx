import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Store, Users, Shield, Database, MessageCircle, Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("store");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch store config
  const { data: storeConfig, isLoading: configLoading } = useQuery({
    queryKey: ['/api/store-config'],
  });

  // Store settings mutation
  const updateStoreMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/store-config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update store config');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/store-config'] });
      toast({
        title: "Berhasil",
        description: "Pengaturan toko berhasil diupdate",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Gagal mengupdate pengaturan",
        variant: "destructive",
      });
    },
  });

  const handleStoreSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      storeName: formData.get('storeName'),
      address: formData.get('address'),
      phone: formData.get('phone'),
      email: formData.get('email'),
    };
    updateStoreMutation.mutate(data);
  };

  if (configLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <SettingsIcon className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Pengaturan Sistem</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="store" className="flex items-center space-x-2">
            <Store className="w-4 h-4" />
            <span>Toko</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Pengguna</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center space-x-2">
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Keamanan</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span>Backup</span>
          </TabsTrigger>
        </TabsList>

        {/* Store Settings */}
        <TabsContent value="store" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Store className="w-5 h-5 mr-2" />
                Informasi Toko
              </CardTitle>
              <CardDescription>
                Kelola informasi dasar toko Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStoreSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Nama Toko</Label>
                    <Input
                      id="storeName"
                      name="storeName"
                      defaultValue={(storeConfig as any)?.storeName || ""}
                      placeholder="Masukkan nama toko"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor Telepon</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={(storeConfig as any)?.phone || ""}
                      placeholder="Masukkan nomor telepon"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={(storeConfig as any)?.address || ""}
                    placeholder="Masukkan alamat lengkap"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={(storeConfig as any)?.email || ""}
                    placeholder="Masukkan email toko"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={updateStoreMutation.isPending}
                >
                  {updateStoreMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Settings */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Manajemen Pengguna
              </CardTitle>
              <CardDescription>
                Kelola akun dan role pengguna sistem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">
                Fitur manajemen pengguna akan tersedia segera
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
            <CardContent>
              <div className="text-muted-foreground">
                Fitur pengaturan keamanan akan tersedia segera
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
                Backup & Restore
              </CardTitle>
              <CardDescription>
                Kelola backup data dan pengaturan sistem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">
                Fitur backup & restore akan tersedia segera
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// WhatsApp Settings Component - Full Implementation
function WhatsAppSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testPhone, setTestPhone] = useState("");
  
  // Fetch store config for WhatsApp settings
  const { data: storeConfig, isLoading: configLoading } = useQuery({
    queryKey: ['/api/store-config'],
  });
  
  const whatsappEnabled = (storeConfig as any)?.whatsappEnabled || false;
  
  // WhatsApp status query - only when WhatsApp is enabled
  const { data: whatsappStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/whatsapp/status'],
    refetchInterval: whatsappEnabled ? 3000 : false, // Only refresh when enabled
    enabled: whatsappEnabled, // Only run query when WhatsApp is enabled
  });

  // Enable/disable WhatsApp mutation
  const toggleWhatsAppMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch(`/api/whatsapp/${enabled ? 'enable' : 'disable'}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to toggle WhatsApp');
      }
      return response.json();
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
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to connect WhatsApp');
      }
      return response.json();
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
      const response = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to disconnect WhatsApp');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/status'] });
      toast({
        title: "Berhasil",
        description: "WhatsApp berhasil diputuskan",
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
  const testMessageMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await fetch('/api/whatsapp/test-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ phoneNumber: phone }),
      });
      if (!response.ok) {
        throw new Error('Failed to send test message');
      }
      return response.json();
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

  const handleTestMessage = () => {
    if (!testPhone.trim()) {
      toast({
        title: "Error",
        description: "Masukkan nomor telepon terlebih dahulu",
        variant: "destructive",
      });
      return;
    }
    testMessageMutation.mutate(testPhone);
  };

  if (configLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div>Memuat pengaturan WhatsApp...</div>
        </CardContent>
      </Card>
    );
  }
  const whatsappConnected = (whatsappStatus as any)?.connected || false;
  const connectionState = (whatsappStatus as any)?.connectionState || 'close';
  const qrCode = (whatsappStatus as any)?.qrCode;

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
        {/* Enable/Disable WhatsApp */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h4 className="font-medium">Status WhatsApp</h4>
            <p className="text-sm text-muted-foreground">
              {whatsappEnabled ? "WhatsApp integration aktif" : "WhatsApp integration nonaktif"}
            </p>
          </div>
          <Button
            variant={whatsappEnabled ? "destructive" : "default"}
            onClick={() => toggleWhatsAppMutation.mutate(!whatsappEnabled)}
            disabled={toggleWhatsAppMutation.isPending}
            data-testid={whatsappEnabled ? "button-disable-whatsapp" : "button-enable-whatsapp"}
          >
            {toggleWhatsAppMutation.isPending ? "Loading..." : whatsappEnabled ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>

        {whatsappEnabled && (
          <>
            {/* Connection Status */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium">Status Koneksi</h4>
                  <p className="text-sm text-muted-foreground">
                    Status: <span className={`font-medium ${whatsappConnected ? 'text-green-600' : 'text-red-600'}`}>
                      {whatsappConnected ? 'Terhubung' : 'Tidak terhubung'}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    State: {connectionState}
                  </p>
                </div>
                <div className="space-x-2">
                  {!whatsappConnected && (
                    <Button
                      onClick={() => connectWhatsAppMutation.mutate()}
                      disabled={connectWhatsAppMutation.isPending}
                      data-testid="button-connect-whatsapp"
                    >
                      {connectWhatsAppMutation.isPending ? "Connecting..." : "Connect"}
                    </Button>
                  )}
                  {whatsappConnected && (
                    <Button
                      variant="outline"
                      onClick={() => disconnectWhatsAppMutation.mutate()}
                      disabled={disconnectWhatsAppMutation.isPending}
                      data-testid="button-disconnect-whatsapp"
                    >
                      {disconnectWhatsAppMutation.isPending ? "Disconnecting..." : "Disconnect"}
                    </Button>
                  )}
                </div>
              </div>

              {/* QR Code Display */}
              {qrCode && !whatsappConnected && (
                <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                  <h5 className="font-medium mb-2">Scan QR Code</h5>
                  <p className="text-sm text-muted-foreground mb-4">
                    Buka WhatsApp di ponsel → Settings → Linked Devices → Link a Device → Scan QR code di bawah
                  </p>
                  <div className="flex justify-center">
                    <img 
                      src={qrCode} 
                      alt="WhatsApp QR Code" 
                      className="w-64 h-64 border"
                      data-testid="img-qr-code"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Test Message */}
            {whatsappConnected && (
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-4">Test Pesan</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="testPhone">Nomor Telepon (dengan kode negara)</Label>
                    <Input
                      id="testPhone"
                      placeholder="contoh: 628123456789"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      data-testid="input-test-phone"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Format: 628xxxxxxxxx (tanpa tanda + atau spasi)
                    </p>
                  </div>
                  <Button
                    onClick={handleTestMessage}
                    disabled={testMessageMutation.isPending || !testPhone.trim()}
                    data-testid="button-send-test"
                  >
                    {testMessageMutation.isPending ? "Mengirim..." : "Kirim Test Pesan"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Kirim pesan test untuk memastikan koneksi WhatsApp berfungsi dengan baik
                </p>
              </div>
            )}

            {/* Feature Information */}
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Fitur Notifikasi Otomatis</h4>
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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}