import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatCard from "@/components/dashboard/stat-card";
import RecentTransactions from "@/components/dashboard/recent-transactions";
import QuickActions from "@/components/dashboard/quick-actions";
import ServiceStatus from "@/components/dashboard/service-status";
import InventoryAlerts from "@/components/dashboard/inventory-alerts";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, DollarSign, BarChart3 } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Tidak Diotorisasi",
        description: "Anda telah logout. Masuk kembali...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return <div>Memuat...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Dasbor" breadcrumb="Beranda / Dasbor" />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Dashboard Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Penjualan Hari Ini"
              value={statsLoading ? "Memuat..." : `Rp ${Number(stats?.todaySales || 0).toLocaleString('id-ID')}`}
              change="+12% dari kemarin"
              icon="money-bill-wave"
              color="primary"
              data-testid="stat-today-sales"
            />
            <StatCard
              title="Service Aktif"
              value={statsLoading ? "Memuat..." : stats?.activeServices?.toString() || "0"}
              change="5 mendesak"
              icon="tools"
              color="accent"
              data-testid="stat-active-services"
            />
            <StatCard
              title="Stok Menipis"
              value={statsLoading ? "Memuat..." : stats?.lowStockCount?.toString() || "0"}
              change="Perlu perhatian"
              icon="exclamation-triangle"
              color="destructive"
              data-testid="stat-low-stock"
            />
            <StatCard
              title="Profit Bulanan"
              value={statsLoading ? "Memuat..." : `Rp ${Number(stats?.monthlyProfit || 0).toLocaleString('id-ID')}`}
              change="+8% bulan ini"
              icon="chart-line"
              color="accent"
              data-testid="stat-monthly-profit"
            />
          </div>

          {/* WhatsApp Status Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Status WhatsApp"
              value={statsLoading ? "Memuat..." : (stats?.whatsappConnected ? "🟢 Terhubung" : "🔴 Terputus")}
              change={stats?.whatsappConnected ? "Siap mengirim" : "Perlu koneksi"}
              icon="message-circle"
              color={stats?.whatsappConnected ? "primary" : "destructive"}
              data-testid="stat-whatsapp-status"
            />
          </div>

          {/* SaaS Management Access Card */}
          <div className="mb-8">
            <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-all duration-200 bg-gradient-to-br from-blue-50 to-purple-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">🚀 SaaS Management Dashboard</CardTitle>
                      <CardDescription>
                        Comprehensive client & subscription management system
                      </CardDescription>
                    </div>
                  </div>
                  <Link href="/admin-saas">
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Open SaaS Dashboard
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  <div className="flex flex-col items-center p-3 bg-white/60 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600 mb-2" />
                    <div className="text-sm font-medium">Client Management</div>
                    <div className="text-xs text-muted-foreground">CRUD Operations</div>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-white/60 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600 mb-2" />
                    <div className="text-sm font-medium">Revenue Analytics</div>
                    <div className="text-xs text-muted-foreground">MRR Tracking</div>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-white/60 rounded-lg">
                    <Building2 className="h-5 w-5 text-purple-600 mb-2" />
                    <div className="text-sm font-medium">Subscriptions</div>
                    <div className="text-xs text-muted-foreground">Plan Management</div>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-white/60 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-orange-600 mb-2" />
                    <div className="text-sm font-medium">Billing System</div>
                    <div className="text-xs text-muted-foreground">Payment Tracking</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <RecentTransactions />
            </div>
            <QuickActions />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ServiceStatus />
            <InventoryAlerts />
          </div>
        </main>
      </div>
    </div>
  );
}
