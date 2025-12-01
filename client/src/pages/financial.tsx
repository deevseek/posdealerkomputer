import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CreditCard, Users, TrendingUp } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

export default function Financial() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Auto redirect to new finance system after 3 seconds
    const timer = setTimeout(() => {
      setLocation('/finance');
    }, 3000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Keuangan" breadcrumb="Beranda / Keuangan" />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          <div className="container mx-auto">
            <div className="max-w-2xl mx-auto text-center space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold text-foreground">Sistem Keuangan Terbaru</h1>
                <p className="text-xl text-muted-foreground">
                  Selamat datang di sistem keuangan dan payroll yang telah diperbarui
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <Card className="p-6">
                  <CardHeader className="space-y-1 p-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                      <CreditCard className="w-6 h-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-center">Transaksi Keuangan</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 pt-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Kelola pemasukan dan pengeluaran dengan sistem yang lebih canggih
                    </p>
                  </CardContent>
                </Card>

                <Card className="p-6">
                  <CardHeader className="space-y-1 p-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                    <CardTitle className="text-center">Manajemen Karyawan</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 pt-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Kelola data karyawan dan sistem payroll terintegrasi
                    </p>
                  </CardContent>
                </Card>

                <Card className="p-6">
                  <CardHeader className="space-y-1 p-0">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <CardTitle className="text-center">Laporan & Analytics</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 pt-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Dashboard lengkap dengan analisis keuangan mendalam
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    <strong>Sistem telah diperbarui!</strong> Anda akan dialihkan ke sistem keuangan baru dalam beberapa detik...
                  </p>
                </div>

                <Button 
                  onClick={() => setLocation('/finance')}
                  size="lg"
                  className="w-full max-w-md"
                >
                  Buka Sistem Keuangan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Sistem keuangan lama akan segera dihentikan. Silakan gunakan sistem baru untuk pengalaman yang lebih baik.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}