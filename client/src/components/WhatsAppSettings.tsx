import { useState } from "react";
import { MessageCircle } from "lucide-react";
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
  const [testPhone, setTestPhone] = useState("");
  
  const whatsappEnabled = storeConfig?.whatsappEnabled || false;

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
            onClick={() => {
              toast({
                title: "Info",
                description: "Fitur toggle akan segera tersedia",
              });
            }}
            data-testid={whatsappEnabled ? "button-disable-whatsapp" : "button-enable-whatsapp"}
          >
            {whatsappEnabled ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>

        {/* Connection Status & Actions */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium">Status Koneksi</h4>
              <p className="text-sm text-muted-foreground">
                <span className="text-red-600">❌ Tidak terhubung</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                State: Disconnected
              </p>
            </div>
            
            <div className="space-x-2">
              <Button
                onClick={() => {
                  toast({
                    title: "Info",
                    description: "Fitur koneksi WhatsApp akan segera tersedia",
                  });
                }}
                data-testid="button-connect-whatsapp"
              >
                Connect
              </Button>
            </div>
          </div>
        </div>

        {/* Test Message */}
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
              onClick={() => {
                toast({
                  title: "Info",
                  description: "Fitur test message akan segera tersedia",
                });
              }}
              data-testid="button-send-test"
            >
              Kirim Test Pesan
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Kirim pesan test untuk memastikan koneksi WhatsApp berfungsi dengan baik
          </p>
        </div>

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