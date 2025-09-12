import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Laptop, Wrench, BarChart3, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Landing() {
  // Get store config for app name - WITH BETTER CACHING
  const { data: storeConfig } = useQuery({
    queryKey: ['store-config-landing'], // Unique key
    queryFn: async () => {
      const response = await fetch('/api/store-config', { credentials: 'include' });
      if (!response.ok) return { name: 'LaptopPOS' };
      return response.json();
    },
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: false,
  });
  
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
              <Laptop className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">{(storeConfig as any)?.name || 'LaptopPOS'}</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Sistem POS Lengkap untuk Penjualan & Servis Laptop
          </p>
          <Button 
            onClick={handleLogin} 
            size="lg" 
            className="px-8 py-3 text-lg"
            data-testid="button-login"
          >
            Masuk untuk Melanjutkan
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Manajemen Penjualan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sistem POS lengkap dengan pelacakan transaksi dan pelaporan
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="text-lg">Tiket Servis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Lacak perbaikan laptop dan permintaan servis secara efisien
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Package className="w-6 h-6 text-secondary" />
              </div>
              <CardTitle className="text-lg">Kontrol Inventori</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Kelola tingkat stok dan dapatkan peringatan stok rendah
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-lg">Laporan Keuangan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Lacak keuntungan, pengeluaran dan buat laporan detail
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Fitur Utama</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Untuk Administrator</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Kontrol akses berbasis peran</li>
                  <li>• Konfigurasi sistem lengkap</li>
                  <li>• Manajemen pengguna</li>
                  <li>• Pengawasan keuangan</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Untuk Staf</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Antarmuka POS yang mudah digunakan</li>
                  <li>• Manajemen tiket servis</li>
                  <li>• Database pelanggan</li>
                  <li>• Pembaruan inventori real-time</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
