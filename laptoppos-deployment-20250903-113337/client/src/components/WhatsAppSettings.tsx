import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, QrCode, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppSettingsProps {
  storeConfig: any;
}

export function WhatsAppSettings({ storeConfig }: WhatsAppSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testPhone, setTestPhone] = useState("");
  
  const whatsappEnabled = storeConfig?.whatsappEnabled || false;

  // Query WhatsApp status
  const { data: whatsappStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/whatsapp/status'],
    enabled: whatsappEnabled,
    refetchInterval: false, // Disable automatic polling to prevent infinite loop
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
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
      // Only invalidate WhatsApp status, not store config to prevent loop
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
        description: "Proses koneksi WhatsApp dimulai. Scan QR code untuk menghubungkan.",
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

  const whatsappConnected = (whatsappStatus as any)?.connected || false;
  const connectionState = (whatsappStatus as any)?.state || 'close';
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

        {/* Connection Status & Actions */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium">Status Koneksi</h4>
              <p className="text-sm text-muted-foreground">
                {whatsappConnected ? (
                  <span className="text-green-600">✅ Terhubung</span>
                ) : (
                  <span className="text-red-600">❌ Tidak terhubung</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                State: {connectionState}
                {statusLoading && <RefreshCw className="w-3 h-3 ml-1 inline animate-spin" />}
              </p>
            </div>
            
            <div className="space-x-2">
              {!whatsappConnected ? (
                <Button
                  onClick={() => connectWhatsAppMutation.mutate()}
                  disabled={connectWhatsAppMutation.isPending}
                  data-testid="button-connect-whatsapp"
                >
                  {connectWhatsAppMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4 mr-2" />
                      Connect
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="destructive"
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
            <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
              <h5 className="font-medium mb-2 flex items-center">
                <QrCode className="w-4 h-4 mr-2" />
                Scan QR Code
              </h5>
              <p className="text-sm text-muted-foreground mb-4">
                Buka WhatsApp di ponsel → Settings → Linked Devices → Link a Device → Scan QR code di bawah
              </p>
              <div className="flex justify-center">
                <img 
                  src={qrCode} 
                  alt="WhatsApp QR Code" 
                  className="w-64 h-64 border rounded-lg"
                  data-testid="img-qr-code"
                />
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                QR code akan diperbarui secara otomatis setiap beberapa detik
              </p>
            </div>
          )}
        </div>

        {/* Test Message - Only show when connected */}
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
      </CardContent>
    </Card>
  );
}