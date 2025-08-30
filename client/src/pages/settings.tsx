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
      return await apiRequest('/api/store-config', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
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
                      defaultValue={storeConfig?.storeName || ""}
                      placeholder="Masukkan nama toko"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor Telepon</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={storeConfig?.phone || ""}
                      placeholder="Masukkan nomor telepon"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={storeConfig?.address || ""}
                    placeholder="Masukkan alamat lengkap"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={storeConfig?.email || ""}
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
          <div className="text-xs text-muted-foreground mb-4">Debug: WhatsApp tab clicked</div>
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

// WhatsApp Settings Component - Simplified version for debugging
function WhatsAppSettings() {
  console.log('WhatsAppSettings component rendering...');
  
  // Simple test without any complex logic
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageCircle className="w-5 h-5 mr-2" />
          Integrasi WhatsApp (Test Mode)
        </CardTitle>
        <CardDescription>
          Hubungkan WhatsApp untuk mengirim notifikasi otomatis ke pelanggan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg bg-blue-50">
          <h4 className="font-medium text-blue-900">✅ Tab WhatsApp berhasil dibuka!</h4>
          <p className="text-sm text-blue-700 mt-2">
            Komponen berhasil di-render. Sekarang kita bisa lanjut implementasi fitur lengkap.
          </p>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Fitur yang akan tersedia:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• Enable/disable WhatsApp integration</li>
            <li>• Scan QR code untuk connect bot</li>
            <li>• Test kirim pesan</li>
            <li>• Notifikasi otomatis service</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}