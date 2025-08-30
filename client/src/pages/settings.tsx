import { useState } from "react";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Store, Users, Shield, Database, MessageCircle, Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { WhatsAppSettings as WhatsAppSettingsComponent } from "@/components/WhatsAppSettings";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("store");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch store config with proper caching
  const { data: storeConfig, isLoading: configLoading } = useQuery({
    queryKey: ['/api/store-config'],
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Store settings mutation
  const updateStoreMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Sending store config data:', data);
      const response = await fetch('/api/store-config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`Failed to update store config: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('Non-JSON response received:', responseText);
        throw new Error('Server returned non-JSON response');
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
      console.error('Store config update error:', error);
      console.error('Error type:', typeof error);
      console.error('Error details:', JSON.stringify(error, null, 2));
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
      name: formData.get('storeName'),
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
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Pengaturan</h1>
        <p className="text-muted-foreground">
          Kelola pengaturan toko dan sistem Anda
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="store" className="flex items-center space-x-2">
            <Store className="w-4 h-4" />
            <span>Toko</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Users</span>
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
              <CardTitle>Informasi Toko</CardTitle>
              <CardDescription>
                Kelola informasi dasar tentang toko Anda
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
                      data-testid="input-store-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telepon</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={(storeConfig as any)?.phone || ""}
                      placeholder="Masukkan nomor telepon"
                      data-testid="input-phone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={(storeConfig as any)?.address || ""}
                    placeholder="Masukkan alamat lengkap toko"
                    data-testid="input-address"
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
                    data-testid="input-email"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={updateStoreMutation.isPending}
                  data-testid="button-save-store"
                >
                  {updateStoreMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manajemen User</CardTitle>
              <CardDescription>
                Kelola user dan role dalam sistem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">
                Fitur manajemen user akan tersedia segera
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Integration */}
        <TabsContent value="whatsapp" className="space-y-6">
          <WhatsAppSettingsComponent storeConfig={storeConfig || {}} />
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Keamanan</CardTitle>
              <CardDescription>
                Kelola pengaturan keamanan sistem
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